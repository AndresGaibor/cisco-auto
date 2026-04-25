export type ExecutionMode = "safe" | "interactive" | "raw" | "strict";

export interface TerminalPolicy {
  ensureMode?: "user-exec" | "privileged-exec" | "global-config";
  expectedMode?: string;
  autoPager: boolean;
  autoConfirm: boolean;
  allowDestructive: boolean;
  allowEmptyOutput: boolean;
  commandTimeoutMs: number;
  stallTimeoutMs: number;
  retries: number;
  recovery: "none" | "soft" | "ctrl-c-enter";
}

export const DEFAULT_POLICY: TerminalPolicy = {
  autoPager: true,
  autoConfirm: false,
  allowDestructive: false,
  allowEmptyOutput: false,
  commandTimeoutMs: 30000,
  stallTimeoutMs: 15000,
  retries: 1,
  recovery: "ctrl-c-enter",
};

export const SAFE_POLICY: TerminalPolicy = {
  autoPager: true,
  autoConfirm: false,
  allowDestructive: false,
  allowEmptyOutput: false,
  commandTimeoutMs: 30000,
  stallTimeoutMs: 20000,
  retries: 2,
  recovery: "ctrl-c-enter",
};

export const INTERACTIVE_POLICY: TerminalPolicy = {
  autoPager: true,
  autoConfirm: true,
  allowDestructive: true,
  allowEmptyOutput: true,
  commandTimeoutMs: 60000,
  stallTimeoutMs: 30000,
  retries: 3,
  recovery: "ctrl-c-enter",
};
