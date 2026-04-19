// Tipos para diagnosis - Analiza fallos

import type { ExecutionEvidence } from "../../contracts/evidence";

export interface Diagnoser {
  diagnose(evidence: ExecutionEvidence): Promise<DiagnosisResult>;
}

export interface DiagnosisResult {
  failures: FailureRecord[];
  rootCause?: string;
}

export interface FailureRecord {
  type: FailureType;
  message: string;
  step?: string;
}

export type FailureType =
  | "transport"
  | "primitive"
  | "terminal-mode"
  | "prompt"
  | "capability-unsupported"
  | "risk-blocked"
  | "evidence-insufficient";

export interface TerminalDiagnoser extends Diagnoser {
  diagnoseTerminal(evidence: ExecutionEvidence): Promise<DiagnosisResult>;
}

export interface TopologyDiagnoser extends Diagnoser {
  diagnoseTopology(evidence: ExecutionEvidence): Promise<DiagnosisResult>;
}

export interface CapabilityDiagnoser extends Diagnoser {
  diagnoseCapability(evidence: ExecutionEvidence): Promise<DiagnosisResult>;
}