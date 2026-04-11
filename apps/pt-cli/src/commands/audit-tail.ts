#!/usr/bin/env bun
import { Command } from 'commander';
import chalk from 'chalk';
import { listAuditEntries } from './audit-data.js';

export function createAuditTailCommand(): Command {
  return new Command('tail')
    .description('Mostrar ultimas operaciones del audit log')
    .option('--lines <n>', 'Numero de entradas a mostrar', '20')
    .option('--device <device>', 'Filtrar por dispositivo')
    .action((options) => {
      const lines = parseInt(options.lines, 10);
      const entries = listAuditEntries({ limit: lines, device: options.device });

      if (entries.length === 0) {
        console.log(chalk.yellow('No hay operaciones en el audit log.'));
        return;
      }

      console.log(chalk.bold(`\n📋 Audit Log (ultimas ${lines} entradas)\n`));
      console.log(chalk.cyan('─'.repeat(100)));
      console.log(
        chalk.yellow('Fecha'.padEnd(22)) +
        chalk.yellow('Dispositivo'.padEnd(15)) +
        chalk.yellow('Estado'.padEnd(10)) +
        chalk.yellow('Comando')
      );
      console.log(chalk.cyan('─'.repeat(100)));

      for (const entry of entries) {
        const date = new Date(entry.timestamp).toLocaleString();
        const status = entry.status === 'success'
          ? chalk.green('✓ OK')
          : chalk.red('✗ FAIL');
        console.log(
          date.padEnd(22) +
          String(entry.hostname || entry.device_id || '-').padEnd(15) +
          status.padEnd(10) +
          entry.command
        );
      }
      console.log(chalk.cyan('─'.repeat(100)));
      console.log(chalk.gray(`\nTotal mostrado: ${entries.length}\n`));
    });
}
