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
import { createCommandExecutor, type ExecutionOptions, type CommandExecutionResult } from "../terminal/index";
import { ensureSession, getSession } from "../terminal/session-registry";
import { 
  detectModeFromPrompt, 
  readTerminalOutput, 
  stripBaselineOutput 
} from "../terminal/prompt-detector";
import { createModeGuard } from "../terminal/mode-guard";

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
    const privResult = await modeGuard.ensurePrivilegedExec(deviceName, terminal);

    if (!privResult.ok) {
      return createErrorResult(
        privResult.error ?? "Failed to enter privileged mode",
        "MODE_TRANSITION_FAILED",
        { raw: privResult.warnings?.join("\n") ?? "" }
      );
    }
  }

  const options: ExecutionOptions = {
    commandTimeoutMs: payload.commandTimeoutMs ?? DEFAULT_COMMAND_TIMEOUT,
    stallTimeoutMs: payload.stallTimeoutMs ?? DEFAULT_STALL_TIMEOUT,
    autoAdvancePager: isHost ? false : (payload.allowPager ?? true),
    autoDismissWizard: true,
    autoConfirm: payload.allowConfirm ?? false,
    maxPagerAdvances: 50,
    sessionKind: session.sessionKind,
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

  if (execResult.ok) {
    return createSuccessResult({
      output: sanitized,
      raw: sanitized,
      status: execResult.status,
      confidence: execResult.confidence,
      parsed,
    });
  }

  return createErrorResult(
    execResult.error || `Command failed with status ${execResult.status}`,
    execResult.code,
    {
      raw: sanitized || raw,
      status: execResult.status ?? undefined,
      parsed,
      details: {
        command: execResult.command,
        status: execResult.status ?? undefined,
        promptBefore: execResult.promptBefore,
        promptAfter: execResult.promptAfter,
        modeBefore: execResult.modeBefore,
        modeAfter: execResult.modeAfter,
        events: execResult.events,
        warnings: execResult.warnings,
      },
    },
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

    if (result.ok || result.output.trim().length > 0) {
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

  const executor = createCommandExecutor({
    commandTimeoutMs: payload.timeoutMs ?? 30000,
    stallTimeoutMs: 15000,
  });

  const result = await executor.executeCommand(
    deviceName,
    payload.command,
    terminal,
    { 
      commandTimeoutMs: payload.timeoutMs ?? 30000,
      autoAdvancePager: true
    }
  );

  if (typeof (api as any).dprint === "function") {
    (api as any).dprint(
      `[handler:execPc] device=${deviceName} status=${result.status} outputLen=${result.output.length} preview=${JSON.stringify(result.output.slice(0, 120))}`,
    );
  }

if (result.ok || result.output.trim().length > 0) {
      return createSuccessResult(
        {
          output: result.output,
          outputLength: result.output.length,
          preview: result.output.slice(0, 200),
          status: result.status ?? undefined,
        },
        { 
          raw: result.output, 
          status: result.status ?? undefined, 
          session: {
            prompt: result.promptAfter,
            mode: result.modeAfter,
            paging: false,
            awaitingConfirm: false,
          }
        },
      );
    }

  return createErrorResult("PC execution failed", (result.status ?? -1) > 0 ? "COMMAND_FAILED" : "NO_OUTPUT", {
    raw: result.output,
  });
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
