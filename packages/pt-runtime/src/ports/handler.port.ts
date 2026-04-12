import type { PtDeps } from "../pt-api/pt-deps.js";
import type { PtResult } from "../pt-api/pt-results.js";

export interface HandlerPayload {
  type: string;
  [key: string]: unknown;
}

export interface HandlerPort {
  readonly name: string;
  readonly supportedTypes: readonly string[];
  execute(payload: HandlerPayload, deps: PtDeps): PtResult | Promise<PtResult>;
}

export type { PtDeps as HandlerDeps } from "../pt-api/pt-deps.js";
export type { PtResult as HandlerResult } from "../pt-api/pt-results.js";
