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
  RuntimeResult, 
  RuntimeApi, 
  DeferredJobPlan, 
  DeferredStep, 
  SessionStateSnapshot,
  DeferredStepType,
  DeferredJobOptions,
  DeviceRef
} from "../runtime/contracts";

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

export interface PollDeferredPayload {
  type: "__pollDeferred";
  ticket: string;
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

function createErrorResult(
  error: string,
  code?: string,
  extra: Partial<RuntimeResult> = {}
): RuntimeResult {
  return {
    ok: false,
    error,
    code,
    ...extra
  } as RuntimeResult;
}

function createSuccessResult(
  value?: unknown,
  extra: Partial<RuntimeResult> = {}
): RuntimeResult {
  return {
    ok: true,
    ...(value !== undefined ? { value } : {}),
    ...extra
  } as RuntimeResult;
}

function createDeferredResult(ticket: string, plan: DeferredJobPlan): RuntimeResult {
  return {
    ok: true,
    deferred: true,
    ticket,
    job: plan
  };
}

// ============================================================================
// Parsers para show commands
// ============================================================================

type ParserFn = (output: string) => Record<string, unknown>;

const PARSERS: Record<string, ParserFn> = {
  "show ip interface brief": (output: string) => {
    const interfaces: Array<{interface: string; ipAddress: string; ok: string; method: string; status: string; protocol: string}> = [];
    const lines = output.split("\n").filter(l => l.trim().length > 0);
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.includes("---")) continue;
      const match = line.match(/^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)$/);
      if (match) {
        interfaces.push({
          interface: match[1],
          ipAddress: match[2],
          ok: match[3],
          method: match[4],
          status: match[5],
          protocol: match[6]
        });
      }
    }
    return { entries: interfaces };
  },
  "show vlan brief": (output: string) => {
    const vlans: Array<{id: number; name: string; status: string; ports: string[]}> = [];
    const lines = output.split("\n").filter(l => l.trim().length > 0);
    for (const line of lines) {
      if (line.includes("---")) continue;
      const match = line.match(/^(\d+)\s+(\S+)\s+(\S+)\s*(.*)$/);
      if (match) {
        vlans.push({
          id: parseInt(match[1]),
          name: match[2],
          status: match[3],
          ports: match[4] ? match[4].split(",").map(p => p.trim()).filter(p => p) : []
        });
      }
    }
    return { entries: vlans };
  },
};

function getParser(command: string): ParserFn | null {
  const cmd = command.toLowerCase().trim();
  if (PARSERS[cmd]) return PARSERS[cmd];
  for (const key in PARSERS) {
    if (cmd.startsWith(key)) return PARSERS[key];
  }
  return null;
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
  }
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
        timeoutMs: options.commandTimeoutMs
      }
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
      stallTimeoutMs: options.stallTimeoutMs
    },
    payload: { commands, save: options.save }
  };
}

function buildExecIosPlan(
  device: string,
  command: string,
  options: {
    ensurePrivileged: boolean;
    commandTimeoutMs: number;
    stallTimeoutMs: number;
  }
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
      timeoutMs: options.commandTimeoutMs
    }
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
      stallTimeoutMs: options.stallTimeoutMs
    },
    payload: { command }
  };
}

// ============================================================================
// Handlers
// ============================================================================

export function handleConfigHost(payload: ConfigHostPayload, api: RuntimeApi): RuntimeResult {
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
      try { (port as any).setDhcpEnabled(true); } catch {}
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
      gateway: payload.gateway
    });
  }

  return createErrorResult("Device has CLI, use configIos instead", "INVALID_DEVICE_TYPE");
}

export function handleConfigIos(payload: ConfigIosPayload, api: RuntimeApi): RuntimeResult {
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

  api.dprint(`[configIos] Created plan ${ticket} for device ${payload.device} with ${plan.plan.length} steps`);

  return createDeferredResult(ticket, plan);
}

export function handleExecIos(payload: ExecIosPayload, api: RuntimeApi): RuntimeResult {
  const device = api.getDeviceByName(payload.device);
  if (!device) {
    return createErrorResult(`Device not found: ${payload.device}`, "DEVICE_NOT_FOUND");
  }

  if (!device.hasTerminal) {
    return createErrorResult(
      `Device not ready: ${payload.device} is still booting or in ROMMON`,
      "NO_TERMINAL"
    );
  }

  const plan = buildExecIosPlan(payload.device, payload.command, {
    ensurePrivileged: payload.ensurePrivileged ?? true,
    commandTimeoutMs: payload.commandTimeoutMs ?? 8000,
    stallTimeoutMs: payload.stallTimeoutMs ?? 15000,
  });

  const ticket = "job_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
  plan.id = ticket;

  api.dprint(`[execIos] Created plan ${ticket} for device ${payload.device} command="${payload.command}"`);

  return createDeferredResult(ticket, plan);
}

export function handleDeferredPoll(pollPayload: PollDeferredPayload, api: RuntimeApi): RuntimeResult {
  const { ticket } = pollPayload;

  const jobState = (api as any).getJobState?.(ticket);
  if (!jobState) {
    return createErrorResult(`Job not found: ${ticket}`, "JOB_NOT_FOUND");
  }

  if (!jobState.done) {
    const pollResult: RuntimeResult = {
      ok: true,
      deferred: true,
      ticket,
      job: undefined as unknown as import("../runtime/contracts").DeferredJobPlan
    };
    (pollResult as any).pollState = {
      done: false,
      state: jobState.state,
      currentStep: jobState.currentStep,
      totalSteps: jobState.totalSteps,
      outputTail: jobState.outputTail
    };
    return pollResult;
  }

  if (jobState.error) {
    return createErrorResult(
      jobState.error,
      jobState.errorCode || "IOS_JOB_FAILED",
      { raw: jobState.output }
    );
  }

  const session = api.querySessionState(pollPayload.ticket.split("_")[1] || "");
  const rawOutput = jobState.output || "";
  const sanitizedOutput = sanitizeTerminalOutput(undefined, rawOutput);

  const result: RuntimeResult = {
    ok: true,
    raw: sanitizedOutput || rawOutput,
    source: "terminal"
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

export function handlePing(api: RuntimeApi): RuntimeResult {
  return createSuccessResult({ status: "alive", timestamp: api.now() });
}

// ============================================================================
// Dispatcher - Punto de entrada del runtime
// ============================================================================

export function runtimeDispatcher(payload: Record<string, unknown>, api: RuntimeApi): RuntimeResult {
  const type = payload.type as string;

  api.dprint("[RUNTIME] Dispatching: " + type);

  try {
    switch (type) {
      case "configHost":
        return handleConfigHost(payload as unknown as ConfigHostPayload, api);

      case "configIos":
        return handleConfigIos(payload as unknown as ConfigIosPayload, api);

      case "execIos":
        return handleExecIos(payload as unknown as ExecIosPayload, api);

      case "__pollDeferred":
        return handleDeferredPoll(payload as unknown as PollDeferredPayload, api);

      case "__ping":
        return handlePing(api);

      default:
        return createErrorResult(`Unknown command type: ${type}`, "UNKNOWN_COMMAND");
    }
  } catch (e) {
    return createErrorResult(String(e), "DISPATCH_ERROR");
  }
}