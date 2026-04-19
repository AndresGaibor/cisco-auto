import type { DebugLogEntry } from "./debug-log-stream.js";

export interface ParsedRuntimeLog {
  ts?: string;
  level?: string;
  logger?: string;
  msg?: string;
  data?: Record<string, unknown>;
  traceId?: string;
  commandType?: string;
  device?: string;
  ticket?: string;
}

export interface DebugLogViewOptions {
  verbose: boolean;
}

export function shouldRenderDebugLogEntry(
  entry: DebugLogEntry,
  options: DebugLogViewOptions,
): boolean {
  if (options.verbose) return true;

  const runtime = parseRuntimeLogMessage(entry.message);
  if (runtime) {
    return runtime.level !== "debug" || isImportantRuntimeMessage(runtime.msg ?? "");
  }

  if (entry.scope.toLowerCase() === "kernel") {
    return isImportantKernelMessage(entry.message);
  }

  if (entry.level !== "debug") return true;

  return isImportantKernelMessage(entry.message);
}

export function formatDebugLogMessage(entry: DebugLogEntry): string {
  const runtime = parseRuntimeLogMessage(entry.message);
  if (runtime) {
    return formatRuntimeMessage(runtime);
  }

  return stripDebugPrefix(entry.message);
}

export function parseRuntimeLogMessage(message: string): ParsedRuntimeLog | null {
  const raw = stripDebugPrefix(message);
  if (!raw.startsWith("{")) return null;

  try {
    const parsed = JSON.parse(raw) as ParsedRuntimeLog;
    if (!parsed || typeof parsed !== "object" || typeof parsed.msg !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

function formatRuntimeMessage(entry: ParsedRuntimeLog): string {
  const level = (entry.level ?? "info").toLowerCase();
  const logger = entry.logger ? entry.logger + " " : "";
  const data = formatData(entry.data);
  return `${logger}${level} ${entry.msg ?? ""}${data}`.trim();
}

function formatData(data?: Record<string, unknown>): string {
  if (!data) return "";

  const parts: string[] = [];
  const keys = Object.keys(data).slice(0, 4);
  for (const key of keys) {
    const value = data[key];
    if (value === undefined || value === null) continue;
    parts.push(`${key}=${formatValue(value)}`);
  }

  return parts.length > 0 ? ` ${parts.join(" ")}` : "";
}

function formatValue(value: unknown): string {
  if (typeof value === "string") return value.length > 80 ? `${value.slice(0, 77)}...` : value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `[${value.slice(0, 3).map(formatValue).join(", ")}]`;
  if (typeof value === "object") return "[object]";
  return String(value);
}

function stripDebugPrefix(message: string): string {
  return message.replace(/^\[(runtime|kernel|loader|queue|heartbeat|fm|exec)\]\s*/i, "");
}

function isImportantKernelMessage(message: string): boolean {
  const inner = message.trim();

  if (inner.startsWith("[loader]")) {
    return (
      /SUCCESS: runtime\.js loaded/i.test(inner) ||
      /LOAD ERROR/i.test(inner) ||
      /Runtime not available/i.test(inner)
    );
  }

  if (inner.startsWith("[queue-claim]")) {
    return (
      /claimed:/i.test(inner) ||
      /reclaimed/i.test(inner) ||
      /claim failed/i.test(inner) ||
      /invalid command/i.test(inner) ||
      /RUNTIME NOT LOADED/i.test(inner) ||
      /RUNTIME FATAL ERROR/i.test(inner)
    );
  }

  if (inner.startsWith("[main]")) {
    return /ERROR/i.test(inner) || /FATAL/i.test(inner);
  }

  if (inner.startsWith("[KERNEL-IIFE]")) {
    return /ERROR/i.test(inner);
  }

  return (
    inner.startsWith("===") ||
    inner.startsWith(">>>") ||
    inner.startsWith("<<<") ||
    /\bFATAL\b/i.test(inner) ||
    /\bERROR\b/i.test(inner) ||
    /Runtime loaded successfully/i.test(inner) ||
    /Runtime not available/i.test(inner) ||
    /Runtime fatal/i.test(inner)
  );
}

function isImportantRuntimeMessage(message: string): boolean {
  return (
    /dispatch ready/i.test(message) ||
    /dispatching/i.test(message) ||
    /job created/i.test(message) ||
    /runtime initialized/i.test(message) ||
    /runtime fatal error/i.test(message) ||
    /runtime load error/i.test(message)
  );
}
