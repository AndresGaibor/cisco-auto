import type { ToolResult } from '@cisco-auto/core';

/**
 * Type guard para ToolResultSuccess
 */
export function isToolResultSuccess<T>(result: ToolResult<T>): result is Omit<ToolResult<T>, 'ok'> & { ok: true; data: T } {
  return result.ok === true;
}

/**
 * Type guard para ToolResultError
 */
export function isToolResultError(result: ToolResult): result is { ok: false; error: string; code?: string; details?: unknown } {
  return result.ok === false;
}

/**
 * Helper para extraer data seguro
 */
export function getToolResultData<T>(result: ToolResult<T>): T | null {
  if (isToolResultSuccess(result)) {
    return result.data;
  }
  return null;
}

/**
 * Helper para extraer error seguro
 */
export function getToolResultError(result: ToolResult): string {
  if (isToolResultError(result)) {
    return result.error;
  }
  return 'Unknown error';
}
