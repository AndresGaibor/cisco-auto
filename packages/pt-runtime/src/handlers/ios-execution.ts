// ============================================================================
// IOS Execution Handlers - V13 Event-Based
// ============================================================================

import type { PtRuntimeApi } from "../pt-api/pt-deps.js";
import type { PtResult } from "../pt-api/pt-results.js";
import type {
  ConfigIosPayload,
  ExecIosPayload,
  PollDeferredPayload,
  ExecPcPayload,
} from "./ios-payloads.js";
import { createErrorResult, createSuccessResult } from "./result-factories";
import { sanitizeTerminalOutput } from "./terminal-sanitizer";
import { createCommandExecutor, type ExecutionOptions, type CommandExecutionResult } from "../terminal/index";
import { ensureSession, getSession } from "../terminal/session-registry";
import { detectModeFromPrompt } from "../terminal/prompt-detector";

const DEFAULT_COMMAND_TIMEOUT = 8000;
const DEFAULT_STALL_TIMEOUT = 15000;

// PTCommandLine del API de PT - tipo requerido por CommandExecutor
interface PTTerminal {
  enterCommand(cmd: string): void;
  getPrompt(): string;
  getMode(): string;
  getCommandInput(): string;
  enterChar(charCode: number, modifier: number): void;
  registerEvent(eventName: string, context: null, handler: (src: unknown, args: unknown) => void): void;
  unregisterEvent(eventName: string, context: null, handler: (src: unknown, args: unknown) => void): void;
}

function getTerminalDevice(api: PtRuntimeApi, deviceName: string): PTTerminal | null {
  const device = api.getDeviceByName(deviceName);
  if (!device) return null;
  const cli = (device as any).getCommandLine?.();
  if (!cli) {
    const ipcTerminal = (api as any).ipc?.terminal;
    return ipcTerminal ? ipcTerminal(deviceName) : null;
  }
  return cli;
}

export async function handleExecIos(payload: ExecIosPayload, api: PtRuntimeApi): Promise<PtResult> {
  const deviceName = payload.device;
  const device = api.getDeviceByName(deviceName);
  if (!device) return createErrorResult(`Device not found: ${deviceName}`, "DEVICE_NOT_FOUND");

  const terminal = getTerminalDevice(api, deviceName);
  if (!terminal) return createErrorResult("Terminal engine inaccessible", "NO_TERMINAL");

  ensureSession(deviceName);

  const options: ExecutionOptions = {
    commandTimeoutMs: payload.commandTimeoutMs ?? DEFAULT_COMMAND_TIMEOUT,
    stallTimeoutMs: payload.stallTimeoutMs ?? DEFAULT_STALL_TIMEOUT,
    autoAdvancePager: true,
    autoDismissWizard: true,
    maxPagerAdvances: 50,
  };

  const executor = createCommandExecutor({
    commandTimeoutMs: payload.commandTimeoutMs ?? DEFAULT_COMMAND_TIMEOUT,
    stallTimeoutMs: payload.stallTimeoutMs ?? DEFAULT_STALL_TIMEOUT,
  });

  const execResult = await executor.executeCommand(
    deviceName,
    payload.command,
    terminal,
    options
  );

  if (execResult.ok) {
    return createSuccessResult(execResult.output, {
      raw: sanitizeTerminalOutput(undefined, execResult.output) || execResult.output,
      status: execResult.status,
      parsed: {
        command: execResult.command,
        startedAt: execResult.startedAt,
        endedAt: execResult.endedAt,
        durationMs: execResult.durationMs,
        promptBefore: execResult.promptBefore,
        promptAfter: execResult.promptAfter,
        modeBefore: execResult.modeBefore,
        modeAfter: execResult.modeAfter,
        events: execResult.events,
        warnings: execResult.warnings,
        confidence: execResult.confidence,
      },
    });
  }

  return createErrorResult(
    execResult.error || `Command failed with status ${execResult.status}`,
    execResult.code,
    {
      raw: execResult.output,
      details: {
        command: execResult.command,
        status: execResult.status,
        events: execResult.events,
        warnings: execResult.warnings,
      },
    }
  );
}

export async function handleConfigIos(payload: ConfigIosPayload, api: PtRuntimeApi): Promise<PtResult> {
  const deviceName = payload.device;
  const device = api.getDeviceByName(deviceName);
  if (!device) return createErrorResult(`Device not found: ${deviceName}`, "DEVICE_NOT_FOUND");

  const terminal = getTerminalDevice(api, deviceName);
  if (!terminal) return createErrorResult("Terminal engine inaccessible", "NO_TERMINAL");

  ensureSession(deviceName);

  const executor = createCommandExecutor({
    commandTimeoutMs: payload.commandTimeoutMs ?? DEFAULT_COMMAND_TIMEOUT,
    stallTimeoutMs: payload.stallTimeoutMs ?? DEFAULT_STALL_TIMEOUT,
  });

  let allOutput = "";
  let lastOk = false;

  const execOptions: ExecutionOptions = {
    commandTimeoutMs: payload.commandTimeoutMs ?? DEFAULT_COMMAND_TIMEOUT,
    stallTimeoutMs: payload.stallTimeoutMs ?? DEFAULT_STALL_TIMEOUT,
    autoAdvancePager: true,
    autoDismissWizard: payload.dismissInitialDialog ?? true,
    maxPagerAdvances: 50,
  };

  for (const command of payload.commands) {
    const result = await executor.executeCommand(deviceName, command, terminal, execOptions);
    allOutput += result.output;

    if (!result.ok) {
      if (payload.stopOnError) {
        return createErrorResult(
          result.error || `Command failed: ${command}`,
          result.code,
          { raw: allOutput }
        );
      }
    } else {
      lastOk = true;
    }
  }

  if (payload.save) {
    const saveResult = await executor.executeCommand(
      deviceName,
      "end",
      terminal,
      execOptions
    );
    allOutput += saveResult.output;

    const copyResult = await executor.executeCommand(
      deviceName,
      "copy run start",
      terminal,
      execOptions
    );
    allOutput += copyResult.output;
    lastOk = copyResult.ok;
  }

  if (lastOk) {
    return createSuccessResult(undefined, {
      raw: sanitizeTerminalOutput(undefined, allOutput) || allOutput,
    });
  }

  return createErrorResult("Configuration sequence failed", "CONFIG_FAILED", {
    raw: allOutput,
  });
}

export function handleDeferredPoll(pollPayload: PollDeferredPayload, api: PtRuntimeApi): PtResult {
  const { ticket } = pollPayload;
  const jobState = (api as any).getJobState?.(ticket);
  if (!jobState) return { ...createErrorResult(`Job not found: ${ticket}`, "JOB_NOT_FOUND"), done: true } as PtResult;
  if (!jobState.done) return { ok: true, deferred: true, ticket, done: false, state: jobState.state } as any;
  const rawOutput = jobState.output || "";
  return { ok: true, done: true, raw: sanitizeTerminalOutput(undefined, rawOutput) || rawOutput, source: "terminal" };
}

export async function handlePing(payload: { device: string; target: string; timeoutMs?: number }, api: PtRuntimeApi): Promise<PtResult> {
  try {
    const deviceName = payload.device;
    const device = api.getDeviceByName(deviceName);
    if (!device) return createErrorResult("Device not found", "DEVICE_NOT_FOUND");

    const type = device.getType ? device.getType() : -1;
    const isPc = (type === 8 || type === 9);
    const cmd = isPc ? "ping " + payload.target : "ping " + payload.target + " repeat 4";

    const terminal = getTerminalDevice(api, deviceName);
    if (!terminal) return createErrorResult("Terminal engine inaccessible", "NO_TERMINAL");

    const executor = createCommandExecutor({
      commandTimeoutMs: payload.timeoutMs ?? 15000,
      stallTimeoutMs: payload.timeoutMs ?? 15000,
    });

    const result = await executor.executeCommand(
      deviceName,
      cmd,
      terminal,
      { commandTimeoutMs: payload.timeoutMs ?? 15000, stallTimeoutMs: payload.timeoutMs ?? 15000 }
    );

    if (result.ok) {
      return createSuccessResult(result.output, { raw: result.output, status: result.status });
    }

    return createErrorResult(result.error || "Ping failed", result.code, { raw: result.output });
  } catch(e) {
    return createErrorResult("Kernel Panic: " + String(e), "INTERNAL_ERROR");
  }
}

export async function handleExecPc(payload: ExecPcPayload, api: PtRuntimeApi): Promise<PtResult> {
  const deviceRef = api.getDeviceByName(payload.device);
  if (!deviceRef) return createErrorResult(`Device not found: ${payload.device}`, "DEVICE_NOT_FOUND");

  const terminal = getTerminalDevice(api, payload.device);
  if (!terminal) return createErrorResult("Terminal engine inaccessible", "NO_TERMINAL");

  const executor = createCommandExecutor({
    commandTimeoutMs: payload.timeoutMs ?? 30000,
    stallTimeoutMs: payload.timeoutMs ?? 30000,
  });

  const result = await executor.executeCommand(
    payload.device,
    payload.command,
    terminal,
    { commandTimeoutMs: payload.timeoutMs ?? 30000, stallTimeoutMs: payload.timeoutMs ?? 30000 }
  );

  if (result.ok) {
    return createSuccessResult(result.output, { raw: result.output });
  }

  return createErrorResult(result.error || "PC execution failed", result.code, { raw: result.output });
}

export function handleExecPcDirect(payload: ExecPcPayload, api: PtRuntimeApi): PtResult {
  try {
    const device = api.getDeviceByName(payload.device);
    if (device && (device as any).getCommandLine) (device as any).getCommandLine().enterCommand(payload.command);
    return { ok: true, result: "Injected" } as any;
  } catch(e) { return createErrorResult(String(e), "EXEC_FAILED"); }
}