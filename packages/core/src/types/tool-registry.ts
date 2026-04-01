/**
 * Tool Registry Types - Registry management for tools
 * Handles tool registration, discovery, and management
 */

import type { Tool, ToolInput, ToolResult, ToolCategory } from './tool-core';
import type { ToolExecutionContext, ToolExecutionOptions } from './tool-execution';

// ============================================================================
// Registry Interface
// ============================================================================

export interface ToolRegistry {
  register(tool: Tool): void;
  unregister(toolId: string): void;
  get(toolId: string): Tool | undefined;
  list(category?: ToolCategory): Tool[];
  has(toolId: string): boolean;
  count(): number;
  execute(
    toolId: string,
    input: ToolInput,
    context: ToolExecutionContext,
    options?: ToolExecutionOptions
  ): Promise<ToolResult>;
}

// ============================================================================
// Registry Events
// ============================================================================

export type RegistryEventType =
  | 'tool-registered'
  | 'tool-unregistered'
  | 'tool-executed'
  | 'tool-error'
  | 'registry-cleared';

export interface RegistryEvent {
  type: RegistryEventType;
  toolId?: string;
  timestamp: number;
  data?: unknown;
}

// ============================================================================
// Registry Statistics
// ============================================================================

export interface RegistryStats {
  totalTools: number;
  toolsByCategory: Record<ToolCategory, number>;
  executionStats: ExecutionStats;
}

export interface ExecutionStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  avgExecutionTime: number;
  lastExecution?: {
    toolId: string;
    timestamp: number;
    duration: number;
    success: boolean;
  };
}

// ============================================================================
// Tool Filter
// ============================================================================

export interface ToolFilter {
  category?: ToolCategory;
  pattern?: RegExp;
  enabled?: boolean;
  tags?: string[];
}

export interface ToolSearchResult {
  tool: Tool;
  matchScore: number;
  relevance: 'exact' | 'partial' | 'fuzzy';
}
