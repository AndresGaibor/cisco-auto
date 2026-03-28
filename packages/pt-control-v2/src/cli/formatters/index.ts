// ============================================================================
// PT Control V2 - Output Formatters
// ============================================================================

import Table from 'cli-table3';
import pc from 'picocolors';

// ============================================================================
// Types
// ============================================================================

export type OutputFormat = 'json' | 'yaml' | 'table' | 'text';

// ============================================================================
// JSON Formatter
// ============================================================================

export function formatJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

// ============================================================================
// YAML Formatter
// ============================================================================

export function formatYaml(data: unknown, indent: number = 0): string {
  const spaces = '  '.repeat(indent);

  if (data === null || data === undefined) {
    return 'null\n';
  }

  if (typeof data === 'boolean' || typeof data === 'number') {
    return `${data}\n`;
  }

  if (typeof data === 'string') {
    if (data.includes('\n') || data.includes(':') || data.includes('#')) {
      return `"${data.replace(/"/g, '\\"')}"\n`;
    }
    return `${data}\n`;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return '[]\n';

    let result = '';
    for (const item of data) {
      if (typeof item === 'object' && item !== null) {
        result += `${spaces}- ${formatYaml(item, indent + 1).trimStart()}`;
      } else {
        result += `${spaces}- ${formatYaml(item)}`;
      }
    }
    return result;
  }

  if (typeof data === 'object') {
    let result = '';
    const obj = data as Record<string, unknown>;
    const keys = Object.keys(obj);

    for (const key of keys) {
      const value = obj[key];
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result += `${spaces}${key}:\n${formatYaml(value, indent + 1)}`;
      } else if (Array.isArray(value)) {
        result += `${spaces}${key}:\n${formatYaml(value, indent + 1)}`;
      } else {
        result += `${spaces}${key}: ${formatYaml(value)}`;
      }
    }
    return result;
  }

  return String(data) + '\n';
}

// ============================================================================
// Table Formatter
// ============================================================================

export function formatTable(data: unknown): string {
  if (!Array.isArray(data) || data.length === 0) {
    return formatText(data);
  }

  // Get all keys from objects
  const allKeys = new Set<string>();
  for (const item of data) {
    if (typeof item === 'object' && item !== null) {
      Object.keys(item as object).forEach(key => allKeys.add(key));
    }
  }

  const keys = Array.from(allKeys);
  if (keys.length === 0) {
    return formatText(data);
  }

  // Calculate column widths
  const widths: Record<string, number> = {};
  for (const key of keys) {
    widths[key] = key.length;
  }

  for (const item of data) {
    if (typeof item === 'object' && item !== null) {
      const obj = item as Record<string, unknown>;
      for (const key of keys) {
        const value = String(obj[key] ?? '');
        const currentWidth = widths[key] ?? key.length;
        if (value.length > currentWidth) {
          widths[key] = Math.min(value.length, 50); // Max width 50
        }
      }
    }
  }

  // Create table
  const table = new Table({
    head: keys.map(k => pc.cyan(k)),
    style: {
      head: [],
      border: ['gray'],
    },
  });

  // Add rows
  for (const item of data) {
    if (typeof item === 'object' && item !== null) {
      const obj = item as Record<string, unknown>;
      table.push(keys.map(key => String(obj[key] ?? '')));
    }
  }

  return table.toString();
}

// ============================================================================
// Text Formatter
// ============================================================================

export function formatText(data: unknown): string {
  if (data === null || data === undefined) {
    return '';
  }

  if (typeof data === 'string') {
    return data;
  }

  if (typeof data !== 'object') {
    return String(data);
  }

  if (Array.isArray(data) && data.length === 0) {
    return pc.gray('No results.');
  }

  return JSON.stringify(data, null, 2);
}

// ============================================================================
// Main Formatter
// ============================================================================

export function formatOutput(data: unknown, format: OutputFormat): string {
  switch (format) {
    case 'json':
      return formatJson(data);
    case 'yaml':
      return formatYaml(data);
    case 'table':
      return formatTable(data);
    case 'text':
    default:
      return formatText(data);
  }
}

// ============================================================================
// JQ-like Filter
// ============================================================================

export function applyJqFilter(data: unknown, filter: string): unknown {
  try {
    const parts = parseJqFilter(filter);
    let result: unknown = data;

    for (const part of parts) {
      if (result === null || result === undefined) {
        return undefined;
      }

      if (typeof part === 'number') {
        // Index access
        if (Array.isArray(result)) {
          result = result[part];
        } else {
          return undefined;
        }
      } else if (part === '*') {
        // Expand array (keep as is)
        if (!Array.isArray(result)) {
          return undefined;
        }
      } else {
        // Key access
        if (typeof result === 'object' && result !== null) {
          result = (result as Record<string, unknown>)[part];
        } else {
          return undefined;
        }
      }
    }

    return result;
  } catch {
    return data;
  }
}

function parseJqFilter(filter: string): (string | number)[] {
  const parts: (string | number)[] = [];
  const regex = /\.?([^.\[\]]+)|\[(\d+)\]/g;
  let match;

  while ((match = regex.exec(filter)) !== null) {
    if (match[1] !== undefined) {
      parts.push(match[1]);
    } else if (match[2] !== undefined) {
      parts.push(parseInt(match[2], 10));
    }
  }

  return parts;
}
