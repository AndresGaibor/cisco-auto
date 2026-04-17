// ============================================================================
// IOS Execution Handlers - configIos, execIos, deferredPoll, ping, execPc
// ============================================================================

import type { DeferredJobPlan } from "../runtime/contracts";
import type { PtRuntimeApi } from "../pt-api/pt-deps.js";
import type { PtResult } from "../pt-api/pt-results.js";
import type {
  ConfigIosPayload,
  ExecIosPayload,
  PollDeferredPayload,
  ExecPcPayload,
} from "./ios-payloads.js";
import { buildConfigIosPlan, buildExecIosPlan } from "./ios-plan-builder";
import { getParser } from "./parsers/ios-parsers.js";
import { createErrorResult, createSuccessResult, createDeferredResult } from "./result-factories";
import { sanitizeTerminalOutput } from "./terminal-sanitizer";

export function handleConfigIos(payload: ConfigIosPayload, api: PtRuntimeApi): PtResult {
  const device = api.getDeviceByName(payload.device);
  if (!device) {
    return createErrorResult(`Device not found: ${payload.device}`, "DEVICE_NOT_FOUND");
  }

  if (!device.hasTerminal || !device.getTerminal()) {
    return createErrorResult(`Device does not support CLI: ${payload.device}`, "NO_TERMINAL");
  }

  if (!payload.commands?.length) {
    return createSuccessResult({ device: payload.device, executed: 0, results: [], skipped: true });
  }

  const plan = buildConfigIosPlan(payload.device, payload.commands, {
    save: payload.save ?? true,
    stopOnError: payload.stopOnError ?? true,
    ensurePrivileged: payload.ensurePrivileged ?? true,
    dismissInitialDialog: payload.dismissInitialDialog ?? true,
    commandTimeoutMs: payload.commandTimeoutMs ?? 8000,
    stallTimeoutMs: payload.stallTimeoutMs ?? 15000,
  });

  const ticket = "job_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
  plan.id = ticket;

  api.dprint(
    `[configIos] Created plan ${ticket} for device ${payload.device} with ${plan.plan.length} steps`,
  );

  return createDeferredResult(ticket, plan);
}

export function handleExecIos(payload: ExecIosPayload, api: PtRuntimeApi): PtResult {
  const device = api.getDeviceByName(payload.device);
  if (!device) {
    return createErrorResult(`Device not found: ${payload.device}`, "DEVICE_NOT_FOUND");
  }

  if (!device.hasTerminal || !device.getTerminal()) {
    return createErrorResult(
      `Device not ready: ${payload.device} is still booting or in ROMMON`,
      "NO_TERMINAL",
    );
  }

  const plan = buildExecIosPlan(payload.device, payload.command, {
    ensurePrivileged: payload.ensurePrivileged ?? true,
    commandTimeoutMs: payload.commandTimeoutMs ?? 8000,
    stallTimeoutMs: payload.stallTimeoutMs ?? 15000,
  });

  const ticket = "job_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
  plan.id = ticket;

  api.dprint(
    `[execIos] Created plan ${ticket} for device ${payload.device} command="${payload.command}"`,
  );

  return createDeferredResult(ticket, plan);
}

export function handleDeferredPoll(pollPayload: PollDeferredPayload, api: PtRuntimeApi): PtResult {
  const { ticket } = pollPayload;

  const jobState = (api as any).getJobState?.(ticket);
  if (!jobState) {
    return {
      ...createErrorResult(`Job not found: ${ticket}`, "JOB_NOT_FOUND"),
      done: true,
    } as PtResult;
  }

  if (!jobState.done) {
    const pollResult: PtResult = {
      ok: true,
      deferred: true,
      ticket,
      job: undefined as unknown as DeferredJobPlan,
      done: false,
      state: jobState.state,
    } as any;
    (pollResult as any).pollState = {
      done: false,
      state: jobState.state,
      currentStep: jobState.currentStep,
      totalSteps: jobState.totalSteps,
      outputTail: jobState.outputTail,
    };
    return pollResult;
  }

  if (jobState.error) {
    return {
      ...createErrorResult(jobState.error, jobState.errorCode || "IOS_JOB_FAILED", {
        raw: jobState.output,
      }),
      done: true,
      source: "terminal",
    } as PtResult;
  }

  const session = api.querySessionState(pollPayload.ticket.split("_")[1] || "");
  const rawOutput = jobState.output || "";
  const sanitizedOutput = sanitizeTerminalOutput(undefined, rawOutput);

  const result: PtResult = {
    ok: true,
    done: true,
    raw: sanitizedOutput || rawOutput,
    source: "terminal",
  };

  const payload = (api as any).jobPayload?.(ticket);
  if (payload?.command) {
    const parser = getParser(payload.command);
    if (parser) {
      try {
        (result as any).parsed = parser(sanitizedOutput);
      } catch (e) {
        (result as any).parseError = String(e);
      }
    }
  }

  return result;
}

export function handlePing(_payload: Record<string, unknown>, api: PtRuntimeApi): PtResult {
  return createSuccessResult({ status: "alive", timestamp: api.now() });
}

export function handleExecPc(payload: ExecPcPayload, api: PtRuntimeApi): PtResult {
  const { device, command, timeoutMs = 30000 } = payload;

  api.dprint(`[execPc] device=${device} command="${command}"`);

  const deviceRef = api.getDeviceByName(device);
  if (!deviceRef) {
    return createErrorResult(`Device not found: ${device}`, "DEVICE_NOT_FOUND");
  }

  const ticket = "pc_" + Date.now() + "_" + Math.floor(Math.random() * 10000);

  const plan: DeferredJobPlan = {
    id: ticket,
    kind: "ios-session",
    version: 1,
    device,
    plan: [
      { type: "command", value: command, options: { stopOnError: false, timeoutMs } },
      { type: "close-session" },
    ],
    options: {
      stopOnError: false,
      commandTimeoutMs: timeoutMs,
      stallTimeoutMs: timeoutMs,
    },
    payload: { device, command },
  };

  api.dprint(`[execPc] Created plan ${ticket} for device=${device} command="${command}"`);

  return createDeferredResult(ticket, plan);
}
