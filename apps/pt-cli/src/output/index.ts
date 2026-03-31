#!/usr/bin/env bun
/**
 * Módulo principal de salida
 * Gestiona la selección automática de formatters y detección TTY
 */

import type { OutputFormat } from '../flags.ts';
import { json, yaml, table, text } from './formatters/index.ts';
import type { Formatter, FormatOptions } from './formatters/types.ts';

/**
 * Registry de formatters disponibles
 */
const formatters: Record<OutputFormat, Formatter> = {
  json,
  yaml,
  table,
  text,
};

/**
 * Verifica si la salida es un TTY (terminal interactiva)
 * @returns true si stdout es un TTY
 */
export function isTTY(): boolean {
  return process.stdout.isTTY ?? false;
}

/**
 * Determina el formato por defecto según el contexto
 * - TTY (terminal): table por defecto para mejor legibilidad
 * - Pipe/Redirect: json por defecto para facilitar scripting
 * @param explicitFormat - Formato explícito del usuario (si existe)
 * @returns Formato determinado
 */
export function getDefaultFormat(explicitFormat?: OutputFormat): OutputFormat {
  if (explicitFormat) {
    return explicitFormat;
  }
  
  return isTTY() ? 'table' : 'json';
}

/**
 * Obtiene el formatter apropiado para el formato especificado
 * @param format - Formato de salida
 * @returns Instancia del formatter
 */
export function getFormatter(format: OutputFormat): Formatter {
  return formatters[format] ?? text;
}

/**
 * Formatea datos según el formato especificado
 * @param data - Datos a formatear
 * @param format - Formato de salida
 * @param options - Opciones adicionales
 * @returns String formateado
 */
export function formatOutput(
  data: unknown,
  format: OutputFormat,
  options?: Partial<FormatOptions>
): string {
  const formatter = getFormatter(format);
  return formatter.format(data);
}

/**
 * Formatea datos con detección automática de formato
 * @param data - Datos a formatear
 * @param explicitFormat - Formato explícito del usuario
 * @param options - Opciones adicionales
 * @returns String formateado
 */
export function autoFormat(
  data: unknown,
  explicitFormat?: OutputFormat,
  options?: Partial<FormatOptions>
): string {
  const format = getDefaultFormat(explicitFormat);
  return formatOutput(data, format, options);
}

/**
 * Exporta todos los formatters para uso directo
 */
export { json, yaml, table, text } from './formatters/index.ts';
export type { Formatter, FormatOptions } from './formatters/types.ts';