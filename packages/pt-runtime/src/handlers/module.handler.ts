import type { HandlerDeps, HandlerPayload, HandlerPort, HandlerResult } from "../ports";
import type { AddModulePayload, RemoveModulePayload } from "./module";
import { handleAddModule, handleRemoveModule } from "./module";

export class ModuleHandler implements HandlerPort {
  readonly name = "module";
  readonly supportedTypes = ["addModule", "removeModule"] as const;

  execute(payload: HandlerPayload, deps: HandlerDeps): HandlerResult {
    switch (payload.type) {
      case "addModule":
        return handleAddModule(payload as unknown as AddModulePayload, deps);
      case "removeModule":
        return handleRemoveModule(payload as unknown as RemoveModulePayload, deps);
      default:
        return { ok: false, error: `Tipo de módulo desconocido: ${String(payload.type)}`, code: "UNSUPPORTED_OPERATION" };
    }
  }
}

export function createModuleHandler(): ModuleHandler {
  return new ModuleHandler();
}
