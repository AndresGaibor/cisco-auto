export interface TerminalEvidenceVerdict {
  ok: boolean;
  reason?: string;
  warnings: string[];
  confidence: number;
  executionOk: boolean;
  evidenceOk: boolean;
  semanticSuccess?: boolean;
}
