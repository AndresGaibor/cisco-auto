// ensureMode step handler — extracted from runTerminalPlan

import type { FileBridgePort } from "../../../application/ports/file-bridge.port.js";
import type {
  TerminalMode,
  TerminalPlanTimeouts,
} from "../../../ports/runtime-terminal-port.js";
import { normalizeStatus, detectHostMode } from "../status-normalizer.js";

export interface EnsureModeHandlerDeps {
  bridge: FileBridgePort;
  device: string;
  isHost: boolean;
  handlerName: "execIos" | "execPc";
  defaultTimeouts: TerminalPlanTimeouts;
  planTargetMode?: TerminalMode;
}

export interface EnsureModeResult {
  skipped: boolean;
  raw?: string;
  status?: number;
  promptBefore?: string;
  modeBefore?: string;
  promptAfter?: string;
  modeAfter?: string;
  finalParsed?: unknown;
  sessionInfo?: {
    kind?: string;
    paging?: boolean;
    awaitingConfirm?: boolean;
  };
  completionReason?: string;
  hasUnifiedContract?: boolean;
  error?: { code?: string; message?: string };
  output?: string;
  ok?: boolean;
  diagnostics?: { statusCode?: number; status?: string; completionReason?: string };
}

interface EnsureModeAction {
  command: string;
  ensurePrivileged: boolean;
  expectedMode?: TerminalMode;
}

function isConfigureTerminalCommand(command: string): boolean {
  const cmd = command.trim().toLowerCase();
  return /^(conf|config|configure)(\s+t|\s+terminal)?$/.test(cmd);
}

export function buildEnsureModeAction(expectMode?: TerminalMode): EnsureModeAction | null {
  if (!expectMode) return null;

  if (expectMode === "privileged-exec") {
    return {
      command: "",
      ensurePrivileged: true,
      expectedMode: "privileged-exec",
    };
  }

  if (expectMode === "global-config") {
    return {
      command: "configure terminal",
      ensurePrivileged: true,
      expectedMode: "global-config",
    };
  }

  return null;
}

export async function handleEnsureModeStep(
  deps: EnsureModeHandlerDeps,
  step: { expectMode?: TerminalMode },
  stepIndex: number,
): Promise<{
  event: Record<string, unknown>;
  result: EnsureModeResult;
  returnEarly: boolean;
  returnValue?: {
    ok: false;
    output: string;
    status: number;
    promptBefore: string;
    promptAfter: string;
    modeBefore: string;
    modeAfter: string;
    events: Array<Record<string, unknown>>;
    warnings: string[];
    parsed?: unknown;
    confidence: number;
  };
}> {
  const { bridge, device, isHost, handlerName, defaultTimeouts, planTargetMode } = deps;

  if (isHost) {
    const event = {
      stepIndex,
      kind: "ensureMode",
      expectMode: step.expectMode,
      skipped: true,
      reason: "host-session",
    };
    return {
      event,
      result: { skipped: true },
      returnEarly: false,
    };
  }

  const ensureAction = buildEnsureModeAction(step.expectMode);

  if (!ensureAction) {
    const event = {
      stepIndex,
      kind: "ensureMode",
      expectMode: step.expectMode,
      skipped: true,
      reason: "no-action-needed",
    };
    return {
      event,
      result: { skipped: true },
      returnEarly: false,
    };
  }

  const bridgeResult = await bridge.sendCommandAndWait<any>(handlerName, {
    type: handlerName,
    device,
    command: ensureAction.command,
    parse: false,
    ensurePrivileged: ensureAction.ensurePrivileged,
    targetMode: planTargetMode,
    expectedMode: ensureAction.expectedMode,
    allowPager: false,
    allowConfirm: false,
    commandTimeoutMs: defaultTimeouts.commandTimeoutMs,
    stallTimeoutMs: defaultTimeouts.stallTimeoutMs,
  }, defaultTimeouts.commandTimeoutMs + 5000);

  const res = bridgeResult?.value ?? bridgeResult ?? {};

  const hasUnifiedContract =
    typeof res?.ok === "boolean" &&
    res?.diagnostics &&
    res?.session &&
    typeof res?.output === "string";

  if (hasUnifiedContract) {
    const tr = res as any;
    const raw = String(tr.output ?? "");
    const status = Number(tr.diagnostics?.statusCode ?? (tr.ok ? 0 : 1));
    const sessionInfo = tr.session ?? {};

    const event = {
      stepIndex,
      kind: "ensureMode",
      command: ensureAction.command || "(mode-only)",
      expectMode: step.expectMode,
      status,
      output: raw,
      sessionKind: sessionInfo.kind ?? (isHost ? "host" : "ios"),
      completionReason: tr.diagnostics?.completionReason,
      paging: Boolean(sessionInfo.paging),
      awaitingConfirm: Boolean(sessionInfo.awaitingConfirm),
    };

    const ensureFailed =
      tr.ok === false ||
      status !== 0 ||
      tr.diagnostics?.status === "failed";

    if (ensureFailed) {
      return {
        event,
        result: {
          skipped: false,
          raw,
          status,
          ok: tr.ok,
          error: tr.error,
          output: raw,
          hasUnifiedContract: true,
          sessionInfo,
          completionReason: tr.diagnostics?.completionReason,
          diagnostics: tr.diagnostics,
        },
        returnEarly: true,
        returnValue: {
          ok: false,
          output: raw,
          status: status || 1,
          promptBefore: "",
          promptAfter: String(tr.session?.promptAfter ?? ""),
          modeBefore: String(tr.session?.modeBefore ?? ""),
          modeAfter: String(tr.session?.modeAfter ?? ""),
          events: [event],
          warnings: [
            `ensureMode falló (unified): ${tr.error?.code ?? "RUNTIME_TERMINAL_FAILED"} — ${tr.error?.message ?? tr.output ?? "(sin output)"}`,
          ],
          parsed: tr,
          confidence: 0,
        },
      };
    }

    return {
      event,
      result: {
        skipped: false,
        raw,
        status,
        promptBefore: String(tr.session?.promptBefore ?? ""),
        modeBefore: String(tr.session?.modeBefore ?? ""),
        promptAfter: String(tr.session?.promptAfter ?? ""),
        modeAfter: String(tr.session?.modeAfter ?? ""),
        finalParsed: tr,
        sessionInfo,
        completionReason: tr.diagnostics?.completionReason,
        hasUnifiedContract: true,
        ok: tr.ok,
        diagnostics: tr.diagnostics,
      },
      returnEarly: false,
    };
  }

  // Legacy contract
  const raw = String(res.output ?? res.raw ?? (typeof res.value === "string" ? res.value : "") ?? "");
  const status = normalizeStatus(res);

  const event = {
    stepIndex,
    kind: "ensureMode",
    command: ensureAction.command || "(mode-only)",
    expectMode: step.expectMode,
    status,
    output: raw,
    sessionKind: isHost ? "host" : "ios",
  };

  if (status !== 0) {
    return {
      event,
      result: {
        skipped: false,
        raw,
        status,
        hasUnifiedContract: false,
        output: raw,
      },
      returnEarly: true,
      returnValue: {
        ok: false,
        output: raw,
        status,
        promptBefore: "",
        promptAfter: "",
        modeBefore: "",
        modeAfter: "",
        events: [event],
        warnings: [`ensureMode falló con status ${status}: ${ensureAction.command || "(mode-only)"}`],
        parsed: res.parsed,
        confidence: 0,
      },
    };
  }

  return {
    event,
    result: {
      skipped: false,
      raw,
      status,
      hasUnifiedContract: false,
      output: raw,
    },
    returnEarly: false,
  };
}
