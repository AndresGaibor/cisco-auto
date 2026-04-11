#!/usr/bin/env bun
import { Command } from 'commander';
import chalk from 'chalk';
import { listAuditEntries } from './audit-data.js';

export function createAuditFailedCommand(): Command {
  return new Command('audit-failed')
    .description('Mostrar operaciones fallidas con filtros')
    .option('--device <device>', 'Filtrar por dispositivo')
    .option('--since <date>', 'Filtrar desde fecha (YYYY-MM-DD)')
    .option('--limit <n>', 'Numero maximo', '50')
    .action((options) => {
      const limit = parseInt(options.limit, 10);
      const since = options.since ? new Date(options.since).toISOString() : undefined;
      const entries = listAuditEntries({
        limit,
        device: options.device,
        since,
        failedOnly: true,
      });

      if (entries.length === 0) {
        console.log(chalk.green('No hay operaciones fallidas.'));
        return;
      }

      console.log(chalk.bold(`\n❌ Operaciones fallidas (${entries.length})\n`));
      console.log(chalk.cyan('─'.repeat(100)));
      console.log(
        chalk.yellow('Fecha'.padEnd(22)) +
        chalk.yellow('Dispositivo'.padEnd(15)) +
        chalk.yellow('Comando')
      );
      console.log(chalk.cyan('─'.repeat(100)));

      for (const entry of entries) {
        const date = new Date(entry.timestamp).toLocaleString();
        console.log(
          date.padEnd(22) +
          String(entry.hostname || entry.device_id || '-').padEnd(15) +
          chalk.red(entry.command as string)
        );
        if (entry.output) {
          console.log(chalk.gray('     Error: ' + (entry.output as string).slice(0, 120)));
        }
      }
      console.log(chalk.cyan('─'.repeat(100)) + '\n');
    });
}
