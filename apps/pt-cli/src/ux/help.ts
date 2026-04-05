#!/usr/bin/env bun
/**
 * Utilidades de help enriquecido para comandos.
 * Proporciona funcionalidad para --help con información adicional.
 */

import type { Command } from 'commander';
import type { CommandMeta } from '../contracts/command-meta.js';

export function attachCommandHelp(command: Command, meta: CommandMeta): Command {
  return command.option('--explain', 'Explicar qué hace el comando y salir', false);
}

export function buildHelpEpilog(meta: CommandMeta): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('更多信息:');

  if (meta.related && meta.related.length > 0) {
    lines.push(`  Comandos relacionados: ${meta.related.join(', ')}`);
  }

  if (meta.tags && meta.tags.length > 0) {
    lines.push(`  Tags: ${meta.tags.join(', ')}`);
  }

  return lines.join('\n');
}

export function printCommandSchema(meta: CommandMeta): string {
  const schema = {
    id: meta.id,
    summary: meta.summary,
    longDescription: meta.longDescription,
    examples: meta.examples.map((e) => ({
      command: e.command,
      description: e.description,
    })),
    related: meta.related,
    tags: meta.tags,
    supportsVerify: meta.supportsVerify,
    supportsJson: meta.supportsJson,
    supportsPlan: meta.supportsPlan,
    supportsExplain: meta.supportsExplain,
  };

  return JSON.stringify(schema, null, 2);
}

export function printCommandExplain(meta: CommandMeta): string {
  const lines: string[] = [];

  lines.push(`# ${meta.id}`);
  lines.push('');
  lines.push(meta.summary);

  if (meta.longDescription) {
    lines.push('');
    lines.push(meta.longDescription);
  }

  if (meta.examples && meta.examples.length > 0) {
    lines.push('');
    lines.push('## Ejemplos');
    lines.push('');
    for (const example of meta.examples) {
      lines.push(`\`${example.command}\``);
      lines.push(`  ${example.description}`);
      lines.push('');
    }
  }

  if (meta.related && meta.related.length > 0) {
    lines.push('');
    lines.push('## Comandos relacionados');
    lines.push('');
    for (const rel of meta.related) {
      lines.push(`- ${rel}`);
    }
  }

  if (meta.nextSteps && meta.nextSteps.length > 0) {
    lines.push('');
    lines.push('## Siguientes pasos sugeridos');
    lines.push('');
    for (const step of meta.nextSteps) {
      lines.push(`- ${step}`);
    }
  }

  return lines.join('\n');
}

export function shouldShowExplain(flags: Record<string, unknown>): boolean {
  return flags.explain === true;
}

export function shouldShowSchema(flags: Record<string, unknown>): boolean {
  return flags.schema === true;
}

export function getCommandDescription(meta: CommandMeta): string {
  if (meta.longDescription) {
    return `${meta.summary}\n\n${meta.longDescription}`;
  }
  return meta.summary;
}
