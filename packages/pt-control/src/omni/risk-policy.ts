// ============================================================================
// Risk Policy - Política de riesgo para capabilities
// ============================================================================

import type { CapabilityRisk, CapabilitySupportStatus, CapabilityRunResult } from "./capability-types.js";

interface RiskPolicy {
  allowedInSuites: string[];
  requiresConfirmation: boolean;
  skipOnFailure: boolean;
}

const RISK_POLICIES: Record<CapabilityRisk, RiskPolicy> = {
  safe: {
    allowedInSuites: ["device-basic", "link-basic", "terminal-core", "omni-safe", "workflow-basic", "verification-basic"],
    requiresConfirmation: false,
    skipOnFailure: false,
  },
  elevated: {
    allowedInSuites: ["device-basic", "link-basic", "module-basic", "host-basic", "omni-elevated", "workflow-basic"],
    requiresConfirmation: true,
    skipOnFailure: false,
  },
  dangerous: {
    allowedInSuites: ["omni-dangerous"],
    requiresConfirmation: true,
    skipOnFailure: true,
  },
  experimental: {
    allowedInSuites: ["omni-experimental"],
    requiresConfirmation: true,
    skipOnFailure: true,
  },
};

export function getRiskPolicy(risk: CapabilityRisk): RiskPolicy {
  return RISK_POLICIES[risk];
}

export function canRunInSuite(risk: CapabilityRisk, suite: string): boolean {
  const policy = RISK_POLICIES[risk];
  return policy.allowedInSuites.includes(suite);
}

export function classifyFromResult(result: CapabilityRunResult): CapabilitySupportStatus {
  if (!result.ok) {
    if (result.cleanupStatus === "failed") {
      return "dangerous";
    }
    return "broken";
  }

  if (result.cleanupStatus === "failed") {
    return "dangerous";
  }

  if (result.cleanupStatus === "partial") {
    return "partial";
  }

  if (result.confidence < 0.5) {
    return "unsupported";
  }

  if (result.warnings.length > 2) {
    return "partial";
  }

  return "supported";
}

export function shouldConfirm(risk: CapabilityRisk): boolean {
  return RISK_POLICIES[risk].requiresConfirmation;
}

export function shouldSkipOnFailure(risk: CapabilityRisk): boolean {
  return RISK_POLICIES[risk].skipOnFailure;
}