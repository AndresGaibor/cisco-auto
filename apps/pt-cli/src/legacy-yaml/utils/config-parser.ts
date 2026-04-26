#!/usr/bin/env bun
/**
 * Parser de archivos de configuración YAML/JSON.
 * Soporta ambos formatos con detección automática por extensión.
 */

import { readFileSync, existsSync } from 'node:fs';
import * as yaml from 'js-yaml';

/**
 * Resultado de parsear un archivo de configuración.
 */
export interface ParseConfigResult<T = Record<string, unknown>> {
  success: boolean;
  data?: T;
  path: string;
  format: 'yaml' | 'json';
  error?: string;
}

/**
 * Detecta el formato de un archivo por su extensión.
 */
function detectFormat(filePath: string): 'yaml' | 'json' {
  const ext = filePath.toLowerCase();
  if (ext.endsWith('.json')) return 'json';
  if (ext.endsWith('.yaml') || ext.endsWith('.yml')) return 'yaml';
  // Default: intentar YAML (es superconjunto de JSON para casos simples)
  return 'yaml';
}

/**
 * Parsea un archivo de configuración YAML o JSON.
 *
 * @param filePath - Ruta al archivo de configuración
 * @returns Resultado con datos parseados o error
 */
export function parseConfigFile<T = Record<string, unknown>>(
  filePath: string
): ParseConfigResult<T> {
  if (!existsSync(filePath)) {
    return {
      success: false,
      path: filePath,
      format: detectFormat(filePath),
      error: `Archivo no encontrado: ${filePath}`,
    };
  }

  const format = detectFormat(filePath);

  try {
    const content = readFileSync(filePath, 'utf-8');

    let data: unknown;
    if (format === 'json') {
      data = JSON.parse(content);
    } else {
      data = yaml.load(content);
    }

    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return {
        success: false,
        path: filePath,
        format,
        error: 'El archivo debe contener un objeto YAML/JSON',
      };
    }

    return {
      success: true,
      data: data as T,
      path: filePath,
      format,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      success: false,
      path: filePath,
      format,
      error: `Error parseando ${format.toUpperCase()}: ${message}`,
    };
  }
}

/**
 * Valida que un objeto de configuración tenga el campo 'type' requerido.
 */
export function requireConfigType(
  data: Record<string, unknown>,
  expectedType: string
): void {
  if (!data.type) {
    throw new Error('El archivo de configuración debe tener un campo "type"');
  }
  if (data.type !== expectedType) {
    throw new Error(
      `Tipo de configuración inesperado: esperaba "${expectedType}", obtuvo "${data.type}"`
    );
  }
}

/**
 * Valida y retorna el campo 'device' de una configuración.
 */
export function requireDevice(data: Record<string, unknown>): string {
  if (!data.device || typeof data.device !== 'string') {
    throw new Error('El campo "device" es requerido y debe ser un string');
  }
  return data.device;
}
