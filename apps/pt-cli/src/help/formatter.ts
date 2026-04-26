/**
 * Módulo de formateo de help personalizado
 * Proporciona funciones para formatear la ayuda de comandos con estilo consistente
 */

import chalk from 'chalk';

/**
 * Formatea una sección de ejemplos para el help
 * @param examples - Array de ejemplos con descripción y comando
 */
export function formatExamples(examples: Array<{ description: string; command: string }>): string {
  if (!examples || examples.length === 0) return '';

  const header = chalk.bold.cyan('\nExamples:');
  const lines = examples.map((ex) => {
    const desc = chalk.gray(`  # ${ex.description}`);
    const cmd = chalk.green(`  $ ${ex.command}`);
    return `${desc}\n${cmd}`;
  });

  return `${header}\n${lines.join('\n\n')}`;
}

/**
 * Formatea una sección de comandos relacionados (See also)
 * @param commands - Array de comandos relacionados
 */
export function formatRelatedCommands(commands: Array<{ name: string; description: string }>): string {
  if (!commands || commands.length === 0) return '';

  const header = chalk.bold.cyan('\nSee also:');
  const lines = commands.map((cmd) => {
    const name = chalk.yellow(`  ${cmd.name}`);
    const desc = chalk.gray(` - ${cmd.description}`);
    return `${name}${desc}`;
  });

  return `${header}\n${lines.join('\n')}`;
}

/**
 * Formatea una sección de opciones globales
 */
export function formatGlobalOptions(): string {
  return chalk.bold.cyan('\nGlobal Options:') + chalk.gray(`
  --json              Output in JSON format
  --jq <filter>       Filter JSON output
  --output <format>   Output format: json, table, text
  --verbose           Verbose output
  --quiet             Suppress non-essential output
  -h, --help          Show help`);
}

/**
 * Genera el texto de help completo para un comando
 */
export function generateHelpText(
  commandName: string,
  examples: Array<{ description: string; command: string }>,
  relatedCommands: Array<{ name: string; description: string }>
): string {
  const examplesSection = formatExamples(examples);
  const relatedSection = formatRelatedCommands(relatedCommands);

  let helpText = '';
  if (examplesSection) helpText += examplesSection;
  if (relatedSection) helpText += relatedSection;

  return helpText;
}

/**
 * Colores para diferentes tipos de contenido en help
 */
export const helpColors = {
  header: chalk.bold.cyan,
  command: chalk.yellow,
  option: chalk.cyan,
  description: chalk.gray,
  example: chalk.green,
  related: chalk.yellow,
  error: chalk.red,
  warning: chalk.yellow,
};

/**
 * Formatea un bloque de código/terminal
 */
export function formatCodeBlock(code: string, language: string = 'bash'): string {
  return chalk.gray('```' + language) + '\n' + code + '\n' + chalk.gray('```');
}

/**
 * Formatea una tabla de ayuda simple
 */
export function formatTable(headers: string[], rows: string[][]): string {
  const colWidths = headers.map((h, i) => {
    const maxRowWidth = Math.max(...rows.map((r) => (r[i] || '').length));
    return Math.max(h.length, maxRowWidth);
  });

  const headerRow = headers
    .map((h, i) => h.padEnd(colWidths[i]!))
    .join('  ');
  const separator = colWidths.map((w) => '-'.repeat(w)).join('  ');

  const dataRows = rows.map((row) =>
    row.map((cell, i) => (cell || '').padEnd(colWidths[i]!)).join('  ')
  );

  return [chalk.bold(headerRow), separator, ...dataRows].join('\n');
}
