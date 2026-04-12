import type {
  DeferredJobPlan,
  RuntimeDeferredResult,
  RuntimeErrorResult,
  RuntimeResult,
  RuntimeSuccessResult,
  SessionStateSnapshot,
} from "../runtime/contracts.js";

export const PtErrorCode = {
  DEVICE_NOT_FOUND: "DEVICE_NOT_FOUND",
  NO_TERMINAL: "NO_TERMINAL",
  NO_NETWORK: "NO_NETWORK",
  NO_PORTS: "NO_PORTS",
  INVALID_INPUT: "INVALID_INPUT",
  INVALID_MODEL: "INVALID_MODEL",
  INVALID_PORT: "INVALID_PORT",
  INVALID_CABLE: "INVALID_CABLE",
  DEVICE_CREATION_FAILED: "DEVICE_CREATION_FAILED",
  COMMAND_FAILED: "COMMAND_FAILED",
  COMMAND_TIMEOUT: "COMMAND_TIMEOUT",
  IOS_JOB_FAILED: "IOS_JOB_FAILED",
  ENABLE_PASSWORD_REQUIRED: "ENABLE_PASSWORD_REQUIRED",
  INITIAL_DIALOG_BLOCKING: "INITIAL_DIALOG_BLOCKING",
  UNSUPPORTED_OPERATION: "UNSUPPORTED_OPERATION",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  DISPATCH_ERROR: "DISPATCH_ERROR",
  UNKNOWN_COMMAND: "UNKNOWN_COMMAND",
} as const;

export type PtErrorCode = (typeof PtErrorCode)[keyof typeof PtErrorCode];

interface PtResultBase {
  source?: "terminal" | "synthetic" | "unknown";
  session?: SessionStateSnapshot;
}

export interface PtSuccessResult extends PtResultBase {
  ok: true;
  value?: unknown;
  raw?: string;
  parsed?: Record<string, unknown>;
  parseError?: string;
  status?: number;
  [key: string]: unknown;
}

export interface PtErrorResult extends PtResultBase {
  ok: false;
  error: string;
  code?: PtErrorCode | string;
  raw?: string;
  details?: unknown;
}

export interface PtDeferredResult extends PtResultBase {
  ok: true;
  deferred: true;
  ticket: string;
  job: DeferredJobPlan;
}

export type PtResult = PtSuccessResult | PtErrorResult | PtDeferredResult;

export function ptSuccess(data?: Record<string, unknown>): PtSuccessResult {
  return { ok: true, ...(data ?? {}) };
}

export function ptError(error: string, code?: PtErrorCode | string, extra?: Record<string, unknown>): PtErrorResult {
  return { ok: false, error, code, ...(extra ?? {}) };
}

export function ptDeferred(ticket: string, job: DeferredJobPlan): PtDeferredResult {
  return { ok: true, deferred: true, ticket, job };
}

export function isDeferredResult(result: PtResult): result is PtDeferredResult {
  return result.ok === true && "deferred" in result && result.deferred === true;
}

export function isErrorResult(result: PtResult): result is PtErrorResult {
  return result.ok === false;
}

export type { DeferredJobPlan, RuntimeDeferredResult, RuntimeErrorResult, RuntimeResult, RuntimeSuccessResult };
