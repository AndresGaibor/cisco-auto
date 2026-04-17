// ============================================================================
// Payload Types for Module Operations
// ============================================================================

export interface AddModulePayload {
  type: "addModule";
  device: string;
  slot: string;
  module: string;
}

export interface RemoveModulePayload {
  type: "removeModule";
  device: string;
  slot: string;
}

// PT Module interface (from actual PT API)
export interface SlotCandidate {
  parent: import("../../pt-api/pt-api-registry").PTModule;
  label: string;
  slotIndex: number;
  slotType: number;
}
