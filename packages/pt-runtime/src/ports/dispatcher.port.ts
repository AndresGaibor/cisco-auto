import type { HandlerDeps, HandlerResult } from "../utils/helpers";
import type { HandlerPayload, HandlerPort } from "./handler.port";

export interface DispatcherPort {
  dispatch(payload: HandlerPayload, deps: HandlerDeps): HandlerResult | Promise<HandlerResult>;
  registerHandler(handler: HandlerPort): void;
  supportsType(type: string): boolean;
  getSupportedTypes(): string[];
}
