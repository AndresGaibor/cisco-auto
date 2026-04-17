// ============================================================================
// Link Handlers - Barrel exports
// ============================================================================

import type { AddLinkPayload } from "./link-types";
import { handleAddLink as handleAddLinkFn } from "./add-link";
import { handleRemoveLink as handleRemoveLinkFn } from "./remove-link";

export type { AddLinkPayload } from "./link-types";
export { handleAddLink } from "./add-link";
export { handleRemoveLink } from "./remove-link";
export { isEndDevice } from "./device-classifier";
export { recommendCableType } from "./cable-recommender";

export class LinkHandler {
  readonly name = "link";
  readonly supportedTypes = ["addLink", "removeLink"];
  execute(payload: any, deps: any) {
    switch (payload.type) {
      case "addLink":
        return handleAddLinkFn(payload, deps);
      case "removeLink":
        return handleRemoveLinkFn(payload, deps);
      default:
        return { ok: false, error: "Unknown type", code: "INVALID_INPUT" };
    }
  }
}
