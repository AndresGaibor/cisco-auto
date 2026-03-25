#!/usr/bin/env bun
/**
 * Formatter de salida texto plano
 */

import type { Formatter, FormatOptions } from './types.ts';

/**
 * Convierte datos a formato texto legible
 * @param data - Datos a formatear
 * @param options - Opciones de formato
 * @returns String en formato texto
 */
export function textFormatter(data: unknown, options?: Partial<FormatOptions>): string {
  if (data === null || data === undefined) {
    return '';
  }
  
  const opts = options ?? {};
  const indent = opts.indent ?? 2;
  
  if (typeof data === 'string') {
    return data;
  }
  
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return '(vacío)';
    }
    
    // Si es array de objetos simples, mostrarlos en líneas
    if (data.every(item => typeof item !== 'object' || item === null)) {
      return data.map(item => String(item)).join('\n');
    }
    
    // Array de objetos - mostrar como lista
    let result = '';
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      result += `${i + 1}. ${formatObject(item, indent)}\n`;
    }
    return result;
  }
  
  if (typeof data === 'object') {
    return formatObject(data, indent);
  }
  
  return String(data);
}

/**
 * Formatea un objeto como texto con clave: valor
 */
function formatObject(obj: unknown, indent: number): string {
  if (obj === null || obj === undefined) {
    return '';
  }
  
  if (typeof obj !== 'object') {
    return String(obj);
  }
  
  const indentStr = '  '.repeat(indent);
  let result = '';
  
  if (Array.isArray(obj)) {
    for (const item of obj) {
      result += `${indentStr}- ${formatObject(item, indent + 1)}\n`;
    }
  } else {
    const entries = Object.entries(obj as Record<string, unknown>);
    for (const [key, value] of entries) {
      if (typeof value === 'object' && value !== null) {
        result += `${indentStr}${key}:\n${formatObject(value, indent + 1)}`;
      } else {
        result += `${indentStr}${key}: ${formatObject(value, indent)}\n`;
      }
    }
  }
  
  return result;
}

/**
 * Crea una instancia de formatter de texto
 */
export const text: Formatter = {
  name: 'text',
  format: (data: unknown) => textFormatter(data),
  canHandle: (data: unknown) => {
    return data !== undefined;
  },
};