// ============================================================================
// Capability Types - Modelo de capabilities para omni
// ============================================================================

export type CapabilityKind = "primitive" | "workflow" | "hack";

export type CapabilityDomain =
  | "device"
  | "link"
  | "module"
  | "host"
  | "terminal"
  | "snapshot"
  | "assessment"
  | "evaluate"
  | "environment"
  | "process"
  | "global-scope"
  | "verification"
  | "diagnosis"
  | "orchestration";

export type CapabilityRisk = "safe" | "elevated" | "dangerous" | "experimental";

export type CapabilitySupportStatus =
  | "supported"
  | "partial"
  | "flaky"
  | "unsupported"
  | "broken"
  | "dangerous"
  | "experimental";

export type CleanupStatus = "success" | "partial" | "failed" | "skipped";

export interface Prerequisite {
  type: "device" | "link" | "module" | "file" | "port" | "capability";
  constraint: string;
}

export interface ExpectedEvidence {
  fields: Record<
    string,
    { required: boolean; type: string }
  >;
}

export interface SupportPolicy {
  minRunsForSupported: number;
  flakinessThreshold: number;
  timeoutMs: number;
}

export interface CapabilityAction {
  type: "primitive" | "terminal" | "hack" | "workflow";
  handler?: string;
  adapter?: string;
  plan?: string;
  code?: string;
}

export interface CapabilitySpec {
  id: string;
  title: string;
  domain: CapabilityDomain;
  kind: CapabilityKind;
  risk: CapabilityRisk;
  description: string;
  tags: string[];
  prerequisites: Prerequisite[];
  setup: CapabilityAction;
  execute: CapabilityAction;
  cleanup: CapabilityAction;
  expectedEvidence: ExpectedEvidence;
  supportPolicy: SupportPolicy;
}

export interface CapabilityRunResult {
  runId: string;
  capabilityId: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  environment: EnvironmentFingerprint;
  ok: boolean;
  supportStatus: CapabilitySupportStatus;
  warnings: string[];
  evidence: Record<string, unknown>;
  confidence: number;
  error?: string;
  cleanupStatus: CleanupStatus;
  cleanupError?: string;
}

export interface EnvironmentFingerprint {
  ptVersion?: string;
  hostPlatform: string;
  nodeVersion: string;
  executionMode: string;
  runtimeDeployed?: string;
  timestamp: number;
}

export interface SupportMatrixEntry {
  capabilityId: string;
  status: CapabilitySupportStatus;
  totalRuns: number;
  successRuns: number;
  failedRuns: number;
  flakyRuns: number;
  averageConfidence: number;
  minConfidence: number;
  maxConfidence: number;
  averageDurationMs: number;
  lastRun: number;
  firstRun: number;
  lastEnvironment: EnvironmentFingerprint;
}

export type RegressionResult =
  | "unchanged"
  | "improved"
  | "regressed"
  | "newly-supported"
  | "newly-broken"
  | "insufficient-data";

export interface RegressionComparison {
  capabilityId: string;
  baselineRunId: string;
  currentRunId: string;
  baselineStatus: CapabilitySupportStatus;
  currentStatus: CapabilitySupportStatus;
  statusChanged: boolean;
  baselineConfidence: number;
  currentConfidence: number;
  confidenceDelta: number;
  baselineRuns: number;
  currentRuns: number;
  result: RegressionResult;
}