// ============================================================================
// Exec IOS Handler - Single IOS command execution
// ============================================================================

import type { PtRuntimeApi } from "../../pt-api/pt-deps.js";
import type { PtResult } from "../../pt-api/pt-results.js";
import type { ExecIosPayload } from "../ios-payloads.js";
import { createDeferredResult, createErrorResult, createSuccessResult } from "../result-factories";
import { ensureSession } from "../../terminal/session-registry";
import { detectModeFromPrompt } from "../../terminal/prompt-detector";
import {
  getTerminalDevice,
} from "./ios-session-utils";
import { buildExecIosPlan } from "../ios-plan-builder";

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

  const plan = buildExecIosPlan(deviceName, payload.command, {
    ensurePrivileged: Boolean(payload.ensurePrivileged),
    commandTimeoutMs: payload.commandTimeoutMs ?? 30000,
    stallTimeoutMs: payload.stallTimeoutMs ?? 15000,
    closeSession: false,
  });

  return createDeferredResult(`execIos:${deviceName}`, plan);
}
