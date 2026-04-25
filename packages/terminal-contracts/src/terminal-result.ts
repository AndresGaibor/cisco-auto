import type { TerminalExecutionError } from "./terminal-error.js";

export interface TerminalExecutionResult {
  ok: boolean;
  device: string;
  command: string;
  output: string;
  raw: string;
  status: number;
  error?: TerminalExecutionError;
  diagnostics: TerminalDiagnostics;
  session: TerminalSessionEvidence;
  events: TerminalEventSummary[];
  warnings: string[];
}

export interface TerminalDiagnostics {
  confidence: "high" | "medium" | "low" | "failure";
  pagerDetected: boolean;
  confirmDetected: boolean;
  modeChanged: boolean;
  modeBefore?: string;
  modeAfter?: string;
  durationMs: number;
}

export interface TerminalSessionEvidence {
  promptBefore: string;
  promptAfter: string;
  sessionId: string;
  deviceKind: "ios" | "host" | "unknown";
}

export interface TerminalEventSummary {
  type: string;
  timestamp: number;
  raw: string;
}
