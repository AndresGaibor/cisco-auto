import type { PtDeps } from "../pt-api/pt-deps.js";
import type { PtResult } from "../pt-api/pt-results.js";
import type { HandlerPayload, HandlerPort } from "./handler.port";

export interface DispatcherPort {
  dispatch(payload: HandlerPayload, deps: PtDeps): PtResult | Promise<PtResult>;
  registerHandler(handler: HandlerPort): void;
  supportsType(type: string): boolean;
  getSupportedTypes(): string[];
}
