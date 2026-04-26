// RuntimeTerminal adapter — re-export barrel
// The original runtime-terminal-adapter.ts becomes a facade that delegates
// to the new modular structure.

export { createRuntimeTerminalAdapter } from "./adapter.js";
export type { RuntimeTerminalAdapterDeps } from "./adapter.js";

// Re-export public surface from original adapter for backwards compatibility
export type {
  ExecInteractiveValue,
} from "./status-normalizer.js";
export {
  normalizeStatus,
  normalizeRuntimeErrorStatus,
  detectHostMode,
} from "./status-normalizer.js";

export type { DeviceType } from "./device-type-detector.js";
export { detectDeviceType } from "./device-type-detector.js";

export { ensureSession, pollTerminalJob } from "./terminal-session.js";

// New modular exports
export { createPayloadBuilder } from "./payload-builder.js";
export type { PayloadBuilder, BuildPayloadOptions } from "./payload-builder.js";

export { createResponseParser } from "./response-parser.js";
export type { ResponseParser, ParsedCommandResponse, ParseResponseOptions } from "./response-parser.js";

export { createEvidenceMapper } from "./evidence-mapper.js";
export type { EvidenceMapper, TerminalEvidence, SingleCommandEvidence } from "./evidence-mapper.js";

export { createRetryPolicy, mergePolicies } from "./retry-policy.js";
export type { RetryPolicy, RetryPolicyConfig, RetryContext, StepRetryPolicy, MergedPolicies } from "./retry-policy.js";

export { createTerminalPlanAdapter } from "./terminal-plan-adapter.js";
export type { TerminalPlanAdapter, PlanValidationResult, NormalizedPlan, NormalizedStep } from "./terminal-plan-adapter.js";