// RuntimeTerminalAdapter — re-export from modular structure
// The implementation moved to runtime-terminal/ subdirectory.
// This file is kept for backwards compatibility with existing imports.

export { createRuntimeTerminalAdapter } from "./runtime-terminal/index.js";
export type { RuntimeTerminalAdapterDeps } from "./runtime-terminal/adapter.js";
export { normalizeStatus, normalizeRuntimeErrorStatus, detectHostMode } from "./runtime-terminal/status-normalizer.js";
export type { ExecInteractiveValue } from "./runtime-terminal/status-normalizer.js";
export { detectDeviceType } from "./runtime-terminal/device-type-detector.js";
export type { DeviceType } from "./runtime-terminal/device-type-detector.js";
export { ensureSession, pollTerminalJob } from "./runtime-terminal/terminal-session.js";

// New modular exports
export { createPayloadBuilder } from "./runtime-terminal/payload-builder.js";
export type { PayloadBuilder, BuildPayloadOptions } from "./runtime-terminal/payload-builder.js";

export { createResponseParser } from "./runtime-terminal/response-parser.js";
export type { ResponseParser, ParsedCommandResponse, ParseResponseOptions } from "./runtime-terminal/response-parser.js";

export { createEvidenceMapper } from "./runtime-terminal/evidence-mapper.js";
export type { EvidenceMapper, TerminalEvidence, SingleCommandEvidence } from "./runtime-terminal/evidence-mapper.js";

export { createRetryPolicy, mergePolicies } from "./runtime-terminal/retry-policy.js";
export type { RetryPolicy, RetryPolicyConfig, RetryContext, StepRetryPolicy, MergedPolicies } from "./runtime-terminal/retry-policy.js";

export { createTerminalPlanAdapter } from "./runtime-terminal/terminal-plan-adapter.js";
export type { TerminalPlanAdapter, PlanValidationResult, NormalizedPlan, NormalizedStep } from "./runtime-terminal/terminal-plan-adapter.js";