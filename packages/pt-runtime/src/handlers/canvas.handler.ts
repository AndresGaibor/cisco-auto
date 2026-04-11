import type { HandlerDeps, HandlerPayload, HandlerPort, HandlerResult } from "../ports";
import type { DevicesInRectPayload, GetRectPayload, ListCanvasRectsPayload } from "./canvas";
import { handleDevicesInRect, handleGetRect, handleListCanvasRects } from "./canvas";

export class CanvasHandler implements HandlerPort {
  readonly name = "canvas";
  readonly supportedTypes = ["listCanvasRects", "getRect", "devicesInRect"] as const;

  execute(payload: HandlerPayload, deps: HandlerDeps): HandlerResult {
    switch (payload.type) {
      case "listCanvasRects":
        return handleListCanvasRects(payload as unknown as ListCanvasRectsPayload, deps);
      case "getRect":
        return handleGetRect(payload as unknown as GetRectPayload, deps);
      case "devicesInRect":
        return handleDevicesInRect(payload as unknown as DevicesInRectPayload, deps);
      default:
        return { ok: false, error: `Tipo de canvas desconocido: ${String(payload.type)}`, code: "UNSUPPORTED_OPERATION" };
    }
  }
}

export function createCanvasHandler(): CanvasHandler {
  return new CanvasHandler();
}
