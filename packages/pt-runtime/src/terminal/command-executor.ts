// ============================================================================
// Command Executor - Ejecución interactiva robusta para IOS y Host Prompt
// ============================================================================
// Maneja el ciclo de vida de un comando: envío, eventos, timeouts y finalización.
// Implementa heurísticas de robustez para DNS hangups, Power check y Estabilización.

import type { TerminalMode } from "./session-state";
import {
  detectConfirmPrompt,
  detectPager,
  detectHostBusy,
  detectDnsLookup,
  detectAuthPrompt,
  detectModeFromPrompt,
  isHostMode,
  normalizePrompt,
  readTerminalOutput,
  stripBaselineOutput,
} from "./prompt-detector";
import { createPagerHandler } from "./pager-handler";
import { createConfirmHandler } from "./confirm-handler";
import { sanitizeCommandOutput } from "./command-sanitizer";
import { type CommandEndedPayload, type TerminalEventRecord } from "../pt/terminal/terminal-events";
import { TerminalErrors, type TerminalErrorCode } from "./terminal-errors";

// Importación estática para asegurar persistencia global de sesiones en el kernel
import { ensureSession } from "./session-registry";
import { checkIsCommandFinished } from "./stability-heuristic";

export interface PTCommandLine {
  getPrompt(): string;
  getOutput?(): string;
  getAllOutput?(): string;
  getBuffer?(): string;
  getCommandInput(): string;
  enterCommand(cmd: string): unknown;
  registerEvent(eventName: string, context: null, handler: (src: unknown, args: unknown) => void): void;
  unregisterEvent(eventName: string, context: null, handler: (src: unknown, args: unknown) => void): void;
  registerObjectEvent?(eventName: string, handler: (src: unknown, args: unknown) => void): void;
  unregisterObjectEvent?(eventName: string, handler: (src: unknown, args: unknown) => void): void;
  enterChar(charCode: number, modifiers: number): void;
  println?(text: string): void;
  flush?(): void;
  getConsole?(): any;
}

function detectDnsHangup(chunk: string): boolean {
  return /Translating\s+["']?.+["']?\.\.\./i.test(chunk);
}

function detectWizardFromOutput(output: string): boolean {
  return (
    output.includes("initial configuration dialog?") ||
    output.includes("[yes/no]") ||
    output.includes("continuar con la configuración")
  );
}

export interface ExecutionOptions {
  commandTimeoutMs?: number;
  stallTimeoutMs?: number;
  expectedMode?: TerminalMode;
  expectedPromptPattern?: string;
  autoAdvancePager?: boolean;
  autoDismissWizard?: boolean;
  autoConfirm?: boolean;
  maxPagerAdvances?: number;
}

export interface CommandExecutionResult {
  ok: boolean;
  command: string;
  status: number;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  promptBefore: string;
  promptAfter: string;
  modeBefore: TerminalMode;
  modeAfter: TerminalMode;
  output: string;
  events: TerminalEventRecord[];
  warnings: string[];
  error?: string;
  code?: TerminalErrorCode;
  confidence: number;
}

const DEFAULT_COMMAND_TIMEOUT = 15000;
const DEFAULT_STALL_TIMEOUT = 5000;
const COMMAND_END_GRACE_MS = 250;
const COMMAND_END_MAX_WAIT_MS = 1000;
const PROMPT_STABILIZED_FALLBACK_MS = 2000;

function pushEvent(
  events: TerminalEventRecord[],
  sessionId: string,
  deviceName: string,
  eventType: string,
  raw: string,
  normalized?: string,
): void {
  events.push({
    sessionId,
    deviceName,
    eventType,
    timestamp: Date.now(),
    raw,
    normalized: normalized ?? normalizePrompt(raw),
  });
}

function guessFailureStatus(output: string): number {
  const text = String(output ?? "");
  if (
    text.includes("% Invalid") ||
    text.includes("% Incomplete") ||
    text.includes("% Ambiguous") ||
    text.includes("% Unknown") ||
    text.includes("%Error") ||
    text.toLowerCase().includes("invalid command")
  ) {
    return 1;
  }
  return 0;
}

function computeConfidence(
  cmdOk: boolean,
  warnings: string[],
  output: string,
  modeMatched: boolean,
  promptMatched: boolean,
): number {
  let confidence = cmdOk ? 1 : 0;
  if (warnings.length > 0 && confidence > 0) confidence = 0.8;
  if (!modeMatched || !promptMatched) confidence = Math.min(confidence, 0.6);
  if (!output.trim()) confidence = Math.min(confidence, 0.5);
  return confidence;
}

function extractImmediateCommandResult(ptRes: unknown): { status?: number; output?: string } | null {
  if (Array.isArray(ptRes) && ptRes.length >= 2) {
    return { status: Number(ptRes[0]), output: String(ptRes[1]) };
  }
  if (ptRes && typeof ptRes === "object") {
    const candidate = ptRes as any;
    const status = typeof candidate.status === "number" ? candidate.status : undefined;
    const output =
      typeof candidate.output === "string"
        ? candidate.output
        : typeof candidate.raw === "string"
          ? candidate.raw
          : undefined;

    if (status !== undefined || output !== undefined) {
      return { status, output };
    }
  }
  return null;
}

/**
 * Crea una instancia del motor de ejecución de comandos.
 * 
 * El CommandExecutor orquestra el ciclo de vida de un comando en el terminal de Packet Tracer,
 * manejando timeouts, eventos asíncronos y heurísticas de finalización para garantizar
 * una ejecución determinista tanto en IOS como en Host Prompt.
 */
export function createCommandExecutor(config: { commandTimeoutMs?: number; stallTimeoutMs?: number } = {}) {
  const defaultCommandTimeout = config.commandTimeoutMs ?? DEFAULT_COMMAND_TIMEOUT;
  const defaultStallTimeout = config.stallTimeoutMs ?? DEFAULT_STALL_TIMEOUT;

  /**
   * Ejecuta un comando en un dispositivo específico.
   * 
   * @param deviceName - Nombre del dispositivo en PT
   * @param command - Comando a ejecutar (ej: 'show version' o 'ipconfig')
   * @param terminal - Interfaz de terminal del dispositivo
   * @param options - Opciones específicas para esta ejecución
   */
  async function executeCommand(
    deviceName: string,
    command: string,
    terminal: PTCommandLine,
    options: ExecutionOptions = {},
  ): Promise<CommandExecutionResult> {
    const startedAt = Date.now();
    const commandTimeoutMs = options.commandTimeoutMs ?? defaultCommandTimeout;
    const stallTimeoutMs = options.stallTimeoutMs ?? defaultStallTimeout;
    
    // Obtener sesión del registro global para persistencia entre comandos
    const session = ensureSession(deviceName);

    const events: TerminalEventRecord[] = [];
    const warnings: string[] = [...(session.warnings || [])];
    const outputBuffer: string[] = [];

    const promptBefore = normalizePrompt(terminal.getPrompt());
    const modeBefore = detectModeFromPrompt(promptBefore);
    const sessionKindBefore = session.sessionKind;

    // 0. Power Check
    try {
        // @ts-ignore
        const net = (typeof ipc !== 'undefined') ? ipc.network() : null;
        const dev = net ? net.getDevice(deviceName) : null;
        if (dev && typeof dev.getPower === "function" && !dev.getPower()) {
            return {
                ok: false, command, status: 1, startedAt, endedAt: Date.now(),
                durationMs: 0, promptBefore, promptAfter: promptBefore,
                modeBefore, modeAfter: modeBefore, output: "",
                events: [], warnings: ["Device is powered off"],
                error: "Device is powered off", code: TerminalErrors.SESSION_BROKEN,
                confidence: 0,
            };
        }
    } catch(e) {}

    if (session.health === "broken") {
      return {
        ok: false, command, status: 1, startedAt, endedAt: Date.now(),
        durationMs: 0, promptBefore, promptAfter: promptBefore,
        modeBefore, modeAfter: modeBefore, output: "",
        events: [], warnings: [...session.warnings],
        error: "Session is broken", code: TerminalErrors.SESSION_BROKEN,
        confidence: 0,
      };
    }

    const pagerHandler = createPagerHandler({
      maxAdvances: options.maxPagerAdvances ?? 50,
    });

    const confirmHandler = createConfirmHandler({
      autoConfirm: options.autoConfirm ?? true,
    });

    const baselineOutput = readTerminalOutput(terminal);
    const commandEndMaxWaitMs =
      isHostMode(modeBefore) || sessionKindBefore === "host"
        ? Math.max(COMMAND_END_MAX_WAIT_MS, 8000)
        : COMMAND_END_MAX_WAIT_MS;

    return new Promise((resolve) => {
      let settled = false;
      let started = false;
      let commandEndedSeen = false;
      let endedStatus: number | null = null;
      let wizardDismissed = false;
      let hostBusy = false;
      let lastObservedTerminalOutput = "";
      let lastTerminalOutputAt = startedAt;
      let commandEndGraceTimer: any = null;
      let stallTimer: any = null;
      let globalTimeoutTimer: any = null;
      let startTimer: any = null;
      let outputPollTimer: any = null;

      function clearTimers() {
        if (commandEndGraceTimer) clearTimeout(commandEndGraceTimer);
        if (stallTimer) clearTimeout(stallTimer);
        if (globalTimeoutTimer) clearTimeout(globalTimeoutTimer);
        if (startTimer) clearTimeout(startTimer);
        if (outputPollTimer) clearInterval(outputPollTimer);
      }

      function resetStallTimer() {
        if (stallTimer) clearTimeout(stallTimer);
        stallTimer = setTimeout(() => {
          if (settled) return;
          
          const currentPrompt = terminal.getPrompt();
          const { finished } = checkIsCommandFinished(currentPrompt, session, true); // Forzamos true para ver si el prompt es válido
          
          if (finished) {
              finalize(true, 0, "Stall timeout reached with valid prompt (assumed finished)");
          } else {
              finalizeFailure(TerminalErrors.COMMAND_END_TIMEOUT, "Command stalled before completion");
          }
        }, stallTimeoutMs);
      }

      function finalize(cmdOk: boolean, status: number, error?: string, code?: TerminalErrorCode): void {
        if (settled) return;
        settled = true;
        clearTimers();
        cleanup();

        const endedAt = Date.now();
        const promptAfter = normalizePrompt(terminal.getPrompt());
        let modeAfter = detectModeFromPrompt(promptAfter);
        const bufferedOutput = outputBuffer.join("");
        const liveOutput = readTerminalOutput(terminal);
        
        // Unificación agresiva de buffers
        var rawOutput = "";
        if (bufferedOutput.length > 0) {
            rawOutput = bufferedOutput;
        } else {
            rawOutput = liveOutput;
        }

        // Restar el output base para ver solo lo nuevo
        // En IOS, si el output es excesivamente largo, evitamos strip para no perder datos
        const newRawOutput = (session.sessionKind === "ios" && rawOutput.length > 5000) 
            ? rawOutput 
            : stripBaselineOutput(rawOutput, baselineOutput);

        // Sanitizar el output final
        const output = sanitizeCommandOutput(newRawOutput);
        
        if (session.sessionKind === "host" && detectHostBusy(output)) hostBusy = true;
        if (hostBusy && modeAfter === "unknown") modeAfter = "host-busy";

        session.lastActivityAt = endedAt;
        session.lastCommandEndedAt = endedAt;
        session.pendingCommand = null;
        session.lastPrompt = promptAfter;
        session.lastMode = modeAfter;
        session.outputBuffer = output;
        session.pagerActive = false;
        session.confirmPromptActive = false;

        session.history.push({ command, output, timestamp: endedAt });
        if (session.history.length > 100) session.history.splice(0, 20);

        if (!cmdOk) session.health = "desynced";

        const promptMatched = !options.expectedPromptPattern || promptAfter.includes(options.expectedPromptPattern);
        const modeMatched = !options.expectedMode || modeAfter === options.expectedMode;

        const finalWarnings = [...warnings];
        if (!promptMatched) finalWarnings.push(`Expected prompt "${options.expectedPromptPattern}" not reached.`);
        if (!modeMatched) finalWarnings.push(`Expected mode "${options.expectedMode}" not reached.`);
        if (wizardDismissed) finalWarnings.push("Initial configuration dialog was auto-dismissed");
        if (hostBusy) finalWarnings.push("Host command produced long-running output");

        const confidence = computeConfidence(cmdOk, finalWarnings, output, modeMatched, promptMatched);

        resolve({
          ok: cmdOk && promptMatched && modeMatched,
          command, status, startedAt, endedAt,
          durationMs: endedAt - startedAt,
          promptBefore, promptAfter, modeBefore, modeAfter,
          output, events, warnings: finalWarnings, error, code, confidence,
        });
      }

      function finalizeFailure(code: TerminalErrorCode, message: string): void {
        finalize(false, 1, message, code);
      }


// ... (dentro de la función executeCommand) ...

      let promptFirstSeenAt: number | null = null;
      function scheduleFinalizeAfterCommandEnd(): void {
        if (settled) return;

        const currentPrompt = terminal.getPrompt();
        
        const { finished, reason } = checkIsCommandFinished(currentPrompt, session, commandEndedSeen);
        
        if (finished) {
            // Si terminamos por prompt pero no hemos visto commandEnded nativo,
            // damos un margen de 1s para asegurar que no hay más chunks llegando.
            if (!commandEndedSeen && !promptFirstSeenAt) {
                promptFirstSeenAt = Date.now();
            }

            const graceElapsed = promptFirstSeenAt ? (Date.now() - promptFirstSeenAt) : 0;
            if (commandEndedSeen || graceElapsed > 1000) {
                // Capturar la salida completa y sanitizar
                const fullOutput = sanitizeCommandOutput(outputBuffer.join(""));
                lastObservedTerminalOutput = fullOutput;
                finalize(true, 0, reason);
                return;
            }
        } else {
            promptFirstSeenAt = null;
        }

        // Si no hay prompt o estamos en periodo de gracia, programamos re-chequeo
        if (commandEndGraceTimer) clearTimeout(commandEndGraceTimer);
        commandEndGraceTimer = setTimeout(() => {
          commandEndGraceTimer = null;
          scheduleFinalizeAfterCommandEnd();
        }, 500);
      }

      function onOutput(_src: unknown, args: unknown): void {
        const payload = args as any;
        const chunk = String(payload?.newOutput ?? payload?.data ?? payload?.output ?? payload?.chunk ?? "");
        if (!chunk) return;

        lastTerminalOutputAt = Date.now();
        outputBuffer.push(chunk);
        
        // Actualizar marca de agua si el chunk vino de un evento (para evitar duplicados en el poll)
        // Solo lo hacemos si el poll está activo y el chunk parece coincidir con el final del buffer real
        const currentRaw = readTerminalOutput(terminal);
        if (currentRaw.length >= lastObservedTerminalOutput.length) {
            lastObservedTerminalOutput = currentRaw;
        }

        pushEvent(events, session.sessionId, deviceName, "outputWritten", chunk, chunk.trim());

        if (detectDnsHangup(chunk)) {
          try {
            terminal.enterChar(3, 0); 
            warnings.push("DNS Hangup detected (Translating...). Breaking with Ctrl+C");
            pushEvent(events, session.sessionId, deviceName, "dnsBreak", "Ctrl+C", "Ctrl+C");
          } catch(e) {}
        }

        if (detectWizardFromOutput(chunk)) {
          session.wizardDetected = true;
          if (options.autoDismissWizard !== false && !wizardDismissed) {
            wizardDismissed = true;
            try { terminal.enterCommand("no"); resetStallTimer(); } catch {}
          }
        }

        if (detectConfirmPrompt(chunk)) {
          session.confirmPromptActive = true;
          confirmHandler.handleOutput(chunk);
          if (options.autoConfirm && confirmHandler.shouldAutoConfirm()) {
            try {
              const lower = chunk.toLowerCase();
              if (lower.indexOf("[yes/no]") !== -1 || lower.indexOf("(y/n)") !== -1) terminal.enterCommand("y");
              else terminal.enterChar(13, 0);
              confirmHandler.confirm();
              resetStallTimer();
            } catch {}
          }
        }

        if (detectAuthPrompt(chunk)) {
            warnings.push("Authentication required");
            if (commandEndGraceTimer) clearTimeout(commandEndGraceTimer);
            commandEndGraceTimer = setTimeout(() => { if (!settled) finalize(true, 0); }, COMMAND_END_GRACE_MS);
            return;
        }

        if (detectPager(chunk)) {
          session.pagerActive = true;
          pagerHandler.handleOutput(chunk);
          if (options.autoAdvancePager !== false && pagerHandler.canContinue()) {
            try { terminal.enterChar(32, 0); resetStallTimer(); } catch {}
          }
        }

        resetStallTimer();
        scheduleFinalizeAfterCommandEnd();
      }

      function onStarted(): void {
        started = true;
        if (startTimer) { clearTimeout(startTimer); startTimer = null; }
        session.lastActivityAt = Date.now();
        resetStallTimer();
      }

      function onEnded(_src: unknown, args: unknown): void {
        const payload = args as CommandEndedPayload;
        commandEndedSeen = true;
        endedStatus = payload.status ?? 0;
        resetStallTimer();
        scheduleFinalizeAfterCommandEnd();
      }

      function onPromptChanged(_src: unknown, args: unknown): void {
        const p = String((args as any).prompt || "");
        session.lastPrompt = normalizePrompt(p);
        const mode = detectModeFromPrompt(session.lastPrompt);
        session.lastMode = mode;
        if (isHostMode(mode)) session.sessionKind = "host";
        resetStallTimer();
        scheduleFinalizeAfterCommandEnd();
      }

      function cleanup(): void {
        try {
          terminal.unregisterEvent("commandStarted", null, onStarted);
          terminal.unregisterEvent("outputWritten", null, onOutput);
          terminal.unregisterEvent("commandEnded", null, onEnded);
          terminal.unregisterEvent("promptChanged", null, onPromptChanged);
          
          if (typeof terminal.unregisterObjectEvent === "function") {
            terminal.unregisterObjectEvent("commandStarted", onStarted);
            terminal.unregisterObjectEvent("outputWritten", onOutput);
            terminal.unregisterObjectEvent("commandEnded", onEnded);
            terminal.unregisterObjectEvent("promptChanged", onPromptChanged);
          }
        } catch {}
      }

      try {
        terminal.registerEvent("commandStarted", null, onStarted);
        terminal.registerEvent("outputWritten", null, onOutput);
        terminal.registerEvent("commandEnded", null, onEnded);
        terminal.registerEvent("promptChanged", null, onPromptChanged);

        if (typeof terminal.registerObjectEvent === "function") {
          terminal.registerObjectEvent("commandStarted", onStarted);
          terminal.registerObjectEvent("outputWritten", onOutput);
          terminal.registerObjectEvent("commandEnded", onEnded);
          terminal.registerObjectEvent("promptChanged", onPromptChanged);
        }
      } catch {}

      // Activar polling de output para mayor robustez (especialmente en switches con muchos logs)
      outputPollTimer = setInterval(function() {
        if (settled) return;
        var currentRaw = readTerminalOutput(terminal);
        if (currentRaw.length > lastObservedTerminalOutput.length) {
            var delta = currentRaw.substring(lastObservedTerminalOutput.length);
            lastObservedTerminalOutput = currentRaw;
            onOutput(null, { chunk: delta, newOutput: delta });
        }
      }, 250);

      globalTimeoutTimer = setTimeout(() => {
        if (settled) return;
        finalizeFailure(TerminalErrors.COMMAND_END_TIMEOUT, `Global timeout reached (${commandTimeoutMs}ms)`);
      }, commandTimeoutMs);

      startTimer = setTimeout(() => {
        if (!started && !settled) {
          const currentPrompt = terminal.getPrompt();
          if (currentPrompt) { started = true; scheduleFinalizeAfterCommandEnd(); }
          else finalizeFailure(TerminalErrors.COMMAND_START_TIMEOUT, "Command did not start");
        }
      }, 2000);

      function runExecutionFlow(): void {
        if (settled) return;
        
        try {
            session.lastMode = modeBefore;
            if (sessionKindBefore !== "unknown") session.sessionKind = sessionKindBefore;

            // FASE 1: Despertar terminal (solo IOS)
            if (session.sessionKind === "ios") {
                // Mandar un Enter para limpiar la línea de posibles logs previos
                terminal.enterChar(13, 0);
                setTimeout(function() {
                    if (settled) return;
                    
                    // FASE 2: Inicialización (si es necesaria)
                    if (!session.initialized) {
                        session.initialized = true;
                        terminal.enterCommand("terminal length 0");
                        terminal.enterChar(13, 0);
                        setTimeout(function() {
                            if (settled) return;
                            terminal.enterCommand("logging synchronous");
                            terminal.enterChar(13, 0);
                            setTimeout(function() { dispatchCommand(); }, 200);
                        }, 200);
                    } else {
                        setTimeout(function() { dispatchCommand(); }, 200);
                    }
                }, 200);
            } else {
                // Host: Envío inmediato
                dispatchCommand();
            }
        } catch(e) {
            finalizeFailure(TerminalErrors.UNKNOWN_STATE, "Flow setup failed: " + String(e));
        }
      }

      function dispatchCommand(): void {
        if (settled) return;
        try {
            // Mandar el comando real
            terminal.enterCommand(command);
            // Mandar Enter extra para asegurar ejecución en switches lentos
            setTimeout(function() {
                if (settled) return;
                terminal.enterChar(13, 0);
                
                started = true;
                resetStallTimer();
                scheduleFinalizeAfterCommandEnd();
            }, 100);
        } catch(e) {
            finalizeFailure(TerminalErrors.UNKNOWN_STATE, "Command dispatch failed: " + String(e));
        }
      }

      runExecutionFlow();
    });
  }

  return { executeCommand };
}
