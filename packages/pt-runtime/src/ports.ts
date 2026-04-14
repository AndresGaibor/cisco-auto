// packages/pt-runtime/src/ports.ts
// Puertos interfaces - definir contracts entre capas
// TODO: Completar implementación según arquitectura definida

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
