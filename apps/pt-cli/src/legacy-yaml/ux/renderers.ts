#!/usr/bin/env bun
/**
 * Renderers para salida canónica de CLI.
 * Proporciona formateo para los diferentes formatos de salida.
 */

import type { CliResult } from '../contracts/cli-result.js';
import type { OutputFormat } from '../flags.js';

export function renderCliResult<T>(result: CliResult<T>, format: OutputFormat): string {
  switch (format) {
    case 'json':
      return renderCliResultJson(result);
    case 'yaml':
      return renderCliResultYaml(result);
    case 'table':
      return renderCliResultTable(result);
    case 'text':
    default:
      return renderCliResultText(result);
  }
}

export function renderCliResultText<T>(result: CliResult<T>): string {
  const lines: string[] = [];

  if (result.ok) {
    lines.push(`✓ ${capitalizeFirst(result.action)}`);
  } else {
    lines.push(`✗ ${capitalizeFirst(result.action)}`);
  }

  if (result.data) {
    lines.push('');
    lines.push('Resumen');
    lines.push(...formatDataAsText(result.data, 2));
  }

  if (result.meta?.context) {
    lines.push('');
    lines.push('Contexto');
    lines.push(...formatDataAsText(result.meta.context, 2));
  }

  if (result.verification) {
    lines.push('');
    lines.push('Verificación');
    for (const check of result.verification.checks ?? []) {
      const status = check.ok ? '✓' : '✗';
      lines.push(`  ${status} ${check.name}`);
      if (check.details && typeof check.details === 'object') {
        lines.push(...formatDataAsText(check.details, 4));
      }
    }
    if (result.meta?.confidence) {
      lines.push(`  Confianza: ${result.meta.confidence}`);
    }
  }

  if (result.warnings && result.warnings.length > 0) {
    lines.push('');
    lines.push('Advertencias');
    for (const warning of result.warnings) {
      lines.push(`  ! ${warning}`);
    }
  }
  if (result.advice && result.advice.length > 0) {
    lines.push('');
    lines.push('Advice');
    for (const advice of result.advice) {
      lines.push(`  → ${advice}`);
    }
  }



  if (result.error) {
    lines.push('');
    lines.push('Error');
    lines.push(`  ${result.error.message}`);
    if (result.error.details) {
      lines.push(...formatDataAsText(result.error.details, 4));
    }
  }

  return lines.join('\n');
}

export function renderCliResultJson<T>(result: CliResult<T>): string {
  return JSON.stringify(result, null, 2);
}

export function renderCliResultYaml<T>(result: CliResult<T>): string {
  return toYamlString(result);
}

export function renderCliResultTable<T>(result: CliResult<T>): string {
  if (!result.data) {
    return renderCliResultText(result);
  }

  if (Array.isArray(result.data)) {
    return formatArrayAsTable(result.data);
  }

  if (typeof result.data === 'object' && result.data !== null) {
    return formatObjectAsTable(result.data as Record<string, unknown>);
  }

  return renderCliResultText(result);
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDataAsText(data: unknown, indent: number = 0): string[] {
  const lines: string[] = [];
  const prefix = ' '.repeat(indent);

  if (data === null || data === undefined) {
    return lines;
  }

  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        lines.push(`${prefix}${key}: (vacío)`);
      } else if (typeof value === 'object') {
        lines.push(`${prefix}${key}:`);
        lines.push(...formatDataAsText(value, indent + 2));
      } else {
        lines.push(`${prefix}${key}: ${value}`);
      }
    }
  } else {
    lines.push(`${prefix}${data}`);
  }

  return lines;
}

function toYamlString(data: unknown, indent: number = 0): string {
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
        result += `${spaces}- ${toYamlString(item, indent + 1).trimStart()}`;
      } else {
        result += `${spaces}- ${toYamlString(item)}`;
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
        result += `${spaces}${key}:\n${toYamlString(value, indent + 1)}`;
      } else if (Array.isArray(value)) {
        result += `${spaces}${key}:\n${toYamlString(value, indent + 1)}`;
      } else {
        result += `${spaces}${key}: ${toYamlString(value)}`;
      }
    }
    return result;
  }

  return String(data) + '\n';
}

function formatArrayAsTable(data: unknown[]): string {
  if (data.length === 0) {
    return '(sin datos)';
  }

  const allKeys = new Set<string>();
  for (const item of data) {
    if (typeof item === 'object' && item !== null) {
      Object.keys(item as object).forEach((key) => allKeys.add(key));
    }
  }

  const keys = Array.from(allKeys);
  if (keys.length === 0) {
    return JSON.stringify(data, null, 2);
  }

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
          widths[key] = value.length;
        }
      }
    }
  }

  let result = '';

  result += keys.map((key) => key.padEnd(widths[key] ?? key.length)).join(' | ');
  result += '\n';

  result += keys.map((key) => '-'.repeat(widths[key] ?? key.length)).join('-+-');
  result += '\n';

  for (const item of data) {
    if (typeof item === 'object' && item !== null) {
      const obj = item as Record<string, unknown>;
      result += keys
        .map((key) => {
          const value = String(obj[key] ?? '');
          const width = widths[key] ?? key.length;
          return value.padEnd(width);
        })
        .join(' | ');
      result += '\n';
    }
  }

  return result;
}

function formatObjectAsTable(data: Record<string, unknown>): string {
  const keys = Object.keys(data);

  if (keys.length === 0) {
    return '(sin datos)';
  }

  const maxKeyLength = Math.max(...keys.map((k) => k.length));

  let result = '';
  for (const [key, value] of Object.entries(data)) {
    const valueStr = String(value ?? '');
    result += `${key.padEnd(maxKeyLength)} | ${valueStr}\n`;
  }

  return result;
}
