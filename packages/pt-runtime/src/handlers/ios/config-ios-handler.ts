// ============================================================================
// Config IOS Handler - Configuration sequence execution
// ============================================================================

import type { PtRuntimeApi } from "../../pt-api/pt-deps.js";
import type { PtResult } from "../../pt-api/pt-results.js";
import type { ConfigIosPayload } from "../ios-payloads.js";
import { createErrorResult, createSuccessResult } from "../result-factories";
import { sanitizeTerminalOutput } from "../terminal-sanitizer";
import { createCommandExecutor, type ExecutionOptions } from "../../terminal/index";
import { ensureSession } from "../../terminal/session-registry";
import {
  getTerminalDevice,
  inferExpectedModeAfterCommand,
  DEFAULT_COMMAND_TIMEOUT,
  DEFAULT_STALL_TIMEOUT,
} from "./ios-session-utils";

/**
 * Ejecuta una secuencia de comandos IOS de configuración.
 * Cada comando se ejecuta en orden, con soporte para stopOnError.
 * Opcionalmente guarda la configuración al final con "copy run start".
 *
 * @param payload - ConfigIosPayload con device, commands[], y options
 * @param api - PtRuntimeApi con acceso a IPC y device registry
 * @returns PtResult con output acumulado si todos succeed o error si falló
 *
 * @example
 * handleConfigIos({
 *   type: "configIos",
 *   device: "R1",
 *   commands: ["interface GigabitEthernet0/0", "ip address 192.168.1.1 255.255.255.0", "no shutdown"],
 *   save: true
 * }, api)
 */
export async function handleConfigIos(payload: ConfigIosPayload, api: PtRuntimeApi): Promise<PtResult> {
  const deviceName = payload.device;
  const device = api.getDeviceByName(deviceName);
  if (!device) return createErrorResult(`Device not found: ${deviceName}`, "DEVICE_NOT_FOUND");

  const terminal = getTerminalDevice(api, deviceName);
  if (!terminal) return createErrorResult("Terminal engine inaccessible", "NO_TERMINAL");

  ensureSession(deviceName);

  const executor = createCommandExecutor({
    commandTimeoutMs: payload.commandTimeoutMs ?? DEFAULT_COMMAND_TIMEOUT,
    stallTimeoutMs: payload.stallTimeoutMs ?? DEFAULT_STALL_TIMEOUT,
  });

  let allOutput = "";
  let lastOk = false;

  const execOptions: ExecutionOptions = {
    commandTimeoutMs: payload.commandTimeoutMs ?? DEFAULT_COMMAND_TIMEOUT,
    stallTimeoutMs: payload.stallTimeoutMs ?? DEFAULT_STALL_TIMEOUT,
    autoAdvancePager: true,
    autoDismissWizard: payload.dismissInitialDialog ?? true,
    maxPagerAdvances: 50,
  };

  for (const command of payload.commands) {
    const result = await executor.executeCommand(deviceName, command, terminal, {
      ...execOptions,
      expectedMode: inferExpectedModeAfterCommand(command),
    });
    allOutput += result.output;

    if (!result.ok) {
      if (payload.stopOnError) {
        return createErrorResult(
          result.error || `Command failed: ${command}`,
          result.code,
          { raw: allOutput }
        );
      }
    } else {
      lastOk = true;
    }
  }

  if (payload.save) {
    const saveResult = await executor.executeCommand(
      deviceName,
      "end",
      terminal,
      {
        ...execOptions,
        expectedMode: "privileged-exec" as any,
      }
    );
    allOutput += saveResult.output;

    const copyResult = await executor.executeCommand(
      deviceName,
      "copy run start",
      terminal,
      execOptions
    );
    allOutput += copyResult.output;
    lastOk = copyResult.ok;
  }

  if (lastOk) {
    return createSuccessResult(undefined, {
      raw: sanitizeTerminalOutput(undefined, allOutput) || allOutput,
    });
  }

  return createErrorResult("Configuration sequence failed", "CONFIG_FAILED", {
    raw: allOutput,
  });
}
