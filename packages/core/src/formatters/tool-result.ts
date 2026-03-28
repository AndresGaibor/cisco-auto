#!/usr/bin/env bun
/**
 * Formateador de resultados de tools para CLI
 * Maneja la presentación de resultados de herramientas MCP
 */

import chalk from 'chalk';

// ============================================================================
// TIPOS
// ============================================================================

/**
 * Resultado exitoso de una tool
 */
export interface ToolResult<T = unknown> {
  /** Identificador único del resultado */
  id: string;
  /** Nombre de la tool que generó el resultado */
  toolName: string;
  /** Indica si la ejecución fue exitosa */
  success: true;
  /** Datos devueltos por la tool */
  data: T;
  /** Metadatos del resultado */
  metadata: ToolResultMetadata;
  /** Timestamp de cuándo se ejecutó */
  timestamp: string;
}

/**
 * Resultado fallido de una tool
 */
export interface ToolError {
  /** Identificador único del error */
  id: string;
  /** Nombre de la tool que falló */
  toolName: string;
  /** Indica que la ejecución falló */
  success: false;
  /** Mensaje de error legible para el usuario */
  message: string;
  /** Código de error interno */
  code?: string;
  /** Causa raíz del error */
  rootCause?: string;
  /** Sugerencias para solucionar el error */
  suggestions?: string[];
  /** Metadatos del error */
  metadata: ToolResultMetadata;
  /** Timestamp de cuándo ocurrió el error */
  timestamp: string;
}

/**
 * Metadatos asociados a cualquier resultado de tool
 */
export interface ToolResultMetadata {
  /** Duración de la ejecución en milisegundos */
  duration: number;
  /** Cantidad de elementos en el resultado (si aplica) */
  itemsCount?: number;
  /** Nombre del archivo o recurso procesado (si aplica) */
  resourceName?: string;
  /** Warnings generados durante la ejecución */
  warnings?: string[];
  /** Flags adicionales de la ejecución */
  flags?: Record<string, unknown>;
}

/**
 * Tipo discriminador para resultados de tool
 */
export type ToolOutput = ToolResult | ToolError;

/**
 * Formato de salida para formatear resultados
 */
export type ToolOutputFormat = 'json' | 'table' | 'text';

/**
 * Opciones para formatear resultados de tools
 */
export interface ToolFormatterOptions {
  /** Formato de salida */
  format: ToolOutputFormat;
  /** Si es true, muestra stack traces en errores */
  verbose: boolean;
  /** Si es true, usa colores en la salida */
  colors: boolean;
  /** Si es true, pretty-print el JSON */
  pretty: boolean;
  /** Profundidad de indentación para JSON */
  indent: number;
}

// ============================================================================
// OPCIONES POR DEFECTO
// ============================================================================

/**
 * Opciones por defecto para el formateador
 */
export const defaultToolFormatterOptions: ToolFormatterOptions = {
  format: 'text',
  verbose: false,
  colors: true,
  pretty: true,
  indent: 2,
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Extrae la cantidad de items del resultado
 * @param data - Datos del resultado
 * @returns Cantidad de items o undefined
 */
function extractItemsCount(data: unknown): number | undefined {
  if (data === null || data === undefined) {
    return undefined;
  }

  if (Array.isArray(data)) {
    return data.length;
  }

  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    
    // Buscar claves comunes que indiquen cantidad
    if ('items' in obj && Array.isArray(obj.items)) {
      return obj.items.length;
    }
    if ('results' in obj && Array.isArray(obj.results)) {
      return obj.results.length;
    }
    if ('data' in obj && Array.isArray(obj.data)) {
      return obj.data.length;
    }
    if ('count' in obj && typeof obj.count === 'number') {
      return obj.count;
    }
    if ('total' in obj && typeof obj.total === 'number') {
      return obj.total;
    }
  }

  return undefined;
}

/**
 * Formatea la duración en formato legible
 * @param durationMs - Duración en milisegundos
 * @returns String formateado
 */
function formatDuration(durationMs: number): string {
  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }
  
  const seconds = Math.floor(durationMs / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

// ============================================================================
// FORMATO JSON
// ============================================================================

/**
 * Formatea un ToolResult como JSON
 * @param result - Resultado a formatear
 * @param options - Opciones del formateador
 * @returns JSON formateado
 */
export function formatToolResultAsJson(
  result: ToolResult,
  options?: Partial<ToolFormatterOptions>
): string {
  const opts = { ...defaultToolFormatterOptions, ...options };
  
  const output = {
    success: result.success,
    tool: result.toolName,
    data: result.data,
    metadata: {
      duration: formatDuration(result.metadata.duration),
      durationMs: result.metadata.duration,
      itemsCount: result.metadata.itemsCount,
      resourceName: result.metadata.resourceName,
      warnings: result.metadata.warnings,
      timestamp: result.timestamp,
    },
  };
  
  if (opts.pretty) {
    return JSON.stringify(output, null, opts.indent);
  }
  
  return JSON.stringify(output);
}

/**
 * Formatea un ToolError como JSON
 * @param error - Error a formatear
 * @param options - Opciones del formateador
 * @returns JSON formateado
 */
export function formatToolErrorAsJson(
  error: ToolError,
  options?: Partial<ToolFormatterOptions>
): string {
  const opts = { ...defaultToolFormatterOptions, ...options };
  
  const output: {
    success: boolean;
    tool: string;
    error: {
      message: string;
      code?: string;
      rootCause?: string;
      suggestions?: string[];
    };
    metadata: Record<string, unknown>;
  } = {
    success: error.success,
    tool: error.toolName,
    error: {
      message: error.message,
      code: error.code,
    },
    metadata: {
      duration: formatDuration(error.metadata.duration),
      durationMs: error.metadata.duration,
      timestamp: error.timestamp,
    },
  };
  
  if (opts.verbose && error.rootCause) {
    output.error.rootCause = error.rootCause;
  }
  
  if (error.suggestions && error.suggestions.length > 0) {
    output.error.suggestions = error.suggestions;
  }
  
  if (opts.pretty) {
    return JSON.stringify(output, null, opts.indent);
  }
  
  return JSON.stringify(output);
}

// ============================================================================
// FORMATO TABLE
// ============================================================================

/**
 * Formatea un ToolResult como tabla
 * @param result - Resultado a formatear
 * @param options - Opciones del formateador
 * @returns Tabla formateada
 */
export function formatToolResultAsTable(
  result: ToolResult,
  options?: Partial<ToolFormatterOptions>
): string {
  const opts = { ...defaultToolFormatterOptions, ...options };
  const useColors = opts.colors !== false;
  
  let output = '';
  
  // Header con información de la tool
  const toolHeader = useColors 
    ? chalk.bold.cyan(`📦 ${result.toolName}`)
    : `${result.toolName}`;
  
  output += toolHeader + '\n';
  output += useColors ? chalk.gray('─'.repeat(40)) : '─'.repeat(40);
  output += '\n';
  
  // Metadata
  const metadataLines: string[] = [];
  
  if (result.metadata.itemsCount !== undefined) {
    const label = useColors ? chalk.gray('Items:') : 'Items:';
    const value = useColors ? chalk.bold(String(result.metadata.itemsCount)) : String(result.metadata.itemsCount);
    metadataLines.push(`  ${label} ${value}`);
  }
  
  const durationLabel = useColors ? chalk.gray('Duración:') : 'Duración:';
  const durationValue = useColors 
    ? chalk.green(formatDuration(result.metadata.duration))
    : formatDuration(result.metadata.duration);
  metadataLines.push(`  ${durationLabel} ${durationValue}`);
  
  if (result.metadata.resourceName) {
    const resLabel = useColors ? chalk.gray('Recurso:') : 'Recurso:';
    metadataLines.push(`  ${resLabel} ${result.metadata.resourceName}`);
  }
  
  output += metadataLines.join('\n') + '\n';
  
  // Warnings
  if (result.metadata.warnings && result.metadata.warnings.length > 0) {
    output += '\n';
    const warnHeader = useColors ? chalk.bold.yellow('⚠️  Warnings:') : 'Warnings:';
    output += warnHeader + '\n';
    for (const warning of result.metadata.warnings) {
      const warnLine = useColors ? chalk.yellow(`  • ${warning}`) : `  • ${warning}`;
      output += warnLine + '\n';
    }
  }
  
  // Datos
  output += '\n';
  const dataHeader = useColors ? chalk.bold('Datos:') : 'Datos:';
  output += dataHeader + '\n';
  
  // Si es un array, mostrar como tabla
  if (Array.isArray(result.data) && result.data.length > 0) {
    output += formatArrayAsTable(result.data, useColors);
  } else if (typeof result.data === 'object' && result.data !== null) {
    // Como objeto, mostrar como clave-valor
    output += formatObjectAsText(result.data, useColors, 2);
  } else {
    // Dato simple
    const dataStr = useColors 
      ? chalk.white(String(result.data))
      : String(result.data);
    output += `  ${dataStr}\n`;
  }
  
  return output;
}

/**
 * Formatea un ToolError como tabla
 * @param error - Error a formatear
 * @param options - Opciones del formateador
 * @returns Tabla formateada
 */
export function formatToolErrorAsTable(
  error: ToolError,
  options?: Partial<ToolFormatterOptions>
): string {
  const opts = { ...defaultToolFormatterOptions, ...options };
  const useColors = opts.colors !== false;
  
  let output = '';
  
  // Header de error
  const errorHeader = useColors 
    ? chalk.bold.red(`❌ ${error.toolName}`)
    : `${error.toolName} - ERROR`;
  
  output += errorHeader + '\n';
  output += useColors ? chalk.red('─'.repeat(40)) : '─'.repeat(40);
  output += '\n';
  
  // Mensaje de error
  const msgLabel = useColors ? chalk.gray('Error:') : 'Error:';
  const msgValue = useColors ? chalk.red(error.message) : error.message;
  output += `  ${msgLabel} ${msgValue}\n`;
  
  // Código de error
  if (error.code) {
    const codeLabel = useColors ? chalk.gray('Código:') : 'Código:';
    const codeValue = useColors ? chalk.yellow(error.code) : error.code;
    output += `  ${codeLabel} ${codeValue}\n`;
  }
  
  // Duración
  const durationLabel = useColors ? chalk.gray('Duración:') : 'Duración:';
  output += `  ${durationLabel} ${formatDuration(error.metadata.duration)}\n`;
  
  // Causa raíz (solo si verbose)
  if (opts.verbose && error.rootCause) {
    output += '\n';
    const causeLabel = useColors ? chalk.bold.red('Causa raíz:') : 'Causa raíz:';
    output += causeLabel + '\n';
    output += formatObjectAsText({ error: error.rootCause }, useColors, 2) + '\n';
  }
  
  // Sugerencias
  if (error.suggestions && error.suggestions.length > 0) {
    output += '\n';
    const suggestHeader = useColors 
      ? chalk.bold.green('💡 Sugerencias:')
      : 'Sugerencias:';
    output += suggestHeader + '\n';
    for (const suggestion of error.suggestions) {
      const suggestLine = useColors 
        ? chalk.green(`  • ${suggestion}`)
        : `  • ${suggestion}`;
      output += suggestLine + '\n';
    }
  }
  
  return output;
}

// ============================================================================
// FORMATO TEXT
// ============================================================================

/**
 * Formatea un ToolResult como texto legible
 * @param result - Resultado a formatear
 * @param options - Opciones del formateador
 * @returns Texto formateado
 */
export function formatToolResultAsText(
  result: ToolResult,
  options?: Partial<ToolFormatterOptions>
): string {
  const opts = { ...defaultToolFormatterOptions, ...options };
  const useColors = opts.colors !== false;
  
  let output = '';
  
  // Icono de éxito
  const successIcon = useColors ? chalk.green('✅') : '[OK]';
  const toolName = useColors ? chalk.bold(result.toolName) : result.toolName;
  output += `${successIcon} ${toolName}\n`;
  
  // Metadata en línea
  const metadataParts: string[] = [];
  
  if (result.metadata.itemsCount !== undefined) {
    metadataParts.push(`${result.metadata.itemsCount} items`);
  }
  
  metadataParts.push(formatDuration(result.metadata.duration));
  
  if (metadataParts.length > 0) {
    const metadataStr = useColors 
      ? chalk.gray(`(${metadataParts.join(', ')})`)
      : `(${metadataParts.join(', ')})`;
    output += `  ${metadataStr}\n`;
  }
  
  // Datos
  if (Array.isArray(result.data) && result.data.length > 0) {
    output += '\n';
    output += formatArrayAsText(result.data, useColors, 1);
  } else if (typeof result.data === 'object' && result.data !== null) {
    output += '\n';
    output += formatObjectAsText(result.data, useColors, 1);
  } else {
    output += '\n';
    const dataStr = useColors ? chalk.white(String(result.data)) : String(result.data);
    output += `  ${dataStr}\n`;
  }
  
  // Warnings
  if (result.metadata.warnings && result.metadata.warnings.length > 0) {
    output += '\n';
    const warnHeader = useColors ? chalk.yellow('⚠️') : '[WARN]';
    output += `${warnHeader} Se generaron ${result.metadata.warnings.length} warning(s):\n`;
    for (const warning of result.metadata.warnings) {
      output += `  • ${warning}\n`;
    }
  }
  
  return output;
}

/**
 * Formatea un ToolError como texto legible
 * @param error - Error a formatear
 * @param options - Opciones del formateador
 * @returns Texto formateado
 */
export function formatToolErrorAsText(
  error: ToolError,
  options?: Partial<ToolFormatterOptions>
): string {
  const opts = { ...defaultToolFormatterOptions, ...options };
  const useColors = opts.colors !== false;
  
  let output = '';
  
  // Icono de error
  const errorIcon = useColors ? chalk.red('❌') : '[ERROR]';
  const toolName = useColors ? chalk.bold(error.toolName) : error.toolName;
  output += `${errorIcon} ${toolName}\n`;
  
  // Mensaje
  const msgStr = useColors ? chalk.red(error.message) : error.message;
  output += `  ${msgStr}\n`;
  
  // Código
  if (error.code) {
    const codeStr = useColors 
      ? chalk.gray(`(${error.code})`)
      : `(${error.code})`;
    output += `  ${codeStr}\n`;
  }
  
  // Causa raíz (verbose)
  if (opts.verbose && error.rootCause) {
    output += '\n';
    const causeHeader = useColors ? chalk.red('Causa raíz:') : 'Causa raíz:';
    output += `  ${causeHeader}\n`;
    output += `    ${error.rootCause}\n`;
  }
  
  // Sugerencias
  if (error.suggestions && error.suggestions.length > 0) {
    output += '\n';
    const suggestHeader = useColors ? chalk.green('💡') : '[HINT]';
    output += `${suggestHeader} Sugerencias:\n`;
    for (const suggestion of error.suggestions) {
      output += `  • ${suggestion}\n`;
    }
  }
  
  return output;
}

// ============================================================================
// HELPERS DE FORMATEO
// ============================================================================

/**
 * Formatea un array como tabla
 */
function formatArrayAsTable(data: unknown[], useColors: boolean): string {
  if (data.length === 0) {
    return useColors ? chalk.gray('  (vacío)') : '  (vacio)';
  }
  
  // Obtener todas las claves
  const allKeys = new Set<string>();
  for (const item of data) {
    if (typeof item === 'object' && item !== null) {
      Object.keys(item as object).forEach(key => allKeys.add(key));
    }
  }
  
  const keys = Array.from(allKeys);
  if (keys.length === 0) {
    return formatArrayAsText(data, useColors, 2);
  }
  
  // Calcular anchos
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
  
  // Header
  const headerCells = keys.map(key => {
    const padded = key.padEnd(widths[key] ?? key.length);
    return useColors ? chalk.bold(padded) : padded;
  });
  result += '  ' + headerCells.join(useColors ? chalk.gray(' | ') : ' | ') + '\n';
  
  // Separador
  const separator = keys.map(key => '-'.repeat(widths[key] ?? key.length)).join('-+-');
  result += '  ' + (useColors ? chalk.gray(separator) : separator) + '\n';
  
  // Filas
  for (const item of data) {
    if (typeof item === 'object' && item !== null) {
      const obj = item as Record<string, unknown>;
      const rowCells = keys.map(key => {
        const value = String(obj[key] ?? '');
        const width = widths[key] ?? key.length;
        return value.padEnd(width);
      });
      result += '  ' + rowCells.join(useColors ? chalk.gray(' | ') : ' | ') + '\n';
    }
  }
  
  return result;
}

/**
 * Formatea un array como texto
 */
function formatArrayAsText(data: unknown[], useColors: boolean, indent: number): string {
  const indentStr = '  '.repeat(indent);
  let result = '';
  
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    const prefix = `[${i + 1}]`;
    const prefixStyled = useColors ? chalk.gray(prefix) : prefix;
    
    if (typeof item === 'object' && item !== null) {
      result += `${indentStr}${prefixStyled}\n`;
      result += formatObjectAsText(item, useColors, indent + 1);
    } else {
      const itemStr = useColors ? chalk.white(String(item)) : String(item);
      result += `${indentStr}${prefixStyled} ${itemStr}\n`;
    }
  }
  
  return result;
}

/**
 * Formatea un objeto como texto
 */
function formatObjectAsText(data: unknown, useColors: boolean, indent: number): string {
  const indentStr = '  '.repeat(indent);
  let result = '';
  
  if (typeof data !== 'object' || data === null) {
    return `${indentStr}${String(data)}`;
  }
  
  const obj = data as Record<string, unknown>;
  const keys = Object.keys(obj);
  
  for (const key of keys) {
    const value = obj[key];
    const keyStyled = useColors ? chalk.gray(`${key}:`) : `${key}:`;
    
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        result += `${indentStr}${keyStyled}\n`;
        result += formatArrayAsText(value, useColors, indent + 1);
      } else {
        result += `${indentStr}${keyStyled}\n`;
        result += formatObjectAsText(value, useColors, indent + 1);
      }
    } else {
      const valueStr = useColors ? chalk.white(String(value ?? '')) : String(value ?? '');
      result += `${indentStr}${keyStyled} ${valueStr}\n`;
    }
  }
  
  return result;
}

// ============================================================================
// FUNCIONES PRINCIPALES DE FORMATEO
// ============================================================================

/**
 * Formatea un resultado de tool según el formato especificado
 * @param result - Resultado a formatear
 * @param options - Opciones del formateador
 * @returns Resultado formateado
 */
export function formatToolResult(
  result: ToolResult,
  options?: Partial<ToolFormatterOptions>
): string {
  const opts = { ...defaultToolFormatterOptions, ...options };
  
  switch (opts.format) {
    case 'json':
      return formatToolResultAsJson(result, options);
    case 'table':
      return formatToolResultAsTable(result, options);
    case 'text':
    default:
      return formatToolResultAsText(result, options);
  }
}

/**
 * Formatea un error de tool según el formato especificado
 * @param error - Error a formatear
 * @param options - Opciones del formateador
 * @returns Error formateado
 */
export function formatToolError(
  error: ToolError,
  options?: Partial<ToolFormatterOptions>
): string {
  const opts = { ...defaultToolFormatterOptions, ...options };
  
  switch (opts.format) {
    case 'json':
      return formatToolErrorAsJson(error, options);
    case 'table':
      return formatToolErrorAsTable(error, options);
    case 'text':
    default:
      return formatToolErrorAsText(error, options);
  }
}

/**
 * Formatea un resultado de tool (sabe si es error o éxito)
 * @param output - Resultado o error a formatear
 * @param options - Opciones del formateador
 * @returns Output formateado
 */
export function formatToolOutput(
  output: ToolOutput,
  options?: Partial<ToolFormatterOptions>
): string {
  if (output.success) {
    return formatToolResult(output, options);
  }
  return formatToolError(output, options);
}

/**
 * Crea un ToolResult a partir de datos crudos
 * @param toolName - Nombre de la tool
 * @param data - Datos devueltos
 * @param durationMs - Duración en milisegundos
 * @param additionalMetadata - Metadatos adicionales
 * @returns ToolResult formateado
 */
export function createToolResult<T = unknown>(
  toolName: string,
  data: T,
  durationMs: number,
  additionalMetadata?: Partial<ToolResultMetadata>
): ToolResult<T> {
  return {
    id: crypto.randomUUID(),
    toolName,
    success: true,
    data,
    metadata: {
      duration: durationMs,
      itemsCount: extractItemsCount(data),
      ...additionalMetadata,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Crea un ToolError a partir de un error
 * @param toolName - Nombre de la tool
 * @param message - Mensaje de error
 * @param durationMs - Duración en milisegundos
 * @param options - Opciones adicionales
 * @returns ToolError formateado
 */
export function createToolError(
  toolName: string,
  message: string,
  durationMs: number,
  options?: {
    code?: string;
    rootCause?: string;
    suggestions?: string[];
  }
): ToolError {
  return {
    id: crypto.randomUUID(),
    toolName,
    success: false,
    message,
    code: options?.code,
    rootCause: options?.rootCause,
    suggestions: options?.suggestions,
    metadata: {
      duration: durationMs,
    },
    timestamp: new Date().toISOString(),
  };
}
