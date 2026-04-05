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
import { STPGenerator, VlanId } from '@cisco-auto/core';

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

interface StpModeSpec {
  mode: 'pvst' | 'rapid-pvst' | 'mst';
}

interface StpRootSpec {
  mode: 'pvst' | 'rapid-pvst' | 'mst';
  vlanConfig: Array<{ vlanId: number; priority?: number }>;
  rootPrimary?: number[];
  rootSecondary?: number[];
}

function generateConfigureCommands(mode: 'pvst' | 'rapid-pvst' | 'mst'): string[] {
  const spec: StpModeSpec = { mode };
  return STPGenerator.generate(spec);
}

function generateSetRootCommands(vlan: number, priority?: number): string[] {
  const spec: StpRootSpec = {
    mode: 'pvst',
    vlanConfig: [],
    rootPrimary: [vlan]
  };
  if (typeof priority === 'number') {
    spec.vlanConfig.push({ vlanId: vlan, priority });
  }
  return STPGenerator.generate(spec);
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
      };

      const result = await runCommand({
        action: 'stp.configure',
        meta: STP_META,
        flags,
        payloadPreview: { device: options.device, mode: options.mode },
        execute: async (ctx): Promise<CliResult> => {
          try {
            if (!['pvst', 'rapid-pvst', 'mst'].includes(options.mode)) {
              return createErrorResult('stp.configure', { message: 'Modo inválido. Use pvst, rapid-pvst o mst' });
            }

            const commands = generateConfigureCommands(options.mode);

            if (options.dryRun) {
              return createSuccessResult('stp.configure', { device: options.device, mode: options.mode, commands, dryRun: true });
            }

            await ctx.controller.start();
            try {
              await ctx.controller.configIos(options.device, commands);
              await ctx.logPhase('verify', { device: options.device });
              return createSuccessResult('stp.configure', { device: options.device, mode: options.mode, commandsGenerated: commands.length });
            } finally {
              await ctx.controller.stop();
            }
          } catch (error) {
            return createErrorResult('stp.configure', { message: error instanceof Error ? error.message : String(error) });
          }
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) console.log(output);
      if (!result.ok) process.exit(1);
    });

  cmd.command('set-root')
    .description('Configurar root bridge para una VLAN')
    .requiredOption('--device <name>', 'Nombre del dispositivo target')
    .requiredOption('--vlan <id>', 'ID de VLAN')
    .option('--priority <value>', 'Priority para la VLAN (múltiplo de 4096)')
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
        console.log(`  1. Configurar como root bridge para VLAN ${options.vlan}`);
        console.log(`  2. Aplicar al dispositivo ${options.device}`);
        return;
      }

      const flags: GlobalFlags = {
        json: false, jq: null, output: 'text', verbose: false, quiet: false,
        trace: false, tracePayload: false, traceResult: false, traceDir: null,
        traceBundle: false, traceBundlePath: null, sessionId: null,
        examples: globalExamples, schema: false, explain: globalExplain, plan: globalPlan, verify: true,
      };

      const result = await runCommand({
        action: 'stp.set-root',
        meta: STP_META,
        flags,
        payloadPreview: { device: options.device, vlan: options.vlan, priority: options.priority },
        execute: async (ctx): Promise<CliResult> => {
          try {
            const vlan = Number(options.vlan);
            const priority = options.priority !== undefined ? Number(options.priority) : undefined;

            if (Number.isNaN(vlan) || vlan < 1 || vlan > 4094) {
              return createErrorResult('stp.set-root', { message: 'VLAN inválida. Debe estar entre 1 y 4094' });
            }

            new VlanId(vlan);
            const commands = generateSetRootCommands(vlan, priority);

            if (options.dryRun) {
              return createSuccessResult('stp.set-root', { device: options.device, vlan, priority, commands, dryRun: true });
            }

            await ctx.controller.start();
            try {
              await ctx.controller.configIos(options.device, commands);
              await ctx.logPhase('verify', { device: options.device });
              return createSuccessResult('stp.set-root', { device: options.device, vlan, priority, commandsGenerated: commands.length });
            } finally {
              await ctx.controller.stop();
            }
          } catch (error) {
            return createErrorResult('stp.set-root', { message: error instanceof Error ? error.message : String(error) });
          }
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) console.log(output);
      if (!result.ok) process.exit(1);
    });

  return cmd;
}
