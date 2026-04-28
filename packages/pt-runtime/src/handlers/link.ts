// ============================================================================
// Link Handlers - Barrel exports
// ============================================================================

export type { AddLinkPayload } from "./link-types";
export { handleAddLink } from "./add-link";
export { handleRemoveLink } from "./remove-link";
export { handleVerifyLink } from "./verify-link";
export { handleListLinks } from "./list-links";
export { isEndDevice } from "./device-classifier";
export { recommendCableType } from "./cable-recommender";
