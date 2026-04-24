import type {
  DeferredJobPlan,
  RuntimeDeferredResult,
  RuntimeErrorResult,
  RuntimeResult,
  RuntimeSuccessResult,
  SessionStateSnapshot,
} from "../runtime/contracts.js";

/**
 * Códigos de error estándar para operaciones PT.
 * Usados en PtErrorResult para identificar el tipo de falla.
 */
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

/**
 * Resultado exitoso de una operación PT.
 * Incluye value, raw output, parsed data, y session state.
 */
export interface PtSuccessResult extends PtResultBase {
  ok: true;
  value?: unknown;
  raw?: string;
  parsed?: Record<string, unknown>;
  parseError?: string;
  status?: number;
  [key: string]: unknown;
}

/**
 * Resultado de error de una operación PT.
 * Incluye mensaje de error, código, y detalles adicionales.
 */
export interface PtErrorResult extends PtResultBase {
  ok: false;
  error: string;
  code?: PtErrorCode | string;
  raw?: string;
  details?: unknown;
}

/**
 * Resultado diferido - la operación continúa en background.
 * El ticket permite hacer polling del estado del job.
 */
export interface PtDeferredResult extends PtResultBase {
  ok: true;
  deferred: true;
  ticket: string;
  job: DeferredJobPlan;
}

export type PtResult = PtSuccessResult | PtErrorResult | PtDeferredResult;

/**
 * Crea un resultado exitoso con datos opcionales.
 * Fusiona los datos en el result preserving el ok: true.
 * 
 * @param data - Datos opcionales a incluir en el resultado
 * @returns PtSuccessResult con los datos incluidos
 */
export function ptSuccess(data?: Record<string, unknown>): PtSuccessResult {
  var res: PtSuccessResult = { ok: true };
  if (data) {
    for (var key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        (res as any)[key] = data[key];
      }
    }
  }
  return res;
}

/**
 * Crea un resultado de error con mensaje y código.
 * 
 * @param error - Mensaje de error descriptivo
 * @param code - Código de error (ej: "DEVICE_NOT_FOUND")
 * @param extra - Datos adicionales a incluir en el resultado
 * @returns PtErrorResult con la información de error
 */
export function ptError(
  error: string,
  code?: PtErrorCode | string,
  extra?: Record<string, unknown>,
): PtErrorResult {
  var res: PtErrorResult = { ok: false, error: error, code: code };
  if (extra) {
    for (var key in extra) {
      if (Object.prototype.hasOwnProperty.call(extra, key)) {
        (res as any)[key] = extra[key];
      }
    }
  }
  return res;
}

/**
 * Crea un resultado diferido - la operación se ejecuta en background.
 * 
 * @param ticket - ID del job para hacer polling
 * @param job - Plan de ejecución del job
 * @returns PtDeferredResult con ticket y job
 */
export function ptDeferred(ticket: string, job: DeferredJobPlan): PtDeferredResult {
  return { ok: true, deferred: true, ticket, job };
}

/**
 * Type guard para verificar si un resultado es deferred.
 * 
 * @param result - Resultado a verificar
 * @returns true si es PtDeferredResult
 */
export function isDeferredResult(result: PtResult): result is PtDeferredResult {
  return result.ok === true && "deferred" in result && result.deferred === true;
}

/**
 * Type guard para verificar si un resultado es error.
 * 
 * @param result - Resultado a verificar
 * @returns true si es PtErrorResult
 */
export function isErrorResult(result: PtResult): result is PtErrorResult {
  return result.ok === false;
}

export type { DeferredJobPlan, RuntimeDeferredResult, RuntimeErrorResult, RuntimeResult, RuntimeSuccessResult };
