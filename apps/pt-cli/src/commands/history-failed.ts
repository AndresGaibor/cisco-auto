#!/usr/bin/env bun
import { Command } from 'commander';
import chalk from 'chalk';

import { listFailedHistoryEntries } from './history-data.js';

export function createHistoryFailedCommand(): Command {
  return new Command('failed')
    .description('Mostrar comandos fallidos')
    .option('--device <device>', 'Filtrar por dispositivo')
    .option('--limit <n>', 'Numero maximo', '50')
    .action((options) => {
      const limit = parseInt(options.limit, 10);
      const results = listFailedHistoryEntries(options.device, limit);

      if (results.length === 0) {
        console.log(chalk.green('No hay comandos fallidos registrados.'));
        return;
      }

      console.log(chalk.bold(`\n❌ Comandos fallidos (${results.length})\n`));
      console.log(chalk.cyan('─'.repeat(90)));
      console.log(
        chalk.yellow('Fecha'.padEnd(22)) +
        chalk.yellow('Dispositivo'.padEnd(15)) +
        chalk.yellow('Comando')
      );
      console.log(chalk.cyan('─'.repeat(90)));

      for (const entry of results) {
        const date = new Date(entry.timestamp).toLocaleString();
        console.log(
          date.padEnd(22) +
          String(entry.hostname || entry.device_id || 'N/A').padEnd(15) +
          chalk.red(entry.command)
        );
        if (entry.output) {
          console.log(chalk.gray('     Output: ' + (entry.output as string).slice(0, 100)));
        }
      }
      console.log(chalk.cyan('─'.repeat(90)) + '\n');
    });
}
