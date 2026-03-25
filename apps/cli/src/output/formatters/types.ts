#!/usr/bin/env bun
/**
 * Tipos para el sistema de formatters
 */

import type { OutputFormat } from '../../flags.ts';

/**
 * Interfaz base para formatters de salida
 */
export interface Formatter {
  name: OutputFormat;
  format: (data: unknown) => string;
  canHandle: (data: unknown) => boolean;
}

/**
 * Opciones de formato
 */
export interface FormatOptions {
  pretty: boolean;
  colors: boolean;
  indent: number;
}

/**
 * Opciones por defecto
 */
export const defaultOptions: FormatOptions = {
  pretty: true,
  colors: true,
  indent: 2,
};