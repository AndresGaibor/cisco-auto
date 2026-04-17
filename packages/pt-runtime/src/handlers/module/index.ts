// ============================================================================
// Module Handlers - Barrel export
// ============================================================================

export { MODULE_TYPE } from "./constants";

export { safeString, isHWICOrWIC, isNetworkModule } from "./helpers";

export {
  getSlotCountOrZero,
  getSlotTypeOrMinus,
  getModuleCountOrZero,
  getModuleAtOrNull,
  collectSlotCandidates,
  findBestSlot,
} from "./slot-finder";

export type { SlotCandidate } from "./slot-finder";

export {
  handleAddModule,
  handleRemoveModule,
  type AddModulePayload,
  type RemoveModulePayload,
} from "./handlers";
