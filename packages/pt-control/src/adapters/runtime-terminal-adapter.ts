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
  value?: string;
  output?: string;
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

  const raw = String(value?.raw ?? value?.value ?? value?.output ?? "");
  if (!raw) return 0;

  // Solo buscar errores en las últimas líneas para evitar falsos positivos con historial viejo
  const lines = raw.split("\n");
  const recentLines = lines.slice(-15).join("\n");
  
  if (
    recentLines.includes("% Invalid") ||
    recentLines.includes("% Incomplete") ||
    recentLines.includes("% Ambiguous") ||
    recentLines.includes("% Unknown") ||
    recentLines.includes("%Error") ||
    recentLines.toLowerCase().includes("invalid command") ||
    recentLines.includes("Command not found")
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

function normalizeRuntimeErrorStatus(status: unknown): number {
  if (typeof status === "number" && Number.isFinite(status)) {
    return status === 0 ? 1 : status;
  }
  return 1;
}

function isConfigureTerminalCommand(command: string): boolean {
  const cmd = command.trim().toLowerCase();
  return /^(conf|config|configure)(\s+t|\s+terminal)?$/.test(cmd);
}

function buildEnsureModeCommand(expectMode?: TerminalMode): string | null {
  if (!expectMode) return null;
  if (expectMode === "privileged-exec") return "__ensure_privileged__";
  if (expectMode === "global-config") return "configure terminal";
  return null;
}

function shouldEnsurePrivilegedForStep(args: {
  isHost: boolean;
  planTargetMode?: TerminalMode;
  command: string;
  stepIndex: number;
}): boolean {
  if (args.isHost) return false;
  const cmd = args.command.trim().toLowerCase();
  if (args.planTargetMode === "privileged-exec") return true;
  if (isConfigureTerminalCommand(cmd)) return true;
  if (args.planTargetMode === "global-config") {
    return args.stepIndex === 0 && !isConfigureTerminalCommand(cmd);
  }
  return false;
}

async function detectDeviceType(bridge: FileBridgePort, deviceName: string): Promise<"host" | "ios" | "unknown"> {
  // Fuente primaria: listDevices directo desde PT (siemprevivo)
  try {
    const listResult = await bridge.sendCommandAndWait("listDevices", {}, 5000);
    if (listResult.ok && listResult.value) {
      const devices = Array.isArray((listResult.value as any)?.devices)
        ? (listResult.value as any).devices
        : Object.values((listResult.value as any)?.devices ?? {});
      const device = devices.find((d: any) => d?.name === deviceName);
      if (device) {
        const model = String(device.model || "").toLowerCase();
        const type = String(device.type || "").toLowerCase();
        if (model.includes("pc") || model.includes("server") || model.includes("laptop") || type === "pc" || type === "server") {
          return "host";
        }
        if (model.includes("router") || model.includes("switch") || type === "router" || type === "switch" || type === "switch_layer3") {
          return "ios";
        }
        return "ios";
      }
    }
  } catch {
    // Fallback a snapshot si listDevices falla
  }

  // Fallback: usar snapshot cacheado
  const state = bridge.getStateSnapshot?.() ?? bridge.readState?.();
  if (state && typeof state === "object") {
    const devices = Array.isArray((state as any).devices)
      ? (state as any).devices
      : Object.values((state as any).devices ?? {});
    const device = devices.find((d: any) => d?.name === deviceName);
    if (device) {
      const model = String(device.model || "").toLowerCase();
      const type = String(device.type || "").toLowerCase();
      if (model.includes("pc") || model.includes("server") || model.includes("laptop") || type === "pc" || type === "server") {
        return "host";
      }
      if (model.includes("router") || model.includes("switch") || type === "router" || type === "switch" || type === "switch_layer3") {
        return "ios";
      }
      return "ios";
    }
  }

  // Fallback heurístico por nombre
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
    let finalParsed: any = undefined;

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

    for (let i = 0; i < plan.steps.length; i += 1) {
      const step = plan.steps[i]!;

      if (step.kind === "ensureMode") {
        if (isHost) {
          events.push({
            stepIndex: i,
            kind: "ensureMode",
            expectMode: step.expectMode,
            skipped: true,
            reason: "host-session",
          });
          continue;
        }

        const ensureCommand = buildEnsureModeCommand(step.expectMode);

        if (!ensureCommand) {
          events.push({
            stepIndex: i,
            kind: "ensureMode",
            expectMode: step.expectMode,
            skipped: true,
            reason: "no-command-needed",
          });
          continue;
        }

        const bridgeResult = await bridge.sendCommandAndWait<any>(
          handlerName,
          {
            type: handlerName,
            device: plan.device,
            command: ensureCommand,
            parse: false,
            ensurePrivileged: false,
            targetMode: plan.targetMode,
            expectedMode: step.expectMode,
            allowPager: false,
            allowConfirm: false,
            commandTimeoutMs: defaultTimeouts.commandTimeoutMs,
            stallTimeoutMs: defaultTimeouts.stallTimeoutMs,
          },
          defaultTimeouts.commandTimeoutMs,
        );

        const res = bridgeResult?.value ?? bridgeResult ?? {};
        const raw = String(res.output ?? res.raw ?? (typeof res.value === "string" ? res.value : "") ?? "");
        const status = normalizeStatus(res);

        events.push({
          stepIndex: i,
          kind: "ensureMode",
          command: ensureCommand,
          expectMode: step.expectMode,
          status,
          output: raw,
          sessionKind: isHost ? "host" : "ios",
        });

        if (status !== 0) {
          return {
            ok: false,
            output: raw,
            status,
            promptBefore,
            promptAfter,
            modeBefore,
            modeAfter,
            events,
            warnings: [...warnings, `ensureMode falló con status ${status}: ${ensureCommand}`],
            parsed: res.parsed,
            confidence: 0,
          };
        }
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
        const confirmResult = await bridge.sendCommandAndWait<any>(
          handlerName,
          {
            type: handlerName,
            device: plan.device,
            command: "y",
            parse: false,
            ensurePrivileged: false,
            allowPager: false,
            allowConfirm: false,
            commandTimeoutMs: defaultTimeouts.commandTimeoutMs,
            stallTimeoutMs: defaultTimeouts.stallTimeoutMs,
          },
          defaultTimeouts.commandTimeoutMs,
        );

        const res = confirmResult?.value ?? confirmResult ?? {};
        const raw = String(res.output ?? res.raw ?? (typeof res.value === "string" ? res.value : "") ?? "");
        const status = normalizeStatus(res);

        events.push({
          stepIndex: i,
          kind: "confirm",
          command: "y",
          status,
          output: raw,
          sessionKind: isHost ? "host" : "ios",
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

      const ensurePrivileged = shouldEnsurePrivilegedForStep({
        isHost,
        planTargetMode: plan.targetMode,
        command,
        stepIndex: i,
      });

      const bridgeResult = await bridge.sendCommandAndWait<any>(
        handlerName,
        {
          type: handlerName,
          device: plan.device,
          command,
          parse: false,
          ensurePrivileged,
          targetMode: plan.targetMode,
          expectedMode: step.expectMode,
          expectedPromptPattern: step.expectPromptPattern,
          allowPager: stepPolicies.allowPager,
          allowConfirm: stepPolicies.allowConfirm,
          commandTimeoutMs: stepTimeout,
          stallTimeoutMs: stepStallTimeout,
        },
        stepTimeout,
      );

      const res = bridgeResult?.value ?? bridgeResult ?? {};
      const raw = String(res.output ?? res.raw ?? (typeof res.value === "string" ? res.value : "") ?? "");
      const status = normalizeStatus(res);

      // Detectar errores del bridge/runtime antes de procesar output
      const bridgeFailed =
        bridgeResult?.ok === false ||
        bridgeResult?.status === "failed" ||
        res?.ok === false ||
        typeof res?.error === "string";

      if (bridgeFailed) {
        const errorMessage = String(
          res?.error ??
          bridgeResult?.error?.message ??
          bridgeResult?.error ??
          "Runtime terminal command failed"
        );

        const errorCode = String(
          res?.code ??
          bridgeResult?.error?.code ??
          "RUNTIME_TERMINAL_FAILED"
        );

        const errorStatus = normalizeRuntimeErrorStatus(res?.status);

        events.push({
          stepIndex: i,
          kind: step.kind ?? "command",
          command,
          status: errorStatus,
          promptAfter,
          modeAfter,
          error: errorMessage,
          code: errorCode,
          sessionKind: isHost ? "host" : "ios",
          allowPager: stepPolicies.allowPager,
          allowConfirm: stepPolicies.allowConfirm,
        });

        return {
          ok: false,
          output: raw,
          status: errorStatus,
          promptBefore,
          promptAfter,
          modeBefore,
          modeAfter,
          events,
          warnings: [...warnings, `${errorCode}: ${errorMessage}`],
          parsed: res?.parsed,
          confidence: 0,
        };
      }

      const parsedInfo = (res.parsed ?? {}) as {
        promptBefore?: string;
        promptAfter?: string;
        modeBefore?: string;
        modeAfter?: string;
        warnings?: string[];
      };

      const resolvedPromptBefore = String(
        parsedInfo.promptBefore ??
          res.session?.prompt ??
          "",
      );

      const resolvedModeBefore = String(
        parsedInfo.modeBefore ??
          res.session?.mode ??
          "",
      );

      const resolvedPromptAfter = String(
        parsedInfo.promptAfter ??
          res.session?.prompt ??
          promptAfter ??
          "",
      );

      const resolvedModeAfter = String(
        parsedInfo.modeAfter ??
          res.session?.mode ??
          modeAfter ??
          "",
      );

      if (i === 0) {
        promptBefore = resolvedPromptBefore;
        modeBefore = resolvedModeBefore;
      }

      promptAfter = resolvedPromptAfter;
      modeAfter = resolvedModeAfter;
      aggregatedOutput += raw.endsWith("\n") ? raw : `${raw}\n`;
      finalStatus = status;
      finalParsed = res.parsed;

      const diagnostics = res.diagnostics ?? {};
      const sessionInfo = res.session ?? {};

      events.push({
        stepIndex: i,
        kind: step.kind ?? "command",
        command,
        status,
        promptAfter,
        modeAfter,
        completionReason: diagnostics.completionReason,
        paging: Boolean(sessionInfo.paging),
        awaitingConfirm: Boolean(sessionInfo.awaitingConfirm),
        autoDismissedInitialDialog: Boolean(sessionInfo.autoDismissedInitialDialog),
        sessionKind: isHost ? "host" : "ios",
        allowPager: stepPolicies.allowPager,
        allowConfirm: stepPolicies.allowConfirm,
        expectMode: step.expectMode,
        expectPromptPattern: step.expectPromptPattern,
        optional: step.optional,
      });

      if (sessionInfo.paging && stepPolicies.allowPager) {
        warnings.push(`El comando "${command}" activó paginación en ${plan.device}`);
      }

      if (sessionInfo.paging && !stepPolicies.allowPager) {
        warnings.push(`El comando "${command}" activó paginación pero allowPager=false`);
      }

      if (sessionInfo.awaitingConfirm && stepPolicies.allowConfirm) {
        warnings.push(`El comando "${command}" requirió confirmación en ${plan.device}`);
      }

      if (sessionInfo.awaitingConfirm && !stepPolicies.allowConfirm && !isHost) {
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
    parsed: finalParsed,
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
parsed: finalParsed,
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
