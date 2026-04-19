// RuntimeTerminalAdapter — Implementación del puerto terminal
// Conecta al motor terminal real via FileBridgePort (sendCommandAndWait)
// No contiene lógica de negocio — solo mapea TerminalPlan → comandos IOS

import type { FileBridgePort } from "../application/ports/file-bridge.port.js";
import type {
  RuntimeTerminalPort,
  TerminalPortOptions,
  TerminalPortResult,
  TerminalPlan,
  TerminalPlanStep,
  SessionResult,
} from "../ports/runtime-terminal-port.js";

export interface RuntimeTerminalAdapterDeps {
  bridge: FileBridgePort;
  generateId: () => string;
  defaultTimeout?: number;
}

export function createRuntimeTerminalAdapter(deps: RuntimeTerminalAdapterDeps): RuntimeTerminalPort {
  const { bridge, generateId, defaultTimeout = 30000 } = deps;

  async function runTerminalPlan(
    plan: TerminalPlan,
    options?: TerminalPortOptions,
  ): Promise<TerminalPortResult> {
    const timeoutMs = options?.timeoutMs ?? defaultTimeout;
    const stallTimeoutMs = options?.stallTimeoutMs ?? 5000;

    let promptBefore = "";
    let modeBefore = "";
    let promptAfter = "";
    let modeAfter = "";
    const events: unknown[] = [];
    const warnings: string[] = [];
    let aggregatedOutput = "";
    let lastStatus = 0;

    for (const step of plan.steps) {
      const stepTimeout = step.timeout ?? timeoutMs;

      const result = await bridge.sendCommandAndWait<any>("execInteractive", {
        id: generateId(),
        device: plan.device,
        command: step.command,
        options: {
          timeout: stepTimeout,
          parse: false,
          ensurePrivileged: false,
        },
      });

      const value = result.value ?? {};
      const raw = value.raw ?? "";

      if (promptBefore === "" && value.session) {
        promptBefore = value.session.prompt ?? "";
        modeBefore = value.session.mode ?? "";
      }

      promptAfter = value.session?.prompt ?? promptAfter;
      modeAfter = value.session?.mode ?? modeAfter;

      aggregatedOutput += raw + "\n";
      lastStatus = value.diagnostics?.commandStatus ?? (raw.includes("%") || raw.includes("Invalid") ? 1 : 0);

      if (value.session?.paging) {
        warnings.push(`Step "${step.command}" triggered paging on device ${plan.device}`);
      }

      if (value.session?.awaitingConfirm) {
        warnings.push(`Step "${step.command}" is awaiting confirmation on device ${plan.device}`);
      }

      if (step.expectedPrompt && !raw.includes(step.expectedPrompt)) {
        warnings.push(`Expected prompt "${step.expectedPrompt}" not found after "${step.command}"`);
      }

      if (stepTimeout > timeoutMs + stallTimeoutMs) {
        warnings.push(`Step "${step.command}" exceeded expected stall timeout`);
      }
    }

    const hasWarnings = warnings.length > 0;
    const confidence = hasWarnings ? 0.7 : 1.0;

    return {
      ok: lastStatus === 0,
      output: aggregatedOutput.trim(),
      status: lastStatus,
      promptBefore,
      promptAfter,
      modeBefore,
      modeAfter,
      events,
      warnings,
      confidence,
    };
  }

  async function ensureSession(device: string): Promise<SessionResult> {
    try {
      const result = await bridge.sendCommandAndWait<any>("execIos", {
        id: generateId(),
        device,
        command: "show version",
        parse: false,
        timeout: defaultTimeout,
      });

      const value = result.value;
      if (!value || value.ok === false) {
        return {
          ok: false,
          error: value?.error ?? "No se pudo abrir sesión en el dispositivo",
        };
      }

      return {
        ok: true,
        sessionId: `${device}-${Date.now()}`,
      };
    } catch (e) {
      return {
        ok: false,
        error: String(e),
      };
    }
  }

  async function pollTerminalJob(jobId: string): Promise<TerminalPortResult | null> {
    return null;
  }

  return {
    runTerminalPlan,
    ensureSession,
    pollTerminalJob,
  };
}