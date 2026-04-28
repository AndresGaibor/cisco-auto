// ============================================================================
// Command State Machine - Máquina de estados para ejecución de comandos
// ============================================================================
// Extraído de command-executor.ts (líneas 266-787) como clase testeable.
// No realiza llamadas directas a la PT API - recibe las dependencias via config.

import type { TerminalMode, TerminalSessionKind } from "../session-state";
import type { TerminalEventRecord } from "../../pt/terminal/terminal-events";
import type { TerminalErrorCode } from "../terminal-errors";
import type { CommandEndedPayload } from "../../pt/terminal/terminal-events";

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
} from "../prompt-detector";
import { createPagerHandler } from "../pager-handler";
import { createConfirmHandler } from "../confirm-handler";
import { verifyIosOutput, verifyHostOutput } from "../terminal-semantic-verifier";
import { recoverTerminalSync } from "../terminal-recovery";
import {
  getPromptSafe,
  getModeSafe,
  ensureTerminalReadySync,
} from "../terminal-ready";
import { extractCommandOutput } from "../command-output-extractor";
import {
  pushEvent,
  compactTerminalEvents,
  buildFinalOutput,
  resolveTerminalError,
  guessFailureStatus,
  isOnlyPrompt,
  computeConfidenceString,
  shouldFinalizeCommand,
} from "./index.js";
import { detectWizardFromOutput, sleep, terminalOutputHasPager } from "../terminal-utils";
import { TerminalErrors } from "../terminal-errors";
import type { PTCommandLine, ExecutionOptions, CommandExecutionResult } from "../command-executor";
import type { TerminalSessionState } from "../session-state";
import type { CommandSessionKind } from "../command-output-extractor";

export { COMMAND_END_GRACE_MS, COMMAND_END_MAX_WAIT_MS, HOST_COMMAND_END_GRACE_MS } from "./terminal-completion-controller";

const DEFAULT_COMMAND_TIMEOUT = 15000;
const DEFAULT_STALL_TIMEOUT = 5000;
const DEFAULT_READY_TIMEOUT = 3000;

export interface CommandStateMachineConfig {
  deviceName: string;
  command: string;
  terminal: PTCommandLine;
  options: ExecutionOptions;
  session: TerminalSessionState;
  events: TerminalEventRecord[];
  warnings: string[];
  sessionKind: TerminalSessionKind;
  promptBefore: string;
  modeBefore: string;
  baselineSnapshot: { raw: string; source: string };
  baselineOutput: string;
  // Dependencies - allows testing without real PT API
  now?: () => number;
  setTimeout?: typeof setTimeout;
  clearTimeout?: typeof clearTimeout;
  setInterval?: typeof setInterval;
  clearInterval?: typeof clearInterval;
  readTerminalSnapshotFn?: typeof readTerminalSnapshot;
  getPromptSafeFn?: typeof getPromptSafe;
  getModeSafeFn?: typeof getModeSafe;
  recoverTerminalSyncFn?: typeof recoverTerminalSync;
  sendPagerAdvanceFn?: (terminal: PTCommandLine, events: TerminalEventRecord[], sessionId: string, deviceName: string, source: string) => boolean;
}

export interface SendPagerAdvanceFn {
  (terminal: PTCommandLine, events: TerminalEventRecord[], sessionId: string, deviceName: string, source: string): boolean;
}

function defaultSendPagerAdvance(
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
 * CommandStateMachine - Clase que gestiona el ciclo de vida de un comando terminal.
 *
 * Maneja:
 * - Envío del comando
 * - Eventos de output, fin de comando, cambio de prompt, pager
 * - Timeouts (stall, global, start)
 * - Finalización del comando
 *
 * No realiza llamadas directas a PT API - todas las interacciones van via terminal
 * pasado en el constructor, lo que permite testing con mocks.
 */
export class CommandStateMachine {
  private readonly config: Required<CommandStateMachineConfig>;
  private readonly sendPagerAdvance: SendPagerAdvanceFn;

  // State
  private settled = false;
  private startedSeen = false;
  private commandEndedSeen = false;
  private commandEndSeenAt: number | null = null;
  private endedStatus: number | null = null;
  private wizardDismissed = false;
  private hostBusy = false;
  private outputBuffer = "";
  private outputEventsCount = 0;
  private lastTerminalSnapshot: { raw: string; source: string };
  private promptFirstSeenAt: number | null = null;
  private finalizedOk = true;
  private finalizedError: string | undefined;
  private finalizedCode: TerminalErrorCode | undefined;

  // Timers
  private commandEndGraceTimer: ReturnType<typeof setTimeout> | null = null;
  private stallTimer: ReturnType<typeof setTimeout> | null = null;
  private globalTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private startTimer: ReturnType<typeof setTimeout> | null = null;
  private outputPollTimer: ReturnType<typeof setInterval> | null = null;

  // Time tracking
  private readonly startedAt: number;
  private lastOutputAt: number;
  private previousPrompt: string;
  private promptStableSince: number | null = null;
  private lastPagerAdvanceAt = 0;

  // Handlers
  private readonly pagerHandler;
  private readonly confirmHandler;

  // Callbacks bound for unregistering
  private readonly onOutputHandler: (src: unknown, args: unknown) => void;
  private readonly onStartedHandler: () => void;
  private readonly onEndedHandler: (src: unknown, args: unknown) => void;
  private readonly onPromptChangedHandler: (src: unknown, args: unknown) => void;
  private readonly onMoreDisplayedHandler: (src: unknown, args: unknown) => void;

  constructor(config: CommandStateMachineConfig) {
    this.config = {
      now: function() { return Date.now(); },
      setTimeout: setTimeout,
      clearTimeout: clearTimeout,
      setInterval: setInterval,
      clearInterval: clearInterval,
      readTerminalSnapshotFn: readTerminalSnapshot,
      getPromptSafeFn: getPromptSafe,
      getModeSafeFn: getModeSafe,
      recoverTerminalSyncFn: recoverTerminalSync,
      sendPagerAdvanceFn: defaultSendPagerAdvance,
      ...config,
    };

    this.sendPagerAdvance = this.config.sendPagerAdvanceFn;

    this.startedAt = this.config.now();
    this.lastOutputAt = this.config.now();
    this.previousPrompt = this.config.promptBefore;
    this.lastTerminalSnapshot = this.config.baselineSnapshot;

    this.pagerHandler = createPagerHandler({
      maxAdvances: this.config.options.maxPagerAdvances ?? 50,
    });

    this.confirmHandler = createConfirmHandler({
      autoConfirm: this.config.options.autoConfirm ?? true,
    });

    // Bind handlers once to avoid issues with unregistration
    this.onOutputHandler = this.onOutput.bind(this);
    this.onStartedHandler = this.onStarted.bind(this);
    this.onEndedHandler = this.onEnded.bind(this);
    this.onPromptChangedHandler = this.onPromptChanged.bind(this);
    this.onMoreDisplayedHandler = this.onMoreDisplayed.bind(this);
  }

  /**
   * Ejecuta el comando y retorna el resultado.
   */
  async run(): Promise<CommandExecutionResult> {
    const { terminal, session, sessionKind, options } = this.config;
    const commandTimeoutMs = options.commandTimeoutMs ?? DEFAULT_COMMAND_TIMEOUT;
    const stallTimeoutMs = options.stallTimeoutMs ?? DEFAULT_STALL_TIMEOUT;

    // Ensure terminal ready
    const readyResult = ensureTerminalReadySync(terminal, sessionKind, {
      maxRetries: 3,
      wakeUpOnFail: options.sendEnterFallback ?? true,
      ensurePrivileged: options.ensurePrivileged ?? false,
    });

    if (!readyResult.ready) {
      this.config.warnings.push("Terminal not ready after retries: " + readyResult.prompt);
    }

    this.setupHandlers();

    // Start output polling fallback
    this.startOutputPolling();

    // Set global timeout
    this.globalTimeoutTimer = this.config.setTimeout(() => {
      if (this.settled) return;
      this.finalizeFailure(TerminalErrors.COMMAND_END_TIMEOUT, `Global timeout reached (${commandTimeoutMs}ms)`);
    }, commandTimeoutMs);

    // Set start detection timeout
    this.startTimer = this.config.setTimeout(() => {
      if (!this.startedSeen && !this.settled) {
        const currentPrompt = this.config.getPromptSafeFn(this.config.terminal);
        if (currentPrompt) {
          this.startedSeen = true;
          this.scheduleFinalizeAfterCommandEnd();
        } else {
          this.finalizeFailure(TerminalErrors.COMMAND_START_TIMEOUT, "Command did not start");
        }
      }
    }, 2000);

    // Send the command
    try {
      if (sessionKind === "ios") {
        try { terminal.enterChar(13, 0); } catch (e) {}
      }

      terminal.enterCommand(this.config.command);

      sleep(100).then(() => {
        if (!this.settled && this.startedSeen) {
          this.scheduleFinalizeAfterCommandEnd();
        }
      });
    } catch (e) {
      this.finalizeFailure(TerminalErrors.UNKNOWN_STATE, "Failed to send command: " + String(e));
    }

    // Return promise that resolves when settled
    return new Promise((resolve) => {
      const checkSettled = () => {
        if (this.settled) {
          resolve(this.buildResult());
        } else {
          this.config.setTimeout!(checkSettled, 50);
        }
      };
      checkSettled();
    });
  }

  /**
   * Build the final result object.
   * Called after settled=true.
   */
  private buildResult(): CommandExecutionResult {
    const { session, sessionKind, options } = this.config;
    const endedAt = this.config.now();
    const promptAfter = this.config.getPromptSafeFn(this.config.terminal);
    const modeAfter = this.config.getModeSafeFn(this.config.terminal);

    const snapshotAfter = this.config.readTerminalSnapshotFn!(this.config.terminal);
    const { delta: snapshotDelta } = diffSnapshotStrict(this.config.baselineOutput, snapshotAfter.raw);

    const extractResult = extractCommandOutput({
      command: this.config.command,
      sessionKind: sessionKind === "unknown" ? "ios" : sessionKind,
      promptBefore: this.config.promptBefore,
      promptAfter,
      eventOutput: this.outputBuffer,
      snapshotDelta: snapshotDelta,
      snapshotAfter: snapshotAfter,
      commandEndedSeen: this.commandEndedSeen,
      outputEventsCount: this.outputEventsCount,
    });

    let finalOutput = extractResult.output;
    let finalRaw = extractResult.raw;

    if (sessionKind === "host" && detectHostBusy(finalOutput)) {
      this.hostBusy = true;
    }

    const promptMatched = !options.expectedPromptPattern || promptAfter.includes(options.expectedPromptPattern);
    const modeMatched = !options.expectedMode || modeAfter === options.expectedMode;

    let finalError: string | undefined = this.finalizedError;
    let finalCode: TerminalErrorCode | undefined = this.finalizedCode;

    const semantic = sessionKind === "host"
      ? verifyHostOutput(finalOutput)
      : verifyIosOutput(finalOutput);

    let cmdOk = this.finalizedOk && (this.endedStatus === null ? true : this.endedStatus === 0);

    if (!semantic.ok) {
      cmdOk = false;
      this.endedStatus = semantic.status;
      finalError = semantic.message || finalError;
      finalCode = (semantic.code as TerminalErrorCode) || finalCode;
      this.config.warnings.push(...semantic.warnings);
    } else if (!cmdOk && this.endedStatus === null) {
      this.endedStatus = guessFailureStatus(finalOutput);
    }

    if (sessionKind !== "ios" && sessionKind !== "unknown") {
      const hasPager = /--More--/i.test(finalOutput) || /--More--/i.test(this.outputBuffer);
      if (hasPager) {
        this.config.warnings.push("Output truncated (pager detected, auto-advance disabled)");
      }
    }

    const isOnlyPromptResult = isOnlyPrompt(finalOutput, promptAfter);
    const emptyWithoutEnded = !finalOutput.trim() && !this.commandEndedSeen;
    if (!options.allowEmptyOutput && (isOnlyPromptResult || emptyWithoutEnded)) {
      cmdOk = false;
      if (!this.config.warnings.includes("No output received")) {
        this.config.warnings.push("No output received");
      }
    }

    const confidence = computeConfidenceString(
      cmdOk,
      this.config.warnings,
      finalOutput,
      modeMatched,
      promptMatched,
      this.startedSeen,
      this.commandEndedSeen,
      this.outputEventsCount
    );

    session.lastActivityAt = endedAt;
    session.lastCommandEndedAt = endedAt;
    session.pendingCommand = null;
    session.lastPrompt = promptAfter;
    session.lastMode = modeAfter as TerminalMode;
    session.outputBuffer = finalOutput;
    session.pagerActive = false;
    session.confirmPromptActive = false;

    session.history.push({ command: this.config.command, output: finalOutput, timestamp: endedAt });
    if (session.history.length > 100) session.history.splice(0, 20);

    if (!cmdOk) session.health = "desynced";

    return {
      ok: cmdOk && promptMatched && modeMatched,
      command: this.config.command,
      output: finalOutput,
      rawOutput: finalRaw,
      status: this.endedStatus,
      startedAt: this.startedAt,
      endedAt,
      durationMs: Math.max(0, endedAt - this.startedAt),
      promptBefore: this.config.promptBefore,
      promptAfter,
      modeBefore: this.config.modeBefore,
      modeAfter,
      startedSeen: this.startedSeen,
      endedSeen: this.commandEndedSeen,
      outputEvents: this.outputEventsCount,
      confidence,
      warnings: [...this.config.warnings, ...extractResult.warnings],
      events: compactTerminalEvents(this.config.events),
      error: finalError,
      code: finalCode,
    };
  }

  private setupHandlers(): void {
    const { terminal } = this.config;

    try {
      terminal.registerEvent?.("commandStarted", null, this.onStartedHandler);
      terminal.registerEvent?.("outputWritten", null, this.onOutputHandler);
      terminal.registerEvent?.("commandEnded", null, this.onEndedHandler);
      terminal.registerEvent?.("promptChanged", null, this.onPromptChangedHandler);
      terminal.registerEvent?.("moreDisplayed", null, this.onMoreDisplayedHandler);
    } catch {}
  }

  private cleanup(): void {
    const { terminal } = this.config;

    try {
      terminal.unregisterEvent?.("commandStarted", null, this.onStartedHandler);
      terminal.unregisterEvent?.("outputWritten", null, this.onOutputHandler);
      terminal.unregisterEvent?.("commandEnded", null, this.onEndedHandler);
      terminal.unregisterEvent?.("promptChanged", null, this.onPromptChangedHandler);
      terminal.unregisterEvent?.("moreDisplayed", null, this.onMoreDisplayedHandler);
    } catch {}
  }

  private startOutputPolling(): void {
    const poll = (): void => {
      if (this.settled) return;
      const currentRaw = this.config.readTerminalSnapshotFn!(this.config.terminal);

      // Handle buffer reset/rotation
      if (currentRaw.raw.length < this.lastTerminalSnapshot.raw.length) {
        this.lastTerminalSnapshot = { raw: "", source: "reset" };
      }

      if (currentRaw.raw.length > this.lastTerminalSnapshot.raw.length) {
        const delta = currentRaw.raw.substring(this.lastTerminalSnapshot.raw.length);
        this.lastTerminalSnapshot = currentRaw;
        this.onOutput(null, { chunk: delta, newOutput: delta });
      }
    };

    poll();
    this.outputPollTimer = this.config.setInterval!(poll, 250) as unknown as ReturnType<typeof setInterval>;
  }

  private clearTimers(): void {
    if (this.commandEndGraceTimer) this.config.clearTimeout!(this.commandEndGraceTimer);
    if (this.stallTimer) this.config.clearTimeout!(this.stallTimer);
    if (this.globalTimeoutTimer) this.config.clearTimeout!(this.globalTimeoutTimer);
    if (this.startTimer) this.config.clearTimeout!(this.startTimer);
    if (this.outputPollTimer) {
      if (this.config.clearInterval) {
        this.config.clearInterval(this.outputPollTimer);
      } else {
        this.config.clearTimeout!(this.outputPollTimer as unknown as ReturnType<typeof setTimeout>);
      }
      this.outputPollTimer = null;
    }
  }

  private canAdvancePagerNow(): boolean {
    const now = this.config.now();
    if (now - this.lastPagerAdvanceAt < 120) {
      return false;
    }
    this.lastPagerAdvanceAt = now;
    return true;
  }

  private resetStallTimer(): void {
    if (this.stallTimer) this.config.clearTimeout!(this.stallTimer);

    const stallTimeoutMs = this.config.options.stallTimeoutMs ?? DEFAULT_STALL_TIMEOUT;

    this.stallTimer = this.config.setTimeout!(() => {
      if (this.settled) return;

      const currentPrompt = this.config.getPromptSafeFn(this.config.terminal);
      const currentMode = this.config.getModeSafeFn(this.config.terminal) as TerminalMode;
      const now = this.config.now();

      if (currentPrompt !== this.previousPrompt) {
        this.previousPrompt = currentPrompt;
        this.promptStableSince = now;
      }

      const verdict = shouldFinalizeCommand({
        state: {
          startedSeen: this.startedSeen,
          commandEndedSeen: this.commandEndedSeen,
          commandEndSeenAt: this.commandEndSeenAt,
          lastOutputAt: this.lastOutputAt,
          promptStableSince: this.promptStableSince,
          previousPrompt: this.previousPrompt,
        },
        currentPrompt,
        currentMode,
        expectedMode: this.config.options.expectedMode,
        sessionKind: this.config.sessionKind,
        pagerActive: this.config.session.pagerActive,
        confirmPromptActive: this.config.session.confirmPromptActive,
      });

      if (verdict.finished) {
        this.finalize(true, this.endedStatus, verdict.reason);
        return;
      }

      this.finalizeFailure(
        TerminalErrors.COMMAND_END_TIMEOUT,
        "Command stalled before completion",
      );
    }, stallTimeoutMs);
  }

  private onOutput(_src: unknown, args: unknown): void {
    const payload = args as any;
    const chunk = String(payload?.newOutput ?? payload?.data ?? payload?.output ?? payload?.chunk ?? "");
    if (!chunk) return;

    this.outputEventsCount++;
    this.outputBuffer += chunk;
    this.lastOutputAt = this.config.now();

    const currentRaw = this.config.readTerminalSnapshotFn!(this.config.terminal);
    if (currentRaw.raw.length >= this.lastTerminalSnapshot.raw.length) {
      this.lastTerminalSnapshot = currentRaw;
    }

    pushEvent(this.config.events, this.config.session.sessionId, this.config.deviceName, "outputWritten", chunk, chunk.trim());

    if (detectDnsLookup(chunk)) {
      try {
        this.config.terminal.enterChar(3, 0);
        this.config.warnings.push("DNS Hangup detected (Translating...). Breaking with Ctrl+C");
        pushEvent(this.config.events, this.config.session.sessionId, this.config.deviceName, "dnsBreak", "Ctrl+C", "Ctrl+C");
      } catch (e) {}
    }

    if (detectWizardFromOutput(chunk)) {
      this.config.session.wizardDetected = true;
      if (this.config.options.autoDismissWizard !== false && !this.wizardDismissed) {
        this.wizardDismissed = true;
        try { this.config.terminal.enterCommand("no"); this.resetStallTimer(); } catch {}
      }
    }

    if (detectConfirmPrompt(chunk)) {
      this.config.session.confirmPromptActive = true;
      this.confirmHandler.handleOutput(chunk);
      if (this.config.options.autoConfirm && this.confirmHandler.shouldAutoConfirm()) {
        try {
          const lower = chunk.toLowerCase();
          if (lower.indexOf("[yes/no]") !== -1 || lower.indexOf("(y/n)") !== -1) {
            this.config.terminal.enterCommand("y");
          } else {
            this.config.terminal.enterChar(13, 0);
          }
          this.confirmHandler.confirm();
          this.resetStallTimer();
        } catch {}
      }
    }

    if (detectAuthPrompt(chunk)) {
      this.config.warnings.push("Authentication required");
      if (this.commandEndGraceTimer) this.config.clearTimeout!(this.commandEndGraceTimer);
      this.commandEndGraceTimer = this.config.setTimeout!(() => {
        if (!this.settled) this.finalize(true, 0);
      }, 900);
      return;
    }

    if (detectPager(chunk)) {
      this.config.session.pagerActive = true;
      this.pagerHandler.handleOutput(chunk);

      if (this.pagerHandler.isLoop()) {
        this.finalizeFailure(
          TerminalErrors.COMMAND_END_TIMEOUT,
          `Pager advance limit reached (${this.config.options.maxPagerAdvances ?? 50})`,
        );
        return;
      }

      if (this.config.sessionKind !== "ios" && this.config.sessionKind !== "unknown") {
        const hasPager = /--More--/i.test(chunk);
        if (hasPager) {
          this.finalize(true, this.endedStatus, "Pager detected in non-IOS session");
          return;
        }
      }

      if (
        this.config.options.autoAdvancePager !== false &&
        this.pagerHandler.canContinue() &&
        this.canAdvancePagerNow()
      ) {
        this.pagerHandler.advance();

        this.config.setTimeout!(() => {
          if (this.settled) return;
          const sent = this.sendPagerAdvance(
            this.config.terminal,
            this.config.events,
            this.config.session.sessionId,
            this.config.deviceName,
            "pagerHandler",
          );

          if (!sent) {
            this.finalizeFailure(
              TerminalErrors.COMMAND_END_TIMEOUT,
              "Pager detected but auto-advance failed",
            );
            return;
          }

          this.config.session.pagerActive = false;
          this.resetStallTimer();
        }, 50);
      }
    }

    this.resetStallTimer();
    this.scheduleFinalizeAfterCommandEnd();
  }

  private onStarted(): void {
    this.startedSeen = true;
    if (this.startTimer) { this.config.clearTimeout!(this.startTimer); this.startTimer = null; }
    this.config.session.lastActivityAt = this.config.now();
    this.resetStallTimer();
    pushEvent(this.config.events, this.config.session.sessionId, this.config.deviceName, "commandStarted", this.config.command, this.config.command);
  }

  private onEnded(_src: unknown, args: unknown): void {
    const payload = args as CommandEndedPayload;
    this.commandEndedSeen = true;
    this.commandEndSeenAt = this.config.now();
    this.endedStatus = payload.status ?? 0;
    this.resetStallTimer();
    pushEvent(this.config.events, this.config.session.sessionId, this.config.deviceName, "commandEnded", String(this.endedStatus), String(this.endedStatus));
    this.scheduleFinalizeAfterCommandEnd();
  }

  private onPromptChanged(_src: unknown, args: unknown): void {
    const p = String((args as any).prompt || "");
    this.previousPrompt = this.config.session.lastPrompt || this.previousPrompt;
    this.config.session.lastPrompt = normalizePrompt(p);
    const mode = detectModeFromPrompt(this.config.session.lastPrompt);
    this.config.session.lastMode = mode;
    if (isHostMode(mode)) this.config.session.sessionKind = "host";
    this.promptStableSince = this.config.now();
    this.resetStallTimer();
    this.scheduleFinalizeAfterCommandEnd();
  }

  private onMoreDisplayed(_src: unknown, args: unknown): void {
    this.config.session.pagerActive = true;
    this.pagerHandler.handleOutput("--More--");

    if (this.pagerHandler.isLoop()) {
      this.finalizeFailure(
        TerminalErrors.COMMAND_END_TIMEOUT,
        `Pager advance limit reached (${this.config.options.maxPagerAdvances ?? 50})`,
      );
      return;
    }

    pushEvent(
      this.config.events,
      this.config.session.sessionId,
      this.config.deviceName,
      "moreDisplayed",
      "--More--",
      "--More--",
    );

    if (
      this.config.options.autoAdvancePager !== false &&
      this.pagerHandler.canContinue() &&
      this.canAdvancePagerNow()
    ) {
      this.pagerHandler.advance();

      this.config.setTimeout!(() => {
        if (this.settled) return;
        const sent = this.sendPagerAdvance(
          this.config.terminal,
          this.config.events,
          this.config.session.sessionId,
          this.config.deviceName,
          "moreDisplayed",
        );

        if (!sent) {
          this.finalizeFailure(
            TerminalErrors.COMMAND_END_TIMEOUT,
            "Pager displayed but auto-advance failed",
          );
          return;
        }

        this.config.session.pagerActive = false;
        this.resetStallTimer();
      }, 50);
    }
  }

  private scheduleFinalizeAfterCommandEnd(): void {
    if (this.settled) return;

    if (this.commandEndedSeen && this.commandEndSeenAt) {
      const waitedAfterEnd = this.config.now() - this.commandEndSeenAt;

      if (waitedAfterEnd >= 1000) {
        this.finalize(true, this.endedStatus, "command-ended-max-wait");
        return;
      }
    }

    const currentPrompt = this.config.getPromptSafeFn(this.config.terminal);

    const verdict = shouldFinalizeCommand({
      state: {
        startedSeen: this.startedSeen,
        commandEndedSeen: this.commandEndedSeen,
        commandEndSeenAt: this.commandEndSeenAt,
        lastOutputAt: this.lastOutputAt,
        promptStableSince: this.promptStableSince,
        previousPrompt: this.previousPrompt,
      },
      currentPrompt,
      currentMode: this.config.getModeSafeFn(this.config.terminal) as TerminalMode,
      expectedMode: this.config.options.expectedMode,
      sessionKind: this.config.sessionKind,
      pagerActive: this.config.session.pagerActive,
      confirmPromptActive: this.config.session.confirmPromptActive,
    });

    if (verdict.finished) {
      this.finalize(true, this.endedStatus, verdict.reason);
      return;
    }

    if (this.commandEndGraceTimer) this.config.clearTimeout!(this.commandEndGraceTimer);
    this.commandEndGraceTimer = this.config.setTimeout!(() => {
      this.commandEndGraceTimer = null;
      this.scheduleFinalizeAfterCommandEnd();
    }, this.config.sessionKind === "host" ? 800 : 250);
  }

  private finalize(cmdOk: boolean, status: number | null, error?: string, code?: TerminalErrorCode): void {
    if (this.settled) return;

    this.finalizedOk = cmdOk;
    if (status !== null) this.endedStatus = status;
    this.finalizedError = error;
    this.finalizedCode = code;

    this.settled = true;
    this.clearTimers();
    this.cleanup();
  }

  private finalizeFailure(code: TerminalErrorCode, message: string): void {
    const recoverable =
      code === TerminalErrors.COMMAND_START_TIMEOUT ||
      code === TerminalErrors.COMMAND_END_TIMEOUT ||
      code === TerminalErrors.PROMPT_MISMATCH ||
      code === TerminalErrors.MODE_MISMATCH ||
      message.includes("No output received");

    if (recoverable && this.config.terminal) {
      try {
        const recovery = this.config.recoverTerminalSyncFn!(
          this.config.terminal,
          this.config.sessionKind === "host" ? "host" : "ios"
        );
        this.config.warnings.push(
          `Recovery attempted: ${recovery.actions.join(", ")}; prompt=${recovery.prompt}; mode=${recovery.mode}`,
        );
      } catch {}
    }

    this.finalize(false, 1, message, code);
  }
}
