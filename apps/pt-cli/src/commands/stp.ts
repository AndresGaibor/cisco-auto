#!/usr/bin/env bun
/**
 * Comando stp - Spanning Tree Protocol
 * Migrado al patrón runCommand con CliResult
 */

import { Command } from 'commander';
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
import { generateStpCommands, validateStpConfig, type StpConfigInput } from '@cisco-auto/kernel/plugins/switching';

const STP_EXAMPLES = [
  { command: 'pt stp configure --device Switch1 --mode rapid-pvst', description: 'Configurar modo STP' },
  { command: 'pt stp set-root --device Switch1 --vlan 1', description: 'Configurar como root bridge' },
  { command: 'pt stp configure --device Switch1 --mode pvst --dry-run', description: 'Ver comandos sin aplicar' },
];

const STP_META: CommandMeta = {
  id: 'stp',
  summary: 'Configurar Spanning Tree Protocol (STP)',
  longDescription: 'Comandos para configurar STP en switches Cisco: modo STP y root bridge.',
  examples: STP_EXAMPLES,
  related: ['vlan', 'config-ios', 'etherchannel'],
  supportsVerify: true,
  supportsJson: true,
  supportsPlan: true,
  supportsExplain: true,
};

interface StpApplyResult {
  device: string;
  mode: string;
  commands?: string[];
  commandsGenerated: number;
}

interface StpRootResult {
  device: string;
  vlan: number;
  priority?: number;
  commands?: string[];
  commandsGenerated: number;
}

function buildStpConfig(options: { mode: string; vlan?: number; priority?: number; rootPrimary?: number[]; rootSecondary?: number[] }): StpConfigInput {
  const config: StpConfigInput = { mode: options.mode as 'pvst' | 'rapid-pvst' | 'mst' };

  if (options.vlan !== undefined) {
    const vlanEntry = { vlanId: options.vlan, priority: options.priority };
    config.vlanConfig = [vlanEntry];
  }

  if (options.rootPrimary && options.rootPrimary.length > 0) {
    config.rootPrimary = options.rootPrimary;
  }

  if (options.rootSecondary && options.rootSecondary.length > 0) {
    config.rootSecondary = options.rootSecondary;
  }

  return config;
}

export function createStpCommand(): Command {
  const cmd = new Command('stp')
    .description('Comandos para configurar Spanning Tree Protocol (STP)')
    .option('--examples', 'Mostrar ejemplos de uso', false)
    .option('--explain', 'Explicar qué hace el comando', false)
    .option('--plan', 'Mostrar plan de ejecución sin ejecutar', false);

  cmd.command('configure')
    .description('Configurar modo STP en un dispositivo')
    .requiredOption('--device <name>', 'Nombre del dispositivo target')
    .requiredOption('--mode <mode>', 'Modo STP (pvst|rapid-pvst|mst)')
    .option('--dry-run', 'Imprimir comandos en lugar de enviarlos', false)
    .option('--examples', 'Mostrar ejemplos', false)
    .option('--explain', 'Explicar', false)
    .option('--plan', 'Mostrar plan', false)
    .action(async (options) => {
      const globalExamples = process.argv.includes('--examples');
      const globalExplain = process.argv.includes('--explain');
      const globalPlan = process.argv.includes('--plan');

      if (globalExamples) {
        console.log(printExamples(STP_META));
        return;
      }

      if (globalExplain) {
        console.log(STP_META.longDescription ?? STP_META.summary);
        return;
      }

      if (globalPlan) {
        console.log('Plan de ejecución:');
        console.log(`  1. Configurar modo STP: ${options.mode}`);
        console.log(`  2. Aplicar al dispositivo ${options.device}`);
        return;
      }

      const flags: GlobalFlags = {
        json: false, jq: null, output: 'text', verbose: false, quiet: false,
        trace: false, tracePayload: false, traceResult: false, traceDir: null,
        traceBundle: false, traceBundlePath: null, sessionId: null,
        examples: globalExamples, schema: false, explain: globalExplain, plan: globalPlan, verify: true,
        timeout: null, noTimeout: false,
      };

      const result = await runCommand({
        action: 'stp.configure',
        meta: STP_META,
        flags,
        payloadPreview: { device: options.device, mode: options.mode },
        execute: async (ctx): Promise<CliResult<StpApplyResult>> => {
          try {
            if (!['pvst', 'rapid-pvst', 'mst'].includes(options.mode)) {
              return createErrorResult('stp.configure', { message: 'Modo inválido. Use pvst, rapid-pvst o mst' }) as CliResult<StpApplyResult>;
            }

            const stpConfig: StpConfigInput = { mode: options.mode };
            const validation = validateStpConfig(stpConfig);
            if (!validation.ok) {
              return createErrorResult('stp.configure', { message: validation.errors.map((e) => e.message).join(', ') }) as CliResult<StpApplyResult>;
            }

            const commands = generateStpCommands(stpConfig);

            if (options.dryRun) {
              return createSuccessResult('stp.configure', { device: options.device, mode: options.mode, commands, commandsGenerated: commands.length });
            }

            await ctx.controller.start();
            try {
              const devices = await fetchDeviceList(ctx.controller);
              const iosDevices = getIOSCapableDevices(devices);
              const selected = iosDevices.find((d) => d.name === options.device);
              if (!selected) {
                return createErrorResult('stp.configure', { message: `Dispositivo "${options.device}" no encontrado` }) as CliResult<StpApplyResult>;
              }

              await ctx.controller.configIosWithResult(options.device, commands, { save: true });
              return createSuccessResult('stp.configure', { device: options.device, mode: options.mode, commandsGenerated: commands.length }, {
                advice: [`Usa pt show spanning-tree summary ${options.device} para verificar`],
              });
            } finally {
              await ctx.controller.stop();
            }
          } catch (error) {
            return createErrorResult('stp.configure', { message: error instanceof Error ? error.message : String(error) }) as CliResult<StpApplyResult>;
          }
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) console.log(output);

      if (result.ok && options.dryRun) {
        console.log(chalk.cyan('\n[DRY-RUN] Comandos STP para ' + chalk.bold(options.device) + ':\n'));
        const cmds = result.data?.commands as string[] | undefined;
        cmds?.forEach((c, i) => console.log(`  ${i + 1}. ${chalk.green(c)}`));
        console.log();
      }

      if (!result.ok) process.exit(1);
    });

  cmd.command('set-root')
    .description('Configurar root bridge para una o más VLANs')
    .requiredOption('--device <name>', 'Nombre del dispositivo target')
    .option('--vlan <id>', 'ID de VLAN (puede ser múltiples separadas por coma)')
    .option('--priority <value>', 'Prioridad para la VLAN (múltiplo de 4096)')
    .option('--root-primary', 'Configurar como root primary', false)
    .option('--root-secondary', 'Configurar como root secondary', false)
    .option('--file <path>', 'Archivo de configuración YAML/JSON')
    .option('--dry-run', 'Imprimir comandos en lugar de enviarlos', false)
    .option('--examples', 'Mostrar ejemplos', false)
    .option('--explain', 'Explicar', false)
    .option('--plan', 'Mostrar plan', false)
    .action(async (options) => {
      const globalExamples = process.argv.includes('--examples');
      const globalExplain = process.argv.includes('--explain');
      const globalPlan = process.argv.includes('--plan');

      if (globalExamples) {
        console.log(printExamples(STP_META));
        return;
      }

      if (globalPlan) {
        console.log('Plan de ejecución:');
        if (options.file) {
          console.log(`  1. Cargar configuración desde ${options.file}`);
        } else if (options.vlan) {
          console.log(`  1. Configurar root bridge para VLAN ${options.vlan}`);
        } else {
          console.log('  1. Configurar root bridge desde archivo');
        }
        console.log(`  2. Aplicar al dispositivo ${options.device}`);
        return;
      }

      const flags: GlobalFlags = {
        json: false, jq: null, output: 'text', verbose: false, quiet: false,
        trace: false, tracePayload: false, traceResult: false, traceDir: null,
        traceBundle: false, traceBundlePath: null, sessionId: null,
        examples: globalExamples, schema: false, explain: globalExplain, plan: globalPlan, verify: true,
        timeout: null, noTimeout: false,
      };

      let device = options.device;
      let vlanId = options.vlan;
      let priority = options.priority;
      let rootPrimary = options.rootPrimary;
      let rootSecondary = options.rootSecondary;

      if (options.file) {
        const result = parseConfigFile(options.file);
        if (!result.success) { console.error(chalk.red('Error: ' + result.error)); process.exit(1); }
        const data = result.data as Record<string, unknown>;
        if (!device) device = requireDevice(data);
        if (!vlanId && data.vlan) vlanId = String(data.vlan);
        if (!priority && data.priority) priority = String(data.priority);
        if (!rootPrimary && data.rootPrimary) rootPrimary = true;
        if (!rootSecondary && data.rootSecondary) rootSecondary = true;
      }

      if (!device) { console.error(chalk.red('Error: --device requerido')); process.exit(1); }
      if (!vlanId) { console.error(chalk.red('Error: --vlan requerido')); process.exit(1); }

      const result = await runCommand({
        action: 'stp.set-root',
        meta: STP_META,
        flags,
        payloadPreview: { device: options.device, vlan: options.vlan, priority: options.priority },
        execute: async (ctx): Promise<CliResult<StpRootResult>> => {
          try {
            const vlan = Number(vlanId);
            const prio = priority !== undefined ? Number(priority) : undefined;

            if (Number.isNaN(vlan) || vlan < 1 || vlan > 4094) {
              return createErrorResult('stp.set-root', { message: 'VLAN inválida. Debe estar entre 1 y 4094' }) as CliResult<StpRootResult>;
            }

            if (prio !== undefined && (Number.isNaN(prio) || prio < 0 || prio > 61440 || prio % 4096 !== 0)) {
              return createErrorResult('stp.set-root', { message: 'Prioridad inválida. Debe ser múltiplo de 4096 entre 0 y 61440' }) as CliResult<StpRootResult>;
            }

            const vlanIds = vlanId.split(',').map((v: string) => Number(v.trim())).filter((v: number) => !Number.isNaN(v) && v >= 1 && v <= 4094);

            const stpConfig: StpConfigInput = {
              mode: 'pvst',
              vlanConfig: vlanIds.map((vid: number) => ({
                vlanId: vid,
                priority: prio,
                rootPrimary: rootPrimary || undefined,
                rootSecondary: rootSecondary || undefined,
              })),
            };

            const validation = validateStpConfig(stpConfig);
            if (!validation.ok) {
              return createErrorResult('stp.set-root', { message: validation.errors.map((e) => e.message).join(', ') }) as CliResult<StpRootResult>;
            }

            const commands = generateStpCommands(stpConfig);

            if (options.dryRun) {
              return createSuccessResult('stp.set-root', { device, vlan, priority: prio, commands, commandsGenerated: commands.length }) as CliResult<StpRootResult>;
            }

            await ctx.controller.start();
            try {
              const devices = await fetchDeviceList(ctx.controller);
              const iosDevices = getIOSCapableDevices(devices);
              const selected = iosDevices.find((d) => d.name === device);
              if (!selected) {
                return createErrorResult('stp.set-root', { message: `Dispositivo "${device}" no encontrado` }) as CliResult<StpRootResult>;
              }

              await ctx.controller.configIosWithResult(device, commands, { save: true });
              return createSuccessResult('stp.set-root', { device, vlan, priority: prio, commandsGenerated: commands.length }, {
                advice: [`Usa pt show spanning-tree vlan ${vlan} ${device} para verificar`],
              });
            } finally {
              await ctx.controller.stop();
            }
          } catch (error) {
            return createErrorResult('stp.set-root', { message: error instanceof Error ? error.message : String(error) }) as CliResult<StpRootResult>;
          }
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) console.log(output);

      if (result.ok && options.dryRun) {
        console.log(chalk.cyan('\n[DRY-RUN] Comandos STP root para ' + chalk.bold(device) + ':\n'));
        const cmds = result.data?.commands as string[] | undefined;
        cmds?.forEach((c, i) => console.log(`  ${i + 1}. ${chalk.green(c)}`));
        console.log();
      }

      if (!result.ok) process.exit(1);
    });

  return cmd;
}
