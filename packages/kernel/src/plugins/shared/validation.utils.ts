import type { PluginValidationResult } from '../../plugin-api/plugin.types.js';

/**
 * Convierte un array de errores al formato estándar de PluginValidationResult.
 * Simplifica la creación de resultados de validación en plugins.
 * 
 * @param errors - Array de errores con path, message y code
 * @returns PluginValidationResult con ok=true si no hay errores
 * 
 * @example
 * return toValidationResult([
 *   { path: 'name', message: 'Name is required', code: 'required' }
 * ]);
 */
export function toValidationResult(errors: PluginValidationResult['errors']): PluginValidationResult {
  return {
    ok: errors.length === 0,
    errors,
  };
}

/**
 * Construye un resultado de validación para comandos show.
 * Similar a toValidationResult pero tipado para resultados de verificación.
 * 
 * @param errors - Array de errores de validación
 * @returns Resultado con ok=true si no hay errores
 * 
 * @example
 * return buildValidationResult([
 *   { path: 'vlans.0', message: 'VLAN 10 not found', code: 'missing_vlan' }
 * ]);
 */
export function buildValidationResult(errors: Array<{ path: string; message: string; code: string }>) {
  return {
    ok: errors.length === 0,
    errors,
  };
}
