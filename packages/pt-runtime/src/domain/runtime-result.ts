// packages/pt-runtime/src/domain/runtime-result.ts
import type { 
  RuntimeResult, 
  RuntimeErrorResult, 
  RuntimeSuccessResult, 
  RuntimeDeferredResult,
  SessionStateSnapshot,
  DeferredJobPlan
} from "./contracts";

export type { RuntimeResult, RuntimeErrorResult, RuntimeSuccessResult, RuntimeDeferredResult };

export function okResult(
  raw?: string,
  options?: { status?: number; parsed?: Record<string, unknown>; session?: SessionStateSnapshot }
): RuntimeSuccessResult {
  return {
    ok: true,
    raw,
    status: options?.status,
    parsed: options?.parsed,
    session: options?.session,
  };
}

export function errorResult(
  error: string,
  options?: { code?: string; raw?: string; session?: SessionStateSnapshot }
): RuntimeErrorResult {
  return {
    ok: false,
    error,
    code: options?.code,
    raw: options?.raw,
    session: options?.session,
  };
}

export function deferredResult(ticket: string, job: DeferredJobPlan): RuntimeDeferredResult {
  return {
    ok: true,
    deferred: true,
    ticket,
    job,
  };
}
