import { registerStableRuntimeHandlers } from "./stable-handlers.js";

export interface RuntimeHandlerRegistrationOptions {
  experimental?: boolean;
  omni?: boolean;
}

/**
 * Runtime default: registra solo handlers estables.
 *
 * No importa omni/experimental aquí para que runtime.js default no cargue
 * handlers de inspección/evaluación/debug.
 */
export function registerRuntimeHandlers(_options?: RuntimeHandlerRegistrationOptions): void {
  registerStableRuntimeHandlers();
}

export function registerRuntimeHandlersFromGlobals(): void {
  registerRuntimeHandlers();
}