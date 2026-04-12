#!/usr/bin/env bun
/**
 * Utilidades para manejo de ToolResult
 * 
 * Implementación local sin dependencias de @cisco-auto/core.
 */

export interface ToolResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  code?: string;
  details?: unknown;
}

export function isToolResultSuccess<T>(result: ToolResult<T>): result is ToolResult<T> & { ok: true; data: T } {
  return result.ok === true;
}

export function isToolResultError(result: ToolResult): result is { ok: false; error: string; code?: string; details?: unknown } {
  return result.ok === false;
}

export function getToolResultData<T>(result: ToolResult<T>): T | null {
  if (isToolResultSuccess(result)) {
    return result.data;
  }
  return null;
}

export function getToolResultError(result: ToolResult): string {
  if (isToolResultError(result)) {
    return result.error;
  }
  return 'Unknown error';
}
