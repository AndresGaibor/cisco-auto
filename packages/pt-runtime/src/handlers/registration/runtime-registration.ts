import { registerStableRuntimeHandlers } from "./stable-handlers.js";
import { registerExperimentalRuntimeHandlers } from "./experimental-handlers.js";
import { registerOmniRuntimeHandlers } from "./omni-handlers.js";

export interface RuntimeHandlerRegistrationOptions {
  experimental?: boolean;
  omni?: boolean;
}

/**
 * Lee flags globales de forma compatible con Packet Tracer/QtScript.
 *
 * No usar process.env aquí porque este código puede terminar dentro de runtime.js.
 */
function getGlobalFlag(name: string): boolean {
  try {
    var scope = Function("return this")() as Record<string, unknown>;
    var value = scope[name];

    return value === true || value === 1 || value === "1" || value === "true";
  } catch {
    return false;
  }
}

/**
 * Registra handlers del runtime.
 *
 * Por defecto registra solo handlers estables.
 * Los handlers experimentales/omni requieren opt-in explícito.
 */
export function registerRuntimeHandlers(
  options: RuntimeHandlerRegistrationOptions = {},
): void {
  registerStableRuntimeHandlers();

  if (options.experimental) {
    registerExperimentalRuntimeHandlers();
  }

  if (options.omni) {
    registerExperimentalRuntimeHandlers();
    registerOmniRuntimeHandlers();
  }
}

/**
 * Entrada usada por runtime-handlers.ts.
 *
 * Permite opt-in por variables globales si main.js decide habilitarlas antes
 * de cargar runtime.js:
 *
 *   PT_ENABLE_EXPERIMENTAL_HANDLERS = true
 *   PT_ENABLE_OMNI_HANDLERS = true
 */
export function registerRuntimeHandlersFromGlobals(): void {
  registerRuntimeHandlers({
    experimental: getGlobalFlag("PT_ENABLE_EXPERIMENTAL_HANDLERS"),
    omni: getGlobalFlag("PT_ENABLE_OMNI_HANDLERS"),
  });
}
