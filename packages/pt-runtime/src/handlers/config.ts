// ============================================================================
// Config Handlers - Device configuration
// ============================================================================
//
// PHASE 1 FIX: These handlers now create IOS jobs and return deferred results.
// The actual execution happens in the IOS_JOBS system in main.js (persistent).
// Synthetic show command responses have been removed.
//
// Architecture:
// - handleConfigIos() and handleExecIos() create jobs in IOS_JOBS (global in main.js)
// - They return { deferred: true, ticket, kind: "ios" }
// - pollDeferredCommands() in main.js polls the runtime with __pollDeferred
// - The __pollDeferred handler checks IOS_JOBS[ticket] for completion
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
  ExecIosSuccessResult,
  ExecIosErrorResult,
} from "./config-types";

// ============================================================================
// Global Scope Access (shared with main.js in PT's Qt Script Engine)
// ============================================================================

declare const IOS_JOBS: Record<string, IOSJob>;
declare const IOS_JOB_SEQ: number;
declare const createIosJob: (type: string, payload: object) => string;
declare const pollIosJob: (ticket: string) => { done: boolean; ok?: boolean; error?: string; state?: string; value?: unknown };

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
  modeBefore: string;
  modeAfter: string;
  lastMode: string;
  lastPrompt: string;
  paged: boolean;
  autoConfirmed: boolean;
  dialogDismissAttempts: number;
  waitingForCommandEnd: boolean;
  finished: boolean;
  result: object | null;
  error: string | null;
  errorCode: string | null;
  inFlightPath: string;
  commandId: string;
  seq: number;
  ensurePrivileged: boolean;
  dismissInitialDialog: boolean;
  commandTimeoutMs: number;
  stallTimeoutMs: number;
  abortSent: boolean;
  phase: string;
  resumePhase: string;
  resumeStep: number;
  currentCommand: string;
  currentCommandOutput: string;
  currentCommandStartedAt: number;
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
// Parsers (only for real output, not synthetic)
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
  "show running-config": (output: string) => {
    const sections: Record<string, string> = {};
    const interfaces: Record<string, string> = {};
    let currentSection: string | null = null;
    const lines = output.split("\n");
    for (const line of lines) {
      if (line === "!") {
        if (currentSection) sections[currentSection] = "";
        currentSection = null;
      } else if (line.startsWith("interface ")) {
        currentSection = line.trim();
        interfaces[line.substring(10).trim()] = "";
      } else if (currentSection) {
        interfaces[currentSection] = (interfaces[currentSection] || "") + line + "\n";
      }
    }
    return { entries: { sections, interfaces } };
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
// Helper Functions
// ============================================================================

function ensureIosTerm(device: PTDevice): PTCommandLine | null {
  return device.getCommandLine() ?? null;
}

// ============================================================================
// Main Handler Dispatcher
// ============================================================================

export function handleConfigHost(payload: ConfigHostPayload, deps: HandlerDeps): HandlerResult {
  const { getNet } = deps;
  const device = getNet().getDevice(payload.device);
  if (!device) return { ok: false, error: `Device not found: ${payload.device}` };

  const port = device.getPortAt(0);
  if (!port) return { ok: false, error: "No ports on device" };

  if (payload.dhcp === true) {
    try { port.setDhcpEnabled(true); } catch {}
  } else {
    if (payload.ip && payload.mask) port.setIpSubnetMask(payload.ip, payload.mask);
    if (payload.gateway) port.setDefaultGateway(payload.gateway);
    if (payload.dns) port.setDnsServerIp(payload.dns);
  }

  return { ok: true, device: payload.device, ip: payload.ip, mask: payload.mask, gateway: payload.gateway };
}

// ============================================================================
// IOS Handlers - Create deferred jobs
// ============================================================================

export function handleConfigIos(payload: ConfigIosPayload, deps: HandlerDeps): HandlerResult | DeferredResult {
  const { getNet, dprint } = deps;
  
  // Handle __pollDeferred - called from main.js pollDeferredCommands
  if ((payload as unknown as PollDeferredPayload).type === "__pollDeferred") {
    const pollPayload = payload as unknown as PollDeferredPayload;
    return handlePollDeferred(pollPayload, deps);
  }

  const device = getNet().getDevice(payload.device);
  if (!device) return { ok: false, error: `Device not found: ${payload.device}`, device: payload.device };

  const term = ensureIosTerm(device);
  if (!term) return { ok: false, error: "Device does not support CLI", device: payload.device };

  if (!payload.commands?.length) {
    return { ok: true, device: payload.device, executed: 0, results: [], skipped: true };
  }

  // Create IOS job for deferred execution
  // The job will be executed by main.js's IOS_JOBS state machine
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

export function handleExecIos(payload: ExecIosPayload, deps: HandlerDeps): (HandlerResult & { raw: string; status?: number }) | DeferredResult {
  const { getNet, dprint } = deps;
  
  // Handle __pollDeferred - called from main.js pollDeferredCommands
  if ((payload as unknown as PollDeferredPayload).type === "__pollDeferred") {
    const pollPayload = payload as unknown as PollDeferredPayload;
    return handlePollDeferred(pollPayload, deps) as (HandlerResult & { raw: string; status?: number }) | DeferredResult;
  }

  const device = getNet().getDevice(payload.device);
  if (!device) return { ok: false, error: `Device not found: ${payload.device}`, raw: "" };

  const term = ensureIosTerm(device);
  if (!term) return { ok: false, error: `Device not ready: ${payload.device} is still booting or in ROMMON`, raw: "" };

  // Create IOS job for deferred execution
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
// __pollDeferred Handler
// ============================================================================

function handlePollDeferred(pollPayload: PollDeferredPayload, deps: HandlerDeps): HandlerResult {
  const { dprint } = deps;
  const { ticket } = pollPayload;

  // Access the global IOS_JOBS from main.js
  const job = IOS_JOBS[ticket];
  
  if (!job) {
    dprint(`[pollDeferred] Job not found: ${ticket}`);
    return { ok: false, error: `Job not found: ${ticket}` };
  }

  if (!job.finished) {
    dprint(`[pollDeferred] Job ${ticket} still in progress: state=${job.state}`);
    return { done: false, state: job.state } as unknown as HandlerResult;
  }

  // Job is complete
  if (job.state === "error") {
    dprint(`[pollDeferred] Job ${ticket} completed with error`);
    return {
      ok: false,
      error: job.error || "Job failed",
      raw: job.output || "",
      status: job.status ?? 1,
    };
  }

  // Sanitize output before parsing
  const command = (job.payload as { command?: string }).command;
  const rawOutput = job.output || "";
  const sanitizedOutput = sanitizeTerminalOutput(command, rawOutput);

  // Build success result with parsed output if available
  const result: ExecIosSuccessResult = {
    ok: true,
    raw: sanitizedOutput || rawOutput,
    status: job.status ?? 0,
    source: "terminal",
    session: {
      mode: (job as unknown as { lastMode?: string }).lastMode || "",
      paging: !!(job as unknown as { paged?: boolean }).paged,
      awaitingConfirm: false,
    },
  };

  // Parse output if it's a show command
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

  dprint(`[pollDeferred] Job ${ticket} completed successfully, output length=${job.output?.length || 0}`);

  return result;
}
