// ============================================================================
// Ping Handler - Ping from IOS device or PC/Server
// ============================================================================

import type { PtRuntimeApi } from "../../pt-api/pt-deps.js";
import type { PtResult } from "../../pt-api/pt-results.js";
import { createErrorResult, createSuccessResult } from "../result-factories";
import { createCommandExecutor } from "../../terminal/index";
import { getTerminalDevice } from "./ios-session-utils";

export async function handlePing(
  payload: { device: string; target: string; timeoutMs?: number },
  api: PtRuntimeApi,
): Promise<PtResult> {
  try {
    const deviceName = payload.device;
    const device = api.getDeviceByName(deviceName);
    if (!device) return createErrorResult("Device not found", "DEVICE_NOT_FOUND");

    const type = device.getType ? device.getType() : -1;
    const model = device.getModel ? String(device.getModel()).toLowerCase() : "";
    const typeStr = String(type).toLowerCase();

    // Detección robusta de PC/Server (por ID, tipo de string o modelo)
    const isPc = (
        type === 8 ||
        type === 9 ||
        typeStr.indexOf("pc") !== -1 ||
        typeStr.indexOf("server") !== -1 ||
        model.indexOf("pc") !== -1 ||
        model.indexOf("server") !== -1
    );

    // Un solo comando para todos los dispositivos - CommandExecutor maneja completion
    const cmd = isPc ? "ping " + payload.target : "ping " + payload.target + " repeat 4";

    const terminal = getTerminalDevice(api, deviceName);
    if (!terminal) return createErrorResult("Terminal engine inaccessible", "NO_TERMINAL");

    // Usa CommandExecutor unificado para todos los dispositivos (incluyendo PC)
    const executor = createCommandExecutor({
      commandTimeoutMs: payload.timeoutMs ?? 15000,
      stallTimeoutMs: 15000,
    });

    const result = await executor.executeCommand(
      deviceName,
      cmd,
      terminal,
      {
        commandTimeoutMs: payload.timeoutMs ?? 15000,
        stallTimeoutMs: 15000,
        autoAdvancePager: true,
      }
    );

    if (typeof (api as any).dprint === "function") {
      (api as any).dprint(
        `[handler:ping] device=${deviceName} ok=${result.ok} status=${result.status} outputLen=${result.output.length} preview=${JSON.stringify(result.output.slice(0, 120))}`,
      );
    }

    if (result.ok) {
      return createSuccessResult(result.output, {
        raw: result.output,
        status: result.status ?? undefined,
        parsed: {
          command: result.command,
          durationMs: result.durationMs,
          promptAfter: result.promptAfter,
          modeAfter: result.modeAfter,
          confidence: result.confidence,
        },
      });
    }

    return createErrorResult(result.error || "Ping failed", result.code, { raw: result.output });
  } catch(e) {
    return createErrorResult("Kernel Panic: " + String(e), "INTERNAL_ERROR");
  }
}
