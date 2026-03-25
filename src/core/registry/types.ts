/**
 * TIPOS ESPECÍFICOS DEL REGISTRY
 * 
 * Códigos de error y tipos auxiliares para el sistema de registro de tools.
 */

import type { Tool, ToolInput, ToolResult, ToolExecutionContext } from '../types/tool.ts';

/**
 * Códigos de error del registry
 */
export enum RegistryErrorCode {
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
  TOOL_ALREADY_EXISTS = 'TOOL_ALREADY_EXISTS',
  INVALID_INPUT = 'INVALID_INPUT',
  EXECUTION_FAILED = 'EXECUTION_FAILED',
  TIMEOUT = 'TIMEOUT',
  CANCELLED = 'CANCELLED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  REGISTRY_ERROR = 'REGISTRY_ERROR'
}

/**
 * Error del registry con código específico
 */
export interface RegistryError {
  code: RegistryErrorCode;
  message: string;
  toolName?: string;
  details?: string;
  cause?: string;
  suggestions?: string[];
  stack?: string;
}

/**
 * Resultado de registro exitoso
 */
export interface RegisterResult {
  success: true;
  tool: Tool;
}

/**
 * Resultado de desregistro exitoso
 */
export interface UnregisterResult {
  success: true;
  toolName: string;
}

/**
 * Opciones para ejecutar una tool
 */
export interface ExecuteOptions {
  /** Contexto de ejecución override */
  context?: Partial<ToolExecutionContext>;
  
  /** Timeout específico para esta ejecución */
  timeout?: number;
  
  /** Signal de abort override */
  signal?: AbortSignal;
}

/**
 * Resultado de búsqueda en el registry
 */
export interface SearchResult {
  tool: Tool;
  score: number;
  matchType: 'name' | 'description' | 'tag' | 'category';
}

/**
 * Estadísticas del registry
 */
export interface RegistryStats {
  totalTools: number;
  toolsByCategory: Record<string, number>;
  lastRegistered?: string;
  lastExecuted?: string;
}

/**
 * Tool registrada con metadata adicional
 */
export interface RegisteredTool extends Tool {
  registeredAt: Date;
  lastExecutedAt?: Date;
  executionCount: number;
}
