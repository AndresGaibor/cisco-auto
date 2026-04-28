import type { HandlerFn } from "../dispatcher.js";
import { registerHandler } from "../dispatcher.js";
import { handleEvaluate } from "../evaluate.js";

let experimentalHandlersRegistered = false;

/**
 * Handlers experimentales.
 *
 * Estos handlers permiten evaluación arbitraria o capacidades no operativas.
 * No deben registrarse en el runtime estable por defecto.
 *
 * Se registran tres aliases para el mismo handler:
 * - __evaluate (legacy)
 * - omni.evaluate.raw (nuevo)
 * - omni.raw (corto)
 */
export function registerExperimentalRuntimeHandlers(): void {
  if (experimentalHandlersRegistered) {
    return;
  }

  experimentalHandlersRegistered = true;

  registerHandler("__evaluate", handleEvaluate as unknown as HandlerFn);
  registerHandler("omni.evaluate.raw", handleEvaluate as unknown as HandlerFn);
  registerHandler("omni.raw", handleEvaluate as unknown as HandlerFn);
}
