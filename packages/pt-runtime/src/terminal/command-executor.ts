// ============================================================================
// Command Executor - Ejecución interactiva robusta para IOS y Host Prompt
// ============================================================================
// Maneja el ciclo de vida de un comando: envío, eventos, timeouts y finalización.
// Implementa heurísticas de robustez para DNS hangups, Power check y Estabilización.

import type { TerminalMode, TerminalSessionKind } from "./session-state";
import {
  detectConfirmPrompt,
  detectPager,
  detectHostBusy,
  detectDnsLookup,
  detectAuthPrompt,
  detectModeFromPrompt,
  isHostMode,
  normalizePrompt,
  readTerminalSnapshot,
  diffSnapshotStrict,
} from "./prompt-detector";
import { createPagerHandler } from "./pager-handler";
import { createConfirmHandler } from "./confirm-handler";
import { sanitizeCommandOutput } from "./command-sanitizer";
import { type CommandEndedPayload, type TerminalEventRecord } from "../pt/terminal/terminal-events";
import { TerminalErrors, type TerminalErrorCode } from "./terminal-errors";
import { ensureSession } from "./session-registry";
import { checkIsCommandFinished } from "./stability-heuristic";
import { checkCommandCompletion } from "./stability-heuristic";
import { verifyIosOutput, verifyHostOutput } from "./terminal-semantic-verifier";
import { recoverTerminalSync } from "./terminal-recovery";
import {
  getPromptSafe,
  getModeSafe,
  isTerminalReadyForCommand,
  wakeTerminal,
  ensureTerminalReadySync,
} from "./terminal-ready";
import { extractCommandOutput, type CommandSessionKind } from "./command-output-extractor";
import {
  pushEvent,
  compactTerminalEvents,
  shouldFinalizeCommand,
  buildFinalOutput,
  resolveTerminalError,
  guessFailureStatus,
  isOnlyPrompt,
  detectDnsHangup,
  computeConfidenceString,
} from "./engine/index.js";

export interface PTCommandLine {
  getPrompt(): string;
  getOutput?(): string;
  getAllOutput?(): string;
  getBuffer?(): string;
  getCommandInput(): string;
  enterCommand(cmd: string): unknown;
  registerEvent(eventName: string, context: null, handler: (src: unknown, args: unknown) => void): void;
  unregisterEvent(eventName: string, context: null, handler: (src: unknown, args: unknown) => void): void;
  enterChar(charCode: number, modifiers: number): void;
  println?(text: string): void;
  flush?(): void;
  getConsole?(): any;
}

export interface ExecutionOptions {
  commandTimeoutMs?: number;
  stallTimeoutMs?: number;
  readyTimeoutMs?: number;
  expectedMode?: TerminalMode;
  expectedPromptPattern?: string;
  autoAdvancePager?: boolean;
  autoDismissWizard?: boolean;
  autoConfirm?: boolean;
  maxPagerAdvances?: number;
  allowEmptyOutput?: boolean;
  sendEnterFallback?: boolean;
  sessionKind?: TerminalSessionKind;
  ensurePrivileged?: boolean;
  allowPager?: boolean;
}

export interface CommandExecutionResult {
  ok: boolean;
  command: string;
  output: string;
  rawOutput: string;
  status: number | null;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  promptBefore: string;
  promptAfter: string;
  modeBefore: string;
  modeAfter: string;
  startedSeen: boolean;
  endedSeen: boolean;
  outputEvents: number;
  confidence: string;
  warnings: string[];
  events: TerminalEventRecord[];
  error?: string;
  code?: TerminalErrorCode;
}

const DEFAULT_COMMAND_TIMEOUT = 15000;
const DEFAULT_STALL_TIMEOUT = 5000;
const DEFAULT_READY_TIMEOUT = 3000;
const COMMAND_END_GRACE_MS = 900;
const COMMAND_END_MAX_WAIT_MS = 1000;
const HOST_COMMAND_END_GRACE_MS = 1500;

function detectWizardFromOutput(output: string): boolean {
  return (
    output.includes("initial configuration dialog?") ||
    output.includes("[yes/no]") ||
    output.includes("continuar con la configuración")
  );
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function terminalOutputHasPager(terminal: PTCommandLine): boolean {
  try {
    const output =
      terminal.getOutput?.() ??
      terminal.getAllOutput?.() ??
      terminal.getBuffer?.() ??
      "";

    return /--More--/i.test(String(output));
  } catch {
    return false;
  }
}

function sendPagerAdvance(
  terminal: PTCommandLine,
  events: TerminalEventRecord[],
  sessionId: string,
  deviceName: string,
  source: string,
): boolean {
  let sent = false;

  try {
    terminal.enterChar?.(32, 0);
    sent = true;
  } catch {}

  try {
    terminal.flush?.();
  } catch {}

  pushEvent(
    events,
    sessionId,
    deviceName,
    sent ? "pagerAdvance" : "pagerAdvanceFailed",
    "SPACE",
    sent ? `SPACE sent to pager from ${source}` : `Failed to send SPACE to pager from ${source}`,
  );

  setTimeout(() => {
    try {
      if (!terminalOutputHasPager(terminal)) return;

      terminal.enterCommand?.(" ");
      terminal.flush?.();

      pushEvent(
        events,
        sessionId,
        deviceName,
        "pagerAdvanceFallback",
        "SPACE",
        `Fallback SPACE command sent to pager from ${source}`,
      );
    } catch {
      pushEvent(
        events,
        sessionId,
        deviceName,
        "pagerAdvanceFallbackFailed",
        "SPACE",
        `Fallback SPACE command failed from ${source}`,
      );
    }
  }, 150);

  return sent;
}

/**
 * Ejecuta un comando en un terminal IOS o Host.
 * Función standalone que puede ser llamada directamente.
 */
export async function executeTerminalCommand(
  deviceName: string,
  command: string,
  terminal: PTCommandLine,
options: ExecutionOptions = {},
  ): Promise<CommandExecutionResult> {
    const startedAt = Date.now();
    const commandTimeoutMs = options.commandTimeoutMs ?? DEFAULT_COMMAND_TIMEOUT;
    const stallTimeoutMs = options.stallTimeoutMs ?? DEFAULT_STALL_TIMEOUT;
    const readyTimeoutMs = options.readyTimeoutMs ?? DEFAULT_READY_TIMEOUT;

    const session = ensureSession(deviceName);
    const events: TerminalEventRecord[] = [];
    const warnings: string[] = [...(session.warnings || [])];
    const sessionKind = options.sessionKind ?? session.sessionKind ?? "ios";

  const promptBefore = getPromptSafe(terminal);
  const modeBefore = getModeSafe(terminal);

  try {
    // @ts-ignore ipc es global inyectado por PT kernel
    const net = (typeof ipc !== "undefined") ? (ipc as any).network?.() : null;
    if (net) {
      const dev = net.getDevice?.(deviceName);
      if (dev && typeof dev.getPower === "function" && !dev.getPower()) {
        return {
          ok: false, command, output: "", rawOutput: "", status: 1,
          startedAt, endedAt: Date.now(), durationMs: 0,
          promptBefore, promptAfter: promptBefore,
          modeBefore, modeAfter: modeBefore,
          startedSeen: false, endedSeen: false, outputEvents: 0,
          confidence: "failure", warnings: ["Device is powered off"],
          events,
          error: "Device is powered off", code: TerminalErrors.SESSION_BROKEN,
        };
      }
    }
  } catch (e) {}

  if (session.health === "broken") {
    return {
      ok: false, command, output: "", rawOutput: "", status: 1,
      startedAt, endedAt: Date.now(), durationMs: 0,
      promptBefore, promptAfter: promptBefore,
      modeBefore, modeAfter: modeBefore,
      startedSeen: false, endedSeen: false, outputEvents: 0,
      confidence: "failure", warnings: [...session.warnings],
      events,
      error: "Session is broken", code: TerminalErrors.SESSION_BROKEN,
    };
  }

  const readyResult = ensureTerminalReadySync(terminal, sessionKind, {
    maxRetries: 3,
    wakeUpOnFail: options.sendEnterFallback ?? true,
    ensurePrivileged: options.ensurePrivileged ?? false,
  });

if (!readyResult.ready) {
    warnings.push("Terminal not ready after retries: " + readyResult.prompt);
  }

  const baselineSnapshot = readTerminalSnapshot(terminal);
  const baselineOutput = baselineSnapshot.raw;

  const pagerHandler = createPagerHandler({
    maxAdvances: options.maxPagerAdvances ?? 50,
  });

  const confirmHandler = createConfirmHandler({
    autoConfirm: options.autoConfirm ?? true,
  });

  return new Promise((resolve) => {
    let settled = false;
    let startedSeen = false;
    let commandEndedSeen = false;
    let commandEndSeenAt: number | null = null;
    let endedStatus: number | null = null;
    let wizardDismissed = false;
    let hostBusy = false;
    let outputBuffer = "";
    let outputEventsCount = 0;
    let lastTerminalSnapshot = baselineSnapshot;
    let promptFirstSeenAt: number | null = null;

    let commandEndGraceTimer: any = null;
    let stallTimer: any = null;
    let globalTimeoutTimer: any = null;
    let startTimer: any = null;
    let outputPollTimer: any = null;

    let lastOutputAt = Date.now();
    let previousPrompt = promptBefore;
    let promptStableSince: number | null = null;
    let lastPagerAdvanceAt = 0;

    function canAdvancePagerNow(): boolean {
      const now = Date.now();
      if (now - lastPagerAdvanceAt < 120) {
        return false;
      }
      lastPagerAdvanceAt = now;
      return true;
    }

    function clearTimers(): void {
      if (commandEndGraceTimer) clearTimeout(commandEndGraceTimer);
      if (stallTimer) clearTimeout(stallTimer);
      if (globalTimeoutTimer) clearTimeout(globalTimeoutTimer);
      if (startTimer) clearTimeout(startTimer);
      if (outputPollTimer) clearInterval(outputPollTimer);
    }

    function resetStallTimer(): void {
      if (stallTimer) clearTimeout(stallTimer);
      stallTimer = setTimeout(() => {
        if (settled) return;

        const currentPrompt = getPromptSafe(terminal);
        const { finished } = checkIsCommandFinished(currentPrompt, session, true);

        if (finished) {
          scheduleFinalizeAfterCommandEnd();
        } else {
          finalizeFailure(TerminalErrors.COMMAND_END_TIMEOUT, "Command stalled before completion");
        }
      }, stallTimeoutMs);
    }

    function cleanup(): void {
      try {
        terminal.unregisterEvent?.("commandStarted", null, onStarted);
        terminal.unregisterEvent?.("outputWritten", null, onOutput);
        terminal.unregisterEvent?.("commandEnded", null, onEnded);
        terminal.unregisterEvent?.("promptChanged", null, onPromptChanged);
        terminal.unregisterEvent?.("moreDisplayed", null, onMoreDisplayed);
      } catch {}
    }

    function finalize(cmdOk: boolean, status: number | null, error?: string, code?: TerminalErrorCode): void {
      if (settled) return;
      settled = true;
      clearTimers();
      cleanup();

      const endedAt = Date.now();
      const promptAfter = getPromptSafe(terminal);
      const modeAfter = getModeSafe(terminal);

      const snapshotAfter = readTerminalSnapshot(terminal);
      const { delta: snapshotDelta, matched } = diffSnapshotStrict(baselineOutput, snapshotAfter.raw);

      const extractResult = extractCommandOutput({
        command,
        sessionKind: sessionKind === "unknown" ? "ios" : sessionKind,
        promptBefore,
        promptAfter,
        eventOutput: outputBuffer,
        snapshotDelta: snapshotDelta,
        snapshotAfter: snapshotAfter,
        commandEndedSeen: commandEndedSeen,
        outputEventsCount: outputEventsCount,
      });

      let finalOutput = extractResult.output;
      let finalRaw = extractResult.raw;

      if (sessionKind === "host" && detectHostBusy(finalOutput)) {
        hostBusy = true;
      }

      const promptMatched = !options.expectedPromptPattern || promptAfter.includes(options.expectedPromptPattern);
      const modeMatched = !options.expectedMode || modeAfter === options.expectedMode;

      let finalError = error;
      let finalCode = code;

      if (cmdOk && !modeMatched) {
        finalError = `Expected mode "${options.expectedMode}" not reached; got "${modeAfter}" at prompt "${promptAfter}".`;
        finalCode = TerminalErrors.PROMPT_MISMATCH;
      }

      if (cmdOk && !promptMatched) {
        finalError = `Expected prompt "${options.expectedPromptPattern}" not reached; got "${promptAfter}".`;
        finalCode = TerminalErrors.PROMPT_MISMATCH;
      }

      const finalWarnings = [...warnings, ...extractResult.warnings];

      const semantic = sessionKind === "host"
        ? verifyHostOutput(finalOutput)
        : verifyIosOutput(finalOutput);

      if (!semantic.ok) {
        cmdOk = false;
        status = semantic.status;
        finalError = semantic.message || finalError;
        finalCode = (semantic.code as TerminalErrorCode) || finalCode;
        finalWarnings.push(...semantic.warnings);
      } else if (!cmdOk && status === null) {
        status = guessFailureStatus(finalOutput);
      }
      if (!promptMatched) finalWarnings.push(`Expected prompt "${options.expectedPromptPattern}" not reached.`);
      if (!modeMatched) finalWarnings.push(`Expected mode "${options.expectedMode}" not reached.`);
      if (wizardDismissed) finalWarnings.push("Initial configuration dialog was auto-dismissed");
      if (hostBusy) finalWarnings.push("Host command produced long-running output");

      if (sessionKind !== "ios" && sessionKind !== "unknown") {
        const hasPager = /--More--/i.test(finalOutput) || /--More--/i.test(outputBuffer);
        if (hasPager) {
          finalWarnings.push("Output truncated (pager detected, auto-advance disabled)");
        }
      }

      const isOnlyPromptResult = isOnlyPrompt(finalOutput, promptAfter);
      const emptyWithoutEnded = !finalOutput.trim() && !commandEndedSeen;
      if (!options.allowEmptyOutput && (isOnlyPromptResult || emptyWithoutEnded)) {
        cmdOk = false;
        if (!finalWarnings.includes("No output received")) {
          finalWarnings.push("No output received");
        }
      }

      const confidence = computeConfidenceString(
        cmdOk, finalWarnings, finalOutput, modeMatched, promptMatched,
        startedSeen, commandEndedSeen, outputEventsCount
      );

      session.lastActivityAt = endedAt;
      session.lastCommandEndedAt = endedAt;
      session.pendingCommand = null;
      session.lastPrompt = promptAfter;
      session.lastMode = modeAfter as TerminalMode;
      session.outputBuffer = finalOutput;
      session.pagerActive = false;
      session.confirmPromptActive = false;

      session.history.push({ command, output: finalOutput, timestamp: endedAt });
      if (session.history.length > 100) session.history.splice(0, 20);

      if (!cmdOk) session.health = "desynced";

      resolve({
        ok: cmdOk && promptMatched && modeMatched,
        command,
        output: finalOutput,
        rawOutput: finalRaw,
        status,
        startedAt,
        endedAt,
        durationMs: endedAt - startedAt,
        promptBefore,
        promptAfter,
        modeBefore,
        modeAfter,
        startedSeen,
        endedSeen: commandEndedSeen,
        outputEvents: outputEventsCount,
        confidence,
        warnings: finalWarnings,
        events: compactTerminalEvents(events),
        error: finalError,
        code: finalCode,
      });
    }

    function finalizeFailure(code: TerminalErrorCode, message: string): void {
      const recoverable =
        code === TerminalErrors.COMMAND_START_TIMEOUT ||
        code === TerminalErrors.COMMAND_END_TIMEOUT ||
        code === TerminalErrors.PROMPT_MISMATCH ||
        code === TerminalErrors.MODE_MISMATCH ||
        message.includes("No output received");

      if (recoverable && terminal) {
        try {
          const recovery = recoverTerminalSync(terminal, sessionKind === "host" ? "host" : "ios");
          warnings.push(
            `Recovery attempted: ${recovery.actions.join(", ")}; prompt=${recovery.prompt}; mode=${recovery.mode}`,
          );
        } catch {}
      }

      finalize(false, 1, message, code);
    }

    function scheduleFinalizeAfterCommandEnd(): void {
      if (settled) return;

      if (commandEndedSeen && commandEndSeenAt) {
        const waitedAfterEnd = Date.now() - commandEndSeenAt;

        if (waitedAfterEnd >= COMMAND_END_MAX_WAIT_MS) {
          finalize(true, endedStatus, "command-ended-max-wait");
          return;
        }
      }

      const currentPrompt = getPromptSafe(terminal);

      const verdict = checkCommandCompletion({
        currentPrompt: currentPrompt,
        previousPrompt: previousPrompt,
        commandEndedSeen: commandEndedSeen,
        lastOutputAt: lastOutputAt,
        now: Date.now(),
        promptStableSince: promptStableSince,
        sessionKind: sessionKind,
        pagerActive: session.pagerActive,
        confirmPromptActive: session.confirmPromptActive,
        expectedMode: options.expectedMode,
        currentMode: getModeSafe(terminal) as TerminalMode,
      });

      if (verdict.finished) {
        finalize(true, endedStatus, verdict.reason);
        return;
      }

      if (commandEndGraceTimer) clearTimeout(commandEndGraceTimer);
      commandEndGraceTimer = setTimeout(() => {
        commandEndGraceTimer = null;
        scheduleFinalizeAfterCommandEnd();
      }, sessionKind === "host" ? 800 : 250);
    }

    function onOutput(_src: unknown, args: unknown): void {
      const payload = args as any;
      const chunk = String(payload?.newOutput ?? payload?.data ?? payload?.output ?? payload?.chunk ?? "");
      if (!chunk) return;

      outputEventsCount++;
      outputBuffer += chunk;
      lastOutputAt = Date.now();

      const currentRaw = readTerminalSnapshot(terminal);
      if (currentRaw.raw.length >= lastTerminalSnapshot.raw.length) {
        lastTerminalSnapshot = currentRaw;
      }

      pushEvent(events, session.sessionId, deviceName, "outputWritten", chunk, chunk.trim());

      if (detectDnsHangup(chunk)) {
        try {
          terminal.enterChar(3, 0);
          warnings.push("DNS Hangup detected (Translating...). Breaking with Ctrl+C");
          pushEvent(events, session.sessionId, deviceName, "dnsBreak", "Ctrl+C", "Ctrl+C");
        } catch (e) {}
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
            if (lower.indexOf("[yes/no]") !== -1 || lower.indexOf("(y/n)") !== -1) {
              terminal.enterCommand("y");
            } else {
              terminal.enterChar(13, 0);
            }
            confirmHandler.confirm();
            resetStallTimer();
          } catch {}
        }
      }

      if (detectAuthPrompt(chunk)) {
        warnings.push("Authentication required");
        if (commandEndGraceTimer) clearTimeout(commandEndGraceTimer);
        commandEndGraceTimer = setTimeout(() => {
          if (!settled) finalize(true, 0);
        }, COMMAND_END_GRACE_MS);
        return;
      }

      if (detectPager(chunk)) {
        session.pagerActive = true;
        pagerHandler.handleOutput(chunk);

        if (pagerHandler.isLoop()) {
          finalizeFailure(
            TerminalErrors.COMMAND_END_TIMEOUT,
            `Pager advance limit reached (${options.maxPagerAdvances ?? 50})`,
          );
          return;
        }

        if (sessionKind !== "ios" && sessionKind !== "unknown") {
          const hasPager = /--More--/i.test(chunk);
          if (hasPager) {
            finalize(true, endedStatus, "Pager detected in non-IOS session");
            return;
          }
        }

        if (
          options.autoAdvancePager !== false &&
          pagerHandler.canContinue() &&
          canAdvancePagerNow()
        ) {
          pagerHandler.advance();

          const sent = sendPagerAdvance(
            terminal,
            events,
            session.sessionId,
            deviceName,
            "outputWritten",
          );

          if (!sent) {
            finalizeFailure(
              TerminalErrors.COMMAND_END_TIMEOUT,
              "Pager detected but auto-advance failed",
            );
            return;
          }

          session.pagerActive = false;
          resetStallTimer();
        }
      }

      resetStallTimer();
      scheduleFinalizeAfterCommandEnd();
    }

    function onStarted(): void {
      startedSeen = true;
      if (startTimer) { clearTimeout(startTimer); startTimer = null; }
      session.lastActivityAt = Date.now();
      resetStallTimer();
      pushEvent(events, session.sessionId, deviceName, "commandStarted", command, command);
    }

    function onEnded(_src: unknown, args: unknown): void {
      const payload = args as CommandEndedPayload;
      commandEndedSeen = true;
      commandEndSeenAt = Date.now();
      endedStatus = payload.status ?? 0;
      resetStallTimer();
      pushEvent(events, session.sessionId, deviceName, "commandEnded", String(endedStatus), String(endedStatus));
      scheduleFinalizeAfterCommandEnd();
    }

    function onPromptChanged(_src: unknown, args: unknown): void {
      const p = String((args as any).prompt || "");
      previousPrompt = session.lastPrompt || previousPrompt;
      session.lastPrompt = normalizePrompt(p);
      const mode = detectModeFromPrompt(session.lastPrompt);
      session.lastMode = mode;
      if (isHostMode(mode)) session.sessionKind = "host";
      promptStableSince = Date.now();
      resetStallTimer();
      scheduleFinalizeAfterCommandEnd();
    }

    function onMoreDisplayed(_src: unknown, args: unknown): void {
      session.pagerActive = true;
      pagerHandler.handleOutput("--More--");

      if (pagerHandler.isLoop()) {
        finalizeFailure(
          TerminalErrors.COMMAND_END_TIMEOUT,
          `Pager advance limit reached (${options.maxPagerAdvances ?? 50})`,
        );
        return;
      }

      pushEvent(
        events,
        session.sessionId,
        deviceName,
        "moreDisplayed",
        "--More--",
        "--More--",
      );

      if (
        options.autoAdvancePager !== false &&
        pagerHandler.canContinue() &&
        canAdvancePagerNow()
      ) {
        pagerHandler.advance();

        const sent = sendPagerAdvance(
          terminal,
          events,
          session.sessionId,
          deviceName,
          "moreDisplayed",
        );

        if (!sent) {
          finalizeFailure(
            TerminalErrors.COMMAND_END_TIMEOUT,
            "Pager displayed but auto-advance failed",
          );
          return;
        }

        session.pagerActive = false;
        resetStallTimer();
      }
    }

    try {
      terminal.registerEvent?.("commandStarted", null, onStarted);
      terminal.registerEvent?.("outputWritten", null, onOutput);
      terminal.registerEvent?.("commandEnded", null, onEnded);
      terminal.registerEvent?.("promptChanged", null, onPromptChanged);
      terminal.registerEvent?.("moreDisplayed", null, onMoreDisplayed);
    } catch {}

    // registerObjectEvent fue removido - causaba errores en PT 9.0
    // El polling fallback en setInterval captura output si eventos fallan

    outputPollTimer = setInterval(function() {
      if (settled) return;
      const currentRaw = readTerminalSnapshot(terminal);
      if (currentRaw.raw.length > lastTerminalSnapshot.raw.length) {
        const delta = currentRaw.raw.substring(lastTerminalSnapshot.raw.length);
        lastTerminalSnapshot = currentRaw;
        onOutput(null, { chunk: delta, newOutput: delta });
      }
    }, 250);

    globalTimeoutTimer = setTimeout(() => {
      if (settled) return;
      finalizeFailure(TerminalErrors.COMMAND_END_TIMEOUT, `Global timeout reached (${commandTimeoutMs}ms)`);
    }, commandTimeoutMs);

    startTimer = setTimeout(() => {
      if (!startedSeen && !settled) {
        const currentPrompt = getPromptSafe(terminal);
        if (currentPrompt) {
          startedSeen = true;
          scheduleFinalizeAfterCommandEnd();
        } else {
          finalizeFailure(TerminalErrors.COMMAND_START_TIMEOUT, "Command did not start");
        }
      }
    }, 2000);

    try {
      if (sessionKind === "ios") {
        try { terminal.enterChar(13, 0); } catch (e) {}
      }

      terminal.enterCommand(command);

      sleep(100).then(() => {
        if (!settled && startedSeen) {
          scheduleFinalizeAfterCommandEnd();
        }
      });
    } catch (e) {
      finalizeFailure(TerminalErrors.UNKNOWN_STATE, "Failed to send command: " + String(e));
    }
  });
}

/**
 * Crea una instancia del motor de ejecución de comandos.
 */
export function createCommandExecutor(config: { commandTimeoutMs?: number; stallTimeoutMs?: number } = {}) {
  const defaultCommandTimeout = config.commandTimeoutMs ?? DEFAULT_COMMAND_TIMEOUT;
  const defaultStallTimeout = config.stallTimeoutMs ?? DEFAULT_STALL_TIMEOUT;

  async function executeCommand(
    deviceName: string,
    command: string,
    terminal: PTCommandLine,
    options: ExecutionOptions = {},
  ): Promise<CommandExecutionResult> {
    const execOptions = {
      ...options,
      commandTimeoutMs: options.commandTimeoutMs ?? defaultCommandTimeout,
      stallTimeoutMs: options.stallTimeoutMs ?? defaultStallTimeout,
    };
    
    return executeTerminalCommand(
      deviceName,
      command,
      terminal,
      execOptions,
    );
  }

  return { executeCommand };
}