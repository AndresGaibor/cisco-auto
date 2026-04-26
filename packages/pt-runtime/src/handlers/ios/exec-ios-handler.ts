// ============================================================================
// Exec IOS Handler - Single IOS command execution
// ============================================================================

import type { PtRuntimeApi } from "../../pt-api/pt-deps.js";
import type { PtResult } from "../../pt-api/pt-results.js";
import type { ExecIosPayload } from "../ios-payloads.js";
import { createErrorResult, createSuccessResult } from "../result-factories";
import { sanitizeTerminalOutput } from "../terminal-sanitizer";
import { createCommandExecutor, type ExecutionOptions } from "../../terminal/index";
import { ensureSession } from "../../terminal/session-registry";
import { detectModeFromPrompt } from "../../terminal/prompt-detector";
import { createModeGuard } from "../../terminal/mode-guard";
import type { TerminalExecutionResult } from "../../terminal/terminal-execution-result.js";
import {
  withTimeout,
  getTerminalDevice,
  DEFAULT_COMMAND_TIMEOUT,
  DEFAULT_STALL_TIMEOUT,
} from "./ios-session-utils";

/**
 * Ejecuta un comando único IOS en un dispositivo.
 * Wrapper async sobre createCommandExecutor que maneja el ciclo completo:
 * 1. Obtiene terminal del dispositivo
 * 2. Registra listeners para eventos PT
 * 3. Envía comando via enterCommand()
 * 4. Espera commandEnded o timeout
 * 5. Retorna output sanitizado y parsed
 *
 * @param payload - ExecIosPayload con device, command, y options
 * @param api - PtRuntimeApi con acceso a IPC y device registry
 * @returns PtResult con output, status, y parsed metadata
 *
 * @example
 * handleExecIos({ type: "execIos", device: "R1", command: "show ip int brief" }, api)
 * // → { ok: true, raw: "...", status: 0, parsed: { command: "show ip int brief", durationMs: 234 } }
 */
export async function handleExecIos(payload: ExecIosPayload, api: PtRuntimeApi): Promise<PtResult> {
  const deviceName = payload.device;
  const device = api.getDeviceByName(deviceName);
  if (!device) return createErrorResult(`Device not found: ${deviceName}`, "DEVICE_NOT_FOUND");

  const terminal = getTerminalDevice(api, deviceName);
  if (!terminal) return createErrorResult("Terminal engine inaccessible", "NO_TERMINAL");

  const session = ensureSession(deviceName);

  const deviceModel = (device as any)?.getModel?.() ?? "";
  const isHost = deviceModel.toLowerCase().includes("pc") || deviceModel.toLowerCase().includes("server");
  session.sessionKind = isHost ? "host" : "ios";

  const currentMode = detectModeFromPrompt(terminal.getPrompt());
  if (payload.ensurePrivileged && currentMode !== "privileged-exec") {
    const modeGuard = createModeGuard();
    let privResult;
    try {
      privResult = await withTimeout(
        modeGuard.ensurePrivilegedExec(deviceName, terminal),
        15000,
        "Timed out while ensuring privileged exec mode",
      );
    } catch (error) {
      return createErrorResult(
        error instanceof Error ? error.message : String(error),
        "MODE_TRANSITION_TIMEOUT",
        { raw: (terminal as any).getOutput?.() ?? "" }
      );
    }

    if (!privResult.ok) {
      return createErrorResult(
        privResult.error ?? "Failed to enter privileged mode",
        "MODE_TRANSITION_FAILED",
        { raw: privResult.warnings?.join("\n") ?? "" }
      );
    }
  }

  if (!payload.command || !String(payload.command).trim()) {
    const now = Date.now();
    const prompt = terminal.getPrompt?.() ?? "";
    const mode = detectModeFromPrompt(prompt);
    const modeMatched = !payload.expectedMode || mode === (payload.expectedMode as string);

    const terminalResult = {
      ok: modeMatched,
      device: deviceName,
      command: "",
      output: "",
      raw: "",
      error: modeMatched
        ? undefined
        : {
            code: "TERMINAL_MODE_MISMATCH" as const,
            message: `Expected mode "${payload.expectedMode}" not reached; got "${mode}" at prompt "${prompt}".`,
            phase: "postcondition" as const,
          },
      diagnostics: {
        status: modeMatched ? ("completed" as const) : ("failed" as const),
        statusCode: modeMatched ? 0 : 1,
        completionReason: "ensure-mode-only",
        outputSource: "none" as const,
        confidence: "high" as const,
        startedSeen: false,
        endedSeen: false,
        outputEvents: 0,
        promptMatched: true,
        modeMatched,
        semanticOk: true,
        durationMs: 0,
      },
      session: {
        kind: session.sessionKind,
        promptBefore: prompt,
        promptAfter: prompt,
        modeBefore: mode as any,
        modeAfter: mode as any,
        paging: false,
        awaitingConfirm: false,
        autoDismissedInitialDialog: false,
      },
      events: [] as any[],
      warnings: [] as string[],
    };

    if (terminalResult.ok) {
      return createSuccessResult(terminalResult as unknown as Record<string, unknown>);
    }

    return createErrorResult(
      terminalResult.error?.message ?? "Ensure mode failed",
      terminalResult.error?.code,
      {
        raw: terminalResult.raw,
        status: terminalResult.diagnostics.statusCode,
        parsed: terminalResult as unknown as Record<string, unknown>,
      },
    );
  }

  const options: ExecutionOptions = {
    commandTimeoutMs: payload.commandTimeoutMs ?? DEFAULT_COMMAND_TIMEOUT,
    stallTimeoutMs: payload.stallTimeoutMs ?? DEFAULT_STALL_TIMEOUT,
    autoAdvancePager: isHost ? false : (payload.allowPager ?? true),
    autoDismissWizard: true,
    autoConfirm: payload.allowConfirm ?? false,
    maxPagerAdvances: 50,
    sessionKind: session.sessionKind,
    expectedMode: payload.expectedMode as any,
    expectedPromptPattern: payload.expectedPromptPattern,
  };

  const executor = createCommandExecutor({
    commandTimeoutMs: options.commandTimeoutMs,
    stallTimeoutMs: options.stallTimeoutMs,
  });

  let execResult;

  try {
    execResult = await withTimeout(
      executor.executeCommand(
        deviceName,
        payload.command,
        terminal as any,
        options,
      ),
      (options.commandTimeoutMs ?? DEFAULT_COMMAND_TIMEOUT) + 3000,
      `Timed out while executing IOS command "${payload.command}"`,
    );
  } catch (error) {
    const raw = (terminal as any).getOutput?.() ?? "";

    return createErrorResult(
      error instanceof Error ? error.message : String(error),
      "IOS_COMMAND_EXECUTION_TIMEOUT",
      {
        raw,
        status: 1,
        details: {
          device: deviceName,
          command: payload.command,
          phase: "execute-command",
          prompt: (terminal as any).getPrompt?.() ?? "",
          mode: detectModeFromPrompt((terminal as any).getPrompt?.() ?? ""),
        },
      },
    );
  }

  const raw = execResult.output;
  const sanitized = sanitizeTerminalOutput(undefined, raw) || raw;

  const parsed = {
    command: execResult.command,
    startedAt: execResult.startedAt,
    endedAt: execResult.endedAt,
    durationMs: execResult.durationMs,
    promptBefore: execResult.promptBefore,
    promptAfter: execResult.promptAfter,
    modeBefore: execResult.modeBefore,
    modeAfter: execResult.modeAfter,
    startedSeen: execResult.startedSeen,
    endedSeen: execResult.endedSeen,
    outputEvents: execResult.outputEvents,
    confidence: execResult.confidence,
    events: execResult.events,
    warnings: execResult.warnings,
  };

  const terminalResult: TerminalExecutionResult = {
    ok: execResult.ok,
    device: deviceName,
    command: payload.command,
    output: sanitized,
    raw: execResult.rawOutput || sanitized,
    error: execResult.ok ? undefined : {
      code: execResult.code ?? "TERMINAL_UNKNOWN_STATE",
      message: execResult.error ?? `Command failed with status ${execResult.status}`,
      phase: "execution",
      details: { status: execResult.status },
    },
    diagnostics: {
      status: execResult.ok ? "completed" : "failed",
      statusCode: execResult.status ?? (execResult.ok ? 0 : 1),
      completionReason: execResult.error,
      outputSource: "event",
      confidence: execResult.confidence as any,
      startedSeen: execResult.startedSeen,
      endedSeen: execResult.endedSeen,
      outputEvents: execResult.outputEvents,
      promptMatched: !payload.expectedPromptPattern || execResult.promptAfter?.includes(payload.expectedPromptPattern),
      modeMatched: !payload.expectedMode || execResult.modeAfter === payload.expectedMode,
      semanticOk: execResult.status === 0,
      durationMs: execResult.durationMs,
    },
    session: {
      kind: session.sessionKind,
      promptBefore: execResult.promptBefore,
      promptAfter: execResult.promptAfter,
      modeBefore: execResult.modeBefore as any,
      modeAfter: execResult.modeAfter as any,
      paging: false,
      awaitingConfirm: false,
      autoDismissedInitialDialog: execResult.warnings?.includes("Initial configuration dialog was auto-dismissed") ?? false,
    },
    events: execResult.events,
    warnings: execResult.warnings,
  };

  if (terminalResult.ok) {
    return createSuccessResult(terminalResult as unknown as Record<string, unknown>);
  }

  return createErrorResult(
    terminalResult.error?.message ?? "Terminal execution failed",
    terminalResult.error?.code,
    { raw: terminalResult.raw, status: terminalResult.diagnostics.statusCode, parsed: terminalResult as unknown as Record<string, unknown> },
  );
}
