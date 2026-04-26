#!/usr/bin/env bun
/**
 * history-search - Alias deprecado para `pt history list --search`
 * Redirige al nuevo comando history con filtro de búsqueda.
 */

import { Command } from 'commander';
import chalk from 'chalk';

export function createHistorySearchCommand(): Command {
  return new Command('history-search')
    .description('⚠️  DEPRECADO - Usa `pt history list` con --action')
    .addHelpText('before', chalk.yellow('⚠️  Este comando está deprecado.\n  Usa `pt history list --action <query>` para buscar en el historial.\n\n'))
    .argument('<query>', 'Texto a buscar')
    .option('--device <device>', 'Filtrar por dispositivo')
    .option('--limit <n>', 'Numero maximo de resultados', '50')
    .action((query, options) => {
      console.log(chalk.yellow('⚠️  history-search está deprecado. Usa:'));
      console.log(chalk.cyan(`  pt history list --action "${query}"`));
      if (options.device) {
        console.log(chalk.cyan(`  pt history list --action "${query}" --device ${options.device}`));
      }
      console.log(chalk.gray('\n  Este comando ahora delega a pt history list\n'));
    });
}
