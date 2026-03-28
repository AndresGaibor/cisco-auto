/**
 * Wrapper de pino para logging estructurado con correlation ID
 * Proporciona logs con trazabilidad completa de requests
 */

import pino, { type Logger, type LoggerOptions } from 'pino';
import type { LogLevel } from './types.ts';

// ============================================================================
// Constantes
// ============================================================================

const DEFAULT_LOG_LEVEL: LogLevel = 'info';

// ============================================================================
// Interfaz del logger con correlation ID
// ============================================================================

/**
 * Logger extendido con soporte para correlation ID
 */
export interface ContextLogger {
  /**
   * Logger de pino subyacente
   */
  pino: Logger;

  /**
   * Correlation ID de este contexto
   */
  correlationId: string;

  /**
   * Log a nivel debug
   */
  debug(message: string, data?: Record<string, unknown>): void;

  /**
   * Log a nivel info
   */
  info(message: string, data?: Record<string, unknown>): void;

  /**
   * Log a nivel warn
   */
  warn(message: string, data?: Record<string, unknown>): void;

  /**
   * Log a nivel error
   */
  error(message: string, error?: Error, data?: Record<string, unknown>): void;

  /**
   * Crea un child logger con datos adicionales
   */
  child(data: Record<string, unknown>): ContextLogger;

  /**
   * Indica si el nivel debug está habilitado
   */
  isDebug(): boolean;
}

// ============================================================================
// Implementación
// ============================================================================

/**
 * Crea un logger con correlation ID incluido en cada mensaje
 */
export function createContextLogger(
  correlationId: string,
  options: { level?: LogLevel; verbose?: boolean } = {}
): ContextLogger {
  const level = options.level || DEFAULT_LOG_LEVEL;
  const isVerbose = options.verbose || false;

  const pinoOptions: LoggerOptions = {
    level: process.env.NODE_ENV === 'production' ? 'info' : level,
    base: {
      correlationId,
      timestamp: pino.stdTimeFunctions.isoTime
    },
    formatters: {
      level(label: string) {
        return { level: label };
      }
    },
    timestamp: isVerbose ? pino.stdTimeFunctions.isoTime : false
  };

  const pinoLogger = pino(pinoOptions);

  // Wrappers que incluyen correlation ID en cada log
  const contextLogger: ContextLogger = {
    pino: pinoLogger,

    correlationId,

    debug(message: string, data?: Record<string, unknown>) {
      pinoLogger.debug({ ...data, correlationId }, message);
    },

    info(message: string, data?: Record<string, unknown>) {
      pinoLogger.info({ ...data, correlationId }, message);
    },

    warn(message: string, data?: Record<string, unknown>) {
      pinoLogger.warn({ ...data, correlationId }, message);
    },

    error(message: string, error?: Error, data?: Record<string, unknown>) {
      if (error) {
        pinoLogger.error(
          {
            ...data,
            correlationId,
            error: {
              message: error.message,
              name: error.name,
              stack: error.stack
            }
          },
          message
        );
      } else {
        pinoLogger.error({ ...data, correlationId }, message);
      }
    },

    child(data: Record<string, unknown>): ContextLogger {
      const childLogger = this.pino.child(data);
      return {
        pino: childLogger,
        correlationId: this.correlationId,
        debug: this.debug.bind(this),
        info: this.info.bind(this),
        warn: this.warn.bind(this),
        error: this.error.bind(this),
        child: (moreData: Record<string, unknown>) => this.child({ ...data, ...moreData }),
        isDebug: this.isDebug.bind(this)
      };
    },

    isDebug(): boolean {
      return level === 'debug' || isVerbose;
    }
  };

  return contextLogger;
}

/**
 * Crea un logger stub para cuando no se necesita logging
 */
export function createNoOpLogger(): ContextLogger {
  const noOp: ContextLogger = {
    pino: pino({ enabled: false }),
    correlationId: 'no-op',
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    child: () => noOp,
    isDebug: () => false
  };

  return noOp;
}

/**
 * Convierte string de nivel a LogLevel
 */
export function parseLogLevel(level: string): LogLevel {
  const validLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
  const normalized = level.toLowerCase() as LogLevel;

  if (validLevels.includes(normalized)) {
    return normalized;
  }

  return DEFAULT_LOG_LEVEL;
}
