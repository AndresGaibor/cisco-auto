/**
 * Tipos para el contexto de ejecución de tools
 * Proporciona dependencias injectadas: logger, config
 */

import type { CiscoAutoConfig } from '../config/types.ts';
import type { ContextLogger } from './logger.ts';

// ============================================================================
// Configuración del contexto
// ============================================================================

/**
 * Opciones para crear un ExecutionContext
 */
export interface ExecutionContextOptions {
  /**
   * Correlation ID para trazabilidad de requests
   * Si no se provee, se genera automáticamente
   */
  correlationId?: string;

  /**
   * Configuración override (opcional)
   */
  config?: Partial<CiscoAutoConfig>;

  /**
   * Timeout en milisegundos para operaciones
   * @default 30000 (30 segundos)
   */
  timeout?: number;

  /**
   * Signal de abort para cancellation
   */
  abortSignal?: AbortSignal;

  /**
   * Logger personalizado (opcional)
   */
  logger?: ContextLogger;

  /**
   * Indica si el contexto es para modo verbose
   */
  verbose?: boolean;
}

/**
 * Resultado de una operación con contexto
 */
export interface ContextResult<T> {
  /**
   * Datos del resultado
   */
  data: T;

  /**
   * Correlation ID usado
   */
  correlationId: string;

  /**
   * Duración en milisegundos
   */
  durationMs: number;

  /**
   * Si fue exitoso
   */
  success: boolean;

  /**
   * Mensaje de error si falló
   */
  error?: string;
}

/**
 * Resultado fallido
 */
export interface ContextError {
  /**
   * Correlation ID del request
   */
  correlationId: string;

  /**
   * Mensaje de error
   */
  message: string;

  /**
   * Código de error
   */
  code: string;

  /**
   * Stack trace (solo en modo verbose)
   */
  stack?: string;

  /**
   * Duración hasta el error
   */
  durationMs: number;
}

// ============================================================================
// Logger Types (re-export de pino)
// ============================================================================

/**
 * Nivel de log
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Mensaje de log estructurado
 */
export interface LogMessage {
  /**
   * Correlation ID del contexto
   */
  correlationId: string;

  /**
   * Nivel del mensaje
   */
  level: LogLevel;

  /**
   * Mensaje principal
   */
  message: string;

  /**
   * Datos adicionales
   */
  data?: Record<string, unknown>;

  /**
   * Timestamp ISO
   */
  timestamp: string;
}