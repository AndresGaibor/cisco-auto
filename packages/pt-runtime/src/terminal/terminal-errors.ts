// ============================================================================
// Terminal Errors - Taxonomía de errores terminales
// ============================================================================

export type TerminalErrorCode =
  | "TERMINAL_SESSION_OPEN_FAILED"
  | "TERMINAL_COMMAND_START_TIMEOUT"
  | "TERMINAL_COMMAND_END_TIMEOUT"
  | "TERMINAL_PROMPT_MISMATCH"
  | "TERMINAL_MODE_MISMATCH"
  | "TERMINAL_PAGER_LOOP_DETECTED"
  | "TERMINAL_WIZARD_BLOCKED"
  | "TERMINAL_CONFIRMATION_BLOCKED"
  | "TERMINAL_SESSION_BROKEN"
  | "TERMINAL_EVIDENCE_MISSING"
  | "TERMINAL_UNKNOWN_STATE";

export const TerminalErrors = {
  SESSION_OPEN_FAILED: "TERMINAL_SESSION_OPEN_FAILED" as TerminalErrorCode,
  COMMAND_START_TIMEOUT: "TERMINAL_COMMAND_START_TIMEOUT" as TerminalErrorCode,
  COMMAND_END_TIMEOUT: "TERMINAL_COMMAND_END_TIMEOUT" as TerminalErrorCode,
  PROMPT_MISMATCH: "TERMINAL_PROMPT_MISMATCH" as TerminalErrorCode,
  MODE_MISMATCH: "TERMINAL_MODE_MISMATCH" as TerminalErrorCode,
  PAGER_LOOP_DETECTED: "TERMINAL_PAGER_LOOP_DETECTED" as TerminalErrorCode,
  WIZARD_BLOCKED: "TERMINAL_WIZARD_BLOCKED" as TerminalErrorCode,
  CONFIRMATION_BLOCKED: "TERMINAL_CONFIRMATION_BLOCKED" as TerminalErrorCode,
  SESSION_BROKEN: "TERMINAL_SESSION_BROKEN" as TerminalErrorCode,
  EVIDENCE_MISSING: "TERMINAL_EVIDENCE_MISSING" as TerminalErrorCode,
  UNKNOWN_STATE: "TERMINAL_UNKNOWN_STATE" as TerminalErrorCode,
};

export interface TerminalError {
  code: TerminalErrorCode;
  message: string;
  device?: string;
  details?: Record<string, unknown>;
}

export function createTerminalError(code: TerminalErrorCode, message: string, details?: Record<string, unknown>): TerminalError {
  return { code, message, details };
}

export function isTerminalErrorCode(code: string): code is TerminalErrorCode {
  return Object.values(TerminalErrors).includes(code as TerminalErrorCode);
}