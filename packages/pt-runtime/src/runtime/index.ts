/**
 * PT Control V2 - Runtime Entry Point
 *
 * This is the main runtime function called from PT main.js
 * Usage: var result = runtime(payload, api);
 *
 * NOTE: This file is compiled to ES5 for Packet Tracer.
 * No imports/exports - all code is global scope compatible.
 */

declare function print(msg: string): void;

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
  if (!_initialized) {
    _initialized = true;

    var transportRobusto = function (entry: any) {
      try {
        if (api.dprint) {
          api.dprint(JSON.stringify(entry));
        } else {
          var fallbackMsg = "[LOG FALLBACK] " + JSON.stringify(entry);
          if (
            typeof globalThis !== "undefined" &&
            (globalThis as any).ipc &&
            (globalThis as any).ipc.appWindow &&
            (globalThis as any).ipc.appWindow().writeToPT
          ) {
            (globalThis as any).ipc.appWindow().writeToPT(fallbackMsg + "\n");
          } else if (typeof print === "function") {
            print(fallbackMsg);
          } else {
            console.error(fallbackMsg);
          }
        }
      } catch (e) {
        console.error("[LOG TRANSPORT ERROR]", JSON.stringify(entry), "Error:", e);
      }
    };

    initializeLogger({
      level: "info",
      transport: transportRobusto,
    });

    getLogger("runtime").info("PT Runtime initialized", {
      version: "1.0.0",
      timestamp: new Date().toISOString(),
    });
  }
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
      var pollLog = log.withCommand("__pollDeferred");
      pollLog.debug("Runtime entrada __pollDeferred", {
        ticket: payload.ticket,
      });

      var pollResult = handlePollDeferred(payload, api);

      pollLog.debug("Runtime resultado __pollDeferred", {
        done: (pollResult as any).done,
        ok: (pollResult as any).ok,
        error: (pollResult as any).error,
      });

      return pollResult;
    }

    if (payload.type === "__hasPendingDeferred") {
      var hasPendingLog = log.withCommand("__hasPendingDeferred");
      hasPendingLog.debug("Runtime entrada __hasPendingDeferred", {});

      var hasPendingResult = handleHasPendingDeferred(api);

      hasPendingLog.debug("Runtime resultado __hasPendingDeferred", {
        pending: hasPendingResult.pending,
      });

      return hasPendingResult as unknown as RuntimeResult;
    }

    var commandType = String(payload.type || "unknown");
    var payloadKeys = Object.keys(payload);

    log.debug("Runtime entrada", {
      commandType: commandType,
      payloadKeys: payloadKeys,
    });

    var mutablePayload: Record<string, unknown> = {};
    for (var key in payload) {
      if (Object.prototype.hasOwnProperty.call(payload, key)) {
        mutablePayload[key] = payload[key];
      }
    }

    var ctx: MiddlewareContext = {
      type: commandType,
      payload: payload,
      mutablePayload: mutablePayload,
      api: api,
      state: {},
      startedAt: Date.now(),
    };

    var pipeline = getPipeline();

    log.debug("Runtime dispatch", { commandType: commandType });

    var result = runtimeDispatcher(ctx.mutablePayload, api);

    var r = result as RuntimeDeferredResult;
    if (r && r.ok && r.deferred && r.ticket && r.job) {
      var jobId = api.createJob ? api.createJob(r.job) : undefined;
      if (jobId) {
        r.ticket = jobId;
        log.info("Job created", { ticket: jobId });
      }
    }

    var rAny = r as any;
    log.debug("Runtime resultado", {
      commandType: commandType,
      ok: rAny.ok,
      deferred: rAny.deferred,
      ticket: rAny.ticket,
      error: rAny.error,
    });

    return result;
  } catch (error) {
    var errMsg = error instanceof Error ? error.message : String(error);
    var errStack = error instanceof Error ? error.stack : undefined;
    log.error("Runtime fatal error", {
      error: errMsg,
      stack: errStack,
      payloadType: payload.type,
    });
    metrics.increment("runtime.fatal_error");

    return {
      ok: false,
      error: "Runtime error: " + errMsg,
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

declare var self: any;

// Export for global scope
var _global =
  typeof self !== "undefined"
    ? self
    : typeof this !== "undefined"
      ? this
      : Function("return this")();
(_global as any).runtime = runtime;
export { runtime };
