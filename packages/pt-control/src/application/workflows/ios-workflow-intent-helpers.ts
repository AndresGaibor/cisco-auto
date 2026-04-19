import type { PostVerificationSpec } from "../services/ios-post-verification.js";
import type { ScenarioEndToEndSpec } from "../services/scenario-end-to-end-verification-service.js";
import type { ExecutionPlan } from "../orchestration/index.js";

export function attachPostVerification(
  plan: ExecutionPlan,
  device: string,
  checks: PostVerificationSpec[],
): ExecutionPlan {
  return {
    ...plan,
    metadata: {
      ...plan.metadata,
      postVerification: {
        device,
        checks,
      },
    },
  };
}

export function attachScenarioVerification(
  plan: ExecutionPlan,
  scenario: ScenarioEndToEndSpec,
): ExecutionPlan {
  return {
    ...plan,
    metadata: {
      ...plan.metadata,
      scenarioVerification: scenario,
    },
  };
}