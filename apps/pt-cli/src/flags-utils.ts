/**
 * Helper para construir GlobalFlags con defaults.
 */
import type { Command } from "commander";
import type { GlobalFlags, OutputFormat } from "./flags.js";

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

export function hasArg(name: string): boolean {
  return process.argv.includes(name);
}

export function flagEnabled(
  localValue: unknown,
  options: {
    defaultValue: boolean;
    positive?: string;
    negative?: string;
  },
): boolean {
  if (options.negative && hasArg(options.negative)) return false;
  if (options.positive && hasArg(options.positive)) return true;
  if (typeof localValue === "boolean") return localValue;
  return options.defaultValue;
}

export function jsonEnabled(commandOptions?: Record<string, unknown>): boolean {
  return Boolean(commandOptions?.json) || hasArg("--json");
}

export function outputFormat(commandOptions?: Record<string, unknown>): OutputFormat {
  if (Boolean(commandOptions?.raw) || hasArg("--raw")) return "raw";
  if (Boolean(commandOptions?.table) || hasArg("--table")) return "table";
  if (jsonEnabled(commandOptions)) return "json";
  return "text";
}

export function flagsFromCommand(
  command: Command | undefined,
  overrides: Partial<GlobalFlags> = {},
): GlobalFlags {
  const opts = command?.optsWithGlobals?.() ?? command?.opts?.() ?? {};

  const json = jsonEnabled(opts);
  const output = outputFormat(opts);

  return buildFlags({
    json,
    output,
    verbose: Boolean(opts.verbose) || hasArg("--verbose") || hasArg("-v"),
    quiet: Boolean(opts.quiet) || hasArg("--quiet") || hasArg("-q"),
    trace: Boolean(opts.trace) || hasArg("--trace"),
    tracePayload: Boolean(opts.tracePayload) || hasArg("--trace-payload"),
    traceResult: Boolean(opts.traceResult) || hasArg("--trace-result"),
    traceDir: typeof opts.traceDir === "string" ? opts.traceDir : null,
    traceBundle: Boolean(opts.traceBundle) || hasArg("--trace-bundle"),
    traceBundlePath: typeof opts.traceBundlePath === "string" ? opts.traceBundlePath : null,
    sessionId: typeof opts.sessionId === "string" ? opts.sessionId : null,
    examples: Boolean(opts.examples) || hasArg("--examples"),
    schema: Boolean(opts.schema) || hasArg("--schema"),
    explain: Boolean(opts.explain) || hasArg("--explain"),
    plan: Boolean(opts.plan) || hasArg("--plan"),
    verify: flagEnabled(opts.verify, {
      defaultValue: false,
      positive: "--verify",
      negative: "--no-verify",
    }),
    timeout:
      typeof opts.timeout === "number" && Number.isFinite(opts.timeout) && opts.timeout > 0
        ? opts.timeout
        : null,
    noTimeout: Boolean(opts.timeout === false) || hasArg("--no-timeout"),
    table: output === "table",
    raw: output === "raw",
    yes: Boolean(opts.yes) || hasArg("--yes") || hasArg("-y"),
    noInput: Boolean(opts.noInput) || hasArg("--no-input"),
    noColor: Boolean(opts.color === false || opts.noColor) || hasArg("--no-color"),
    ...overrides,
  });
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
    examples: hasArg("--examples"),
    explain: hasArg("--explain"),
    plan: hasArg("--plan"),
    schema: hasArg("--schema"),
    trace: hasArg("--trace"),
    traceBundle: hasArg("--trace-bundle"),
  };
}
