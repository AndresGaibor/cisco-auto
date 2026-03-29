// ============================================================================
// Validation Engine - Core
// ============================================================================

import type { Diagnostic } from "./diagnostic";
import type { ValidationContext } from "./validation-context";
import type { Rule } from "./rule";
import { ruleApplies } from "./rule";
import type { ValidationPolicy } from "./policies";

export interface ValidationResult {
  diagnostics: Diagnostic[];
  blocked: boolean;
}

export class ValidationEngine {
  constructor(
    private readonly rules: Rule[],
    private readonly policy: ValidationPolicy,
  ) {}

  run<TInput>(ctx: ValidationContext<TInput>): ValidationResult {
    const diagnostics: Diagnostic[] = [];

    for (const rule of this.rules) {
      if (!ruleApplies(rule, ctx.mutation.kind)) continue;
      diagnostics.push(...rule.validate(ctx));
    }

    return {
      diagnostics,
      blocked: this.policy.shouldBlock(diagnostics),
    };
  }

  preflight<TInput>(ctx: Omit<ValidationContext<TInput>, "phase">): ValidationResult {
    return this.run({ ...ctx, phase: "preflight" });
  }

  postflight<TInput>(ctx: Omit<ValidationContext<TInput>, "phase">): ValidationResult {
    return this.run({ ...ctx, phase: "postflight" });
  }

  addRule(rule: Rule): void {
    this.rules.push(rule);
  }

  removeRule(ruleId: string): void {
    const index = this.rules.findIndex((r) => r.id === ruleId);
    if (index !== -1) {
      this.rules.splice(index, 1);
    }
  }
}
