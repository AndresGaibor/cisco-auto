#!/usr/bin/env bun
/**
 * Comando show-vlan: DEPRECADO - Usa `pt show vlan <device>`
 * Redirige al nuevo comando show con subcomando vlan.
 */

import { Command } from 'commander';
import chalk from 'chalk';

export function createShowVlanCommand(): Command {
  const showVlanCmd = new Command('show-vlan')
    .description('⚠️  DEPRECADO - Usa `pt show vlan <device>`')
    .addHelpText('before', chalk.yellow('⚠️  show-vlan está deprecado.\n  El nuevo comando es: pt show vlan <device>\n  (forma parte del grupo `pt show` con subcomandos)\n\n'))
    .argument('[device]', 'Nombre del dispositivo switch')
    .option('--examples', 'Mostrar ejemplos de uso')
    .option('--schema', 'Mostrar schema del resultado')
    .option('--explain', 'Explicar qué hace el comando')
    .option('-j, --json', 'Salida en formato JSON')
    .option('--jq <filter>', 'Filtrar salida JSON')
    .option('-o, --output <format>', 'Formato de salida (json|yaml|table|text)', 'text')
    .action(async (device: string, options: Record<string, unknown>) => {
      console.log(chalk.yellow('⚠️  show-vlan está deprecado. Usa:'));
      console.log(chalk.cyan(`  pt show vlan ${device ?? '<device>'}`));
      console.log(chalk.gray('\n  Este comando es parte del grupo `pt show` con subcomandos.\n'));
    });

  showVlanCmd.addHelpText(
    'after',
    `
Ejemplos (nuevo comando):
  pt show vlan Switch1
  pt show vlan S1 --json

Flags de información:
  --examples    Mostrar ejemplos de uso
  --schema      Mostrar schema del resultado
  --explain     Explicar el comando
  --json        Salida en JSON
  --jq <expr>   Filtrar resultado con expresión jq
`
  );

  return showVlanCmd;
}
