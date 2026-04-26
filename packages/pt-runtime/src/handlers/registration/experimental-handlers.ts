import type { HandlerFn } from "../dispatcher.js";
import { registerHandler } from "../dispatcher.js";
import { handleEvaluate } from "../evaluate.js";

let experimentalHandlersRegistered = false;

/**
 * Handlers experimentales.
 *
 * Estos handlers permiten evaluación arbitraria o capacidades no operativas.
 * No deben registrarse en el runtime estable por defecto.
 */
export function registerExperimentalRuntimeHandlers(): void {
  if (experimentalHandlersRegistered) {
    return;
  }

  experimentalHandlersRegistered = true;

  registerHandler("__evaluate", handleEvaluate as unknown as HandlerFn);
  registerHandler("omni.evaluate.raw", handleEvaluate as unknown as HandlerFn);
}
