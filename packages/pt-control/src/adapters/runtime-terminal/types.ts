// Tipos compartidos para runtime-terminal adapter y sus módulos

import type { FileBridgePort } from "../../application/ports/file-bridge.port.js";
import type {
  TerminalPlan,
  TerminalPlanTimeouts,
  TerminalPlanStep,
  TerminalMode,
} from "../../ports/runtime-terminal-port.js";

export type { TerminalPlan, TerminalPlanTimeouts, TerminalPlanStep, TerminalMode };

export type AdapterTimingMap = Record<string, number>;

export interface NormalizedPlan extends TerminalPlan {
  device: string;
  targetMode: TerminalMode;
}

export interface NormalizedStep {
  kind: string;
  command: string;
  expectMode?: string;
  expectPromptPattern?: string;
  allowPager: boolean;
  allowConfirm: boolean;
  optional: boolean;
  expectedPrompt?: string;
  timeout?: number;
  metadata?: Record<string, unknown>;
}

export interface TerminalPlanPolicies {
  autoBreakWizard: boolean;
  autoAdvancePager: boolean;
  maxPagerAdvances: number;
  maxConfirmations: number;
  abortOnPromptMismatch: boolean;
  abortOnModeMismatch: boolean;
}

export interface PlanValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function isDeferredValue(value: unknown): value is { deferred: true; ticket: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { deferred?: unknown }).deferred === true &&
    typeof (value as { ticket?: unknown }).ticket === "string"
  );
}

export function isStillPending(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  if (record.deferred === true) return true;
  if (record.done === false) return true;
  if (record.status === "pending") return true;
  if (record.status === "in-flight") return true;
  if (record.status === "running") return true;
  return false;
}

export function isUnsupportedTerminalPlanRun(result: unknown): boolean {
  const value = result as { error?: unknown; value?: { error?: unknown } } | null | undefined;
  const text = String(value?.error ?? value?.value?.error ?? "").toLowerCase();
  return (
    text.includes("unknown command") ||
    text.includes("not found") ||
    text.includes("unsupported") ||
    text.includes("unrecognized") ||
    text.includes("no existe")
  );
}

export function normalizeBridgeValue(result: unknown): unknown {
  return (result as { value?: unknown })?.value ?? result ?? {};
}

export function buildTimingsEvidence(timings: unknown): Record<string, unknown> {
  return timings ? { timings } : {};
}

export interface RuntimeTerminalAdapterDeps {
  bridge: FileBridgePort;
  generateId: () => string;
  defaultTimeout?: number;
}

export type { FileBridgePort };

export interface RuntimeTerminalPort {
  runTerminalPlan(plan: TerminalPlan, options?: TerminalPortOptions): Promise<TerminalPortResult>;
  ensureSession(device: string): Promise<SessionResult>;
  pollTerminalJob(jobId: string): Promise<TerminalPortResult | null>;
}

export interface SessionResult {
  ok: boolean;
  sessionId?: string;
  error?: string;
}

export interface TerminalPortResult {
  ok: boolean;
  output: string;
  status: number;
  promptBefore: string;
  promptAfter: string;
  modeBefore: string;
  modeAfter: string;
  events: unknown[];
  warnings: string[];
  confidence: number;
  parsed?: unknown;
  evidence?: unknown;
}

export interface TerminalPortOptions {
  timeoutMs?: number;
  stallTimeoutMs?: number;
}