#!/usr/bin/env bun
/**
 * Utilidades para mostrar ejemplos de comandos.
 * Proporciona funcionalidad para --examples y formateo de ejemplos.
 */

import type { Command } from 'commander';
import type { CommandMeta, CommandExample } from '../contracts/command-meta.js';

export function attachExamplesOption(command: Command, meta: CommandMeta): Command {
  return command.option('--examples', 'Mostrar ejemplos de uso y salir', false);
}

export function printExamples(meta: CommandMeta): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('Ejemplos de uso:');
  lines.push('');

  for (const example of meta.examples) {
    lines.push(`  $ ${example.command}`);
    lines.push(`    ${example.description}`);

    if (example.output) {
      lines.push(`    Output:`);
      for (const outputLine of example.output.split('\n')) {
        lines.push(`      ${outputLine}`);
      }
    }

    lines.push('');
  }

  return lines.join('\n');
}

export function shouldShowExamples(flags: Record<string, unknown>): boolean {
  return flags.examples === true;
}

export function formatExampleForTerminal(example: CommandExample): string {
  const lines: string[] = [];

  lines.push(`  $ ${example.command}`);
  lines.push(`    ${example.description}`);

  if (example.output) {
    lines.push(`    Output:`);
    for (const outputLine of example.output.split('\n')) {
      lines.push(`      ${outputLine}`);
    }
  }

  return lines.join('\n');
}

export function examplesToArray(meta: CommandMeta): string[] {
  return meta.examples.map((example) => {
    let result = `$ ${example.command}`;
    if (example.description) {
      result += `\n  ${example.description}`;
    }
    if (example.output) {
      result += `\n  Output: ${example.output}`;
    }
    return result;
  });
}
