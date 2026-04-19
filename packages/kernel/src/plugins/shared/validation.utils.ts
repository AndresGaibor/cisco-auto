import type { PluginValidationResult } from '../../plugin-api/plugin.types.js';

export function toValidationResult(errors: PluginValidationResult['errors']): PluginValidationResult {
  return {
    ok: errors.length === 0,
    errors,
  };
}

export function buildValidationResult(errors: Array<{ path: string; message: string; code: string }>) {
  return {
    ok: errors.length === 0,
    errors,
  };
}
