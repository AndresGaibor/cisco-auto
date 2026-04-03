/**
 * Help System - Módulo centralizado para help CLI
 */

export { formatExamples, formatRelatedCommands, formatGlobalOptions, generateHelpText, helpColors, formatCodeBlock, formatTable } from './formatter.ts';
export { getExamples, getExamplesForCommand, commandExamples, type CommandExample } from './examples.ts';
export { getRelatedCommands, getRelatedForCommand, relatedCommands, type RelatedCommand } from './related.ts';

import type { CommandExample } from './examples.ts';
import type { RelatedCommand } from './related.ts';
import { formatExamples, formatRelatedCommands } from './formatter.ts';

/**
 * Interfaz mínima de Commander.Command para agregar texto de ayuda
 */
interface CommanderCommand {
  addHelpText(position: 'beforeAll' | 'before' | 'after' | 'afterAll', text: string): unknown;
}

/**
 * Agrega help personalizado a un comando de Commander
 * @param command - Comando de Commander al que agregar ayuda
 * @param commandPath - Ruta del comando para buscar ejemplos (no usada directamente, legacy)
 * @param examples - Array de ejemplos con descripción y comando
 * @param related - Array de comandos relacionados con nombre y descripción
 */
export function addHelpToCommand(
  command: CommanderCommand,
  commandPath: string,
  examples: CommandExample[],
  related: RelatedCommand[]
): void {
  const examplesText = formatExamples(examples);
  const relatedText = formatRelatedCommands(related);

  if (examplesText || relatedText) {
    command.addHelpText('after', examplesText + relatedText);
  }
}
