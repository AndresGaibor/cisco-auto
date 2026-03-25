#!/usr/bin/env bun
/**
 * Formatter de salida JSON
 * Convierte datos a JSON con formato legible
 */

import type { Formatter } from './types.ts';

/**
 * Convierte datos a formato JSON
 * @param data - Datos a formatear
 * @param pretty - Si usar indentación (default: true para TTY)
 * @returns String en formato JSON
 */
export function jsonFormatter(data: unknown, pretty: boolean = true): string {
  if (data === undefined) {
    return '';
  }
  
  if (pretty) {
    return JSON.stringify(data, null, 2);
  }
  
  return JSON.stringify(data);
}

/**
 * Crea una instancia de formatter JSON
 */
export const json: Formatter = {
  name: 'json',
  format: (data: unknown) => jsonFormatter(data, true),
  canHandle: (data: unknown) => {
    // JSON puede manejar cualquier tipo de datos
    return true;
  },
};