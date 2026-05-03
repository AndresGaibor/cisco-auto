// ============================================================================
// Ping Handler - Ping from IOS device or PC/Server (Sync Wrapper)
// ============================================================================

import type { PtRuntimeApi } from "../../pt-api/pt-deps.js";
import type { PtResult } from "../../pt-api/pt-results.js";
import { createErrorResult } from "../result-factories";
import {
  buildDeferredCommandPlan,
  startDeferredJobOrError,
} from "../deferred-job-factory.js";

export function handlePing(
  payload: { device: string; target: string; timeoutMs?: number },
  api: PtRuntimeApi,
): PtResult {
  const deviceName = payload.device;
  const device = api.getDeviceByName(deviceName);
  if (!device) return createErrorResult("Device not found", "DEVICE_NOT_FOUND");

  const type = device.getType ? device.getType() : -1;
  const model = device.getModel ? String(device.getModel()).toLowerCase() : "";
  const typeStr = String(type).toLowerCase();

  const isPc = (
    type === 8 ||
    type === 9 ||
    typeStr.indexOf("pc") !== -1 ||
    typeStr.indexOf("server") !== -1 ||
    model.indexOf("pc") !== -1 ||
    model.indexOf("server") !== -1
  );

  const cmd = isPc ? "ping " + payload.target : "ping " + payload.target + " repeat 4";
  const commandTimeoutMs = payload.timeoutMs ?? 15000;

  const plan = buildDeferredCommandPlan(deviceName, {
    command: cmd,
    ensurePrivileged: false,
    stopOnError: false,
    commandTimeoutMs,
    stallTimeoutMs: 15000,
    closeSession: false,
  });

  return startDeferredJobOrError(plan, api);
}