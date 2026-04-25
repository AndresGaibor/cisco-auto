export interface TerminalExecutionError {
  code: string;
  message: string;
  phase:
    | "device"
    | "readiness"
    | "mode-transition"
    | "send"
    | "execution"
    | "completion"
    | "semantic"
    | "postcondition";
  details?: Record<string, unknown>;
}

export const TERMINAL_ERROR_CODES = {
  DEVICE_NOT_FOUND: "DEVICE_NOT_FOUND",
  DEVICE_NOT_READY: "DEVICE_NOT_READY",
  MODE_TRANSITION_FAILED: "MODE_TRANSITION_FAILED",
  COMMAND_TIMEOUT: "COMMAND_TIMEOUT",
  COMMAND_STALLED: "COMMAND_STALLED",
  PAGER_STUCK: "PAGER_STUCK",
  CONFIRM_TIMEOUT: "CONFIRM_TIMEOUT",
  DNS_HANGUP: "DNS_HANGUP",
  IOS_INVALID_INPUT: "IOS_INVALID_INPUT",
  IOS_INCOMPLETE: "IOS_INCOMPLETE",
  IOS_AMBIGUOUS: "IOS_AMBIGUOUS",
  IOS_WRONG_MODE: "IOS_WRONG_MODE",
  SEMANTIC_MISMATCH: "SEMANTIC_MISMATCH",
  UNKNOWN: "UNKNOWN",
} as const;
