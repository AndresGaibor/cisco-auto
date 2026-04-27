// ============================================================================
// Config IOS Handler - Configuration sequence execution
// ============================================================================

import type { PtRuntimeApi } from "../../pt-api/pt-deps.js";
import type { PtResult } from "../../pt-api/pt-results.js";
import type { ConfigIosPayload } from "../ios-payloads.js";
import { createDeferredResult, createErrorResult } from "../result-factories";
import { ensureSession } from "../../terminal/session-registry";
import {
  getTerminalDevice,
} from "./ios-session-utils";
import { buildConfigIosPlan } from "../ios-plan-builder";

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

  const plan = buildConfigIosPlan(deviceName, payload.commands, {
    save: Boolean(payload.save),
    stopOnError: Boolean(payload.stopOnError),
    ensurePrivileged: Boolean(payload.ensurePrivileged),
    dismissInitialDialog: payload.dismissInitialDialog ?? true,
    commandTimeoutMs: payload.commandTimeoutMs ?? 30000,
    stallTimeoutMs: payload.stallTimeoutMs ?? 15000,
  });

  return createDeferredResult(`configIos:${deviceName}`, plan);
}
