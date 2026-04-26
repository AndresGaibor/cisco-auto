// ============================================================================
// Capability Registry - Thin barrel re-exporting from registry/
// ============================================================================

// Re-export all capability types and query API from the modular registry
export {
  getCapability,
  listCapabilities,
  filterCapabilities,
  capabilityExists,
} from "./registry/index.js";

export type {
  CapabilitySpec,
  CapabilityDomain,
  CapabilityKind,
  CapabilityRisk,
  Prerequisite,
  ExpectedEvidence,
  SupportPolicy,
  CapabilityAction,
} from "./registry/index.js";