import type { HandlerDeps, HandlerPayload, HandlerPort, HandlerResult } from "../ports";
import type { AddLinkPayload } from "./link";
import { handleAddLink, handleRemoveLink } from "./link";

export class LinkHandler implements HandlerPort {
  readonly name = "link";
  readonly supportedTypes = ["addLink", "removeLink"] as const;

  execute(payload: HandlerPayload, deps: HandlerDeps): HandlerResult {
    switch (payload.type) {
      case "addLink":
        return handleAddLink(payload as unknown as AddLinkPayload, deps);
      case "removeLink":
        return handleRemoveLink(payload as unknown as { device: string; port: string }, deps);
      default:
        return { ok: false, error: `Tipo de enlace desconocido: ${String(payload.type)}`, code: "UNSUPPORTED_OPERATION" };
    }
  }
}

export function createLinkHandler(): LinkHandler {
  return new LinkHandler();
}
