import type { HandlerDeps, HandlerResult } from "../utils/helpers";

export interface HandlerPayload {
  type: string;
  [key: string]: unknown;
}

export interface HandlerPort {
  readonly name: string;
  readonly supportedTypes: readonly string[];
  execute(payload: HandlerPayload, deps: HandlerDeps): HandlerResult | Promise<HandlerResult>;
}

export type { HandlerDeps, HandlerResult };
