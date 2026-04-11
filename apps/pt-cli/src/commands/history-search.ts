#!/usr/bin/env bun
import { Command } from 'commander';
import chalk from 'chalk';

import { searchHistoryEntries } from './history-data.js';

export function createHistorySearchCommand(): Command {
  return new Command('search')
    .description('Buscar en historial de comandos')
    .argument('<query>', 'Texto a buscar')
    .option('--device <device>', 'Filtrar por dispositivo')
    .option('--limit <n>', 'Numero maximo de resultados', '50')
    .action((query, options) => {
      const limit = parseInt(options.limit, 10);
      const results = searchHistoryEntries(query, options.device, limit);

      if (results.length === 0) {
        console.log(chalk.yellow(`No se encontraron comandos con "${query}"`));
        return;
      }

      console.log(chalk.bold(`\n🔍 Resultados para "${query}" (${results.length})\n`));
      console.log(chalk.cyan('─'.repeat(90)));
      console.log(
        chalk.yellow('Fecha'.padEnd(22)) +
        chalk.yellow('Dispositivo'.padEnd(15)) +
        chalk.yellow('Estado'.padEnd(12)) +
        chalk.yellow('Comando')
      );
      console.log(chalk.cyan('─'.repeat(90)));

      for (const entry of results) {
        const date = new Date(entry.timestamp).toLocaleString();
        const status = entry.status === 'success' ? chalk.green('✓ OK') : chalk.red('✗ FAIL');
        console.log(
          date.padEnd(22) +
          String(entry.hostname || entry.device_id || 'N/A').padEnd(15) +
          status.padEnd(12) +
          entry.command
        );
      }
      console.log(chalk.cyan('─'.repeat(90)) + '\n');
    });
}
