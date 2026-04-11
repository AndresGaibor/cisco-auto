import type { HandlerDeps, HandlerPayload, HandlerPort, HandlerResult } from "../ports";
import type { ConfigHostPayload } from "./config-types";
import { handleConfigHost } from "./config";

export class ConfigHandler implements HandlerPort {
  readonly name = "config";
  readonly supportedTypes = ["configHost"] as const;

  execute(payload: HandlerPayload, deps: HandlerDeps): HandlerResult {
    switch (payload.type) {
      case "configHost":
        return handleConfigHost(payload as unknown as ConfigHostPayload, deps);
      default:
        return { ok: false, error: `Tipo de configuración desconocido: ${String(payload.type)}`, code: "UNSUPPORTED_OPERATION" };
    }
  }
}

export function createConfigHandler(): ConfigHandler {
  return new ConfigHandler();
}
