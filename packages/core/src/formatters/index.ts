#!/usr/bin/env bun
/**
 * Exporta los formatters de resultados de tools
 */

export {
  formatToolResult,
  formatToolError,
  formatToolOutput,
  formatToolResultAsJson,
  formatToolResultAsTable,
  formatToolResultAsText,
  formatToolErrorAsJson,
  formatToolErrorAsTable,
  formatToolErrorAsText,
  createToolResult,
  createToolError,
} from './tool-result.ts';

export type {
  ToolResult,
  ToolError,
  ToolResultMetadata,
  ToolOutput,
  ToolOutputFormat,
  ToolFormatterOptions,
} from './tool-result.ts';
