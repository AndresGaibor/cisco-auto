#!/usr/bin/env bun
/**
 * Definición de flags globales para cisco-auto CLI
 * Implementa: --json, --jq, --output, --verbose, --quiet
 */

import { Command } from 'commander';

/**
 * Tipos de salida soportados
 */
export type OutputFormat = 'json' | 'yaml' | 'table' | 'text';

/**
 * Contexto global de la CLI con los flags configurados
 */
export interface GlobalFlags {
  json: boolean;
  jq: string | null;
  output: OutputFormat;
  verbose: boolean;
  quiet: boolean;
  trace: boolean;
  tracePayload: boolean;
  traceResult: boolean;
  traceDir: string | null;
  traceBundle: boolean;
  traceBundlePath: string | null;
  sessionId: string | null;
  examples: boolean;
  schema: boolean;
  explain: boolean;
  plan: boolean;
  verify: boolean;
  timeout?: number | null;
  noTimeout?: boolean;
}

/**
 * Obtiene los flags globales del programa
 * @param program - Instancia de Command de Commander
 * @returns Objeto con los flags globales
 */
export function getGlobalFlags(program: Command): GlobalFlags {
  return {
    json: program.opts().json ?? false,
    jq: program.opts().jq ?? null,
    output: (program.opts().output as OutputFormat) ?? 'text',
    verbose: program.opts().verbose ?? false,
    quiet: program.opts().quiet ?? false,
    trace: program.opts().trace ?? false,
    tracePayload: program.opts().tracePayload ?? false,
    traceResult: program.opts().traceResult ?? false,
    traceDir: program.opts().traceDir ?? null,
    traceBundle: program.opts().traceBundle ?? false,
    traceBundlePath: program.opts().traceBundlePath ?? null,
    sessionId: program.opts().sessionId ?? null,
    examples: program.opts().examples ?? false,
    schema: program.opts().schema ?? false,
    explain: program.opts().explain ?? false,
    plan: program.opts().plan ?? false,
    verify: program.opts().verify ?? true,
    timeout: program.opts().timeout ?? null,
    noTimeout: program.opts().noTimeout ?? false,
  };
}

/**
 * Añade los flags globales al programa de Commander
 * @param program - Instancia de Command de Commander
 * @returns El programa con los flags añadidos
 */
export function addGlobalFlags(program: Command): Command {
  return program
    .option('-j, --json', 'Salida en formato JSON', false)
    .option('--jq <filter>', 'Filtrar salida JSON usando sintaxis similar a jq (ej: .[0].name)')
    .option(
      '-o, --output <format>',
      'Formato de salida: json, yaml, table, text',
      'text'
    )
    .option('-v, --verbose', 'Salida detallada con logs de debug', false)
    .option('-q, --quiet', 'Suprime salida no esencial (solo errores)', false)
    .option('--trace', 'Activar traza estructurada de la ejecución', false)
    .option('--trace-payload', 'Incluir payload redactado en la traza', false)
    .option('--trace-result', 'Incluir preview del resultado en la traza', false)
    .option('--trace-dir <dir>', 'Sobrescribir directorio de logs', undefined)
    .option('--trace-bundle', 'Generar archivo bundle único para debugging', false)
    .option('--trace-bundle-path <path>', 'Ruta personalizada para el archivo bundle', undefined)
    .option('--session-id <id>', 'ID de sesión manual para agrupar acciones', undefined)
    .option('--examples', 'Mostrar ejemplos de uso del comando y salir', false)
    .option('--schema', 'Mostrar schema JSON del resultado y salir', false)
    .option('--explain', 'Explicar qué hace el comando y salir', false)
    .option('--plan', 'Mostrar plan de ejecución sin ejecutar', false)
    .option('--verify', 'Verificar cambios post-ejecución', true)
    .option('--no-verify', 'Omitir verificación post-ejecución', false)
    .option('--timeout <ms>', 'Timeout global para operaciones en milisegundos', undefined)
    .option('--no-timeout', 'Desactivar timeout global', false);
}

/**
 * Formatea los datos según el flag de salida
 * @param data - Datos a formatear
 * @param format - Formato de salida ('json', 'yaml', 'table', 'text')
 * @returns String formateado
 */
export function formatOutput(data: unknown, format: OutputFormat): string {
  switch (format) {
    case 'json':
      return JSON.stringify(data, null, 2);
    
    case 'yaml':
      // Implementación básica de YAML sin librería pesada
      return toYaml(data);
    
    case 'table':
      // Formato tabular básico para arrays de objetos
      return formatTable(data);
    
    case 'text':
    default:
      return formatAsText(data);
  }
}

/**
 * Aplica filtro jq-like básico a datos JSON
 * @param data - Datos JSON a filtrar
 * @param filter - Filter jq (sintaxis básica: .key, .[0], .key.subkey)
 * @returns Datos filtrados
 */
export function applyJqFilter(data: unknown, filter: string): unknown {
  // Implementación básica de filtro jq-like
  // Soporta: .key, .[0], .key.subkey, .[]
  
  try {
    // Parsear el filtro
    const parts = parseJqFilter(filter);
    let result: unknown = data;
    
    for (const part of parts) {
      if (result === null || result === undefined) {
        return undefined;
      }
      
      if (typeof part === 'number') {
        // Acceso por índice
        if (Array.isArray(result)) {
          result = result[part];
        } else {
          return undefined;
        }
      } else if (part === '*') {
        // Expandir array
        if (Array.isArray(result)) {
          return result; // Devuelve el array para iterar
        }
      } else {
        // Acceso por clave
        if (typeof result === 'object' && result !== null) {
          result = (result as Record<string, unknown>)[part];
        } else {
          return undefined;
        }
      }
    }
    
    return result;
  } catch {
    // Si el filtro falla, devolver los datos originales
    return data;
  }
}

/**
 * Parsea un filtro jq básico en partes
 * @param filter - Filter string
 * @returns Array de partes (claves e índices)
 */
function parseJqFilter(filter: string): (string | number)[] {
  const parts: (string | number)[] = [];
  const regex = /\.?([^.\[\]]+)|\[(\d+)\]/g;
  let match;
  
  while ((match = regex.exec(filter)) !== null) {
    if (match[1] !== undefined) {
      parts.push(match[1]);
    } else if (match[2] !== undefined) {
      parts.push(parseInt(match[2], 10));
    }
  }
  
  return parts;
}

/**
 * Convierte datos a formato YAML básico
 * @param data - Datos a convertir
 * @returns String en formato YAML
 */
function toYaml(data: unknown, indent: number = 0): string {
  const spaces = '  '.repeat(indent);
  
  if (data === null || data === undefined) {
    return 'null\n';
  }
  
  if (typeof data === 'boolean' || typeof data === 'number') {
    return `${data}\n`;
  }
  
  if (typeof data === 'string') {
    // Strings con caracteres especiales necesitan comillas
    if (data.includes('\n') || data.includes(':') || data.includes('#')) {
      return `"${data.replace(/"/g, '\\"')}"\n`;
    }
    return `${data}\n`;
  }
  
  if (Array.isArray(data)) {
    if (data.length === 0) return '[]\n';
    
    let result = '';
    for (const item of data) {
      if (typeof item === 'object' && item !== null) {
        result += `${spaces}- ${toYaml(item, indent + 1).trimStart()}`;
      } else {
        result += `${spaces}- ${toYaml(item)}`;
      }
    }
    return result;
  }
  
  if (typeof data === 'object') {
    let result = '';
    const obj = data as Record<string, unknown>;
    const keys = Object.keys(obj);
    
    for (const key of keys) {
      const value = obj[key];
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result += `${spaces}${key}:\n${toYaml(value, indent + 1)}`;
      } else if (Array.isArray(value)) {
        result += `${spaces}${key}:\n${toYaml(value, indent + 1)}`;
      } else {
        result += `${spaces}${key}: ${toYaml(value)}`;
      }
    }
    return result;
  }
  
  return String(data) + '\n';
}

/**
 * Formatea datos como tabla (para arrays de objetos)
 * @param data - Datos a formatear
 * @returns String en formato tabla
 */
function formatTable(data: unknown): string {
  if (!Array.isArray(data) || data.length === 0) {
    return formatAsText(data);
  }
  
  // Obtener todas las claves de los objetos
  const allKeys = new Set<string>();
  for (const item of data) {
    if (typeof item === 'object' && item !== null) {
      Object.keys(item as object).forEach(key => allKeys.add(key));
    }
  }
  
  const keys = Array.from(allKeys);
  if (keys.length === 0) {
    return formatAsText(data);
  }
  
  // Calcular anchos de columna
  const widths: Record<string, number> = {};
  for (const key of keys) {
    widths[key] = key.length;
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
  
  // Crear tabla
  let result = '';
  
  // Header
  result += keys.map(key => key.padEnd(widths[key] ?? key.length)).join(' | ');
  result += '\n';
  
  // Separador
  result += keys.map(key => '-'.repeat(widths[key] ?? key.length)).join('-+-');
  result += '\n';
  
  // Filas
  for (const item of data) {
    if (typeof item === 'object' && item !== null) {
      const obj = item as Record<string, unknown>;
      result += keys.map(key => {
        const value = String(obj[key] ?? '');
        const width = widths[key] ?? key.length;
        return value.padEnd(width);
      }).join(' | ');
      result += '\n';
    }
  }
  
  return result;
}

/**
 * Convierte datos a texto legible
 * @param data - Datos a convertir
 * @returns String en formato texto
 */
function formatAsText(data: unknown): string {
  if (data === null || data === undefined) {
    return '';
  }
  
  if (typeof data === 'object') {
    return JSON.stringify(data, null, 2);
  }
  
  return String(data);
}

/**
 * Logger configurable según flags verbose/quiet
 */
export class CliLogger {
  private verbose: boolean;
  private quiet: boolean;
  
  constructor(verbose: boolean = false, quiet: boolean = false) {
    this.verbose = verbose;
    this.quiet = quiet;
  }
  
  debug(message: string): void {
    if (this.verbose && !this.quiet) {
      console.log(`[DEBUG] ${message}`);
    }
  }
  
  info(message: string): void {
    if (!this.quiet) {
      console.log(message);
    }
  }
  
  warn(message: string): void {
    if (!this.quiet) {
      console.warn(`[WARN] ${message}`);
    }
  }
  
  error(message: string): void {
    // Errors siempre se muestran, incluso en modo quiet
    console.error(`[ERROR] ${message}`);
  }
}

/**
 * Crea una instancia de logger según los flags
 * @param flags - Flags globales
 * @returns Instancia de CliLogger
 */
export function createLogger(flags: GlobalFlags): CliLogger {
  return new CliLogger(flags.verbose, flags.quiet);
}
