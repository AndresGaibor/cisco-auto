#!/usr/bin/env bun
/**
 * Formatter de salida en formato tabla
 * Usa chalk para colores y formato visual
 */

import chalk from 'chalk';
import type { Formatter, FormatOptions } from './types.ts';

/**
 * Convierte datos a formato tabla
 * @param data - Datos a formatear (array de objetos)
 * @param options - Opciones de formato
 * @returns String en formato tabla
 */
export function tableFormatter(data: unknown, options?: Partial<FormatOptions>): string {
  if (!Array.isArray(data) || data.length === 0) {
    return formatAsText(data, options);
  }
  
  const opts = options ?? {};
  const useColors = opts.colors !== false;
  
  const allKeys = new Set<string>();
  for (const item of data) {
    if (typeof item === 'object' && item !== null) {
      Object.keys(item as object).forEach(key => allKeys.add(key));
    }
  }
  
  const keys = Array.from(allKeys);
  if (keys.length === 0) {
    return formatAsText(data, options);
  }
  
  const widths: Record<string, number> = {};
  for (const key of keys) {
    widths[key] = useColors ? chalk.bold(key).length : key.length;
  }
  
  for (const item of data) {
    if (typeof item === 'object' && item !== null) {
      const obj = item as Record<string, unknown>;
      for (const key of keys) {
        const value = String(obj[key] ?? '');
        const currentWidth = widths[key] ?? key.length;
        if (value.length > currentWidth) {
          widths[key] = value.length;
        }
      }
    }
  }
  
  let result = '';
  
  // Header con colores
  const headerCells = keys.map(key => {
    const padded = key.padEnd(widths[key] ?? key.length);
    return useColors ? chalk.bold(padded) : padded;
  });
  result += headerCells.join(chalk.gray(' | '));
  result += '\n';
  
  // Separador
  const separator = keys.map(key => '-'.repeat(widths[key] ?? key.length)).join('-+-');
  result += chalk.gray(separator);
  result += '\n';
  
  // Filas
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    if (typeof item === 'object' && item !== null) {
      const obj = item as Record<string, unknown>;
      const rowCells = keys.map(key => {
        const value = String(obj[key] ?? '');
        const width = widths[key] ?? key.length;
        return value.padEnd(width);
      });
      result += rowCells.join(chalk.gray(' | '));
      result += '\n';
    }
  }
  
  return result;
}

/**
 * Fallback a texto plano cuando no hay datos tabulares
 */
function formatAsText(data: unknown, options?: Partial<FormatOptions>): string {
  if (data === null || data === undefined) {
    return '';
  }
  
  if (typeof data === 'object') {
    return JSON.stringify(data, null, options?.indent ?? 2);
  }
  
  return String(data);
}

/**
 * Crea una instancia de formatter de tabla
 */
export const table: Formatter = {
  name: 'table',
  format: (data: unknown) => tableFormatter(data),
  canHandle: (data: unknown) => {
    return Array.isArray(data) && data.length > 0 && 
           typeof data[0] === 'object' && data[0] !== null;
  },
};