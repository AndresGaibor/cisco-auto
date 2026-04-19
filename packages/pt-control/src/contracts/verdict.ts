import type { ExecutionEvidence } from "./evidence.js";

export type VerdictStatus = "success" | "partial" | "failed" | "flaky" | "unsupported" | "dangerous";

export interface ExecutionVerdict {
  ok: boolean;
  status: VerdictStatus;
  goalSatisfied: boolean;
  partial: boolean;
  reason: string;
  warnings: string[];
  evidence: ExecutionEvidence;
  confidence: number;
  nextActions?: string[];
}