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
import { detectModeFromPrompt } from "../terminal/prompt-detector";
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

function readTerminalOutput(terminal: PTTerminal): string {
  try {
    // Brute force: intentar varios nombres comunes en PT para el buffer de terminal
    const methods = ["getOutput", "getAllOutput", "getBuffer", "getText"];
    for (let i = 0; i < methods.length; i++) {
      const m = methods[i]!;
      try {
        const out = (terminal as any)[m]();
        if (typeof out === "string" && out.length > 0) return out;
      } catch(e) {}
    }
    return "";
  } catch {
    return "";
  }
}

function stripBaselineOutput(output: string, baseline: string): string {
  if (!output) return "";
  if (!baseline) return output;
  
  if (output.startsWith(baseline)) {
    return output.slice(baseline.length);
  }

  // Si el buffer hizo scroll, buscar el punto de divergencia
  // O buscar la última línea del baseline en el output
  const lines = baseline.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]?.trim();
    if (!line || line === "C:\\>") continue;
    
    const idx = output.lastIndexOf(line);
    if (idx !== -1) {
      return output.slice(idx + line.length);
    }
  }

  return output;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function guessHostCommandStatus(output: string): number {
  const text = String(output ?? "");
  if (
    text.includes("% Invalid") ||
    text.includes("% Incomplete") ||
    text.includes("% Ambiguous") ||
    text.includes("% Unknown") ||
    text.includes("%Error") ||
    text.toLowerCase().includes("invalid command") ||
    text.toLowerCase().includes("unknown host") ||
    text.toLowerCase().includes("could not find host") ||
    text.toLowerCase().includes("timed out") && !text.toLowerCase().includes("ping statistics")
  ) {
    return 1;
  }

  return 0;
}

async function recoverTerminalOutput(
  terminal: PTTerminal,
  baseline: string,
  timeoutMs: number,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  let last = "";
  let stableSince = Date.now();

  while (Date.now() < deadline) {
    const snapshot = stripBaselineOutput(readTerminalOutput(terminal), baseline);
    if (snapshot !== last) {
      last = snapshot;
      stableSince = Date.now();
    }

    if (last.trim().length > 0 && Date.now() - stableSince >= 250) {
      return last;
    }

    await delay(250);
  }

  return last;
}

async function runHostTerminalCommand(
  terminal: PTTerminal,
  command: string,
  timeoutMs: number,
  api: PtRuntimeApi,
): Promise<{
  output: string;
  status: number;
  debug: {
    baselineLength: number;
    finalLength: number;
    iterations: number;
    elapsedMs: number;
  };
}> {
  const baseline = readTerminalOutput(terminal);
  const baselineLength = baseline.length;
  const startedAt = Date.now();
  let iterations = 0;

  try {
    // LIMPIEZA PREVIA: Si hay texto escrito pero no enviado, o estamos en un sub-shell,
    // intentamos cancelar con Ctrl+C (3) antes de enviar nuestro comando.
    if (terminal.getCommandInput && terminal.getCommandInput().length > 0) {
      if (terminal.enterChar) terminal.enterChar(3, 0); // Ctrl+C
      await delay(200);
    }

    // Si el prompt no es el estándar de PC (C:\>) o está vacío (proceso colgado), intentamos salir
    const currentPrompt = terminal.getPrompt ? terminal.getPrompt() : "";
    if (currentPrompt === "" || currentPrompt.indexOf("C:\\>") === -1) {
       // Podríamos estar en 'js>', 'python>>>' o con un ping infinito corriendo
       if (terminal.enterCommand && currentPrompt) terminal.enterCommand("quit");
       if (terminal.enterChar) terminal.enterChar(3, 0);
       await delay(200);
    }

    terminal.enterCommand(command);
  } catch {    return {
      output: "",
      status: 1,
      debug: {
        baselineLength,
        finalLength: baselineLength,
        iterations,
        elapsedMs: Date.now() - startedAt,
      },
    };
  }

  const deadline = Date.now() + Math.max(500, Math.min(timeoutMs, 30000));
  const normalizedCommand = String(command ?? "").toLowerCase();
  const waitsForCompletionMarker =
    normalizedCommand.startsWith("ping ") ||
    normalizedCommand.startsWith("tracert") ||
    normalizedCommand.startsWith("trace") ||
    normalizedCommand.startsWith("nslookup") ||
    normalizedCommand.startsWith("netstat");
  let lastSnapshot = baseline;
  let lastChangeAt = Date.now();

  while (Date.now() < deadline) {
    iterations += 1;
    const current = readTerminalOutput(terminal);

    // Extraer solo la parte nueva para evitar falsos positivos con el historial
    const currentNewOutput = stripBaselineOutput(current, baseline);
    const lowerNewOutput = currentNewOutput.toLowerCase();

    if (current !== lastSnapshot) {
      lastSnapshot = current;
      lastChangeAt = Date.now();
      
      // Auto-avance de paginación si se detecta --More--
      if (current.toLowerCase().includes("--more--")) {
        try {
          // Presionar espacio (32) para avanzar página
          if (terminal.enterChar) terminal.enterChar(32, 0);
        } catch(e) {}
      }
    }

    const quietForLongEnough = Date.now() - lastChangeAt >= 500;
    const currentPrompt = terminal.getPrompt ? terminal.getPrompt() : "";
    const hasFinalPrompt = currentPrompt && current.endsWith(currentPrompt);

    const hasCompletionMarker =
      !waitsForCompletionMarker ||
      lowerNewOutput.includes("ping statistics") ||
      lowerNewOutput.includes("trace complete") ||
      lowerNewOutput.includes("address:") ||
      lowerNewOutput.includes("unknown host") ||
      lowerNewOutput.includes("can't find") ||
      lowerNewOutput.includes("non-existent");

    if (quietForLongEnough && (hasFinalPrompt || hasCompletionMarker) && lastSnapshot.trim().length > 0) {
      break;
    }

    await delay(250);
  }

  const output = stripBaselineOutput(lastSnapshot, baseline);
  const finalOutput = output.trim().length > 0 ? output : lastSnapshot;

  return {
    output: finalOutput,
    status: guessHostCommandStatus(finalOutput),
    session: {
      prompt: terminal.getPrompt ? terminal.getPrompt() : "",
      mode: terminal.getMode ? terminal.getMode() : "",
    },
    debug: {
      baselineLength,
      finalLength: finalOutput.length,
      iterations,
      elapsedMs: Date.now() - startedAt,
    },
  };
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

  ensureSession(deviceName);

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
    autoAdvancePager: payload.allowPager ?? true,
    autoDismissWizard: true,
    autoConfirm: payload.allowConfirm ?? false,
    maxPagerAdvances: 50,
  };

  const executor = createCommandExecutor({
    commandTimeoutMs: payload.commandTimeoutMs ?? DEFAULT_COMMAND_TIMEOUT,
    stallTimeoutMs: payload.stallTimeoutMs ?? DEFAULT_STALL_TIMEOUT,
  });
  const baselineOutput = readTerminalOutput(terminal);

  const execResult = await executor.executeCommand(
    deviceName,
    payload.command,
    terminal,
    options
  );

  if (typeof (api as any).dprint === "function") {
    (api as any).dprint(
      `[handler:execIos] ok=${execResult.ok} status=${execResult.status} outputLen=${execResult.output.length} preview=${JSON.stringify(execResult.output.slice(0, 120))}`,
    );
  }

  const normalizedOutput = stripBaselineOutput(execResult.output, baselineOutput);
  const liveSnapshot = readTerminalOutput(terminal);
  const recoveredOutput =
    normalizedOutput.trim().length === 0
      ? await recoverTerminalOutput(
          terminal,
          baselineOutput,
          Math.max(payload.commandTimeoutMs ?? DEFAULT_COMMAND_TIMEOUT, 5000),
        )
      : "";
  const finalOutput =
    normalizedOutput.trim().length > 0
      ? normalizedOutput
      : recoveredOutput.trim().length > 0
        ? recoveredOutput
        : liveSnapshot;

  if (execResult.ok) {
    return createSuccessResult(finalOutput, {
      raw: sanitizeTerminalOutput(undefined, finalOutput) || finalOutput,
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

/**
 * Ejecuta comando ping en un dispositivo IOS o PC.
 * Usa CommandExecutor unificado para todos los tipos de dispositivo.
 * Detecta completion estructuralmente via detectHostBusy().
 * 
 * @param payload - Payload con device, target, y timeoutMs opcional
 * @param api - PtRuntimeApi con acceso a IPC y device registry
 * @returns PtResult con output completo del ping
 */
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

    if (isPc) {
      const hostPing = await runHostTerminalCommand(terminal, cmd, payload.timeoutMs ?? 15000, api);

      if (typeof (api as any).dprint === "function") {
        (api as any).dprint(
          `[handler:ping-host] device=${deviceName} status=${hostPing.status} outputLen=${hostPing.output.length} preview=${JSON.stringify(hostPing.output.slice(0, 120))}`,
        );
      }

      if (hostPing.output.trim().length > 0) {
        return createSuccessResult(
          {
            output: hostPing.output,
            outputLength: hostPing.output.length,
            preview: hostPing.output.slice(0, 200),
            status: hostPing.status,
            debug: hostPing.debug,
          },
          { 
            raw: hostPing.output, 
            status: hostPing.status, 
            session: hostPing.session 
          },
        );
      }

      return createErrorResult("Ping failed", "COMMAND_FAILED", { raw: hostPing.output });
    }

    // Usa CommandExecutor unificado para todos los dispositivos (incluyendo PC)
    const executor = createCommandExecutor({
      commandTimeoutMs: payload.timeoutMs ?? 15000,
      stallTimeoutMs: payload.timeoutMs ?? 15000,
    });
    const baselineOutput = readTerminalOutput(terminal);

    const result = await executor.executeCommand(
      deviceName,
      cmd,
      terminal,
      { commandTimeoutMs: payload.timeoutMs ?? 15000, stallTimeoutMs: payload.timeoutMs ?? 15000 }
    );

    if (typeof (api as any).dprint === "function") {
      (api as any).dprint(
        `[handler:ping] device=${deviceName} ok=${result.ok} status=${result.status} outputLen=${result.output.length} preview=${JSON.stringify(result.output.slice(0, 120))}`,
      );
    }

    const normalizedOutput = stripBaselineOutput(result.output, baselineOutput);
    const liveSnapshot = readTerminalOutput(terminal);
    const recoveredOutput =
      normalizedOutput.trim().length === 0
        ? await recoverTerminalOutput(
            terminal,
            baselineOutput,
            Math.max(payload.timeoutMs ?? 15000, 5000),
          )
        : "";
    const finalOutput =
      normalizedOutput.trim().length > 0
        ? normalizedOutput
        : recoveredOutput.trim().length > 0
          ? recoveredOutput
          : liveSnapshot;

    if (result.ok) {
      return createSuccessResult(finalOutput, { raw: finalOutput, status: result.status });
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

  const hostResult = await runHostTerminalCommand(terminal, payload.command, payload.timeoutMs ?? 30000, api);

  if (typeof (api as any).dprint === "function") {
    (api as any).dprint(
      `[handler:execPc-host] device=${payload.device} status=${hostResult.status} outputLen=${hostResult.output.length} preview=${JSON.stringify(hostResult.output.slice(0, 120))}`,
    );
  }

  if (hostResult.output.trim().length > 0) {
    return createSuccessResult(
      {
        output: hostResult.output,
        outputLength: hostResult.output.length,
        preview: hostResult.output.slice(0, 200),
        status: hostResult.status,
        debug: hostResult.debug,
      },
      { 
        raw: hostResult.output, 
        status: hostResult.status, 
        session: hostResult.session 
      },
    );
  }

  return createErrorResult("PC execution failed", hostResult.status > 0 ? "COMMAND_FAILED" : "NO_OUTPUT", {
    raw: hostResult.output,
  });
}

export function handleExecPcDirect(payload: ExecPcPayload, api: PtRuntimeApi): PtResult {
  try {
    const device = api.ipc.network().getDevice(payload.device);
    if (device && (device as any).getCommandLine) {
      const cli = (device as any).getCommandLine();
      const prompt = cli.getPrompt();

      // Bypass simple para inyección raw
      if (prompt && prompt.indexOf("initial configuration dialog") !== -1) {
        cli.enterCommand("no");
        // Ctrl+C (char 3) para estabilizar
        if (cli.enterChar) cli.enterChar(3, 0);
      }

      cli.enterCommand(payload.command);
    }
    return { ok: true, result: "Injected" } as any;
  } catch(e) { return createErrorResult(String(e), "EXEC_FAILED"); }

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
