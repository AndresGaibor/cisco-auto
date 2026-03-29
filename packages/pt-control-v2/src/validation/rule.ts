// ============================================================================
// Rule Interface for Validation Engine
// ============================================================================

import type { Diagnostic } from "./diagnostic";
import type { ValidationContext, MutationKind } from "./validation-context";

export type AppliesTo = MutationKind[] | "*";

export interface Rule<TInput = unknown> {
  id: string;
  appliesTo: AppliesTo;
  validate(ctx: ValidationContext<TInput>): Diagnostic[];
}

export function ruleApplies(rule: Rule, kind: MutationKind): boolean {
  if (rule.appliesTo === "*") return true;
  return (rule.appliesTo as MutationKind[]).includes(kind);
}
