// RuntimeTerminalAdapter — Implementación robusta del puerto terminal
// Soporta tanto IOS como Host Command Prompt
// Habla con el runtime solo por el adapter. No contiene lógica de negocio.

import type { FileBridgePort } from "../application/ports/file-bridge.port.js";
import type {
  RuntimeTerminalPort,
  TerminalPortOptions,
  TerminalPortResult,
  TerminalPlan,
  TerminalPlanStep,
  TerminalPlanTimeouts,
  TerminalPlanPolicies,
  SessionResult,
  TerminalMode,
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

async function detectDeviceType(bridge: FileBridgePort, deviceName: string): Promise<"host" | "ios" | "unknown"> {
  try {
    const listResult = await bridge.sendCommandAndWait("listDevices", {}, 5000);
    if (listResult.ok && listResult.value) {
      const devices = (listResult.value as any)?.devices || [];
      const device = devices.find((d: any) => d.name === deviceName);
      if (device) {
        const model = (device.model || "").toLowerCase();
        const type = (device.type || "").toLowerCase();
        if (model.includes("pc") || model.includes("server") || model.includes("laptop") || type === "pc" || type === "server") {
          return "host";
        }
        if (model.includes("router") || model.includes("switch") || type === "router" || type === "switch") {
          return "ios";
        }
      }
    }
  } catch {
    // Fallback: intentar por nombre del dispositivo
  }
  
  if (deviceName.toLowerCase().includes("pc") || deviceName.toLowerCase().includes("server")) {
    return "host";
  }
  
  return "unknown";
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

    const deviceType = await detectDeviceType(bridge, plan.device);
    const isHost = deviceType === "host";
    const handlerName = isHost ? "execPc" : "execIos";

    const defaultTimeouts: TerminalPlanTimeouts = plan.timeouts ?? {
      commandTimeoutMs: 8000,
      stallTimeoutMs: 15000,
    };
    const defaultPolicies: TerminalPlanPolicies = plan.policies ?? {
      autoBreakWizard: true,
      autoAdvancePager: true,
      maxPagerAdvances: 50,
      maxConfirmations: 3,
      abortOnPromptMismatch: false,
      abortOnModeMismatch: true,
    };

    if (isHost) {
      warnings.push(`Dispositivo ${plan.device} detectado como host, usando execPc`);
    }

    if (plan.targetMode) {
      warnings.push(`Plan con targetMode: ${plan.targetMode}`);
    }

    for (let i = 0; i < plan.steps.length; i += 1) {
      const step = plan.steps[i]!;

      if (step.kind === "ensureMode") {
        events.push({
          stepIndex: i,
          kind: "ensureMode",
          expectMode: step.expectMode,
        });
        continue;
      }

      if (step.kind === "expectPrompt") {
        events.push({
          stepIndex: i,
          kind: "expectPrompt",
          expectPromptPattern: step.expectPromptPattern,
        });
        continue;
      }

      if (step.kind === "confirm") {
        events.push({
          stepIndex: i,
          kind: "confirm",
        });
        continue;
      }

      const command = String(step.command ?? "");
      const stepTimeout = step.timeout ?? defaultTimeouts.commandTimeoutMs;
      const stepStallTimeout = defaultTimeouts.stallTimeoutMs;

      const stepPolicies = {
        allowPager: step.allowPager ?? defaultPolicies.autoAdvancePager,
        allowConfirm: step.allowConfirm ?? false,
      };

      const bridgeResult = await bridge.sendCommandAndWait<{ value?: ExecInteractiveValue }>(
        handlerName,
        {
          type: handlerName,
          device: plan.device,
          command,
          parse: false,
          ensurePrivileged: plan.targetMode === "privileged-exec" || plan.targetMode === "global-config",
          targetMode: plan.targetMode,
          allowPager: stepPolicies.allowPager,
          allowConfirm: stepPolicies.allowConfirm,
          commandTimeoutMs: stepTimeout,
          stallTimeoutMs: stepStallTimeout,
        },
        stepTimeout,
      );

      const value = (bridgeResult?.value ?? {}) as ExecInteractiveValue;
      const raw = String(value.raw ?? "");
      const status = normalizeStatus(value);

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
        kind: step.kind ?? "command",
        command,
        status,
        promptAfter,
        modeAfter,
        completionReason: value.diagnostics?.completionReason,
        paging: Boolean(value.session?.paging),
        awaitingConfirm: Boolean(value.session?.awaitingConfirm),
        autoDismissedInitialDialog: Boolean(value.session?.autoDismissedInitialDialog),
        sessionKind: isHost ? "host" : "ios",
        allowPager: stepPolicies.allowPager,
        allowConfirm: stepPolicies.allowConfirm,
        expectMode: step.expectMode,
        expectPromptPattern: step.expectPromptPattern,
        optional: step.optional,
      });

      if (value.session?.paging && stepPolicies.allowPager) {
        warnings.push(`El comando "${command}" activó paginación en ${plan.device}`);
      }

      if (value.session?.paging && !stepPolicies.allowPager) {
        warnings.push(`El comando "${command}" activó paginación pero allowPager=false`);
      }

      if (value.session?.awaitingConfirm && stepPolicies.allowConfirm) {
        warnings.push(`El comando "${command}" requirió confirmación en ${plan.device}`);
      }

      if (value.session?.awaitingConfirm && !stepPolicies.allowConfirm && !isHost) {
        warnings.push(`El comando "${command}" dejó confirmación pendiente en ${plan.device} (allowConfirm=false)`);
      }

      if (
        (step.expectedPrompt || step.expectPromptPattern) &&
        promptAfter &&
        !promptAfter.includes(step.expectedPrompt ?? step.expectPromptPattern ?? "")
      ) {
        warnings.push(
          `Prompt esperado "${step.expectedPrompt ?? step.expectPromptPattern}" no alcanzado tras "${command}". Prompt final: "${promptAfter}"`,
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
