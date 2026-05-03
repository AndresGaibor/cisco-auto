// ============================================================================
// Config IOS Handler - Configuration sequence execution (Sync Wrapper)
// ============================================================================

import type { PtRuntimeApi } from "../../pt-api/pt-deps.js";
import type { PtResult } from "../../pt-api/pt-results.js";
import type { ConfigIosPayload } from "../ios-payloads.js";
import { createErrorResult } from "../result-factories";
import {
  buildDeferredConfigPlan,
  startDeferredJobOrError,
} from "../deferred-job-factory.js";

export function handleConfigIos(payload: ConfigIosPayload, api: PtRuntimeApi): PtResult {
  const deviceName = payload.device;
  const device = api.getDeviceByName(deviceName);
  if (!device) return createErrorResult(`Device not found: ${deviceName}`, "DEVICE_NOT_FOUND");

  if (!payload.commands || payload.commands.length === 0) {
    return createErrorResult("No commands provided", "EMPTY_COMMANDS");
  }

  const plan = buildDeferredConfigPlan(deviceName, {
    commands: payload.commands,
    save: Boolean(payload.save),
    stopOnError: Boolean(payload.stopOnError),
    ensurePrivileged: Boolean(payload.ensurePrivileged),
    dismissInitialDialog: payload.dismissInitialDialog ?? true,
    commandTimeoutMs: payload.commandTimeoutMs ?? 30000,
    stallTimeoutMs: payload.stallTimeoutMs ?? 15000,
    closeSession: false,
  });

  return startDeferredJobOrError(plan, api);
}