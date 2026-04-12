// packages/pt-runtime/src/core/middleware.ts
// Middleware — Pre/post processing for dispatched commands

import type { RuntimeResult, RuntimeApi } from "../runtime/contracts";

export interface MiddlewareContext {
  type: string;
  payload: Record<string, unknown>;
  mutablePayload: Record<string, unknown>;
  api: RuntimeApi;
  state: Record<string, unknown>;
  startedAt: number;
}

export type MiddlewareFn = (
  ctx: MiddlewareContext,
  next: () => RuntimeResult
) => RuntimeResult;

export class MiddlewarePipeline {
  private middlewares: MiddlewareFn[] = [];

  use(middleware: MiddlewareFn): void {
    this.middlewares.push(middleware);
  }

  remove(middleware: MiddlewareFn): void {
    var idx = this.middlewares.indexOf(middleware);
    if (idx >= 0) {
      this.middlewares.splice(idx, 1);
    }
  }

  execute(
    ctx: MiddlewareContext,
    handler: () => RuntimeResult
  ): RuntimeResult {
    var self = this;
    var index = 0;

    function dispatch(): RuntimeResult {
      if (index < self.middlewares.length) {
        var middleware = self.middlewares[index];
        index++;
        return middleware(ctx, dispatch);
      }
      return handler();
    }

    return dispatch();
  }

  list(): MiddlewareFn[] {
    return this.middlewares.slice();
  }

  clear(): void {
    this.middlewares = [];
  }
}
