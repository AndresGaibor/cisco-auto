// RuntimeTerminalAdapter — Implementación robusta del puerto terminal
// Soporta tanto IOS como Host Command Prompt
// Habla con el runtime solo por el adapter. No contiene lógica de negocio.

import type { FileBridgePort } from "../application/ports/file-bridge.port.js";
import type {
  RuntimeTerminalPort,
  TerminalPortOptions,
  TerminalPortResult,
  TerminalPlan,
  SessionResult,
} from "../ports/runtime-terminal-port.js";

export interface RuntimeTerminalAdapterDeps {
  bridge: FileBridgePort;
  generateId: () => string;
  defaultTimeout?: number;
}

type ExecInteractiveValue = {
  raw?: string;
  parsed?: unknown;
  session?: {
    mode?: string;
    prompt?: string;
    paging?: boolean;
    awaitingConfirm?: boolean;
    autoDismissedInitialDialog?: boolean;
  };
  diagnostics?: {
    commandStatus?: number;
    completionReason?: string;
  };
};

function normalizeStatus(value: ExecInteractiveValue): number {
  if (typeof value?.diagnostics?.commandStatus === "number") {
    return value.diagnostics.commandStatus;
  }

  const raw = String(value?.raw ?? "");
  if (
    raw.includes("% Invalid") ||
    raw.includes("% Incomplete") ||
    raw.includes("% Ambiguous") ||
    raw.includes("% Unknown") ||
    raw.includes("%Error") ||
    raw.toLowerCase().includes("invalid command")
  ) {
    return 1;
  }

  return 0;
}

function detectHostMode(session: ExecInteractiveValue["session"]): boolean {
  if (!session?.mode) return false;
  const mode = session.mode.toLowerCase();
  return mode.includes("host") || mode === "pc" || mode === "server";
}

export function createRuntimeTerminalAdapter(
  deps: RuntimeTerminalAdapterDeps,
): RuntimeTerminalPort {
  const { bridge, generateId, defaultTimeout = 30000 } = deps;

  async function runTerminalPlan(
    plan: TerminalPlan,
    options?: TerminalPortOptions,
  ): Promise<TerminalPortResult> {
    const timeoutMs = options?.timeoutMs ?? defaultTimeout;

    if (!plan.device || !String(plan.device).trim()) {
      return {
        ok: false,
        output: "",
        status: 1,
        promptBefore: "",
        promptAfter: "",
        modeBefore: "",
        modeAfter: "",
        events: [],
        warnings: ["TerminalPlan.device es obligatorio"],
        confidence: 0,
      };
    }

    if (!Array.isArray(plan.steps) || plan.steps.length === 0) {
      return {
        ok: false,
        output: "",
        status: 1,
        promptBefore: "",
        promptAfter: "",
        modeBefore: "",
        modeAfter: "",
        events: [],
        warnings: ["TerminalPlan.steps no puede estar vacío"],
        confidence: 0,
      };
    }

    let promptBefore = "";
    let modeBefore = "";
    let promptAfter = "";
    let modeAfter = "";
    let aggregatedOutput = "";
    let finalStatus = 0;

    const warnings: string[] = [];
    const events: Array<Record<string, unknown>> = [];

    for (let i = 0; i < plan.steps.length; i += 1) {
      const step = plan.steps[i]!;
      const command = String(step.command ?? "");
      const stepTimeout = step.timeout ?? timeoutMs;

      const bridgeResult = await bridge.sendCommandAndWait<{ value?: ExecInteractiveValue }>(
        "execInteractive",
        {
          id: generateId(),
          device: plan.device,
          command,
          options: {
            timeout: stepTimeout,
            parse: false,
            ensurePrivileged: false,
          },
        },
      );

      const value = (bridgeResult?.value ?? {}) as ExecInteractiveValue;
      const raw = String(value.raw ?? "");
      const status = normalizeStatus(value);
      const isHost = detectHostMode(value.session);

      if (i === 0) {
        promptBefore = String(value.session?.prompt ?? "");
        modeBefore = String(value.session?.mode ?? "");
      }

      promptAfter = String(value.session?.prompt ?? promptAfter);
      modeAfter = String(value.session?.mode ?? modeAfter);
      aggregatedOutput += raw.endsWith("\n") ? raw : `${raw}\n`;
      finalStatus = status;

      events.push({
        stepIndex: i,
        command,
        status,
        promptAfter,
        modeAfter,
        completionReason: value.diagnostics?.completionReason,
        paging: Boolean(value.session?.paging),
        awaitingConfirm: Boolean(value.session?.awaitingConfirm),
        autoDismissedInitialDialog: Boolean(value.session?.autoDismissedInitialDialog),
        sessionKind: isHost ? "host" : "ios",
      });

      if (value.session?.paging) {
        warnings.push(`El comando "${command}" activó paginación en ${plan.device}`);
      }

      if (value.session?.awaitingConfirm && !isHost) {
        warnings.push(`El comando "${command}" dejó confirmación pendiente en ${plan.device}`);
      }

      if (
        step.expectedPrompt &&
        promptAfter &&
        !promptAfter.includes(step.expectedPrompt)
      ) {
        warnings.push(
          `Prompt esperado "${step.expectedPrompt}" no alcanzado tras "${command}". Prompt final: "${promptAfter}"`,
        );
      }

      if (isHost && (raw.includes("request timed out") || raw.includes("reply from"))) {
        warnings.push(`Comando host "${command}" produjo output de red (ping/tracert)`);
      }

      if (status !== 0) {
        return {
          ok: false,
          output: aggregatedOutput.trim(),
          status,
          promptBefore,
          promptAfter,
          modeBefore,
          modeAfter,
          events,
          warnings,
          confidence: warnings.length > 0 ? 0.5 : 0.6,
        };
      }
    }

    return {
      ok: true,
      output: aggregatedOutput.trim(),
      status: finalStatus,
      promptBefore,
      promptAfter,
      modeBefore,
      modeAfter,
      events,
      warnings,
      confidence: warnings.length > 0 ? 0.8 : 1,
    };
  }

  async function ensureSession(device: string): Promise<SessionResult> {
    if (!device || !String(device).trim()) {
      return {
        ok: false,
        error: "Device es obligatorio para ensureSession()",
      };
    }

    return {
      ok: true,
      sessionId: `terminal:${String(device).trim()}`,
    };
  }

  async function pollTerminalJob(_jobId: string): Promise<TerminalPortResult | null> {
    throw new Error(
      "pollTerminalJob() no está habilitado en la arquitectura actual. " +
        "Usa runTerminalPlan() directamente o elimina pollTerminalJob() del contrato si ya no se necesita.",
    );
  }

  return {
    runTerminalPlan,
    ensureSession,
    pollTerminalJob,
  };
}
