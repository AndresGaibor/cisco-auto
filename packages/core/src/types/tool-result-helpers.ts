/**
 * Tool Result Helpers - Type guards and utilities for ToolResult
 */

import type { ToolResult, ToolExecutionContext, ToolLogger } from './tool-execution';

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

export function createToolContext(toolId: string = 'cli-tool'): ToolExecutionContext {
  const logger: ToolLogger = {
    debug(message: string, data?: unknown): void {
      if (process.env.DEBUG) console.debug(message, data);
    },
    info(message: string, data?: unknown): void {
      console.log(message, data);
    },
    warn(message: string, data?: unknown): void {
      console.warn(message, data);
    },
    error(message: string, error?: unknown): void {
      console.error(message, error);
    },
    trace(message: string): void {
      if (process.env.DEBUG) console.trace(message);
    },
  };

  return {
    toolId,
    requestId: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    logger,
    metadata: {},
    startTime: Date.now(),
  };
}
