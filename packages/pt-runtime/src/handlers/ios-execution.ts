// ============================================================================
// IOS Execution Handlers - V12 Resilient
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
  if (!device) return createErrorResult(`Device not found: ${payload.device}`, "DEVICE_NOT_FOUND");
  const plan = buildConfigIosPlan(payload.device, payload.commands, {
    save: payload.save ?? true, stopOnError: payload.stopOnError ?? true,
    ensurePrivileged: payload.ensurePrivileged ?? true,
    dismissInitialDialog: payload.dismissInitialDialog ?? true,
    commandTimeoutMs: payload.commandTimeoutMs ?? 8000, stallTimeoutMs: payload.stallTimeoutMs ?? 15000,
  });
  const ticket = "job_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
  plan.id = ticket;
  return createDeferredResult(ticket, plan);
}

export function handleExecIos(payload: ExecIosPayload, api: PtRuntimeApi): PtResult {
  const device = api.getDeviceByName(payload.device);
  if (!device) return createErrorResult(`Device not found: ${payload.device}`, "DEVICE_NOT_FOUND");
  const plan = buildExecIosPlan(payload.device, payload.command, {
    ensurePrivileged: payload.ensurePrivileged ?? true,
    commandTimeoutMs: payload.commandTimeoutMs ?? 8000, stallTimeoutMs: payload.stallTimeoutMs ?? 15000,
  });
  const ticket = "job_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
  plan.id = ticket;
  return createDeferredResult(ticket, plan);
}

export function handleDeferredPoll(pollPayload: PollDeferredPayload, api: PtRuntimeApi): PtResult {
  const { ticket } = pollPayload;
  const jobState = (api as any).getJobState?.(ticket);
  if (!jobState) return { ...createErrorResult(`Job not found: ${ticket}`, "JOB_NOT_FOUND"), done: true } as PtResult;
  if (!jobState.done) return { ok: true, deferred: true, ticket, done: false, state: jobState.state } as any;
  const rawOutput = jobState.output || "";
  return { ok: true, done: true, raw: sanitizeTerminalOutput(undefined, rawOutput) || rawOutput, source: "terminal" };
}

export function handlePing(payload: { device: string; target: string; timeoutMs?: number }, api: PtRuntimeApi): PtResult {
  try {
    var device = api.getDeviceByName(payload.device);
    if (!device) return createErrorResult("Device not found", "DEVICE_NOT_FOUND");
    
    var type = device.getType ? device.getType() : -1;
    var isPc = (type === 8 || type === 9);
    var cmd = isPc ? "ping " + payload.target : "ping " + payload.target + " repeat 4";

    // HACK: Despertamos el objeto Command Line manualmente
    var cli = (device as any).getCommandLine ? (device as any).getCommandLine() : null;
    if (!cli) {
        // Fallback: Si no tiene el método, intentamos obtenerlo vía IPC
        cli = (api as any).ipc.terminal ? (api as any).ipc.terminal(payload.device) : null;
    }
    
    if (!cli) return createErrorResult("Terminal engine inaccessible on this device", "NO_TERMINAL");

    var ticket = "ping_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    var plan: DeferredJobPlan = {
        id: ticket, kind: "ios-session", version: 1, device: payload.device,
        plan: [{ type: "command", value: cmd, options: { timeoutMs: 15000 } }],
        options: { commandTimeoutMs: 15000, stallTimeoutMs: 15000 },
        payload: payload
    };
    return createDeferredResult(ticket, plan);
  } catch(e) {
      return createErrorResult("Kernel Panic: " + String(e), "INTERNAL_ERROR");
  }
}

export function handleExecPc(payload: ExecPcPayload, api: PtRuntimeApi): PtResult {
  const deviceRef = api.getDeviceByName(payload.device);
  if (!deviceRef) return createErrorResult(`Device not found: ${payload.device}`, "DEVICE_NOT_FOUND");
  const ticket = "pc_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
  const plan: DeferredJobPlan = {
    id: ticket, kind: "ios-session", version: 1, device: payload.device,
    plan: [{ type: "command", value: payload.command, options: { stopOnError: false, timeoutMs: 30000 } }, { type: "close-session" }],
    options: { stopOnError: false, commandTimeoutMs: 30000, stallTimeoutMs: 30000 },
    payload: payload,
  };
  return createDeferredResult(ticket, plan);
}

export function handleExecPcDirect(payload: ExecPcPayload, api: PtRuntimeApi): PtResult {
  try {
      var d = api.getDeviceByName(payload.device);
      if (d && (d as any).getCommandLine) (d as any).getCommandLine().enterCommand(payload.command);
      return { ok: true, result: "Injected" } as any;
  } catch(e) { return createErrorResult(String(e), "EXEC_FAILED"); }
}
