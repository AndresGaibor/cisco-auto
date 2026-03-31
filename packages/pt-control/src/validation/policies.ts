// ============================================================================
// Validation Policies
// ============================================================================

import type { Diagnostic } from "./diagnostic";

export type ValidationPolicyName = "soft" | "normal" | "strict";

export interface ValidationPolicy {
  name: ValidationPolicyName;
  shouldBlock(diagnostics: Diagnostic[]): boolean;
}

export const softPolicy: ValidationPolicy = {
  name: "soft",
  shouldBlock(diagnostics) {
    return diagnostics.some((d) => d.severity === "error" && d.blocking);
  },
};

export const normalPolicy: ValidationPolicy = {
  name: "normal",
  shouldBlock(diagnostics) {
    return diagnostics.some((d) => d.severity === "error");
  },
};

export const strictPolicy: ValidationPolicy = {
  name: "strict",
  shouldBlock(diagnostics) {
    return diagnostics.some((d) => d.severity === "error" || d.blocking);
  },
};

export function createPolicy(name: ValidationPolicyName): ValidationPolicy {
  switch (name) {
    case "soft":
      return softPolicy;
    case "normal":
      return normalPolicy;
    case "strict":
      return strictPolicy;
  }
}
