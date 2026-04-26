#!/usr/bin/env bun
/**
 * Comando show-route: DEPRECADO - Usa `pt show ip-route <device>`
 * Redirige al nuevo comando show con subcomando ip-route.
 */

import { Command } from 'commander';
import chalk from 'chalk';

export function createShowRouteCommand(): Command {
  const showRouteCmd = new Command('show-route')
    .description('⚠️  DEPRECADO - Usa `pt show ip-route <device>`')
    .addHelpText('before', chalk.yellow('⚠️  show-route está deprecado.\n  El nuevo comando es: pt show ip-route <device>\n  (forma parte del grupo `pt show` con subcomandos)\n\n'))
    .argument('[device]', 'Nombre del dispositivo')
    .option('--examples', 'Mostrar ejemplos de uso')
    .option('--schema', 'Mostrar schema del resultado')
    .option('--explain', 'Explicar qué hace el comando')
    .option('-j, --json', 'Salida en formato JSON')
    .option('--jq <filter>', 'Filtrar salida JSON')
    .option('-o, --output <format>', 'Formato de salida (json|yaml|table|text)', 'text')
    .action(async (device: string, options: Record<string, unknown>) => {
      console.log(chalk.yellow('⚠️  show-route está deprecado. Usa:'));
      console.log(chalk.cyan(`  pt show ip-route ${device ?? '<device>'}`));
      console.log(chalk.gray('\n  Este comando es parte del grupo `pt show` con subcomandos.\n'));
    });

  showRouteCmd.addHelpText(
    'after',
    `
Ejemplos (nuevo comando):
  pt show ip-route R1
  pt show ip-route Router1 --json

Flags de información:
  --examples    Mostrar ejemplos de uso
  --schema      Mostrar schema del resultado
  --explain     Explicar el comando
  --json        Salida en JSON
  --jq <expr>   Filtrar resultado con expresión jq
`
  );

  return showRouteCmd;
}
