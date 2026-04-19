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
