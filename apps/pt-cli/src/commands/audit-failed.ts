#!/usr/bin/env bun
/**
 * audit-failed - DEPRECADO
 * Usa `pt history list --failed` para ver comandos fallidos.
 */

import { Command } from 'commander';
import chalk from 'chalk';

export function createAuditFailedCommand(): Command {
  return new Command('audit-failed')
    .description('⚠️  DEPRECADO - Usa `pt history list --failed`')
    .addHelpText('before', chalk.yellow('⚠️  audit-failed está deprecado.\n  Usa `pt history list --failed` para ver comandos fallidos.\n\n'))
    .option('--device <device>', 'Filtrar por dispositivo')
    .option('--since <date>', 'Filtrar desde fecha (YYYY-MM-DD)')
    .option('--limit <n>', 'Numero maximo', '50')
    .action((options) => {
      console.log(chalk.yellow('⚠️  audit-failed está deprecado. Usa:'));
      console.log(chalk.cyan('  pt history list --failed'));
      if (options.device) {
        console.log(chalk.cyan(`  pt history list --failed --device ${options.device}`));
      }
      console.log(chalk.gray('\n  Este comando ahora delega a pt history list --failed\n'));
    });
}
