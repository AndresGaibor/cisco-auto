import type { PtDeps } from "../pt-api/pt-deps.js";
import type { PtResult } from "../pt-api/pt-results.js";

/** Dependencies injected into handlers */
export type HandlerDeps = PtDeps;

/** Handler result type */
export type HandlerResult = PtResult;

/** Error codes for structured error handling */
export const HandlerErrorCode = {
  DEVICE_NOT_FOUND: "DEVICE_NOT_FOUND",
  DEVICE_NOT_READY: "DEVICE_NOT_READY",
  INVALID_INPUT: "INVALID_INPUT",
  COMMAND_FAILED: "COMMAND_FAILED",
  SESSION_ERROR: "SESSION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  RECT_NOT_FOUND: "RECT_NOT_FOUND",
  DEVICE_CREATION_FAILED: "DEVICE_CREATION_FAILED",
  INVALID_PORT: "INVALID_PORT",
  UNSUPPORTED_OPERATION: "UNSUPPORTED_OPERATION",
} as const;

export type HandlerErrorCode =
  | (typeof HandlerErrorCode)[keyof typeof HandlerErrorCode]
  | string
  | undefined;

/** Structured error interface */
export interface HandlerError {
  ok: false;
  error: string;
  code: HandlerErrorCode;
  details?: unknown;
}

/** Helper function to create structured errors */
export function makeHandlerError(
  code: HandlerErrorCode,
  error: string,
  details?: unknown,
): HandlerError {
  return { ok: false, error, code, details };
}
