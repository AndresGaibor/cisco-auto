/**
 * Tool Execution Types - Execution context and handler types
 * Handles execution flow, logging, and context management
 */

import type { ToolInput, ToolResult, ToolError, ToolResultSuccess, ToolResultError, ToolResultMetadata, ToolConfig } from './tool-core';
export type { ToolInput, ToolResult, ToolError, ToolResultSuccess, ToolResultError, ToolResultMetadata, ToolConfig };

// ============================================================================
// Execution Context
// ============================================================================

export interface ToolExecutionContext {
  toolId: string;
  requestId: string;
  userId?: string;
  timeout?: number;
  retryCount?: number;
  metadata?: Record<string, unknown>;
  logger: ToolLogger;
  abortSignal?: AbortSignal;
  startTime: number;
}

export interface ToolLogger {
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, error?: unknown): void;
  trace(message: string): void;
}

// ============================================================================
// Handler Types
// ============================================================================

export type ToolHandler<TInput extends ToolInput = ToolInput, TOutput = unknown> = (
  input: TInput,
  context: ToolExecutionContext,
) => Promise<ToolResult<TOutput>>;

export interface ToolExecutionOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  cacheResult?: boolean;
  cacheExpiry?: number;
}

// ============================================================================
// Execution State
// ============================================================================

export interface ExecutionState {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: number;
  endTime?: number;
  duration?: number;
  error?: Error;
  result?: unknown;
  progress?: number;
}

export interface ExecutionMetrics {
  duration: number;
  executionTime: number;
  memoryUsed: number;
  cpuTime: number;
  retries: number;
  cacheHit: boolean;
}

// ============================================================================
// Error Handling
// ============================================================================

export interface ToolErrorInterface extends Error {
  code: string;
  statusCode?: number;
  details?: unknown;
  recoverable: boolean;
  retryable: boolean;
}

export class ToolExecutionError implements ToolErrorInterface {
  name = 'ToolExecutionError';
  message: string;
  code: string;
  statusCode?: number;
  details?: unknown;
  recoverable = false;
  retryable = false;

  constructor(
    message: string,
    code: string = 'EXECUTION_ERROR',
    options?: { statusCode?: number; details?: unknown; recoverable?: boolean; retryable?: boolean }
  ) {
    this.message = message;
    this.code = code;
    this.statusCode = options?.statusCode;
    this.details = options?.details;
    this.recoverable = options?.recoverable ?? false;
    this.retryable = options?.retryable ?? false;
  }
}

// ============================================================================
// Execution Hooks
// ============================================================================

export interface ToolExecutionHooks {
  beforeExecute?: (context: ToolExecutionContext, input: ToolInput) => Promise<void>;
  afterExecute?: (context: ToolExecutionContext, result: ToolResult) => Promise<void>;
  onError?: (context: ToolExecutionContext, error: Error) => Promise<void>;
  onRetry?: (context: ToolExecutionContext, attempt: number) => Promise<void>;
}