#!/usr/bin/env bun
/**
 * Metadata de comandos para help, examples, yexplain.
 * Define la estructura de información complementaria de cada comando.
 */

/**
 * Ejemplo de uso de un comando.
 */
export interface CommandExample {
  command: string;
  description: string;
  output?: string;
}

/**
 * Metadata completa de un comando.
 */
export interface CommandMeta {
  id: string;
  summary: string;
  longDescription?: string;
  examples: CommandExample[];
  related: string[];
  nextSteps?: string[];
  tags?: string[];
  supportsVerify?: boolean;
  supportsJson?: boolean;
  supportsPlan?: boolean;
  supportsExplain?: boolean;
}

/**
 * Registry de metadata de comandos.
 * indexed por ID del comando.
 */
export interface CommandMetaRegistry {
  [commandId: string]: CommandMeta;
}
