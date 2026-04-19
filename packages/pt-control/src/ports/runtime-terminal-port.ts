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

export interface TerminalPlan {
  id: string;
  device: string;
  steps: TerminalPlanStep[];
}

export interface TerminalPlanStep {
  command: string;
  expectedPrompt?: string;
  timeout?: number;
}

export interface SessionResult {
  ok: boolean;
  sessionId?: string;
  error?: string;
}
