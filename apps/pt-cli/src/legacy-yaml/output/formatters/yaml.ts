#!/usr/bin/env bun
/**
 * Formatter de salida YAML
 * Usa js-yaml para conversión confiable
 */

// @ts-ignore - js-yaml lacks type declarations
import jsYaml from 'js-yaml';
import type { Formatter, FormatOptions } from './types.ts';

/**
 * Convierte datos a formato YAML
 * @param data - Datos a formatear
 * @param options - Opciones de formato
 * @returns String en formato YAML
 */
export function yamlFormatter(data: unknown, options?: Partial<FormatOptions>): string {
  if (data === undefined) {
    return '';
  }
  
  const opts = options ?? {};
  const indent = opts.indent ?? 2;
  
  return jsYaml.dump(data, {
    indent,
    lineWidth: 120,
    noRefs: true,
    sortKeys: false,
  });
}

/**
 * Crea una instancia de formatter YAML
 */
export const yaml: Formatter = {
  name: 'yaml',
  format: (data: unknown) => yamlFormatter(data),
  canHandle: (data: unknown) => {
    try {
      return typeof data === 'object' && data !== null;
    } catch {
      return false;
    }
  },
};