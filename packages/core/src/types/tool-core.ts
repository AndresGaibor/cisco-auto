/**
 * Tool Types - Core type definitions for tools
 * Defines tool contracts, schemas, and interfaces
 */

// ============================================================================
// Input Schema Types
// ============================================================================

export interface ToolInputSchema {
  type: 'object';
  properties: Record<string, ToolInputProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface ToolInputProperty {
  type: string;
  description?: string;
  enum?: unknown[];
  default?: unknown;
  items?: { type: string };
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
}

export type ToolInput = Record<string, unknown>;

// ============================================================================
// Result Types
// ============================================================================

export interface ToolResultSuccess<T = unknown> {
  ok: true;
  data: T;
  timestamp?: number;
}

export interface ToolResultError {
  ok: false;
  error: string;
  code?: string;
  details?: unknown;
  timestamp?: number;
}

export type ToolResult<T = unknown> = ToolResultSuccess<T> | ToolResultError;

// ============================================================================
// Metadata & Context
// ============================================================================

export interface ToolResultMetadata {
  executionTime?: number;
  source?: string;
  version?: string;
  cached?: boolean;
  [key: string]: unknown;
}

export interface ToolError extends Error {
  code?: string;
  details?: unknown;
  recoverable?: boolean;
}

export type ToolHandler<TInput extends ToolInput = ToolInput, TOutput = unknown> = (
  input: TInput,
  context: ToolExecutionContext,
) => Promise<ToolResult<TOutput>>;

export interface ToolExecutionContext {
  toolId: string;
  requestId: string;
  userId?: string;
  timeout?: number;
  metadata?: Record<string, unknown>;
  logger: ToolLogger;
}

export interface ToolLogger {
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, error?: unknown): void;
}

// ============================================================================
// Configuration
// ============================================================================

export interface ToolConfig {
  id: string;
  name: string;
  description: string;
  version: string;
  timeout?: number;
  retryable?: boolean;
  cacheable?: boolean;
  rateLimit?: {
    requests: number;
    window: number;
  };
}

// ============================================================================
// Tool Interface
// ============================================================================

export interface Tool<TInput extends ToolInput = ToolInput, TOutput = unknown> {
  config: ToolConfig;
  inputSchema: ToolInputSchema;
  handler: ToolHandler<TInput, TOutput>;
  validate(input: TInput): boolean;
  execute(input: TInput, context: ToolExecutionContext): Promise<ToolResult<TOutput>>;
}

// ============================================================================
// Categories & Examples
// ============================================================================

export type ToolCategory =
  | 'topology'
  | 'configuration'
  | 'validation'
  | 'execution'
  | 'deployment'
  | 'monitoring'
  | 'utility';

export interface ToolExample {
  name: string;
  description: string;
  input: ToolInput;
  output: unknown;
}

// ============================================================================
// Registry
// ============================================================================

export interface ToolRegistry {
  register(tool: Tool): void;
  unregister(toolId: string): void;
  get(toolId: string): Tool | undefined;
  list(category?: ToolCategory): Tool[];
  has(toolId: string): boolean;
  execute(toolId: string, input: ToolInput, context: ToolExecutionContext): Promise<ToolResult>;
}
