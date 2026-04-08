#!/usr/bin/env bun
/**
 * Contrato canónico para resultados de CLI.
 * Define la estructura estándar de respuesta para todos los comandos.
 */

/**
 * Verificación individual dentro del resultado.
 */
export interface VerificationCheck {
  name: string;
  ok: boolean;
  details?: Record<string, unknown>;
}

/**
 * Error estructurado para resultados de CLI.
 */
export interface CliError {
  code?: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Resultado canónico de CLI.
 * Todos los comandos deben retornar esta estructura.
 */
export interface CliResult<T = unknown> {
  schemaVersion: '1.0';
  ok: boolean;
  action: string;
  entityType?: string;
  data?: T;
  verification?: {
    executed?: boolean;
    verified?: boolean;
    partiallyVerified?: boolean;
    verificationSource?: string[];
    warnings?: string[];
    checks?: VerificationCheck[];
  };
  warnings?: string[];
  advice?: string[];
  examples?: string[];
  meta?: {
    durationMs?: number;
    sessionId?: string;
    correlationId?: string;
    commandIds?: string[];
    interactionSummary?: string;
  };
  error?: CliError;
}

/**
 * Crea un resultado de CLI exitoso.
 * @param action - Acción ejecutada
 * @param data - Datos resultantes
 * @param options - Opciones adicionales
 * @returns Resultado de CLI exitoso
 */
export function createSuccessResult<T>(
  action: string,
  data?: T,
  options?: {
    entityType?: string;
    warnings?: string[];
    advice?: string[];
    examples?: string[];
    meta?: CliResult['meta'];
  }
): CliResult<T> {
  return {
    schemaVersion: '1.0',
    ok: true,
    action,
    entityType: options?.entityType,
    data,
    warnings: options?.warnings,
    advice: options?.advice,
    examples: options?.examples,
    meta: options?.meta,
  };
}

/**
 * Crea un resultado de CLI con error.
 * @param action - Acción intentada
 * @param error - Error ocurrido
 * @returns Resultado de CLI con error
 */
export function createErrorResult(
  action: string,
  error: CliError
): CliResult {
  return {
    schemaVersion: '1.0',
    ok: false,
    action,
    error,
  };
}

/**
 * Crea un resultado de CLI con verificación.
 * @param action - Acción ejecutada
 * @param data - Datos resultantes
 * @param verification - Resultado de verificación
 * @returns Resultado de CLI con verificación
 */
export function createVerifiedResult<T>(action: string, data: T, verification: CliResult['verification']): CliResult<T> {
  return {
    schemaVersion: '1.0',
    ok: true,
    action,
    data,
    verification,
  };
}
