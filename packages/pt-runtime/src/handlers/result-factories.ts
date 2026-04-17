import type {
  PtResult,
  PtSuccessResult,
  PtErrorResult,
  PtDeferredResult,
} from "../pt-api/pt-results.js";
import type { DeferredJobPlan } from "../runtime/contracts";

export function createErrorResult(
  error: string,
  code?: string,
  extra: Partial<PtResult> = {},
): PtErrorResult {
  return {
    ok: false,
    error,
    code,
    ...extra,
  } as PtErrorResult;
}

export function createSuccessResult(
  data?: unknown,
  extra: Partial<PtResult> = {},
): PtSuccessResult {
  return {
    ok: true,
    ...(data && typeof data === "object" ? data : { value: data }),
    ...extra,
  } as PtSuccessResult;
}

export function createDeferredResult(ticket: string, plan: DeferredJobPlan): PtDeferredResult {
  return {
    ok: true,
    deferred: true,
    ticket,
    job: plan,
  } as PtDeferredResult;
}
