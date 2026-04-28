import { registerStableRuntimeHandlers } from "./stable-handlers.js";
import { registerExperimentalRuntimeHandlers } from "./experimental-handlers.js";
import { registerOmniRuntimeHandlers } from "./omni-handlers.js";

export interface RuntimeHandlerRegistrationOptions {
  experimental?: boolean;
  omni?: boolean;
}

/**
 * Registra handlers del runtime.
 *
 * Siempre registra handlers estables, omni y experimentales.
 * Los tres grupos se registran sin necesidad de opt-in.
 */
export function registerRuntimeHandlers(): void {
  registerStableRuntimeHandlers();
  registerOmniRuntimeHandlers();
  registerExperimentalRuntimeHandlers();
}

/**
 * Entrada usada por runtime-handlers.ts.
 *
 * Registra todos los handlers (estables, omni y experimentales) sin
 * necesidad de flags globales. El runtime debe tener disponibles
 * todos los comandos desde el inicio.
 */
export function registerRuntimeHandlersFromGlobals(): void {
  registerRuntimeHandlers();
}
