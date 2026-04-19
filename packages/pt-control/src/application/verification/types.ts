// Tipos para verification - Evalúa evidencia

import type { ExecutionEvidence } from "../../contracts/evidence";
import type { ExecutionVerdict } from "../../contracts/verdict";

export interface Verifier {
  verify(evidence: ExecutionEvidence, criteria: any): Promise<ExecutionVerdict>;
}

export interface EvidenceNormalizer {
  normalize(evidence: ExecutionEvidence): ExecutionEvidence;
}

export interface GoalVerifier {
  verifyGoal(evidence: ExecutionEvidence, goal: string): Promise<boolean>;
}

export interface ConsistencyChecker {
  checkConsistency(evidence: ExecutionEvidence): Promise<boolean>;
}

export interface ConfidenceEstimator {
  estimate(evidence: ExecutionEvidence): Promise<number>;
}