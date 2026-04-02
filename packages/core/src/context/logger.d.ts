/**
 * Wrapper de pino para logging estructurado con correlation ID
 * Proporciona logs con trazabilidad completa de requests
 */
import { type Logger } from 'pino';
import type { LogLevel } from './types.ts';
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
/**
 * Crea un logger con correlation ID incluido en cada mensaje
 */
export declare function createContextLogger(correlationId: string, options?: {
    level?: LogLevel;
    verbose?: boolean;
}): ContextLogger;
/**
 * Crea un logger stub para cuando no se necesita logging
 */
export declare function createNoOpLogger(): ContextLogger;
/**
 * Convierte string de nivel a LogLevel
 */
export declare function parseLogLevel(level: string): LogLevel;
//# sourceMappingURL=logger.d.ts.map