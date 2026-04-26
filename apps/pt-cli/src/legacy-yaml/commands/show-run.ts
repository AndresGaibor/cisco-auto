#!/usr/bin/env bun
/**
 * Comando show-run: DEPRECADO - Usa `pt show run-config <device>`
 * Redirige al nuevo comando show con subcomando run-config.
 */

import { Command } from 'commander';
import chalk from 'chalk';

export function createShowRunCommand(): Command {
  const showRunCmd = new Command('show-run')
    .description('⚠️  DEPRECADO - Usa `pt show run-config <device>`')
    .addHelpText('before', chalk.yellow('⚠️  show-run está deprecado.\n  El nuevo comando es: pt show run-config <device>\n  (forma parte del grupo `pt show` con subcomandos)\n\n'))
    .argument('[device]', 'Nombre del dispositivo')
    .option('--parse', 'Forzar parseo explícito (comportamiento por defecto)')
    .option('--examples', 'Mostrar ejemplos de uso')
    .option('--schema', 'Mostrar schema del resultado')
    .option('--explain', 'Explicar qué hace el comando')
    .option('-j, --json', 'Salida en formato JSON')
    .option('--jq <filter>', 'Filtrar salida JSON')
    .option('-o, --output <format>', 'Formato de salida (json|yaml|table|text)', 'text')
    .action(async (device: string, options: Record<string, unknown>) => {
      console.log(chalk.yellow('⚠️  show-run está deprecado. Usa:'));
      console.log(chalk.cyan(`  pt show run-config ${device ?? '<device>'}`));
      console.log(chalk.gray('\n  Este comando es parte del grupo `pt show` con subcomandos.\n'));
    });

  showRunCmd.addHelpText(
    'after',
    `
Ejemplos (nuevo comando):
  pt show run-config R1
  pt show run-config Router1 --json

Flags de información:
  --examples    Mostrar ejemplos de uso
  --schema      Mostrar schema del resultado
  --explain     Explicar el comando
  --json        Salida en JSON
  --jq <expr>   Filtrar resultado con expresión jq
`
  );

  return showRunCmd;
}
