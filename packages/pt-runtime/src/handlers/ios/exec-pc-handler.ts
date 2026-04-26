// ============================================================================
// Exec PC Handler - PC/Server command execution
// ============================================================================

import type { PtRuntimeApi } from "../../pt-api/pt-deps.js";
import type { PtResult } from "../../pt-api/pt-results.js";
import type { ExecPcPayload } from "../ios-payloads.js";
import { createErrorResult, createSuccessResult } from "../result-factories";
import { createCommandExecutor } from "../../terminal/index";
import { ensureSession } from "../../terminal/session-registry";
import { verifyHostOutput } from "../../terminal/terminal-semantic-verifier";
import { getTerminalDevice, DEFAULT_STALL_TIMEOUT } from "./ios-session-utils";
import { stabilizeHostPrompt, hostEchoLooksTruncated } from "./host-stabilize";
import { mapExecResultToTerminalResult, mapTerminalResultToPtResult } from "./ios-result-mapper";

/**
 * Ejecuta un comando en un host (PC o Server) de Packet Tracer.
 * A diferencia de IOS, los hosts tienen CLI simple sin modos de configuración.
 *
 * @param payload - ExecPcPayload con device, command, y timeoutMs
 * @param api - PtRuntimeApi con acceso a IPC y device registry
 * @returns PtResult con output, status, y parsed metadata
 */
export async function handleExecPc(payload: ExecPcPayload, api: PtRuntimeApi): Promise<PtResult> {
  const deviceName = payload.device;
  const deviceRef = api.getDeviceByName(deviceName);
  if (!deviceRef) return createErrorResult(`Device not found: ${deviceName}`, "DEVICE_NOT_FOUND");

  const terminal = getTerminalDevice(api, deviceName);
  if (!terminal) return createErrorResult("Terminal engine inaccessible", "NO_TERMINAL");

  const session = ensureSession(deviceName);
  session.sessionKind = "host";

  const cmd = payload.command.trim().toLowerCase();
  const isLongRunningCommand = cmd.startsWith("ping") || cmd.startsWith("tracert") || cmd.startsWith("trace");
  const commandTimeoutMs = isLongRunningCommand ? (payload.timeoutMs ?? 60000) : (payload.timeoutMs ?? 30000);

  await stabilizeHostPrompt(terminal);

  const executor = createCommandExecutor({
    commandTimeoutMs,
    stallTimeoutMs: DEFAULT_STALL_TIMEOUT,
  });

  let result = await executor.executeCommand(
    deviceName,
    payload.command,
    terminal,
    {
      commandTimeoutMs,
      autoAdvancePager: true,
    }
  );

  if (hostEchoLooksTruncated(result.output, payload.command)) {
    await stabilizeHostPrompt(terminal);

    result = await executor.executeCommand(
      deviceName,
      payload.command,
      terminal,
      {
        commandTimeoutMs,
        autoAdvancePager: true,
      }
    );
  }

  if (typeof (api as any).dprint === "function") {
    (api as any).dprint(
      `[handler:execPc] device=${deviceName} status=${result.status} outputLen=${result.output.length} preview=${JSON.stringify(result.output.slice(0, 120))}`,
    );
  }

  const semantic = verifyHostOutput(result.output);
  const autoDismissedInitialDialog = result.warnings?.includes("Initial configuration dialog was auto-dismissed") ?? false;

  const terminalResult = mapExecResultToTerminalResult(
    result,
    deviceName,
    payload.command,
    semantic,
    autoDismissedInitialDialog,
  );

  return mapTerminalResultToPtResult(terminalResult, terminalResult.raw);
}
