// ============================================================================
// Exec PC Handler - PC/Server command execution (Sync Wrapper)
// ============================================================================

import type { PtRuntimeApi } from "../../pt-api/pt-deps.js";
import type { PtResult } from "../../pt-api/pt-results.js";
import type { ExecPcPayload } from "../ios-payloads.js";
import { createErrorResult } from "../result-factories";
import {
  buildDeferredCommandPlan,
  startDeferredJobOrError,
} from "../deferred-job-factory.js";

export function handleExecPc(payload: ExecPcPayload, api: PtRuntimeApi): PtResult {
  const deviceName = payload.device;
  const deviceRef = api.getDeviceByName(deviceName);
  if (!deviceRef) return createErrorResult(`Device not found: ${deviceName}`, "DEVICE_NOT_FOUND");

  const cmd = payload.command.trim().toLowerCase();
  const isLongRunningCommand = cmd.startsWith("ping") || cmd.startsWith("tracert") || cmd.startsWith("trace");
  const commandTimeoutMs = isLongRunningCommand ? (payload.timeoutMs ?? 60000) : (payload.timeoutMs ?? 30000);

  const plan = buildDeferredCommandPlan(deviceName, {
    command: payload.command,
    sessionKind: "host",
    source: "execPc",
    ensurePrivileged: false,
    stopOnError: false,
    commandTimeoutMs,
    stallTimeoutMs: 15000,
    closeSession: false,
  });

  return startDeferredJobOrError(plan, api);
}