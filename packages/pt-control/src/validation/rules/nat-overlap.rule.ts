// ============================================================================
// NAT Overlap Rule
// ============================================================================
//
// Detects overlapping NAT inside/outside networks.
//
// Placeholder implementation: NAT configuration is not fully modeled yet.
// In the future, this rule will:
// - Check if inside/outside networks overlap with existing NAT translations
// - Detect duplicate NAT mappings on the same interface
// - Flag when a NAT pool exhausts available addresses

import type { Rule } from "../rule";
import type { ValidationContext } from "../validation-context";

export const natOverlapRule: Rule = {
  id: "nat-overlap",
  appliesTo: ["configureNat", "configureSubinterface"],
  validate(_ctx: ValidationContext) {
    // Placeholder: NAT configuration modeling not yet implemented
    return [];
  },
};
