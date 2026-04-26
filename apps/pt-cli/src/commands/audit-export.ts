#!/usr/bin/env bun
/**
 * audit-export - DEPRECADO
 * Usa `pt history list --json` y redirige a un archivo.
 */

import { Command } from 'commander';
import chalk from 'chalk';

export function createAuditExportCommand(): Command {
  return new Command('export')
    .description('⚠️  DEPRECADO - Usa `pt history list --json > file.json`')
    .addHelpText('before', chalk.yellow('⚠️  audit export está deprecado.\n  Usa `pt history list --json` y redirige a un archivo:\n  pt history list --json > history.json\n\n'))
    .option('--format <format>', 'Formato: json, csv, markdown', 'json')
    .option('--output <path>', 'Archivo de salida', 'audit-export.json')
    .option('--device <device>', 'Filtrar por dispositivo')
    .option('--since <date>', 'Filtrar desde fecha (YYYY-MM-DD)')
    .action((options) => {
      console.log(chalk.yellow('⚠️  audit export está deprecado. Usa:'));
      console.log(chalk.cyan('  pt history list --json > archivo.json'));
      console.log(chalk.gray('\n  Para exportar el historial de comandos a JSON.\n'));
    });
}
