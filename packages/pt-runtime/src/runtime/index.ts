/**
 * PT Control V2 - Runtime Entry Point
 *
 * This is the main runtime function called from PT main.js
 * Usage: var result = runtime(payload, api);
 *
 * NOTE: This file is compiled to ES5 for Packet Tracer.
 * No imports/exports - all code is global scope compatible.
 */

import { runtimeDispatcher } from "../handlers/runtime-handlers";
import { initializeLogger, getLogger } from "./logger";
import { getMetrics } from "./metrics";
import { validatePayload } from "./payload-validator";
import {
  errorRecoveryMiddleware,
  rateLimitMiddleware,
  loggingMiddleware,
  metricsMiddleware,
  validationMiddleware,
} from "../core/built-in-middleware";
import { MiddlewarePipeline } from "../core/middleware";
import type { MiddlewareContext } from "../core/middleware";
import type { RuntimeApi, RuntimeResult, RuntimeDeferredResult } from "./contracts";

var _pipeline: MiddlewarePipeline | null = null;
var _initialized = false;

function getPipeline(): MiddlewarePipeline {
  if (!_pipeline) {
    _pipeline = new MiddlewarePipeline();
    _pipeline.use(errorRecoveryMiddleware);
    _pipeline.use(rateLimitMiddleware);
    _pipeline.use(loggingMiddleware);
    _pipeline.use(metricsMiddleware);
    _pipeline.use(validationMiddleware);
  }
  return _pipeline;
}

function initializeRuntime(api: RuntimeApi): void {
  if (_initialized) return;
  _initialized = true;

  initializeLogger({
    level: "info",
    transport: function (entry) {
      if (api.dprint) {
        api.dprint(JSON.stringify(entry));
      }
    },
  });

  getLogger("runtime").info("PT Runtime initialized", {
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
}

/**
 * Main runtime dispatcher
 * Called by PT Script Engine with: runtime(payload, api)
 *
 * @param payload - Command payload with type and parameters
 * @param api - RuntimeApi object injected by main.js kernel
 */
function runtime(payload: Record<string, unknown>, api: RuntimeApi): RuntimeResult {
  initializeRuntime(api);

  var metrics = getMetrics();
  var log = getLogger("runtime");

  try {
    if (payload.type === "__pollDeferred") {
      return handlePollDeferred(payload, api);
    }

    if (payload.type === "__hasPendingDeferred") {
      return handleHasPendingDeferred(api) as unknown as RuntimeResult;
    }

    var ctx: MiddlewareContext = {
      type: payload.type || "unknown",
      payload: payload,
      mutablePayload: Object.assign({}, payload),
      api: api,
      state: {},
      startedAt: Date.now(),
    };

    var pipeline = getPipeline();
    var result = runtimeDispatcher(ctx.mutablePayload, api);

    var r = result as RuntimeDeferredResult;
    if (r && r.ok && r.deferred && r.ticket && r.job) {
      var jobId = api.createJob ? api.createJob(r.job) : undefined;
      if (jobId) {
        r.ticket = jobId;
        log.info("Job created", { ticket: jobId });
      }
    }

    return result;
  } catch (error) {
    var message = error instanceof Error ? error.message : String(error);
    log.error("Runtime fatal error", { error: message });
    metrics.increment("runtime.fatal_error");

    return {
      ok: false,
      error: "Runtime error: " + message,
    };
  }
}

function handlePollDeferred(payload: Record<string, unknown>, api: RuntimeApi): RuntimeResult {
  const ticket = payload.ticket as string;
  if (!ticket) {
    return { ok: false, error: "Missing ticket" };
  }

  const jobState = api.getJobState(ticket);
  if (!jobState) {
    return { ok: false, error: "Job not found: " + ticket };
  }

  if (!jobState.finished) {
    return {
      done: false,
      state: jobState.state,
      currentStep: jobState.currentStep,
      totalSteps: jobState.plan.plan.length,
      outputTail: jobState.outputBuffer ? jobState.outputBuffer.slice(-500) : "",
    } as unknown as RuntimeResult;
  }

  return {
    done: true,
    ok: !jobState.error,
    result: jobState.result,
    error: jobState.error,
    errorCode: jobState.errorCode,
    output: jobState.outputBuffer,
  } as unknown as RuntimeResult;
}

function handleHasPendingDeferred(api: RuntimeApi): { pending: boolean } {
  if (!api.getActiveJobs) {
    return { pending: false };
  }

  const jobs = api.getActiveJobs();
  const hasPending = jobs && jobs.some((job) => !job.finished);

  return { pending: hasPending };
}

// Export for global scope
(globalThis as any).runtime = runtime;
export { runtime };
