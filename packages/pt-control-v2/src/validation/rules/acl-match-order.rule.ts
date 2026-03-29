// ============================================================================
// ACL Match Order Rule
// ============================================================================
//
// Cisco ACLs process entries top-down and stop at first match.
// The most specific entries should come first.
//
// Placeholder implementation: ACL parsing infrastructure doesn't exist yet.
// In the future, this rule will:
// - Parse access-lists in running-config
// - Detect if more specific entries (e.g., "permit host 10.0.0.1") appear
//   after more general entries (e.g., "permit any")
// - Flag misconfigurations where traffic might be incorrectly permitted/denied

import type { Rule } from "../rule";
import type { ValidationContext } from "../validation-context";

export const aclMatchOrderRule: Rule = {
  id: "acl-match-order",
  appliesTo: ["generic"], // TODO: Change to ["configureAcl"] when ACL mutation exists
  validate(_ctx: ValidationContext) {
    // Placeholder: ACL parsing not yet implemented
    // In the future, validate that more specific ACEs come before general ones
    return [];
  },
};
