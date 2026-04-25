export type TerminalDeviceKind = "ios" | "host" | "unknown";

export interface RunTerminalCommandOptions {
  timeoutMs?: number;
  mode?: "safe" | "interactive" | "raw" | "strict";
  allowConfirm?: boolean;
  allowDestructive?: boolean;
  evidenceLevel?: "summary" | "full";
}

export interface TerminalCommandResult {
  ok: boolean;
  action: "ios.exec" | "host.exec" | "unknown";
  device: string;
  deviceKind: TerminalDeviceKind;
  command: string;
  output: string;
  status: number;
  promptBefore?: string;
  promptAfter?: string;
  modeBefore?: string;
  modeAfter?: string;
  error?: {
    code: string;
    message: string;
    phase?: string;
  };
  warnings: string[];
  evidence: unknown;
}
