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

export function handleExecIos(payload: ExecIosPayload, api: PtRuntimeApi): PtResult {
  const deviceName = payload.device;
  const device = api.getDeviceByName(deviceName);
  if (!device) return createErrorResult(`Device not found: ${deviceName}`, "DEVICE_NOT_FOUND");

  if (!payload.command || !String(payload.command).trim()) {
    return createErrorResult("Empty command not supported in sync wrapper", "EMPTY_COMMAND");
  }

  const plan = buildDeferredCommandPlan(deviceName, {
    command: payload.command,
    ensurePrivileged: Boolean(payload.ensurePrivileged),
    stopOnError: false,
    commandTimeoutMs: payload.commandTimeoutMs ?? 30000,
    stallTimeoutMs: payload.stallTimeoutMs ?? 15000,
    closeSession: false,
  });

  return startDeferredJobOrError(plan, api);
}