#!/usr/bin/env bun
/**
 * Comando audit query - DEPRECADO
 * Usa `pt audit` (lab/audit) que es el comando nuevo unificado.
 */

import { Command } from 'commander';
import chalk from 'chalk';

export function createAuditQueryCommand(): Command {
  const cmd = new Command('query');
  cmd
    .description('⚠️  DEPRECADO - Usa `pt audit` (comando nuevo)')
    .addHelpText('before', chalk.yellow('⚠️  audit query está deprecado.\n  El nuevo comando es `pt audit` (lab/audit) que unifica toda la auditoría.\n\n'))
    .option('-l, --limit <num>', 'Número máximo de entradas', '20')
    .option('--session <id>', 'Filtrar por sesión')
    .option('--device <device>', 'Filtrar por dispositivo')
    .option('--status <status>', 'Filtrar por estado: success, failed, rolled_back')
    .option('--json', 'Salida en JSON', false)
    .action(async (options) => {
      console.log(chalk.yellow('⚠️  audit query está deprecado. Usa:'));
      console.log(chalk.cyan('  pt audit'));
      console.log(chalk.gray('\n  El comando `pt audit` (lab/audit) unifica toda la auditoría.\n'));
    });

  return cmd;
}
