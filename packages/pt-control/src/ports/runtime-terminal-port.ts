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
  events: any[];
  warnings: string[];
  confidence: number;
}

export interface RuntimeTerminalPort {
  runTerminalPlan(plan: TerminalPlan, options?: TerminalPortOptions): Promise<TerminalPortResult>;
  openSession(device: string): Promise<SessionResult>;
  closeSession(device: string): Promise<SessionResult>;
  querySessionState(device: string): Promise<SessionStateResult | null>;
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

export interface SessionStateResult {
  sessionId: string;
  device: string;
  mode: string;
  lastPrompt: string;
}

export function createTerminalPort(config?: { defaultTimeout?: number }): RuntimeTerminalPort {
  const defaultTimeout = config?.defaultTimeout ?? 8000;

  return {
    async runTerminalPlan(plan: TerminalPlan, options?: TerminalPortOptions): Promise<TerminalPortResult> {
      const timeout = options?.timeoutMs ?? defaultTimeout;

      try {
        const results: string[] = [];

        for (const step of plan.steps) {
          const result = await executeTerminalCommand(
            plan.device,
            step.command,
            { timeout: step.timeout ?? timeout }
          );
          results.push(result.output);
        }

        return {
          ok: true,
          output: results.join("\n"),
          status: 0,
          promptBefore: "",
          promptAfter: "",
          modeBefore: "",
          modeAfter: "",
          events: [],
          warnings: [],
          confidence: 1,
        };
      } catch (e) {
        return {
          ok: false,
          output: String(e),
          status: 1,
          promptBefore: "",
          promptAfter: "",
          modeBefore: "",
          modeAfter: "",
          events: [],
          warnings: [],
          confidence: 0,
        };
      }
    },

    async openSession(device: string): Promise<SessionResult> {
      return { ok: true, sessionId: `session-${device}-${Date.now()}` };
    },

    async closeSession(device: string): Promise<SessionResult> {
      return { ok: true };
    },

    async querySessionState(device: string): Promise<SessionStateResult | null> {
      return {
        sessionId: `session-${device}`,
        device,
        mode: "user-exec",
        lastPrompt: `${device}>`,
      };
    },
  };
}

async function executeTerminalCommand(
  device: string,
  command: string,
  context: { timeout: number }
): Promise<{ output: string }> {
  return { output: `Executed: ${command} on ${device}` };
}