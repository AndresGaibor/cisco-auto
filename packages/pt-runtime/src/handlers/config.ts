// ============================================================================
// Config Handlers - Device configuration
// ============================================================================
//
// PURE runtime handlers — execution context: Packet Tracer Qt Script Engine.
//
// Architecture:
// - handleConfigIos() / handleExecIos() only validate and create deferred jobs
// - handleDeferredPoll() queries job state and returns structured results
// - Non-IOS handlers (configHost) execute synchronously
//
// In PT's Qt Script Engine, main.js and runtime.js share the same global scope.
// IOS_JOBS is a global variable defined in main.js and is accessible here.
//
// ============================================================================

import type { HandlerDeps, HandlerResult, PTCommandLine, PTDevice } from "../utils/helpers";
import type {
  ConfigHostPayload,
  ConfigIosPayload,
  ExecIosPayload,
} from "./config-types";

// ============================================================================
// Global Scope Access (shared with main.js in PT's Qt Script Engine)
// ============================================================================

declare const IOS_JOBS: Record<string, IOSJob>;
declare const createIosJob: (type: string, payload: object) => string;

interface IOSJob {
  ticket: string;
  device: string;
  type: string;
  payload: object;
  steps: string[];
  currentStep: number;
  state: string;
  startedAt: number;
  updatedAt: number;
  lastActivityAt: number;
  output: string;
  outputs: string[];
  stepResults: Array<{ command: string; raw: string; status: number }>;
  status: number | null;
  lastMode: string;
  lastPrompt: string;
  paged: boolean;
  autoConfirmed: boolean;
  waitingForCommandEnd: boolean;
  finished: boolean;
  result: object | null;
  error: string | null;
  errorCode: string | null;
  phase: string;
}

interface DeferredResult {
  deferred: true;
  ticket: string;
  kind: "ios";
}

interface PollDeferredPayload {
  type: "__pollDeferred";
  ticket: string;
}

// ============================================================================
// Runtime Result Types
// ============================================================================

interface RuntimeErrorResult {
  ok: false;
  error: string;
  code?: string;
  raw?: string;
  source?: "terminal" | "synthetic" | "unknown";
  session?: {
    mode?: string;
    prompt?: string;
    paging?: boolean;
    autoDismissedInitialDialog?: boolean;
  };
  [key: string]: unknown;
}

interface RuntimeSuccessResult {
  ok: true;
  raw: string;
  status?: number;
  source: "terminal";
  parsed?: Record<string, unknown>;
  parseError?: string;
  session?: {
    mode?: string;
    prompt?: string;
    paging?: boolean;
    awaitingConfirm?: boolean;
    autoDismissedInitialDialog?: boolean;
  };
}

interface DeferredPollInProgress {
  done: false;
  state: string;
}

interface DeferredPollDoneSuccess extends RuntimeSuccessResult {
  done: true;
}

interface DeferredPollDoneError extends RuntimeErrorResult {
  done: true;
}

type DeferredPollResult =
  | DeferredPollInProgress
  | DeferredPollDoneSuccess
  | DeferredPollDoneError;

// ============================================================================
// Result Factories
// ============================================================================

function createRuntimeError(
  error: string,
  code?: string,
  extra: Partial<RuntimeErrorResult> = {},
): RuntimeErrorResult {
  return {
    ok: false,
    error,
    code,
    source: extra.source ?? "unknown",
    raw: extra.raw ?? "",
    session: extra.session,
  };
}

function createTerminalSuccess(
  raw: string,
  status?: number,
  extra: Partial<RuntimeSuccessResult> = {},
): RuntimeSuccessResult {
  return {
    ok: true,
    raw,
    status,
    source: "terminal",
    parsed: extra.parsed,
    parseError: extra.parseError,
    session: extra.session,
  };
}

// ============================================================================
// Parsers (lightweight, only for well-structured show commands)
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
// Helper Functions
// ============================================================================

function ensureIosTerm(device: PTDevice): PTCommandLine | null {
  return device.getCommandLine() ?? null;
}

// ============================================================================
// Non-IOS Handlers (synchronous, pure)
// ============================================================================

export function handleConfigHost(payload: ConfigHostPayload, deps: HandlerDeps): HandlerResult {
  const { getNet, dprint } = deps;
  const device = getNet().getDevice(payload.device);
  if (!device) return { ok: false, error: `Device not found: ${payload.device}` };

  const port = device.getPortAt(0);
  if (!port) return { ok: false, error: "No ports on device" };

  let dhcpEnabled = false;
  let actualIp = "";
  let actualMask = "";
  let actualGateway = "";
  const actualDns = payload.dns || "";

  if (payload.dhcp === true) {
    // Intentar setDhcpFlag a nivel dispositivo (Pc/Server)
    if (typeof (device as any).setDhcpFlag === "function") {
      try {
        (device as any).setDhcpFlag(true);
        if (typeof (device as any).getDhcpFlag === "function") {
          dhcpEnabled = !!(device as any).getDhcpFlag();
        }
      } catch (e) {
        dprint(`[handleConfigHost] setDhcpFlag failed: ${String(e)}`);
      }
    }

    // Intentar setDhcpClientFlag en el puerto (HostPort)
    if (!dhcpEnabled && typeof (port as any).setDhcpClientFlag === "function") {
      try {
        (port as any).setDhcpClientFlag(true);
        if (typeof (port as any).isDhcpClientOn === "function") {
          dhcpEnabled = !!(port as any).isDhcpClientOn();
        }
      } catch (e) {
        dprint(`[handleConfigHost] setDhcpClientFlag failed: ${String(e)}`);
      }
    }

    // Fallback a setDhcpEnabled (API antigua)
    if (!dhcpEnabled && typeof (port as any).setDhcpEnabled === "function") {
      try {
        (port as any).setDhcpEnabled(true);
        dhcpEnabled = true;
      } catch (e) {
        dprint(`[handleConfigHost] setDhcpEnabled failed: ${String(e)}`);
      }
    }

    // Leer IP adicional asignada por DHCP
    try { actualIp = String(port.getIpAddress()); } catch {}
    try { actualMask = String(port.getSubnetMask()); } catch {}
    try { actualGateway = String(port.getDefaultGateway()); } catch {}

    return {
      ok: true,
      device: payload.device,
      dhcp: dhcpEnabled,
      ip: actualIp,
      mask: actualMask,
      gateway: actualGateway,
    };
  }

  // Configuración estática
  if (payload.ip && payload.mask) {
    try {
      port.setIpSubnetMask(payload.ip, payload.mask);
    } catch (e) {
      return { ok: false, error: `Failed to set IP: ${String(e)}` };
    }
  }
  if (payload.gateway) {
    try {
      port.setDefaultGateway(payload.gateway);
    } catch (e) {
      return { ok: false, error: `Failed to set gateway: ${String(e)}` };
    }
  }
  if (payload.dns && typeof (port as any).setDnsServerIp === "function") {
    try {
      (port as any).setDnsServerIp(payload.dns);
    } catch {}
  }

  // Desactivar DHCP si estaba activo
  if (typeof (device as any).setDhcpFlag === "function") {
    try { (device as any).setDhcpFlag(false); } catch {}
  } else if (typeof (port as any).setDhcpClientFlag === "function") {
    try { (port as any).setDhcpClientFlag(false); } catch {}
  } else if (typeof (port as any).setDhcpEnabled === "function") {
    try { (port as any).setDhcpEnabled(false); } catch {}
  }

  // Leer valores actuales
  try { actualIp = String(port.getIpAddress()); } catch {}
  try { actualMask = String(port.getSubnetMask()); } catch {}
  try { actualGateway = String(port.getDefaultGateway()); } catch {}
  try {
    if (typeof (device as any).getDhcpFlag === "function") {
      dhcpEnabled = !!(device as any).getDhcpFlag();
    } else if (typeof (port as any).isDhcpClientOn === "function") {
      dhcpEnabled = !!(port as any).isDhcpClientOn();
    }
  } catch {}

  return {
    ok: true,
    device: payload.device,
    dhcp: dhcpEnabled,
    ip: actualIp,
    mask: actualMask,
    gateway: actualGateway,
    dns: actualDns,
  };
}

// ============================================================================
// IOS Handlers — create deferred jobs only
// ============================================================================

export function handleConfigIos(payload: ConfigIosPayload, deps: HandlerDeps): HandlerResult | DeferredResult {
  const { getNet, dprint } = deps;

  const device = getNet().getDevice(payload.device);
  if (!device) {
    return createRuntimeError(`Device not found: ${payload.device}`, "DEVICE_NOT_FOUND");
  }

  const term = ensureIosTerm(device);
  if (!term) {
    return createRuntimeError(`Device does not support CLI: ${payload.device}`, "NO_TERMINAL");
  }

  if (!payload.commands?.length) {
    return { ok: true, device: payload.device, executed: 0, results: [], skipped: true };
  }

  const ticket = createIosJob("configIos", {
    device: payload.device,
    commands: payload.commands,
    save: payload.save ?? true,
    stopOnError: payload.stopOnError ?? true,
    ensurePrivileged: payload.ensurePrivileged ?? true,
    dismissInitialDialog: payload.dismissInitialDialog ?? true,
    commandTimeoutMs: payload.commandTimeoutMs ?? 8000,
    stallTimeoutMs: payload.stallTimeoutMs ?? 15000,
  });

  dprint(`[configIos] Created job ${ticket} for device ${payload.device}`);

  return { deferred: true, ticket, kind: "ios" };
}

export function handleExecIos(payload: ExecIosPayload, deps: HandlerDeps): HandlerResult | DeferredResult {
  const { getNet, dprint } = deps;

  const device = getNet().getDevice(payload.device);
  if (!device) {
    return createRuntimeError(`Device not found: ${payload.device}`, "DEVICE_NOT_FOUND");
  }

  const term = ensureIosTerm(device);
  if (!term) {
    return createRuntimeError(
      `Device not ready: ${payload.device} is still booting or in ROMMON`,
      "NO_TERMINAL"
    );
  }

  const ticket = createIosJob("execIos", {
    device: payload.device,
    command: payload.command,
    parse: payload.parse ?? true,
    ensurePrivileged: payload.ensurePrivileged ?? true,
    dismissInitialDialog: payload.dismissInitialDialog ?? true,
    commandTimeoutMs: payload.commandTimeoutMs ?? 8000,
    stallTimeoutMs: payload.stallTimeoutMs ?? 15000,
  });

  dprint(`[execIos] Created job ${ticket} for device ${payload.device} command="${payload.command}"`);

  return { deferred: true, ticket, kind: "ios" };
}

// ============================================================================
// Deferred Poll Handler — queries job state from main.js
// ============================================================================

export function handleDeferredPoll(
  pollPayload: PollDeferredPayload,
  deps: HandlerDeps
): DeferredPollResult {
  const { dprint } = deps;
  const { ticket } = pollPayload;
  const job = IOS_JOBS[ticket];

  if (!job) {
    dprint(`[pollDeferred] Job not found: ${ticket}`);
    return {
      done: true,
      ...createRuntimeError(`Job not found: ${ticket}`, "JOB_NOT_FOUND"),
    };
  }

  if (!job.finished) {
    dprint(`[pollDeferred] Job ${ticket} still in progress: state=${job.state}`);
    return {
      done: false,
      state: job.state || "unknown",
    };
  }

  const session = {
    mode: job.lastMode || "",
    prompt: job.lastPrompt || "",
    paging: !!job.paged,
    awaitingConfirm: false,
    autoDismissedInitialDialog: !!job.autoConfirmed,
  };

  if (job.state === "error") {
    dprint(`[pollDeferred] Job ${ticket} completed with error`);
    return {
      done: true,
      ...createRuntimeError(
        job.error || "Job failed",
        job.errorCode || "IOS_JOB_FAILED",
        {
          raw: job.output || "",
          source: "terminal",
          session,
        }
      ),
    };
  }

  const command = (job.payload as { command?: string }).command;
  const rawOutput = job.output || "";
  const sanitizedOutput = sanitizeTerminalOutput(command, rawOutput);

  const result: DeferredPollDoneSuccess = {
    done: true,
    ...createTerminalSuccess(sanitizedOutput || rawOutput, job.status ?? undefined, {
      session,
    }),
  };

  if (command && sanitizedOutput) {
    const parser = getParser(command);
    if (parser) {
      try {
        result.parsed = parser(sanitizedOutput);
      } catch (e) {
        result.parseError = String(e);
      }
    }
  }

  dprint(`[pollDeferred] Job ${ticket} completed successfully, output length=${rawOutput.length}`);
  return result;
}
