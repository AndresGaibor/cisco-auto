#!/usr/bin/env bun
/**
 * Utilidades para manejo de timeouts globales de la CLI
 * Proporciona funciones helper para obtener y resolver timeouts
 * desde los flags globales de la aplicación
 */

import type { GlobalFlags } from '../flags';

/**
 * Valor por defecto para timeout global cuando no se especifica
 * 30 segundos - coincide con el valor usado en el comando deploy
 */
export const DEFAULT_GLOBAL_TIMEOUT_MS = 30_000;

/**
 * Obtiene el timeout global configurado desde los flags
 * Si se especifica --no-timeout, retorna null (sin timeout)
 * Si se especifica --timeout <ms>, retorna ese valor
 * Si no se especifica nada, retorna el valor por defecto
 * 
 * @param flags - Flags globales obtenidos de getGlobalFlags()
 * @returns Timeout en milisegundos o null si está desactivado
 */
export function getGlobalTimeout(flags: GlobalFlags): number | null {
  if (flags.noTimeout === true) {
    return null;
  }

  if (typeof flags.timeout === 'number') {
    return flags.timeout;
  }

  return DEFAULT_GLOBAL_TIMEOUT_MS;
}

/**
 * Resuelve el timeout efectivo para una operación específica
 * Prioriza el timeout explícito de la operación sobre el global
 * 
 * @param operationTimeoutMs - Timeout específico para la operación (opcional)
 * @param globalFlags - Flags globales de la CLI
 * @returns Timeout efectivo en milisegundos o null si está desactivado
 */
export function resolveTimeout(
  operationTimeoutMs: number | undefined,
  globalFlags: GlobalFlags
): number | null {
  // Si la operación especifica un timeout explícito, usarlo
  if (operationTimeoutMs !== undefined) {
    return operationTimeoutMs;
  }
  
  // De lo contrario, usar el timeout global
  return getGlobalTimeout(globalFlags);
}

/**
 * Verifica si el timeout está activo (no es null)
 * 
 * @param timeoutMs - Valor de timeout a verificar
 * @returns true si el timeout está activo, false si está desactivado
 */
export function isTimeoutActive(timeoutMs: number | null): boolean {
  return timeoutMs !== null;
}