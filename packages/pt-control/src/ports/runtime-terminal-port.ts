// Puerto para terminal interactiva del runtime
// Abstrae la ejecución de planes de terminal (secuencias de comandos IOS)

export interface TerminalPortOptions {
  timeoutMs?: number;
  stallTimeoutMs?: number;
}

export interface TerminalPortResult {
  ok: boolean;
  output: string;
  status: number;
  promptBefore: string;
  promptAfter: string;
  modeBefore: string;
  modeAfter: string;
  events: unknown[];
  warnings: string[];
  confidence: number;
}

export interface RuntimeTerminalPort {
  runTerminalPlan(plan: TerminalPlan, options?: TerminalPortOptions): Promise<TerminalPortResult>;
  ensureSession(device: string): Promise<SessionResult>;
  pollTerminalJob(jobId: string): Promise<TerminalPortResult | null>;
}

export type TerminalPlanStepKind = "command" | "ensureMode" | "confirm" | "expectPrompt";

export type TerminalMode =
  | "user-exec"
  | "privileged-exec"
  | "global-config"
  | "config-if"
  | "config-line"
  | "config-router"
  | "config-vlan"
  | "config-subif"
  | "host-prompt"
  | "host-busy"
  | "wizard"
  | "pager"
  | "confirm"
  | "boot"
  | "unknown";

export interface TerminalPlanTimeouts {
  commandTimeoutMs: number;
  stallTimeoutMs: number;
}

export interface TerminalPlanPolicies {
  autoBreakWizard: boolean;
  autoAdvancePager: boolean;
  maxPagerAdvances: number;
  maxConfirmations: number;
  abortOnPromptMismatch: boolean;
  abortOnModeMismatch: boolean;
}

export interface TerminalPlan {
  id: string;
  device: string;
  targetMode?: TerminalMode;
  steps: TerminalPlanStep[];
  timeouts?: TerminalPlanTimeouts;
  policies?: TerminalPlanPolicies;
  metadata?: Record<string, unknown>;
}

export interface TerminalPlanStep {
  kind?: TerminalPlanStepKind;
  command?: string;
  expectMode?: TerminalMode;
  expectPromptPattern?: string;
  allowPager?: boolean;
  allowConfirm?: boolean;
  optional?: boolean;
  expectedPrompt?: string;
  timeout?: number;
  metadata?: Record<string, unknown>;
}

export interface SessionResult {
  ok: boolean;
  sessionId?: string;
  error?: string;
}
