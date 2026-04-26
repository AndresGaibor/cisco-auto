// ============================================================================
// Capability Risk Utilities
// ============================================================================

import type { CapabilityRisk, CapabilitySpec } from "./capability-types.js";

/**
 * Returns true if risk level is considered elevated or higher
 */
export function isElevatedRisk(risk: CapabilityRisk): boolean {
  return risk === "elevated" || risk === "dangerous";
}

/**
 * Returns true if the capability carries any risk requiring caution
 */
export function isRiskyCapability(spec: CapabilitySpec): boolean {
  return isElevatedRisk(spec.risk);
}

/**
 * Human-readable risk label for display
 */
export function riskLabel(risk: CapabilityRisk): string {
  switch (risk) {
    case "safe":
      return "Safe";
    case "elevated":
      return "Elevated Risk";
    case "dangerous":
      return "Dangerous";
    case "experimental":
      return "Experimental";
  }
}