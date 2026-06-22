// ============================================================================
// Exec IOS Handler - Single IOS command execution (Sync Wrapper)
// ============================================================================

import type { PtRuntimeApi } from "../../pt-api/pt-deps.js";
import type { PtResult } from "../../pt-api/pt-results.js";
import type { ExecIosPayload } from "../ios-payloads.js";
import { createErrorResult } from "../result-factories";
import {
  buildDeferredCommandPlan,
  startDeferredJobOrError,
} from "../deferred-job-factory.js";


function requiresPrivilegedByDefault(device: any): boolean {
  try {
    if (device && typeof device.getType === "function") {
      var typeId = device.getType();
      // 0=router, 1=switch, 16=multilayer switch, 27=firewall
      if (typeId === 0 || typeId === 1 || typeId === 16 || typeId === 27) return true;
    }
  } catch {}
  return false;
}

export function handleExecIos(payload: ExecIosPayload, api: PtRuntimeApi): PtResult {
  if (!payload || !payload.device || typeof payload.device !== "string") {
    return createErrorResult("Missing or invalid payload.device", "INVALID_PAYLOAD");
  }
  if (!payload.command || typeof payload.command !== "string" || !payload.command.trim()) {
    return createErrorResult("Missing or invalid payload.command", "INVALID_PAYLOAD");
  }

  const deviceName = payload.device;
  const device = api.getDeviceByName(deviceName);
  if (!device) return createErrorResult(`Device not found: ${deviceName}`, "DEVICE_NOT_FOUND");

  var needsPrivileged = Boolean(payload.ensurePrivileged);
  if (!needsPrivileged && requiresPrivilegedByDefault(device)) {
    needsPrivileged = true;
  }

  const plan = buildDeferredCommandPlan(deviceName, {
    command: payload.command,
    ensurePrivileged: needsPrivileged,
    stopOnError: false,
    commandTimeoutMs: payload.commandTimeoutMs ?? 30000,
    stallTimeoutMs: payload.stallTimeoutMs ?? 15000,
    closeSession: false,
  });

  return startDeferredJobOrError(plan, api);
}