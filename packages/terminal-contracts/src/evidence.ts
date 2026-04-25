export interface OperationEvidence {
  id: string;
  timestamp: string;
  intent: string;
  device?: string;
  commands: CommandEvidence[];
  verifications: VerificationEvidence[];
  result: "success" | "partial" | "failed";
  suggestedFixes: string[];
}

export interface CommandEvidence {
  command: string;
  output: string;
  ok: boolean;
  promptBefore?: string;
  promptAfter?: string;
  modeBefore?: string;
  modeAfter?: string;
  error?: unknown;
}

export interface VerificationEvidence {
  name: string;
  ok: boolean;
  evidence: string[];
}
