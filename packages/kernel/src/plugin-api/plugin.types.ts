import type { ZodSchema } from 'zod';

/**
 * Categorías de plugin soportadas por el sistema.
 * Cada categoría agrupa plugins con funcionalidad similar.
 */
export type PluginCategory = 'switching' | 'routing' | 'security' | 'services' | 'backend' | 'device';

/**
 * Define un comando que un plugin puede ejecutar.
 * Incluye el schema de validación del input y ejemplos de uso.
 */
export interface PluginCommandDefinition {
  /** Nombre único del comando dentro del plugin */
  name: string;
  /** Descripción legible del propósito del comando */
  description: string;
  /** Schema Zod para validar el input del comando */
  inputSchema: ZodSchema;
  /** Ejemplos de uso con input válido y descripción */
  examples: Array<{ input: Record<string, unknown>; description: string }>;
}

/**
 * Resultado de validación de configuración de un plugin.
 * Indica si la configuración es válida y los errores/warnings encontrados.
 */
export interface PluginValidationResult {
  /** True si la validación pasó sin errores */
  ok: boolean;
  /** Lista de errores de validación con path y código */
  errors: Array<{ path: string; message: string; code: string }>;
  /** Warnings opcionales que no bloquean la operación */
  warnings?: string[];
}
