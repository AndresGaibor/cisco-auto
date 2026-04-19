export type StepKind = "primitive" | "terminal-plan" | "omni-capability" | "verification" | "diagnosis" | "cleanup";

export interface ExecutionStep {
  id: string;
  kind: StepKind;
  actionType: string;
  runtimePrimitiveId?: string;
  terminalPlan?: any;
  omniCapabilityId?: string;
  payload: unknown;
  optional: boolean;
  retryPolicy?: any;
  rollbackHint?: string;
  metadata?: Record<string, unknown>;
}

export interface ExecutionPlan {
  id: string;
  intentId: string;
  strategy: string;
  steps: ExecutionStep[];
  policies?: any;
  fallbacks?: string[];
  expectedEvidence?: any;
  successCriteria?: any;
}