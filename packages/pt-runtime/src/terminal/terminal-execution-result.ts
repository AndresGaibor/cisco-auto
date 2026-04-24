// ============================================================================
// Terminal Execution Result - Contrato unificado de ejecución terminal
// ============================================================================

import type { TerminalMode, TerminalSessionKind } from "./session-state";
import type { TerminalEventRecord } from "../pt/terminal/terminal-events";
import type { TerminalErrorCode } from "./terminal-errors";

export type TerminalExecutionStatus =
  | "completed"
  | "failed"
  | "timeout"
  | "blocked"
  | "partial";

export type TerminalOutputSource =
  | "event"
  | "delta"
  | "event+delta"
  | "snapshot"
  | "none";

export interface TerminalDiagnostics {
  status: TerminalExecutionStatus;
  statusCode: number;
  completionReason?: string;
  outputSource: TerminalOutputSource;
  confidence: "high" | "medium" | "low" | "failure";
  startedSeen: boolean;
  endedSeen: boolean;
  outputEvents: number;
  promptMatched: boolean;
  modeMatched: boolean;
  semanticOk: boolean;
  durationMs: number;
}

export interface TerminalSessionEvidence {
  kind: TerminalSessionKind;
  promptBefore: string;
  promptAfter: string;
  modeBefore: TerminalMode | "unknown";
  modeAfter: TerminalMode | "unknown";
  paging: boolean;
  awaitingConfirm: boolean;
  autoDismissedInitialDialog: boolean;
}

export interface TerminalExecutionResult {
  ok: boolean;
  device: string;
  command: string;
  output: string;
  raw: string;
  error?: {
    code: TerminalErrorCode;
    message: string;
    phase:
      | "device"
      | "readiness"
      | "send"
      | "execution"
      | "completion"
      | "semantic"
      | "postcondition";
    details?: Record<string, unknown>;
  };
  diagnostics: TerminalDiagnostics;
  session: TerminalSessionEvidence;
  events: TerminalEventRecord[];
  warnings: string[];
}