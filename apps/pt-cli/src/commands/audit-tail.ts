#!/usr/bin/env bun
/**
 * audit-tail - DEPRECADO
 * Usa `pt audit` o `pt history list` para ver últimas operaciones.
 */

import { Command } from 'commander';
import chalk from 'chalk';

export function createAuditTailCommand(): Command {
  return new Command('tail')
    .description('⚠️  DEPRECADO - Usa `pt history list` o `pt audit`')
    .addHelpText('before', chalk.yellow('⚠️  audit tail está deprecado.\n  Usa `pt history list` para ver el historial de comandos.\n\n'))
    .option('--lines <n>', 'Numero de entradas a mostrar', '20')
    .option('--device <device>', 'Filtrar por dispositivo')
    .action((options) => {
      console.log(chalk.yellow('⚠️  audit tail está deprecado. Usa:'));
      console.log(chalk.cyan('  pt history list'));
      console.log(chalk.gray('\n  El historial de comandos se consulta con pt history list\n'));
    });
}
