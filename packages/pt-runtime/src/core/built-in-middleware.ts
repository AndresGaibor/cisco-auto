// packages/pt-runtime/src/core/built-in-middleware.ts
// Built-in middleware for pt-runtime

import type { MiddlewareFn, MiddlewareContext } from "./middleware";
import type { RuntimeResult } from "../runtime/contracts";
import { validatePayload } from "../runtime/payload-validator";
import { getLogger } from "../runtime/logger";
import { getMetrics } from "../runtime/metrics";

export var loggingMiddleware: MiddlewareFn = function(ctx, next) {
  var log = getLogger("dispatch");
  log.info("Dispatching", { type: ctx.type });
  var result = next();
  if (result.ok) {
    log.info("Dispatch completed", { type: ctx.type });
  } else {
    log.warn("Dispatch failed", { type: ctx.type, error: result.error });
  }
  return result;
};

export var metricsMiddleware: MiddlewareFn = function(ctx, next) {
  var metrics = getMetrics();
  metrics.increment("dispatch.request", { type: ctx.type });
  var result = next();
  if (result.ok) {
    metrics.increment("dispatch.success", { type: ctx.type });
  } else {
    metrics.increment("dispatch.error", { type: ctx.type, code: result.code || "unknown" });
  }
  return result;
};

export var validationMiddleware: MiddlewareFn = function(ctx, next) {
  var validation = validatePayload(ctx.type, ctx.mutablePayload);
  if (!validation.valid) {
    return {
      ok: false,
      error: "Payload validation failed: " + validation.errors.map(function(e) {
        return e.field + ": " + e.message;
      }).join("; "),
      code: "INVALID_PAYLOAD",
    };
  }
  return next();
};

export var rateLimitMiddleware: MiddlewareFn = (function() {
  var commandCounts: Record<string, number> = {};
  var lastReset = 0;
  var WINDOW_MS = 60000;
  var MAX_COMMANDS_PER_WINDOW = 300;

  return function(ctx, next) {
    var now = Date.now();
    if (now - lastReset > WINDOW_MS) {
      commandCounts = {};
      lastReset = now;
    }

    var key = ctx.type;
    commandCounts[key] = (commandCounts[key] || 0) + 1;

    if (commandCounts[key] > MAX_COMMANDS_PER_WINDOW) {
      return {
        ok: false,
        error: "Rate limit exceeded for command: " + ctx.type,
        code: "RATE_LIMITED",
      };
    }

    return next();
  };
})();

export var errorRecoveryMiddleware: MiddlewareFn = function(ctx, next) {
  try {
    return next();
  } catch (e) {
    var log = getLogger("dispatch");
    log.error("Unhandled exception in handler", {
      type: ctx.type,
      error: String(e),
    });
    return {
      ok: false,
      error: "Internal error: " + String(e),
      code: "HANDLER_EXCEPTION",
    };
  }
};
