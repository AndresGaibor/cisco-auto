#!/usr/bin/env bun
/**
 * Módulo principal de salida.
 */

import type { OutputFormat } from "../flags.ts";
import { json, table, text } from "./formatters/index.ts";
import type { Formatter, FormatOptions } from "./formatters/types.ts";

const raw: Formatter = {
  name: "raw",
  format: (data: unknown) => {
    if (data === null || data === undefined) return "";
    if (typeof data === "string") return data;
    return JSON.stringify(data, null, 2);
  },
  canHandle: (data: unknown) => typeof data === "string",
};

const formatters: Record<OutputFormat, Formatter> = {
  json,
  table,
  text,
  raw,
};

export function isTTY(): boolean {
  return process.stdout.isTTY ?? false;
}

export function getDefaultFormat(explicitFormat?: OutputFormat): OutputFormat {
  if (explicitFormat) return explicitFormat;
  return isTTY() ? "table" : "json";
}

export function getFormatter(format: OutputFormat): Formatter {
  return formatters[format] ?? text;
}

export function formatOutput(
  data: unknown,
  format: OutputFormat,
): string {
  const formatter = getFormatter(format);
  return formatter.format(data);
}

export function autoFormat(
  data: unknown,
  explicitFormat?: OutputFormat,
): string {
  const format = getDefaultFormat(explicitFormat);
  return formatOutput(data, format);
}

export { json, table, text };
export type { Formatter, FormatOptions } from "./formatters/types.ts";