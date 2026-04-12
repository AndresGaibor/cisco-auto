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

function initializeRuntime(api: any): void {
  if (_initialized) return;
  _initialized = true;

  initializeLogger({
    level: api.dprint ? "info" : "debug",
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
function runtime(payload: any, api: any): any {
  initializeRuntime(api);

  var metrics = getMetrics();
  var log = getLogger("runtime");

  try {
    if (payload.type === "__pollDeferred") {
      return handlePollDeferred(payload, api);
    }

    if (payload.type === "__hasPendingDeferred") {
      return handleHasPendingDeferred(api);
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
    var result = pipeline.execute(ctx, function () {
      return runtimeDispatcher(ctx.mutablePayload, api);
    });

    var r = result as any;
    if (r && r.deferred && r.ticket && r.job) {
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

function handlePollDeferred(payload: any, api: any): any {
  const ticket = payload.ticket;
  if (!ticket) {
    return { ok: false, error: "Missing ticket" };
  }

  const getJobState = (api as any).getJobState;
  if (!getJobState) {
    return { ok: false, error: "API does not support getJobState" };
  }

  const jobState = getJobState(ticket);
  if (!jobState) {
    return { done: true, ok: false, error: "Job not found: " + ticket };
  }

  if (!jobState.done) {
    return {
      done: false,
      state: jobState.state,
      currentStep: jobState.currentStep,
      totalSteps: jobState.totalSteps,
      outputTail: jobState.outputTail,
    };
  }

  return {
    done: true,
    ok: !jobState.error,
    result: jobState.result,
    error: jobState.error,
    errorCode: jobState.errorCode,
    output: jobState.output,
  };
}

function handleHasPendingDeferred(api: any): any {
  const getActiveJobs = (api as any).getActiveJobs;
  if (!getActiveJobs) {
    return { pending: false };
  }

  const jobs = getActiveJobs();
  const hasPending = jobs && jobs.some((job: any) => !job.finished);

  return { pending: hasPending };
}

// Export for global scope
(globalThis as any).runtime = runtime;
export { runtime };
