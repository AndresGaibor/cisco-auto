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
  var res: any = {
    ok: false,
    error: error,
    code: code,
  };
  for (var key in extra) {
    if (Object.prototype.hasOwnProperty.call(extra, key)) {
      res[key] = (extra as any)[key];
    }
  }
  return res as PtErrorResult;
}

export function createSuccessResult(
  data?: unknown,
  extra: Partial<PtResult> = {},
): PtSuccessResult {
  var res: any = { ok: true };

  var dataObj = data && typeof data === "object" ? (data as any) : { value: data };
  for (var k1 in dataObj) {
    if (Object.prototype.hasOwnProperty.call(dataObj, k1)) {
      res[k1] = dataObj[k1];
    }
  }

  for (var k2 in extra) {
    if (Object.prototype.hasOwnProperty.call(extra, k2)) {
      res[k2] = (extra as any)[k2];
    }
  }

  return res as PtSuccessResult;
}

export function createDeferredResult(ticket: string, plan: DeferredJobPlan): PtDeferredResult {
  return {
    ok: true,
    deferred: true,
    ticket,
    job: plan,
  } as PtDeferredResult;
}
