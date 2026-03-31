/**
 * Help System - Módulo centralizado para help CLI
 */

export { formatExamples, formatRelatedCommands, formatGlobalOptions, generateHelpText, helpColors, formatCodeBlock, formatTable } from './formatter.ts';
export { getExamples, getExamplesForCommand, commandExamples, type CommandExample } from './examples.ts';
export { getRelatedCommands, getRelatedForCommand, relatedCommands, type RelatedCommand } from './related.ts';

/**
 * Agrega help personalizado a un comando de Commander
 */
export function addHelpToCommand(
  command: any,
  commandPath: string,
  examples: any[],
  related: any[]
): void {
  const { formatExamples, formatRelatedCommands } = require('./formatter.ts');

  const examplesText = formatExamples(examples);
  const relatedText = formatRelatedCommands(related);

  if (examplesText || relatedText) {
    command.addHelpText('after', examplesText + relatedText);
  }
}
