#!/usr/bin/env bun
/**
 * Comando show-mac - DEPRECADO - Usa `pt show mac-address-table <device>`
 * Redirige al nuevo comando show con subcomando mac-address-table.
 */

import { Command } from 'commander';
import chalk from 'chalk';

export const SHOW_MAC_META = {
  id: 'show-mac',
  summary: 'DEPRECADO - Usa pt show mac-address-table',
  deprecated: true,
};

export function createShowMacCommand(): Command {
  return new Command('show-mac')
    .description('⚠️  DEPRECADO - Usa `pt show mac-address-table <device>`')
    .addHelpText('before', chalk.yellow('⚠️  show-mac está deprecado.\n  El nuevo comando es: pt show mac-address-table <device>\n  (forma parte del grupo `pt show` con subcomandos)\n\n'))
    .argument('<device>', 'Nombre del switch')
    .option('--vlan <id>', 'Filtrar por VLAN específica')
    .option('--address <mac>', 'Buscar por dirección MAC específica')
    .option('--port <port>', 'Filtrar por puerto específico')
    .option('--examples', 'Mostrar ejemplos de uso')
    .option('--schema', 'Mostrar schema del resultado')
    .option('--explain', 'Explicar qué hace el comando')
    .option('-j, --json', 'Salida en formato JSON')
    .option('-o, --output <format>', 'Formato de salida (json|yaml|table|text)', 'table')
    .action(async (device: string, options: Record<string, unknown>) => {
      console.log(chalk.yellow('⚠️  show-mac está deprecado. Usa:'));
      console.log(chalk.cyan(`  pt show mac-address-table ${device}`));
      console.log(chalk.gray('\n  Este comando es parte del grupo `pt show` con subcomandos.\n'));
    });
}
