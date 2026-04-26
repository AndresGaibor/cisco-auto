#!/usr/bin/env bun
/**
 * Comando show-cdp: DEPRECADO - Usa `pt show cdp`
 * Redirige al comando correspondiente en el grupo `pt show`.
 */

import { Command } from 'commander';
import chalk from 'chalk';

export function createShowCdpCommand(): Command {
  const showCdpCmd = new Command('show-cdp')
    .description('⚠️  DEPRECADO - Usa `pt show cdp <device>`')
    .addHelpText('before', chalk.yellow('⚠️  show-cdp está deprecado.\n  El nuevo comando es: pt show cdp <device>\n  (forma parte del grupo `pt show` con subcomandos)\n\n'))
    .argument('[device]', 'Nombre del dispositivo')
    .option('--save-topology', 'Guardar vecinos CDP en SQLite como topología')
    .option('--examples', 'Mostrar ejemplos de uso')
    .option('--schema', 'Mostrar schema del resultado')
    .option('--explain', 'Explicar qué hace el comando')
    .option('-j, --json', 'Salida en formato JSON')
    .option('--jq <filter>', 'Filtrar salida JSON')
    .option('-o, --output <format>', 'Formato de salida (json|yaml|table|text)', 'text')
    .action(async (device: string, options: Record<string, unknown>) => {
      console.log(chalk.yellow('⚠️  show-cdp está deprecado. Usa:'));
      console.log(chalk.cyan(`  pt show cdp ${device ?? '<device>'}`));
      console.log(chalk.gray('\n  Este comando es parte del grupo `pt show` con subcomandos.\n'));
    });

  showCdpCmd.addHelpText(
    'after',
    `
Ejemplos (nuevo comando):
  pt show cdp R1
  pt show cdp Router1 --json

Flags de información:
  --examples        Mostrar ejemplos de uso
  --schema          Mostrar schema del resultado
  --explain         Explicar el comando
  --json            Salida en JSON
  --jq <expr>       Filtrar resultado con expresión jq
`
  );

  return showCdpCmd;
}
