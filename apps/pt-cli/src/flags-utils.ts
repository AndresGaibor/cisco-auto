/**
 * Helper para construir GlobalFlags con defaults
 */
import type { GlobalFlags } from "./flags.js";

export const DEFAULT_FLAGS: GlobalFlags = {
  json: false,
  jq: null,
  output: "text",
  verbose: false,
  quiet: false,
  trace: false,
  tracePayload: false,
  traceResult: false,
  traceDir: null,
  traceBundle: false,
  traceBundlePath: null,
  sessionId: null,
  examples: false,
  schema: false,
  explain: false,
  plan: false,
  verify: false,
  timeout: null,
  noTimeout: false,
  table: false,
  raw: false,
  yes: false,
  noInput: false,
  noColor: false,
};

export function buildFlags(overrides: Partial<GlobalFlags> = {}): GlobalFlags {
  return { ...DEFAULT_FLAGS, ...overrides };
}

export function parseGlobalOptions(): {
  examples: boolean;
  explain: boolean;
  plan: boolean;
  schema: boolean;
  trace: boolean;
  traceBundle: boolean;
} {
  return {
    examples: process.argv.includes("--examples"),
    explain: process.argv.includes("--explain"),
    plan: process.argv.includes("--plan"),
    schema: process.argv.includes("--schema"),
    trace: process.argv.includes("--trace"),
    traceBundle: process.argv.includes("--trace-bundle"),
  };
}