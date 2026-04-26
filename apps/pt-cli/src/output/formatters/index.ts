#!/usr/bin/env bun
/**
 * Exporta formatters de salida públicos.
 * La CLI pública soporta text/json/table/raw.
 */

export { json, jsonFormatter } from "./json.ts";
export { table, tableFormatter } from "./table.ts";
export { text, textFormatter } from "./text.ts";
export type { Formatter, FormatOptions } from "./types.ts";
export { defaultOptions } from "./types.ts";
