export interface ExecutionEvidence {
  rawRuntimeResults: Record<string, unknown>[];
  rawTerminalResults: Record<string, unknown>[];
  rawOmniResults: Record<string, unknown>[];
  snapshotsBeforeAfter?: Record<string, unknown>;
  normalizedFacts: Record<string, unknown>[];
  warnings: string[];
  anomalies: string[];
  confidenceInputs: Record<string, unknown>;
}