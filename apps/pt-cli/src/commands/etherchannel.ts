#!/usr/bin/env bun
/**
 * Comando etherchannel - EtherChannel (Port-Channel) management
 * Migrado al patrón runCommand con kernel plugins
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
import { fetchDeviceList, getIOSCapableDevices } from '../utils/device-utils.js';
import { parseConfigFile, requireDevice } from '../utils/config-parser.js';
import { generateEtherChannelCommands, validateEtherChannelConfig, type EtherChannelConfigInput } from '@cisco-auto/kernel/plugins/switching';

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

interface EtherchannelCreateResult {
  device: string;
  groupId: number;
  interfaces: string[];
  commandsGenerated: number;
}

interface EtherchannelRemoveResult {
  device: string;
  groupId: number;
}

interface EtherchannelListResult {
  device: string;
  output: string;
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
    .option('-i, --interactive', 'Seleccionar el switch de forma interactiva', false)
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
        timeout: null, noTimeout: false,
      };

      const result = await runCommand({
        action: 'etherchannel.create',
        meta: ETHERCHANNEL_META,
        flags,
        payloadPreview: { device: deviceName, groupId: options.groupId, interfaces: options.interfaces },
        execute: async (ctx): Promise<CliResult<EtherchannelCreateResult>> => {
          try {
            let targetDevice = deviceName;

            if (!targetDevice && !options.interactive) {
              return createErrorResult('etherchannel.create', { message: 'Debes pasar --device o usar --interactive' }) as CliResult<EtherchannelCreateResult>;
            }

            if (!targetDevice) {
              await ctx.controller.start();
              try {
                const devices = await fetchDeviceList(ctx.controller);
                const switches = devices.filter((d) =>
                  d.type === 'switch' || d.type === 'switch_layer3' || d.model?.includes('2960') || d.model?.includes('3650')
                );

                if (switches.length === 0) {
                  return createErrorResult('etherchannel.create', { message: 'No hay switches disponibles' }) as CliResult<EtherchannelCreateResult>;
                }

                targetDevice = await select({
                  message: 'Selecciona el switch',
                  choices: switches.map((d) => ({ name: d.name, value: d.name })),
                });
              } finally {
                await ctx.controller.stop();
              }
            }

            if (!options.interfaces) {
              return createErrorResult('etherchannel.create', { message: 'Se requiere --interfaces' }) as CliResult<EtherchannelCreateResult>;
            }

            const interfaces = options.interfaces.split(',').map((s: string) => s.trim());
            const groupId = parseInt(options.groupId, 10);

            if (Number.isNaN(groupId) || groupId < 1 || groupId > 64) {
              return createErrorResult('etherchannel.create', { message: 'Group ID inválido. Debe estar entre 1 y 64' }) as CliResult<EtherchannelCreateResult>;
            }

            const ecConfig: EtherChannelConfigInput = {
              groupId,
              mode: options.mode as 'active' | 'passive' | 'on' | 'desirable' | 'auto',
              interfaces,
              portChannel: `Port-channel${groupId}`,
              trunkMode: options.trunk ? 'trunk' : 'access',
              nativeVlan: options.nativeVlan ? parseInt(options.nativeVlan, 10) : undefined,
              allowedVlans: options.allowedVlans === 'all' ? 'all' : options.allowedVlans ? options.allowedVlans.split(',').map((v: string) => parseInt(v.trim(), 10)) : undefined,
              description: options.description,
            };

            const validation = validateEtherChannelConfig(ecConfig);
            if (!validation.ok) {
              return createErrorResult('etherchannel.create', { message: validation.errors.map((e) => e.message).join(', ') }) as CliResult<EtherchannelCreateResult>;
            }

            const commands = generateEtherChannelCommands(ecConfig);

            if (options.dryRun) {
              return createSuccessResult('etherchannel.create', {
                device: targetDevice,
                groupId,
                interfaces,
                commandsGenerated: commands.length,
              }, {
                advice: ['Usa --apply para ejecutar los comandos en el dispositivo'],
              }) as CliResult<EtherchannelCreateResult>;
            }

            await ctx.controller.start();
            try {
              const devices = await fetchDeviceList(ctx.controller);
              const iosDevices = getIOSCapableDevices(devices);
              const selected = iosDevices.find((d) => d.name === targetDevice);
              if (!selected) {
                return createErrorResult('etherchannel.create', { message: `Dispositivo "${targetDevice}" no encontrado` }) as CliResult<EtherchannelCreateResult>;
              }

              await ctx.controller.configIosWithResult(targetDevice, commands, { save: true });
              return createSuccessResult('etherchannel.create', {
                device: targetDevice,
                groupId,
                interfaces,
                commandsGenerated: commands.length,
              }, {
                advice: [`Usa pt etherchannel list ${targetDevice} para verificar`],
              });
            } finally {
              await ctx.controller.stop();
            }
          } catch (error) {
            return createErrorResult('etherchannel.create', {
              message: error instanceof Error ? error.message : String(error),
            }) as CliResult<EtherchannelCreateResult>;
          }
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) {
        console.log(output);
      }

      if (result.ok && options.dryRun) {
        console.log(chalk.green('✅ EtherChannel configurado (dry-run)'));
        console.log('--- Commands (dry-run) ---');
      } else if (result.ok && !options.dryRun) {
        console.log(chalk.green('✅ EtherChannel configurado'));
      }

      if (!result.ok) process.exit(1);
    });

  cmd
    .command('remove')
    .description('Remove an EtherChannel bundle')
    .argument('[device]', 'Nombre del dispositivo')
    .option('-i, --interactive', 'Seleccionar el switch de forma interactiva', false)
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
        timeout: null, noTimeout: false,
      };

      const result = await runCommand({
        action: 'etherchannel.remove',
        meta: ETHERCHANNEL_META,
        flags,
        payloadPreview: { device: deviceName, groupId: options.groupId },
        execute: async (ctx): Promise<CliResult<EtherchannelRemoveResult>> => {
          try {
            let targetDevice = deviceName;

            if (!targetDevice && !options.interactive) {
              return createErrorResult('etherchannel.remove', { message: 'Debes pasar --device o usar --interactive' }) as CliResult<EtherchannelRemoveResult>;
            }

            if (!targetDevice) {
              await ctx.controller.start();
              try {
                const devices = await fetchDeviceList(ctx.controller);
                const switches = devices.filter((d) =>
                  d.type === 'switch' || d.type === 'switch_layer3' || d.model?.includes('2960') || d.model?.includes('3650')
                );

                if (switches.length === 0) {
                  return createErrorResult('etherchannel.remove', { message: 'No hay switches disponibles' }) as CliResult<EtherchannelRemoveResult>;
                }

                targetDevice = await select({
                  message: 'Selecciona el switch',
                  choices: switches.map((d) => ({ name: d.name, value: d.name })),
                });
              } finally {
                await ctx.controller.stop();
              }
            }

            const groupId = parseInt(options.groupId, 10);
            const commands = [`no interface Port-channel${groupId}`];

            if (options.dryRun) {
              return createSuccessResult('etherchannel.remove', {
                device: targetDevice,
                groupId,
              }, {
                advice: ['Comandos para remover el EtherChannel:', ...commands],
              }) as CliResult<EtherchannelRemoveResult>;
            }

            await ctx.controller.start();
            try {
              const devices = await fetchDeviceList(ctx.controller);
              const iosDevices = getIOSCapableDevices(devices);
              const selected = iosDevices.find((d) => d.name === targetDevice);
              if (!selected) {
                return createErrorResult('etherchannel.remove', { message: `Dispositivo "${targetDevice}" no encontrado` }) as CliResult<EtherchannelRemoveResult>;
              }

              await ctx.controller.configIosWithResult(targetDevice, commands, { save: true });
              return createSuccessResult('etherchannel.remove', {
                device: targetDevice,
                groupId,
              });
            } finally {
              await ctx.controller.stop();
            }
          } catch (error) {
            return createErrorResult('etherchannel.remove', {
              message: error instanceof Error ? error.message : String(error),
            }) as CliResult<EtherchannelRemoveResult>;
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
    .option('-i, --interactive', 'Seleccionar el switch de forma interactiva', false)
    .action(async (deviceName, options) => {
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
        timeout: null, noTimeout: false,
      };

      const result = await runCommand({
        action: 'etherchannel.list',
        meta: ETHERCHANNEL_META,
        flags,
        payloadPreview: { device: deviceName },
        execute: async (ctx): Promise<CliResult<EtherchannelListResult>> => {
          try {
            let targetDevice = deviceName;

            if (!targetDevice && !options.interactive) {
              return createErrorResult('etherchannel.list', { message: 'Debes pasar --device o usar --interactive' }) as CliResult<EtherchannelListResult>;
            }

            if (!targetDevice) {
              await ctx.controller.start();
              try {
                const devices = await fetchDeviceList(ctx.controller);
                const switches = devices.filter((d) =>
                  d.type === 'switch' || d.type === 'switch_layer3' || d.model?.includes('2960') || d.model?.includes('3650')
                );

                if (switches.length === 0) {
                  return createErrorResult('etherchannel.list', { message: 'No hay switches disponibles' }) as CliResult<EtherchannelListResult>;
                }

                targetDevice = await select({
                  message: 'Selecciona el switch',
                  choices: switches.map((d) => ({ name: d.name, value: d.name })),
                });
              } finally {
                await ctx.controller.stop();
              }
            }

            await ctx.controller.start();
            try {
              const output = await ctx.controller.execIos(targetDevice, 'show etherchannel summary', true);
              return createSuccessResult('etherchannel.list', {
                device: targetDevice,
                output: output.raw,
              });
            } finally {
              await ctx.controller.stop();
            }
          } catch (error) {
            return createErrorResult('etherchannel.list', {
              message: error instanceof Error ? error.message : String(error),
            }) as CliResult<EtherchannelListResult>;
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
