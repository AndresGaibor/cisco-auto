#!/usr/bin/env bun
/**
 * history-failed - Alias deprecado para `pt history list --failed`
 * Redirige al nuevo comando history.
 */

import { Command } from 'commander';
import chalk from 'chalk';

export function createHistoryFailedCommand(): Command {
  return new Command('history-failed')
    .description('⚠️  DEPRECADO - Usa `pt history list --failed`')
    .addHelpText('before', chalk.yellow('⚠️  Este comando está deprecado.\n  Usa `pt history list --failed` para ver comandos fallidos.\n\n'))
    .option('--device <device>', 'Filtrar por dispositivo')
    .option('--limit <n>', 'Numero maximo', '50')
    .action((options) => {
      console.log(chalk.yellow('⚠️  history-failed está deprecado. Usa:'));
      console.log(chalk.cyan('  pt history list --failed'));
      if (options.device) {
        console.log(chalk.cyan(`  pt history list --failed --device ${options.device}`));
      }
      console.log(chalk.gray('\n  Este comando ahora delega a pt history list\n'));
    });
}
