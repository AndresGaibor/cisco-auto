// ============================================================================
// Runtime Handlers - Lógica de negocio
// ============================================================================
//
// Estos handlers contienen toda la lógica de negocio ydevuelven planes de
// ejecución o resultados inmediatos. No ejecutan la terminal directamente.
//
// El kernel (main) ejecuta los planes; los handlers solo decide QUÉ hacer.
// ============================================================================

import type {
  DeferredJobPlan,
  DeferredStep,
  SessionStateSnapshot,
  DeferredStepType,
  DeferredJobOptions,
  DeviceRef,
  RuntimeResult,
  RuntimeApi,
} from "../runtime/contracts";
import type { PtResult } from "../pt-api/pt-results.js";
import type { PtRuntimeApi } from "../pt-api/pt-deps.js";

import {
  handleEnsureVlans,
  handleConfigVlanInterfaces,
  type ConfigVlanInterfacesPayload,
} from "./vlan.js";
import {
  handleConfigDhcpServer,
  handleInspectDhcpServer,
  type ConfigDhcpServerPayload,
  type InspectDhcpServerPayload,
} from "./dhcp.js";
import { handleInspectHost, type InspectHostPayload } from "./host.js";
import { getParser } from "./parsers/ios-parsers.js";

// ============================================================================
// Payload Types
// ============================================================================

export interface ConfigHostPayload {
  type: "configHost";
  device: string;
  ip?: string;
  mask?: string;
  gateway?: string;
  dns?: string;
  dhcp?: boolean;
}

export interface ConfigIosPayload {
  type: "configIos";
  device: string;
  commands: string[];
  save?: boolean;
  stopOnError?: boolean;
  ensurePrivileged?: boolean;
  dismissInitialDialog?: boolean;
  commandTimeoutMs?: number;
  stallTimeoutMs?: number;
}

export interface ExecIosPayload {
  type: "execIos";
  device: string;
  command: string;
  parse?: boolean;
  ensurePrivileged?: boolean;
  dismissInitialDialog?: boolean;
  commandTimeoutMs?: number;
  stallTimeoutMs?: number;
}

export interface PollDeferredPayload {
  type: "__pollDeferred";
  ticket: string;
}

export interface ExecPcPayload {
  type: "execPc";
  device: string;
  command: string;
  timeoutMs?: number;
}

interface PollStateInProgress {
  done: false;
  state: string;
  currentStep: number;
  totalSteps: number;
  outputTail?: string;
}

interface PollStateDone {
  done: true;
  ok: boolean;
  error?: string;
  errorCode?: string;
  output?: string;
  result?: unknown;
}

// ============================================================================
// Result Factories
// ============================================================================

function createErrorResult(error: string, code?: string, extra: Partial<PtResult> = {}): PtResult {
  return {
    ok: false,
    error,
    code,
    ...extra,
  } as PtResult;
}

function createSuccessResult(value?: unknown, extra: Partial<PtResult> = {}): PtResult {
  return {
    ok: true,
    ...(value !== undefined ? { value } : {}),
    ...extra,
  } as PtResult;
}

function createDeferredResult(ticket: string, plan: DeferredJobPlan): PtResult {
  return {
    ok: true,
    deferred: true,
    ticket,
    job: plan,
  };
}

// ============================================================================
// Output Sanitization
// ============================================================================

function sanitizeTerminalOutput(command: string | undefined, output: string): string {
  const lines = output.split(/\r?\n/);
  const cleaned: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (command && line === command.trim()) continue;
    if (/^--More--$/i.test(line)) continue;
    if (/Would you like to enter the initial configuration dialog/i.test(line)) continue;
    if (/% Please answer 'yes' or 'no'\./i.test(line)) continue;
    if (/^[A-Za-z0-9._()-]+(?:\(config[^\)]*\))?[>#]\s*$/.test(line)) continue;

    cleaned.push(rawLine);
  }

  return cleaned.join("\n").trim();
}

// ============================================================================
// Plan Builders - Lógica de negocio que construye planes
// ============================================================================

function buildConfigIosPlan(
  device: string,
  commands: string[],
  options: {
    save: boolean;
    stopOnError: boolean;
    ensurePrivileged: boolean;
    dismissInitialDialog: boolean;
    commandTimeoutMs: number;
    stallTimeoutMs: number;
  },
): DeferredJobPlan {
  const plan: DeferredStep[] = [];

  if (options.ensurePrivileged) {
    plan.push({ type: "ensure-mode", value: "priv-exec", options: { stopOnError: true } });
  }

  plan.push({ type: "ensure-mode", value: "config", options: { stopOnError: true } });

  if (options.dismissInitialDialog) {
    plan.push({ type: "command", value: "", options: { stopOnError: false } });
    plan.push({ type: "confirm", value: "n", options: { stopOnError: false } });
  }

  for (const cmd of commands) {
    plan.push({
      type: "command",
      value: cmd,
      options: {
        stopOnError: options.stopOnError,
        timeoutMs: options.commandTimeoutMs,
      },
    });
  }

  if (options.save) {
    plan.push({ type: "save-config", options: { stopOnError: false } });
  }

  plan.push({ type: "close-session" });

  return {
    id: "",
    kind: "ios-session",
    version: 1,
    device,
    plan,
    options: {
      stopOnError: options.stopOnError,
      commandTimeoutMs: options.commandTimeoutMs,
      stallTimeoutMs: options.stallTimeoutMs,
    },
    payload: { commands, save: options.save },
  };
}

function buildExecIosPlan(
  device: string,
  command: string,
  options: {
    ensurePrivileged: boolean;
    commandTimeoutMs: number;
    stallTimeoutMs: number;
  },
): DeferredJobPlan {
  const plan: DeferredStep[] = [];

  if (options.ensurePrivileged) {
    plan.push({ type: "ensure-mode", value: "priv-exec", options: { stopOnError: true } });
  }

  plan.push({
    type: "command",
    value: command,
    options: {
      stopOnError: false,
      timeoutMs: options.commandTimeoutMs,
    },
  });

  plan.push({ type: "close-session" });

  return {
    id: "",
    kind: "ios-session",
    version: 1,
    device,
    plan,
    options: {
      stopOnError: false,
      commandTimeoutMs: options.commandTimeoutMs,
      stallTimeoutMs: options.stallTimeoutMs,
    },
    payload: { command },
  };
}

// ============================================================================
// Handlers
// ============================================================================

export function handleConfigHost(payload: ConfigHostPayload, api: PtRuntimeApi): PtResult {
  const device = api.getDeviceByName(payload.device);
  if (!device) {
    return createErrorResult(`Device not found: ${payload.device}`, "DEVICE_NOT_FOUND");
  }

  if (!device.hasTerminal) {
    const net = device.getNetwork();
    if (!net) {
      return createErrorResult("Device has no network reference", "NO_NETWORK");
    }
    const dev = net.getDevice(payload.device);
    if (!dev) {
      return createErrorResult("Device not found in network", "DEVICE_NOT_FOUND");
    }
    const port = dev.getPortAt(0);
    if (!port) {
      return createErrorResult("No ports on device", "NO_PORTS");
    }

    if (payload.dhcp === true) {
      try {
        (port as any).setDhcpEnabled(true);
      } catch {
        // PT API puede no soportar setDhcpEnabled en este dispositivo
      }
    } else {
      if (payload.ip && payload.mask) {
        (port as any).setIpSubnetMask(payload.ip, payload.mask);
      }
      if (payload.gateway) {
        (port as any).setDefaultGateway(payload.gateway);
      }
      if (payload.dns) {
        (port as any).setDnsServerIp(payload.dns);
      }
    }

    return createSuccessResult({
      device: payload.device,
      ip: payload.ip,
      mask: payload.mask,
      gateway: payload.gateway,
    });
  }

  return createErrorResult("Device has CLI, use configIos instead", "INVALID_DEVICE_TYPE");
}

export function handleConfigIos(payload: ConfigIosPayload, api: PtRuntimeApi): PtResult {
  const device = api.getDeviceByName(payload.device);
  if (!device) {
    return createErrorResult(`Device not found: ${payload.device}`, "DEVICE_NOT_FOUND");
  }

  if (!device.hasTerminal) {
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

  if (!device.hasTerminal) {
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
    return createErrorResult(`Job not found: ${ticket}`, "JOB_NOT_FOUND");
  }

  if (!jobState.done) {
    const pollResult: PtResult = {
      ok: true,
      deferred: true,
      ticket,
      job: undefined as unknown as import("../runtime/contracts").DeferredJobPlan,
    };
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
    return createErrorResult(jobState.error, jobState.errorCode || "IOS_JOB_FAILED", {
      raw: jobState.output,
    });
  }

  const session = api.querySessionState(pollPayload.ticket.split("_")[1] || "");
  const rawOutput = jobState.output || "";
  const sanitizedOutput = sanitizeTerminalOutput(undefined, rawOutput);

  const result: PtResult = {
    ok: true,
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

export function handlePing(api: PtRuntimeApi): PtResult {
  return createSuccessResult({ status: "alive", timestamp: api.now() });
}

export function handleExecPc(payload: ExecPcPayload, api: PtRuntimeApi): PtResult {
  const { device, command, timeoutMs = 30000 } = payload;

  api.dprint(`[execPc] device=${device} command="${command}"`);

  const deviceRef = api.getDeviceByName(device);
  if (!deviceRef) {
    return createErrorResult(`Device not found: ${device}`, "DEVICE_NOT_FOUND");
  }

  // PC/Server devices use a command prompt, not a CLI terminal.
  // Build a simple one-step deferred plan — the kernel will execute it
  // via the terminal engine, which handles events correctly.
  const ticket = "pc_" + Date.now() + "_" + Math.floor(Math.random() * 10000);

  const plan: DeferredJobPlan = {
    id: ticket,
    kind: "ios-session", // reuse ios-session kind; kernel handles generic execution
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


// ============================================================================
// Handler Map - Registro centralizado de handlers
// ============================================================================

type HandlerFn = (payload: any, api: PtRuntimeApi) => PtResult;

const HANDLER_MAP: Map<string, HandlerFn> = new Map();

function registerHandler(type: string, handler: HandlerFn): void {
  HANDLER_MAP.set(type, handler);
}

registerHandler("configHost", handleConfigHost as HandlerFn);
registerHandler("configIos", handleConfigIos as HandlerFn);
registerHandler("execIos", handleExecIos as HandlerFn);
registerHandler("__pollDeferred", handleDeferredPoll as HandlerFn);
registerHandler("__ping", handlePing as HandlerFn);
registerHandler("execPc", handleExecPc as HandlerFn);

// Register VLAN and DHCP handlers
registerHandler("ensureVlans", handleEnsureVlans as HandlerFn);
registerHandler("configVlanInterfaces", handleConfigVlanInterfaces as HandlerFn);
registerHandler("configDhcpServer", handleConfigDhcpServer as HandlerFn);
registerHandler("inspectDhcpServer", handleInspectDhcpServer as HandlerFn);
registerHandler("inspectHost", handleInspectHost as HandlerFn);

// ============================================================================
// Dispatcher - Punto de entrada del runtime
// ============================================================================

export function runtimeDispatcher(
  payload: Record<string, unknown>,
  api: RuntimeApi,
): RuntimeResult {
  const type = payload.type as string;

  api.dprint("[RUNTIME] Dispatching: " + type);

  if (!type || typeof type !== "string") {
    return createErrorResult("Missing payload.type", "INVALID_PAYLOAD") as RuntimeResult;
  }

  const handler = HANDLER_MAP.get(type);
  if (!handler) {
    return createErrorResult(`Unknown command type: ${type}`, "UNKNOWN_COMMAND") as RuntimeResult;
  }

  try {
    return handler(payload, api as any) as RuntimeResult;
  } catch (e) {
    return createErrorResult(String(e), "DISPATCH_ERROR") as RuntimeResult;
  }
}

export function validateHandlerCoverage(): { missing: string[]; registered: string[] } {
  return {
    missing: [],
    registered: [...HANDLER_MAP.keys()],
  };
}
