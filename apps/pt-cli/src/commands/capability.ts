#!/usr/bin/env bun
/**
 * Comando capability - Consultar capacidades de dispositivos
 */

import { Command } from 'commander';
import chalk from 'chalk';

import type { CliResult } from '../contracts/cli-result.js';
import { createSuccessResult, createErrorResult } from '../contracts/cli-result.js';
import type { CommandMeta } from '../contracts/command-meta.js';
import type { GlobalFlags } from '../flags.js';

import { runCommand } from '../application/run-command.js';
import { createCapabilityMatrixService, getAllModels } from '@cisco-auto/pt-control';

export const CAPABILITY_META: CommandMeta = {
  id: 'capability',
  summary: 'Consultar capacidades de dispositivos',
  longDescription: 'Muestra las capacidades de modelos Cisco, operaciones soportadas y superficies de ejecución.',
  examples: [
    { command: 'pt capability list', description: 'Listar todos los modelos' },
    { command: 'pt capability model 2911', description: 'Ver capacidades de 2911' },
    { command: 'pt capability ops 2960', description: 'Ver operaciones de 2960' },
  ],
  status: 'stable',
  requiresPT: false,
};

export function createCapabilityCommand(): Command {
  return new Command('capability')
    .description('Consultar capacidades de dispositivos Cisco')
    .addCommand(
      new Command('list')
        .description('Listar todos los modelos soportados')
        .action(async () => {
          const models = getAllModels();
          
          console.log('\n═══ Modelos Soportados ═══\n');
          for (const model of models) {
            console.log(`  ${chalk.cyan(model.id)} - ${model.name}`);
            console.log(`     Tipo: ${model.type} | Interfaces: ${model.interfaceCount}`);
            console.log('');
          }
        })
    )
    .addCommand(
      new Command('model')
        .description('Ver capacidades de un modelo específico')
        .argument('<model>', 'Modelo (ej: 2911, 2960)')
        .option('-j, --json', 'Salida JSON')
        .action(async (model: string, options) => {
          await runCommand({
            action: 'capability',
            meta: CAPABILITY_META,
            flags: options,
            execute: async (ctx) => {
              const capService = createCapabilityMatrixService();
              const caps = capService.getCapabilities(model);
              
              if (!caps) {
                return createErrorResult('Modelo no encontrado');
              }
              
              return createSuccessResult('capability-model', {
                model,
                surfaces: caps.surfaces,
                operations: Object.entries(caps.operations).map(([op, data]) => ({
                  operation: op,
                  supported: data.supported,
                  surface: data.surface,
                })),
              });
            }
          });
        })
    )
    .addCommand(
      new Command('ops')
        .description('Ver operaciones soportadas por modelo')
        .argument('<model>', 'Modelo')
        .action(async (model: string) => {
          const capService = createCapabilityMatrixService();
          const caps = capService.getCapabilities(model);
          
          if (!caps) {
            console.log(chalk.red(`Modelo ${model} no encontrado`));
            return;
          }
          
          console.log(`\n═══ Operaciones para ${model} ═══\n`);
          for (const [op, data] of Object.entries(caps.operations)) {
            const status = data.supported ? chalk.green('✓') : chalk.red('✗');
            console.log(`  ${status} ${op} (${data.surface})`);
          }
        })
    )
    .addCommand(
      new Command('check')
        .description('Verificar si modelo soporta operación')
        .argument('<model>', 'Modelo')
        .argument('<operation>', 'Operación')
        .action(async (model: string, operation: string) => {
          const capService = createCapabilityMatrixService();
          const canExecute = capService.canExecute(model, operation as any);
          const surface = capService.getRecommendedSurface(model, operation as any);
          
          console.log(`\n═══ Verificación ${model} → ${operation} ═══\n`);
          console.log(`  Soportado: ${canExecute ? chalk.green('Sí') : chalk.red('No')}`);
          console.log(`  Superficie: ${surface || 'N/A'}`);
        })
    );
}