import type { HandlerDeps, HandlerPayload, HandlerPort, HandlerResult } from "../ports";
import type { HardwareCatalogPayload, HardwareInfoPayload, InspectPayload, SnapshotPayload } from "./inspect";
import { handleInspect, handleSnapshot } from "./inspect";

export class InspectHandler implements HandlerPort {
  readonly name = "inspect";
  readonly supportedTypes = ["inspect", "snapshot"] as const;

  execute(payload: HandlerPayload, deps: HandlerDeps): HandlerResult {
    switch (payload.type) {
      case "inspect":
        return handleInspect(payload as unknown as InspectPayload, deps);
      case "snapshot":
        return handleSnapshot(payload as unknown as SnapshotPayload, deps);
      default:
        return { ok: false, error: `Tipo de inspección desconocido: ${String(payload.type)}`, code: "UNSUPPORTED_OPERATION" };
    }
  }
}

export function createInspectHandler(): InspectHandler {
  return new InspectHandler();
}
