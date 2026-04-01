/**
 * TOOL BASE TYPES
 * 
 * Define los tipos fundamentales para el sistema de Tool Registry
 */

import type { ToolInput, ToolResult, ToolExecutionContext, ToolConfig, ToolHandler } from './tool-execution';

export type { ToolInput, ToolResult, ToolExecutionContext, ToolConfig, ToolHandler };

export interface ToolInputSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  properties?: Record<string, ToolInputProperty>;
  required?: string[];
  items?: ToolInputSchema;
  description?: string;
  enum?: readonly string[];
  default?: unknown;
}

export interface ToolInputProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: readonly string[];
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  items?: ToolInputSchema;
}

export interface Tool<TInput extends ToolInput = ToolInput, TOutput = unknown> {
  name: string;
  description: string;
  longDescription?: string;
  inputSchema: ToolInputSchema;
  handler: ToolHandler<TInput, TOutput>;
  category?: ToolCategory;
  tags?: string[];
  examples?: ToolExample[];
  config?: ToolConfigDefinition;
}

export type ToolCategory = 
  | 'catalog'
  | 'topology'
  | 'validation'
  | 'generation'
  | 'deploy'
  | 'analysis'
  | 'utility';

export interface ToolExample {
  description: string;
  input: ToolInput;
  output?: unknown;
}

export interface ToolConfigDefinition {
  timeout?: number;
  requiresBridge?: boolean;
  experimental?: boolean;
  version?: string;
}