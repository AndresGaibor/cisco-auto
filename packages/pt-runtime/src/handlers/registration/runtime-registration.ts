import { registerStableRuntimeHandlers } from "./stable-handlers.js";
import { registerExperimentalRuntimeHandlers } from "./experimental-handlers.js";
import { registerOmniHandlers } from "./omni-adapter.js";

export interface RuntimeHandlerRegistrationOptions {
  /**
   * Registra solo aliases de evaluación raw:
   * - __evaluate
   * - omni.evaluate.raw
   * - omni.raw
   *
   * No registra el paquete omni completo.
   */
  experimental?: boolean;

  /**
   * Reservado para activar omni completo en una fase futura.
   */
  omni?: boolean;
}

/**
 * Registro estable por defecto.
 *
 * Importante:
 * - registerRuntimeHandlers() mantiene comportamiento estable si no recibe opciones.
 * - registerRuntimeHandlersFromGlobals() es la ruta usada por runtime.js generado.
 */
export function registerRuntimeHandlers(options: RuntimeHandlerRegistrationOptions = {}): void {
  registerStableRuntimeHandlers();

  if (options.experimental === true) {
    registerExperimentalRuntimeHandlers();
  }

  if (options.omni === true) {
    registerOmniHandlers();
  }
}

export function registerRuntimeHandlersFromGlobals(): void {
  registerRuntimeHandlers({
    experimental: true,
  });
}