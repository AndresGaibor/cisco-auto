#!/usr/bin/env bun
/**
 * Comando ledger - Evidence Ledger para trazabilidad
 */

import { Command } from 'commander';
import chalk from 'chalk';

import type { CliResult } from '../contracts/cli-result.js';
import { createSuccessResult, createErrorResult } from '../contracts/cli-result.js';
import type { CommandMeta } from '../contracts/command-meta.js';
import type { GlobalFlags } from '../flags.js';

import { runCommand } from '../application/run-command.js';
import { createEvidenceLedgerService } from '@cisco-auto/pt-control';

export const LEDGER_META: CommandMeta = {
  id: 'ledger',
  summary: 'Trazabilidad de operaciones',
  longDescription: 'Registro y consulta de operaciones ejecutadas con verificación y resultados.',
  examples: [
    { command: 'pt ledger list', description: 'Listar operaciones recientes' },
    { command: 'pt ledger show <id>', description: 'Ver detalles de operación' },
    { command: 'pt ledger device R1', description: 'Operaciones por dispositivo' },
  ],
  status: 'experimental',
  requiresPT: false,
};

export function createLedgerCommand(): Command {
  return new Command('ledger')
    .description('Trazabilidad de operaciones')
    .addCommand(
      new Command('list')
        .description('Listar operaciones recientes')
        .option('-l, --limit <n>', 'Límite de resultados', '20')
        .option('-r, --result <success|partial|failed>', 'Filtrar por resultado')
        .option('-j, --json', 'Salida JSON')
        .action(async (options) => {
          const ledger = createEvidenceLedgerService();
          const limit = parseInt(options.limit);
          const resultFilter = options.result;
          
          const ops = ledger.query({ 
            limit, 
            result: resultFilter as any 
          });
          
          if (ops.length === 0) {
            console.log(chalk.yellow('  No hay operaciones registradas'));
            return;
          }
          
          console.log('\n═══ Operaciones Recientes ═══\n');
          for (const op of ops) {
            const statusIcon = op.result === 'success' ? chalk.green('✓') 
              : op.result === 'partial' ? chalk.yellow('◐') 
              : chalk.red('✗');
            console.log(`  ${statusIcon} ${op.id}`);
            console.log(`    Dispositivo: ${op.device} | Intención: ${op.intent}`);
            console.log(`    Comandos: ${op.commands.length} | Tiempo: ${op.durationMs || 'N/A'}ms`);
            console.log('');
          }
        })
    )
    .addCommand(
      new Command('show')
        .description('Mostrar detalles de una operación')
        .argument('<operation-id>', 'ID de operación')
        .option('-j, --json', 'Salida JSON')
        .action(async (opId: string, options) => {
          const ledger = createEvidenceLedgerService();
          
          if (options.json) {
            const op = ledger.get(opId);
            console.log(JSON.stringify(op, null, 2));
            return;
          }
          
          console.log(ledger.explain(opId));
        })
    )
    .addCommand(
      new Command('device')
        .description('Ver operaciones de un dispositivo')
        .argument('<device>', 'Nombre del dispositivo')
        .option('-l, --limit <n>', 'Límite', '10')
        .action(async (device: string, options) => {
          const ledger = createEvidenceLedgerService();
          const ops = ledger.getByDevice(device);
          
          console.log(`\n═══ Operaciones en ${device} ═══\n`);
          for (const op of ops.slice(0, parseInt(options.limit))) {
            const statusIcon = op.result === 'success' ? chalk.green('✓') 
              : op.result === 'partial' ? chalk.yellow('◐') 
              : chalk.red('✗');
            console.log(`  ${statusIcon} ${op.id} - ${op.intent}`);
            console.log(`    Comandos: ${op.commands.join(' | ')}`);
            if (op.error) {
              console.log(`    ${chalk.red('Error:')} ${op.error}`);
            }
            console.log('');
          }
        })
    )
    .addCommand(
      new Command('stats')
        .description('Ver estadísticas del ledger')
        .action(async () => {
          const ledger = createEvidenceLedgerService();
          const stats = ledger.getStats();
          
          console.log('\n═══ Estadísticas del Ledger ═══\n');
          console.log(`  Total de operaciones: ${stats.totalOperations}`);
          console.log(`  Exitosas: ${chalk.green(stats.successCount)}`);
          console.log(`  Parciales: ${chalk.yellow(stats.partialCount)}`);
          console.log(`  Fallidas: ${chalk.red(stats.failedCount)}`);
          console.log(`  Dispositivos: ${stats.devices.join(', ')}`);
          console.log(`  Duración promedio: ${stats.avgDurationMs}ms`);
        })
    )
    .addCommand(
      new Command('query')
        .description('Query avanzado de operaciones')
        .option('-d, --device <device>', 'Filtrar por dispositivo')
        .option('-r, --result <type>', 'Filtrar por resultado')
        .option('-s, --since <date>', 'Desde fecha')
        .option('-l, --limit <n>', 'Límite', '20')
        .option('-j, --json', 'Salida JSON')
        .action(async (options) => {
          const ledger = createEvidenceLedgerService();
          
          const ops = ledger.query({
            device: options.device,
            result: options.result as any,
            limit: parseInt(options.limit),
          });
          
          console.log(`\n═══ Resultados (${ops.length}) ═══\n`);
          for (const op of ops) {
            console.log(`  ${op.id}: ${op.intent} [${op.result}]`);
          }
        })
    );
}