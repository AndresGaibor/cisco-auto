/**
 * Core runtime types
 * Used by all handlers and PT integration
 */

/** Payload sent to runtime handlers */
export interface HandlerPayload {
  type: string;
  [key: string]: unknown;
}

/** Dependencies injected to handlers */
export interface HandlerDependencies {
  ipc: any;
  dprint: (msg: string) => void;
}

/** Result returned from handlers */
export interface HandlerResult {
  ok: boolean;
  error?: string;
  value?: unknown;
}

/** Handler function type */
export type HandlerFunction = (
  payload: HandlerPayload,
  deps: HandlerDependencies
) => HandlerResult;

/** Handler registry */
export interface HandlerRegistry {
  [key: string]: HandlerFunction;
}
