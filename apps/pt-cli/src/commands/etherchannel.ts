#!/usr/bin/env bun
/**
 * Comando etherchannel - EtherChannel (Port-Channel) management
 * Migrado al patrón runCommand con CliResult
 */

import { Command } from 'commander';
import { select } from '@inquirer/prompts';
import chalk from 'chalk';

import type { CliResult } from '../contracts/cli-result.js';
import { createSuccessResult, createErrorResult } from '../contracts/cli-result.js';
import type { CommandMeta } from '../contracts/command-meta.js';
import type { GlobalFlags } from '../flags.js';

import { runCommand } from '../application/run-command.js';
import { renderCliResult } from '../ux/renderers.js';
import { printExamples } from '../ux/examples.js';

const ETHERCHANNEL_EXAMPLES = [
  { command: 'pt etherchannel create --device Switch1 --group-id 1 --interfaces Gi0/1,Gi0/2', description: 'Crear EtherChannel con LACP' },
  { command: 'pt etherchannel create --device Switch1 --group-id 1 --interfaces Gi0/1,Gi0/2 --trunk', description: 'Crear EtherChannel como trunk' },
  { command: 'pt etherchannel list Switch1', description: 'Ver EtherChannels configurados' },
  { command: 'pt etherchannel remove Switch1 --group-id 1', description: 'Remover EtherChannel' },
];

const ETHERCHANNEL_META: CommandMeta = {
  id: 'etherchannel',
  summary: 'Gestionar EtherChannel (Port-Channel) en switches',
  longDescription: 'Comandos para crear, remover y listar bundles EtherChannel en switches Cisco.',
  examples: ETHERCHANNEL_EXAMPLES,
  related: ['vlan', 'config-ios', 'show'],
  supportsVerify: true,
  supportsJson: true,
  supportsPlan: true,
  supportsExplain: true,
};

interface EtherchannelCreateOptions {
  groupId: number;
  interfaces: string;
  mode: 'active' | 'passive' | 'desirable' | 'auto' | 'on';
  protocol: 'lacp' | 'pagp' | 'static';
  trunk: boolean;
  allowedVlans?: string;
  nativeVlan?: number;
  description?: string;
  dryRun: boolean;
}

interface EtherchannelResult {
  device: string;
  groupId: number;
  interfaces: string[];
  commands?: string[];
  dryRun?: boolean;
  commandsGenerated?: number;
}

function buildEtherchannelCommands(
  groupId: number,
  interfaces: string[],
  options: EtherchannelCreateOptions
): string[] {
  const commands: string[] = [];

  commands.push(`! EtherChannel Group ${groupId} (${options.protocol.toUpperCase()})`);

  for (const iface of interfaces) {
    commands.push(`interface ${iface}`);
    commands.push(` channel-group ${groupId} mode ${options.mode}`);
    commands.push(' no shutdown');
  }

  commands.push(`interface Port-channel${groupId}`);
  if (options.description) {
    commands.push(` description ${options.description}`);
  }

  if (options.trunk) {
    commands.push(' switchport trunk encapsulation dot1q');
    commands.push(' switchport mode trunk');
    if (options.allowedVlans) {
      commands.push(` switchport trunk allowed vlan ${options.allowedVlans}`);
    }
    if (options.nativeVlan) {
      commands.push(` switchport trunk native vlan ${options.nativeVlan}`);
    }
  } else {
    commands.push(' switchport mode access');
  }

  return commands;
}

export function createEtherchannelCommand(): Command {
  const cmd = new Command('etherchannel')
    .description('EtherChannel (Port-Channel) management')
    .option('--examples', 'Mostrar ejemplos de uso', false)
    .option('--explain', 'Explicar qué hace el comando', false)
    .option('--plan', 'Mostrar plan de ejecución sin ejecutar', false);

  cmd
    .command('create')
    .description('Create an EtherChannel bundle')
    .argument('[device]', 'Nombre del dispositivo')
    .option('--group-id <id>', 'Channel group ID (1-64)', '1')
    .option('--interfaces <interfaces>', 'Member interfaces, comma-separated')
    .option('--mode <mode>', 'Negotiation mode', 'active')
    .option('--protocol <protocol>', 'Protocol (lacp|pagp|static)', 'lacp')
    .option('--trunk', 'Set as trunk port', true)
    .option('--allowed-vlans <vlans>', 'Allowed VLANs')
    .option('--native-vlan <id>', 'Native VLAN ID')
    .option('--description <text>', 'Port-channel description')
    .option('--dry-run', 'Show commands without applying', false)
    .action(async (deviceName, options) => {
      const globalExamples = process.argv.includes('--examples');
      const globalExplain = process.argv.includes('--explain');
      const globalPlan = process.argv.includes('--plan');

      if (globalExamples) {
        console.log(printExamples(ETHERCHANNEL_META));
        return;
      }

      if (globalExplain) {
        console.log(ETHERCHANNEL_META.longDescription ?? ETHERCHANNEL_META.summary);
        return;
      }

      if (globalPlan) {
        console.log('Plan de ejecución:');
        console.log(`  1. Seleccionar dispositivo: ${deviceName ?? '<interactive>'}`);
        console.log(`  2. Crear EtherChannel Group ${options.groupId}`);
        console.log(`  3. Interfaces: ${options.interfaces ?? '<interactive>'}`);
        console.log(`  4. Modo: ${options.mode}`);
        return;
      }

      const flags: GlobalFlags = {
        json: false,
        jq: null,
        output: 'text',
        verbose: false,
        quiet: false,
        trace: false,
        tracePayload: false,
        traceResult: false,
        traceDir: null,
        traceBundle: false,
        traceBundlePath: null,
        sessionId: null,
        examples: globalExamples,
        schema: false,
        explain: globalExplain,
        plan: globalPlan,
        verify: true,
      };

      const result = await runCommand({
        action: 'etherchannel.create',
        meta: ETHERCHANNEL_META,
        flags,
        payloadPreview: { device: deviceName, groupId: options.groupId, interfaces: options.interfaces },
        execute: async (ctx): Promise<CliResult<EtherchannelResult>> => {
          try {
            let targetDevice = deviceName;

            if (!targetDevice) {
              const devices = await ctx.controller.listDevices();
              const switches = devices.filter((d: any) => 
                d.type === 'switch' || d.type === 'multilayer_switch' || d.model?.includes('2960') || d.model?.includes('3650')
              );
              
              if (switches.length === 0) {
                return createErrorResult('etherchannel.create', { message: 'No hay switches disponibles' }) as CliResult<EtherchannelResult>;
              }

              targetDevice = await select({
                message: 'Selecciona el switch',
                choices: switches.map((d: any) => ({ name: d.name, value: d.name })),
              });
            }

            if (!options.interfaces) {
              return createErrorResult('etherchannel.create', { message: 'Se requiere --interfaces' }) as CliResult<EtherchannelResult>;
            }

            const interfaces = options.interfaces.split(',').map((s: string) => s.trim());
            const groupId = parseInt(options.groupId, 10);
            
            const opts: EtherchannelCreateOptions = {
              groupId,
              interfaces,
              mode: options.mode as any,
              protocol: options.protocol as any,
              trunk: options.trunk,
              allowedVlans: options.allowedVlans,
              nativeVlan: options.nativeVlan ? parseInt(options.nativeVlan, 10) : undefined,
              description: options.description,
              dryRun: options.dryRun
            };

            const commands = buildEtherchannelCommands(groupId, interfaces, opts);

            if (options.dryRun) {
              return createSuccessResult('etherchannel.create', {
                device: targetDevice,
                groupId,
                interfaces,
                commands,
                dryRun: true,
              });
            }

            await ctx.controller.configIos(targetDevice, commands);

            return createSuccessResult('etherchannel.create', {
              device: targetDevice,
              groupId,
              interfaces,
              commandsGenerated: commands.length,
            }, {
              advice: [`Usa pt etherchannel list ${targetDevice} para verificar`],
            });
          } catch (error) {
            return createErrorResult('etherchannel.create', {
              message: error instanceof Error ? error.message : String(error),
            }) as CliResult<EtherchannelResult>;
          }
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) {
        console.log(output);
      }

      if (result.ok && !options.dryRun) {
        console.log(chalk.green('✅ EtherChannel configurado'));
      } else if (result.ok && options.dryRun) {
        console.log('--- Commands (dry-run) ---');
        const cmds = result.data?.commands as string[] | undefined;
        cmds?.forEach(c => console.log(c));
      }

      if (!result.ok) process.exit(1);
    });

  cmd
    .command('remove')
    .description('Remove an EtherChannel bundle')
    .argument('[device]', 'Nombre del dispositivo')
    .option('--group-id <id>', 'Channel group ID (1-64)', '1')
    .option('--dry-run', 'Show commands without applying', false)
    .action(async (deviceName, options) => {
      const globalExamples = process.argv.includes('--examples');
      const globalPlan = process.argv.includes('--plan');

      if (globalExamples) {
        console.log(printExamples(ETHERCHANNEL_META));
        return;
      }

      if (globalPlan) {
        console.log('Plan de ejecución:');
        console.log(`  1. Seleccionar dispositivo: ${deviceName ?? '<interactive>'}`);
        console.log(`  2. Remover EtherChannel Group ${options.groupId}`);
        return;
      }

      const flags: GlobalFlags = {
        json: false,
        jq: null,
        output: 'text',
        verbose: false,
        quiet: false,
        trace: false,
        tracePayload: false,
        traceResult: false,
        traceDir: null,
        traceBundle: false,
        traceBundlePath: null,
        sessionId: null,
        examples: globalExamples,
        schema: false,
        explain: false,
        plan: globalPlan,
        verify: false,
      };

      const result = await runCommand({
        action: 'etherchannel.remove',
        meta: ETHERCHANNEL_META,
        flags,
        payloadPreview: { device: deviceName, groupId: options.groupId },
        execute: async (ctx): Promise<CliResult> => {
          try {
            let targetDevice = deviceName;

            if (!targetDevice) {
              const devices = await ctx.controller.listDevices();
              targetDevice = await select({
                message: 'Selecciona el switch',
                choices: devices.map((d: any) => ({ name: d.name, value: d.name })),
              });
            }

            const groupId = parseInt(options.groupId, 10);
            const commands = [`no interface Port-channel${groupId}`];

            if (options.dryRun) {
              return createSuccessResult('etherchannel.remove', {
                device: targetDevice,
                groupId,
                commands,
                dryRun: true,
              });
            }

            await ctx.controller.configIos(targetDevice, commands);

            return createSuccessResult('etherchannel.remove', {
              device: targetDevice,
              groupId,
            });
          } catch (error) {
            return createErrorResult('etherchannel.remove', {
              message: error instanceof Error ? error.message : String(error),
            });
          }
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) {
        console.log(output);
      }

      if (!result.ok) process.exit(1);
    });

  cmd
    .command('list')
    .description('List EtherChannel bundles')
    .argument('[device]', 'Nombre del dispositivo')
    .action(async (deviceName) => {
      const globalExamples = process.argv.includes('--examples');

      if (globalExamples) {
        console.log(printExamples(ETHERCHANNEL_META));
        return;
      }

      const flags: GlobalFlags = {
        json: false,
        jq: null,
        output: 'text',
        verbose: false,
        quiet: false,
        trace: false,
        tracePayload: false,
        traceResult: false,
        traceDir: null,
        traceBundle: false,
        traceBundlePath: null,
        sessionId: null,
        examples: globalExamples,
        schema: false,
        explain: false,
        plan: false,
        verify: false,
      };

      const result = await runCommand({
        action: 'etherchannel.list',
        meta: ETHERCHANNEL_META,
        flags,
        payloadPreview: { device: deviceName },
        execute: async (ctx): Promise<CliResult> => {
          try {
            let targetDevice = deviceName;

            if (!targetDevice) {
              const devices = await ctx.controller.listDevices();
              targetDevice = await select({
                message: 'Selecciona el switch',
                choices: devices.map((d: any) => ({ name: d.name, value: d.name })),
              });
            }

            const output = await ctx.controller.execIos(targetDevice, 'show etherchannel summary', true);

            return createSuccessResult('etherchannel.list', {
              device: targetDevice,
              output: output.raw,
            });
          } catch (error) {
            return createErrorResult('etherchannel.list', {
              message: error instanceof Error ? error.message : String(error),
            });
          }
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) {
        console.log(output);
      }

      if (!result.ok) process.exit(1);
    });

  return cmd;
}
