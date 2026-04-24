// ============================================================================
// IOS Execution Handlers - V13 Event-Based
// ============================================================================
// Ejecuta comandos IOS en dispositivos PT via terminal engine.
// Soporta execIos (comando único), configIos (múltiples comandos),
// ping, execPc, y polling de jobs deferidos.

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
import { createCommandExecutor, type ExecutionOptions } from "../terminal/index";
import { ensureSession, getSession } from "../terminal/session-registry";
import {
  detectModeFromPrompt,
  readTerminalOutput,
} from "../terminal/prompt-detector";
import { createModeGuard } from "../terminal/mode-guard";
import { verifyHostOutput } from "../terminal/terminal-semantic-verifier.js";
import type { TerminalExecutionResult } from "../terminal/terminal-execution-result.js";

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]);
}

const DEFAULT_COMMAND_TIMEOUT = 8000;
const DEFAULT_STALL_TIMEOUT = 15000;

// PTCommandLine del API de PT - tipo requerido por CommandExecutor
interface PTTerminal {
  enterCommand(cmd: string): void;
  getPrompt(): string;
  getMode(): string;
  getOutput?(): string;
  getAllOutput?(): string;
  getCommandInput(): string;
  enterChar(charCode: number, modifier: number): void;
  registerEvent(eventName: string, context: null, handler: (src: unknown, args: unknown) => void): void;
  unregisterEvent(eventName: string, context: null, handler: (src: unknown, args: unknown) => void): void;
}

function getTerminalDevice(api: PtRuntimeApi, deviceName: string): any {
  try {
    // Intentar acceso directo vía ipc.network (más fiable en PT v9)
    // @ts-ignore
    const net = (typeof ipc !== "undefined") ? ipc.network() : null;
    if (net) {
        const dev = net.getDevice(deviceName);
        if (dev && dev.getCommandLine) {
            return dev.getCommandLine();
        }
    }

    // Fallback al api wrapper
    const device = api.getDeviceByName(deviceName);
    if (!device) return null;
    const cli = (device as any).getCommandLine?.();
    return cli || null;
  } catch(e) {
    return null;
  }
}

function inferExpectedModeAfterCommand(command: string): any {
  const cmd = command.trim().toLowerCase();

  if (/^(conf|config|configure)(\s+t|\s+terminal)?$/.test(cmd)) {
    return "global-config";
  }

  if (/^interface\s+/.test(cmd)) {
    return "config-if";
  }

  if (/^line\s+/.test(cmd)) {
    return "config-line";
  }

  if (/^router\s+/.test(cmd)) {
    return "config-router";
  }

  if (/^vlan\s+\d+/.test(cmd)) {
    return "config-vlan";
  }

  if (/^end$/.test(cmd) || /^\^z$/.test(cmd)) {
    return "privileged-exec";
  }

  return undefined;
}


/**
 * Ejecuta un comando único IOS en un dispositivo.
 * Wrapper async sobre createCommandExecutor que maneja el ciclo completo:
 * 1. Obtiene terminal del dispositivo
 * 2. Registra listeners para eventos PT
 * 3. Envía comando via enterCommand()
 * 4. Espera commandEnded o timeout
 * 5. Retorna output sanitizado y parsed
 *
 * @param payload - ExecIosPayload con device, command, y options
 * @param api - PtRuntimeApi con acceso a IPC y device registry
 * @returns PtResult con output, status, y parsed metadata
 *
 * @example
 * handleExecIos({ type: "execIos", device: "R1", command: "show ip int brief" }, api)
 * // → { ok: true, raw: "...", status: 0, parsed: { command: "show ip int brief", durationMs: 234 } }
 */
export async function handleExecIos(payload: ExecIosPayload, api: PtRuntimeApi): Promise<PtResult> {
  const deviceName = payload.device;
  const device = api.getDeviceByName(deviceName);
  if (!device) return createErrorResult(`Device not found: ${deviceName}`, "DEVICE_NOT_FOUND");

  const terminal = getTerminalDevice(api, deviceName);
  if (!terminal) return createErrorResult("Terminal engine inaccessible", "NO_TERMINAL");

  const session = ensureSession(deviceName);

  const deviceModel = (device as any)?.getModel?.() ?? "";
  const isHost = deviceModel.toLowerCase().includes("pc") || deviceModel.toLowerCase().includes("server");
  session.sessionKind = isHost ? "host" : "ios";

  const currentMode = detectModeFromPrompt(terminal.getPrompt());
  if (payload.ensurePrivileged && currentMode !== "privileged-exec") {
    const modeGuard = createModeGuard();
    let privResult;
    try {
      privResult = await withTimeout(
        modeGuard.ensurePrivilegedExec(deviceName, terminal),
        7000,
        "Timed out while ensuring privileged exec mode",
      );
    } catch (error) {
      return createErrorResult(
        error instanceof Error ? error.message : String(error),
        "MODE_TRANSITION_TIMEOUT",
        { raw: (terminal as any).getOutput?.() ?? "" }
      );
    }

    if (!privResult.ok) {
      return createErrorResult(
        privResult.error ?? "Failed to enter privileged mode",
        "MODE_TRANSITION_FAILED",
        { raw: privResult.warnings?.join("\n") ?? "" }
      );
    }
  }

  if (!payload.command || !String(payload.command).trim()) {
    const now = Date.now();
    const prompt = terminal.getPrompt?.() ?? "";
    const mode = detectModeFromPrompt(prompt);
    const modeMatched = !payload.expectedMode || mode === (payload.expectedMode as string);

    const terminalResult = {
      ok: modeMatched,
      device: deviceName,
      command: "",
      output: "",
      raw: "",
      error: modeMatched
        ? undefined
        : {
            code: "TERMINAL_MODE_MISMATCH" as const,
            message: `Expected mode "${payload.expectedMode}" not reached; got "${mode}" at prompt "${prompt}".`,
            phase: "postcondition" as const,
          },
      diagnostics: {
        status: modeMatched ? ("completed" as const) : ("failed" as const),
        statusCode: modeMatched ? 0 : 1,
        completionReason: "ensure-mode-only",
        outputSource: "none" as const,
        confidence: "high" as const,
        startedSeen: false,
        endedSeen: false,
        outputEvents: 0,
        promptMatched: true,
        modeMatched,
        semanticOk: true,
        durationMs: 0,
      },
      session: {
        kind: session.sessionKind,
        promptBefore: prompt,
        promptAfter: prompt,
        modeBefore: mode as any,
        modeAfter: mode as any,
        paging: false,
        awaitingConfirm: false,
        autoDismissedInitialDialog: false,
      },
      events: [] as any[],
      warnings: [] as string[],
    };

    if (terminalResult.ok) {
      return createSuccessResult(terminalResult as unknown as Record<string, unknown>);
    }

    return createErrorResult(
      terminalResult.error?.message ?? "Ensure mode failed",
      terminalResult.error?.code,
      {
        raw: terminalResult.raw,
        status: terminalResult.diagnostics.statusCode,
        parsed: terminalResult as unknown as Record<string, unknown>,
      },
    );
  }

  const options: ExecutionOptions = {
    commandTimeoutMs: payload.commandTimeoutMs ?? DEFAULT_COMMAND_TIMEOUT,
    stallTimeoutMs: payload.stallTimeoutMs ?? DEFAULT_STALL_TIMEOUT,
    autoAdvancePager: isHost ? false : (payload.allowPager ?? true),
    autoDismissWizard: true,
    autoConfirm: payload.allowConfirm ?? false,
    maxPagerAdvances: 50,
    sessionKind: session.sessionKind,
    expectedMode: payload.expectedMode as any,
    expectedPromptPattern: payload.expectedPromptPattern,
  };

  const executor = createCommandExecutor({
    commandTimeoutMs: options.commandTimeoutMs,
    stallTimeoutMs: options.stallTimeoutMs,
  });

  const execResult = await executor.executeCommand(
    deviceName,
    payload.command,
    terminal as any,
    options,
  );

  const raw = execResult.output;
  const sanitized = sanitizeTerminalOutput(undefined, raw) || raw;

  const parsed = {
    command: execResult.command,
    startedAt: execResult.startedAt,
    endedAt: execResult.endedAt,
    durationMs: execResult.durationMs,
    promptBefore: execResult.promptBefore,
    promptAfter: execResult.promptAfter,
    modeBefore: execResult.modeBefore,
    modeAfter: execResult.modeAfter,
    startedSeen: execResult.startedSeen,
    endedSeen: execResult.endedSeen,
    outputEvents: execResult.outputEvents,
    confidence: execResult.confidence,
    events: execResult.events,
    warnings: execResult.warnings,
  };

  const terminalResult: TerminalExecutionResult = {
    ok: execResult.ok,
    device: deviceName,
    command: payload.command,
    output: sanitized,
    raw: execResult.rawOutput || sanitized,
    error: execResult.ok ? undefined : {
      code: execResult.code ?? "TERMINAL_UNKNOWN_STATE",
      message: execResult.error ?? `Command failed with status ${execResult.status}`,
      phase: "execution",
      details: { status: execResult.status },
    },
    diagnostics: {
      status: execResult.ok ? "completed" : "failed",
      statusCode: execResult.status ?? (execResult.ok ? 0 : 1),
      completionReason: execResult.error,
      outputSource: "event",
      confidence: execResult.confidence as any,
      startedSeen: execResult.startedSeen,
      endedSeen: execResult.endedSeen,
      outputEvents: execResult.outputEvents,
      promptMatched: !payload.expectedPromptPattern || execResult.promptAfter?.includes(payload.expectedPromptPattern),
      modeMatched: !payload.expectedMode || execResult.modeAfter === payload.expectedMode,
      semanticOk: execResult.status === 0,
      durationMs: execResult.durationMs,
    },
    session: {
      kind: session.sessionKind,
      promptBefore: execResult.promptBefore,
      promptAfter: execResult.promptAfter,
      modeBefore: execResult.modeBefore as any,
      modeAfter: execResult.modeAfter as any,
      paging: false,
      awaitingConfirm: false,
      autoDismissedInitialDialog: execResult.warnings?.includes("Initial configuration dialog was auto-dismissed") ?? false,
    },
    events: execResult.events,
    warnings: execResult.warnings,
  };

  if (terminalResult.ok) {
    return createSuccessResult(terminalResult as unknown as Record<string, unknown>);
  }

  return createErrorResult(
    terminalResult.error?.message ?? "Terminal execution failed",
    terminalResult.error?.code,
    { raw: terminalResult.raw, status: terminalResult.diagnostics.statusCode, parsed: terminalResult as unknown as Record<string, unknown> },
  );
}

/**
 * Ejecuta una secuencia de comandos IOS de configuración.
 * Cada comando se ejecuta en orden, con soporte para stopOnError.
 * Opcionalmente guarda la configuración al final con "copy run start".
 * 
 * @param payload - ConfigIosPayload con device, commands[], y options
 * @param api - PtRuntimeApi con acceso a IPC y device registry
 * @returns PtResult con output acumulado si todos succeed o error si falló
 * 
 * @example
 * handleConfigIos({
 *   type: "configIos",
 *   device: "R1",
 *   commands: ["interface GigabitEthernet0/0", "ip address 192.168.1.1 255.255.255.0", "no shutdown"],
 *   save: true
 * }, api)
 */
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
    const result = await executor.executeCommand(deviceName, command, terminal, {
      ...execOptions,
      expectedMode: inferExpectedModeAfterCommand(command),
    });
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
      {
        ...execOptions,
        expectedMode: "privileged-exec" as any,
      }
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
    const model = device.getModel ? String(device.getModel()).toLowerCase() : "";
    const typeStr = String(type).toLowerCase();
    
    // Detección robusta de PC/Server (por ID, tipo de string o modelo)
    const isPc = (
        type === 8 || 
        type === 9 || 
        typeStr.indexOf("pc") !== -1 || 
        typeStr.indexOf("server") !== -1 || 
        model.indexOf("pc") !== -1 ||
        model.indexOf("server") !== -1
    );

    // Un solo comando para todos los dispositivos - CommandExecutor maneja completion
    const cmd = isPc ? "ping " + payload.target : "ping " + payload.target + " repeat 4";

    const terminal = getTerminalDevice(api, deviceName);
    if (!terminal) return createErrorResult("Terminal engine inaccessible", "NO_TERMINAL");

    // Usa CommandExecutor unificado para todos los dispositivos (incluyendo PC)
    const executor = createCommandExecutor({
      commandTimeoutMs: payload.timeoutMs ?? 15000,
      stallTimeoutMs: 15000,
    });

    const result = await executor.executeCommand(
      deviceName,
      cmd,
      terminal,
      { 
        commandTimeoutMs: payload.timeoutMs ?? 15000, 
        stallTimeoutMs: 15000,
        autoAdvancePager: true
      }
    );

    if (typeof (api as any).dprint === "function") {
      (api as any).dprint(
        `[handler:ping] device=${deviceName} ok=${result.ok} status=${result.status} outputLen=${result.output.length} preview=${JSON.stringify(result.output.slice(0, 120))}`,
      );
    }

    if (result.ok) {
      return createSuccessResult(result.output, { 
        raw: result.output, 
        status: result.status ?? undefined,
        parsed: {
          command: result.command,
          durationMs: result.durationMs,
          promptAfter: result.promptAfter,
          modeAfter: result.modeAfter,
          confidence: result.confidence
        }
      });
    }

    return createErrorResult(result.error || "Ping failed", result.code, { raw: result.output });
  } catch(e) {
    return createErrorResult("Kernel Panic: " + String(e), "INTERNAL_ERROR");
  }
}

export async function handleExecPc(payload: ExecPcPayload, api: PtRuntimeApi): Promise<PtResult> {
  const deviceName = payload.device;
  const deviceRef = api.getDeviceByName(deviceName);
  if (!deviceRef) return createErrorResult(`Device not found: ${deviceName}`, "DEVICE_NOT_FOUND");

  const terminal = getTerminalDevice(api, deviceName);
  if (!terminal) return createErrorResult("Terminal engine inaccessible", "NO_TERMINAL");

  const session = ensureSession(deviceName);
  session.sessionKind = "host";

  const cmd = payload.command.trim().toLowerCase();
  const isLongRunningCommand = cmd.startsWith("ping") || cmd.startsWith("tracert") || cmd.startsWith("trace");
  const commandTimeoutMs = isLongRunningCommand ? (payload.timeoutMs ?? 60000) : (payload.timeoutMs ?? 30000);

  const executor = createCommandExecutor({
    commandTimeoutMs,
    stallTimeoutMs: 15000,
  });

  const result = await executor.executeCommand(
    deviceName,
    payload.command,
    terminal,
    {
      commandTimeoutMs,
      autoAdvancePager: true
    }
  );

  if (typeof (api as any).dprint === "function") {
    (api as any).dprint(
      `[handler:execPc] device=${deviceName} status=${result.status} outputLen=${result.output.length} preview=${JSON.stringify(result.output.slice(0, 120))}`,
    );
  }

  const semantic = verifyHostOutput(result.output);
  const execOk = result.ok && semantic.ok;

  const terminalResult: TerminalExecutionResult = {
    ok: execOk,
    device: deviceName,
    command: payload.command,
    output: result.output,
    raw: result.output,
    error: execOk ? undefined : {
      code: (semantic.code ?? result.code ?? "TERMINAL_UNKNOWN_STATE") as any,
      message: semantic.message ?? result.error ?? `PC execution failed with status ${result.status}`,
      phase: "execution",
      details: { status: result.status },
    },
    diagnostics: {
      status: execOk ? "completed" : "failed",
      statusCode: result.status ?? (execOk ? 0 : 1),
      completionReason: semantic.message,
      outputSource: "event",
      confidence: result.confidence as any,
      startedSeen: result.startedSeen,
      endedSeen: result.endedSeen,
      outputEvents: result.outputEvents,
      promptMatched: true,
      modeMatched: true,
      semanticOk: result.status === 0,
      durationMs: result.durationMs,
    },
    session: {
      kind: "host",
      promptBefore: result.promptBefore,
      promptAfter: result.promptAfter,
      modeBefore: result.modeBefore as any,
      modeAfter: result.modeAfter as any,
      paging: false,
      awaitingConfirm: false,
      autoDismissedInitialDialog: result.warnings?.includes("Initial configuration dialog was auto-dismissed") ?? false,
    },
    events: result.events,
    warnings: [...result.warnings, ...semantic.warnings],
  };

  if (terminalResult.ok) {
    return createSuccessResult(terminalResult as unknown as Record<string, unknown>);
  }

  return createErrorResult(
    terminalResult.error?.message ?? "PC execution failed",
    terminalResult.error?.code,
    { raw: terminalResult.raw, status: terminalResult.diagnostics.statusCode, parsed: terminalResult as unknown as Record<string, unknown> },
  );
}

export function handleReadTerminal(payload: { device: string }, api: PtRuntimeApi): PtResult {
  const terminal = getTerminalDevice(api, payload.device);
  if (!terminal) return createErrorResult("Terminal inaccessible", "NO_TERMINAL");

  const raw = readTerminalOutput(terminal);
  const session = getSession(payload.device);

  // Descubrimiento de métodos (force test some common ones since for..in might fail on Qt objects)
  const allProps: string[] = [];
  try {
    const keys = Object.keys(terminal);
    for (var j = 0; j < keys.length; j++) {
      allProps.push(keys[j] + " (keys)");
    }
  } catch(e) {}
  
  try {
    for (var k in terminal) {
      allProps.push(k + " (in)");
    }
  } catch(e) {}

  const methodsToTest = ["getOutput", "getAllOutput", "getBuffer", "getText", "getHistory", "history", "getCommandInput", "getConsole", "readAll", "read", "toString", "className", "objectName"];
  for (var i = 0; i < methodsToTest.length; i++) {
    var m = methodsToTest[i];
    try {
      if (m !== undefined && terminal[m as keyof typeof terminal] !== undefined) {
        allProps.push(m + " (exists)");
      }
    } catch(e) {
      allProps.push(m + " (throws)");
    }
  }

  return createSuccessResult({
    raw,
    device: payload.device,
    prompt: terminal.getPrompt ? terminal.getPrompt() : "",
    methods: allProps,
    history: session ? session.history : []
  });
}
