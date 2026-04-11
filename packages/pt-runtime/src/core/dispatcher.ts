import type { DispatcherPort, HandlerDeps, HandlerPayload, HandlerResult, HandlerPort } from "../ports";
import { HandlerRegistry, globalRegistry } from "./registry";

function crearError(code: string, error: string): HandlerResult {
  return { ok: false, error, code };
}

export class RuntimeDispatcher implements DispatcherPort {
  constructor(private readonly registry: HandlerRegistry = globalRegistry) {}

  dispatch(payload: HandlerPayload, deps: HandlerDeps): HandlerResult | Promise<HandlerResult> {
    if (!payload || typeof payload !== "object") {
      return crearError("INVALID_INPUT", "Payload inválido");
    }

    if (typeof payload.type !== "string" || payload.type.length === 0) {
      return crearError("INVALID_INPUT", "Falta payload.type");
    }

    const handler = this.registry.getHandlerForType(payload.type);
    if (!handler) {
      return crearError("UNSUPPORTED_OPERATION", `Tipo de payload desconocido: ${payload.type}`);
    }

    try {
      return handler.execute(payload, deps);
    } catch (error) {
      return crearError("INTERNAL_ERROR", String(error));
    }
  }

  registerHandler(handler: HandlerPort): void {
    this.registry.register(handler);
  }

  supportsType(type: string): boolean {
    return this.registry.getHandlerForType(type) !== undefined;
  }

  getSupportedTypes(): string[] {
    return this.registry.getAllSupportedTypes();
  }
}

export const globalDispatcher = new RuntimeDispatcher();
