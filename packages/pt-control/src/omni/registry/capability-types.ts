// ============================================================================
// Capability Types - shared types for capability registry
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