// packages/pt-runtime/src/ports.ts
/**
 * Port interfaces — contracts between application layers.
 *
 * Used by core/dispatcher.ts and handlers/module.ts for dependency inversion.
 *
 * Note: These ports are NOT used by the compiled runtime.js build path.
 * The compiled runtime uses a Map-based dispatcher in handlers/runtime-handlers.ts
 * which bypasses these interfaces. Ports are retained for future extensibility
 * and alternative build paths.
 *
 * @deprecated Not used in active build path. See handlers/runtime-handlers.ts.
 */

import type { PtDeps } from "./pt-api/pt-deps.js";
import type { PtResult } from "./pt-api/pt-results.js";

export interface HandlerPayload {
  type: string;
  [key: string]: unknown;
}

export interface HandlerPort {
  readonly type: string;
  execute(payload: HandlerPayload, deps: PtDeps): PtResult | Promise<PtResult>;
}

export interface HandlerRegistryPort {
  register(handler: HandlerPort): void;
  getHandler(name: string): HandlerPort | undefined;
  getHandlerForType(type: string): HandlerPort | undefined;
  getAllHandlers(): readonly HandlerPort[];
  getAllSupportedTypes(): string[];
  clear(): void;
}

export interface DispatcherPort {
  dispatch(payload: HandlerPayload, deps: PtDeps): PtResult | Promise<PtResult>;
  registerHandler(handler: HandlerPort): void;
  supportsType(type: string): boolean;
  getSupportedTypes(): string[];
}

export type { PtDeps, PtResult, PtDeps as HandlerDeps, PtResult as HandlerResult };
