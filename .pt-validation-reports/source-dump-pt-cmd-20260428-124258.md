# Source dump pt cmd

Fecha: Tue Apr 28 12:42:58 -05 2026

## git status
```
 M packages/pt-control/src/adapters/omni-payload-builder.ts
 M packages/pt-control/src/adapters/omni-response-parser.ts
 M packages/pt-control/src/adapters/runtime-omni-adapter.ts
 M packages/pt-control/src/adapters/runtime-primitive-adapter.ts
 M packages/pt-control/src/adapters/runtime-terminal/adapter.ts
 M packages/pt-control/src/application/services/terminal-plan-builder.ts
 M packages/pt-runtime/src/__tests__/handlers/runtime-handler-groups.test.ts
 M packages/pt-runtime/src/__tests__/pt/execution-engine-auto-attach.test.ts
 M packages/pt-runtime/src/__tests__/pt/terminal-engine.test.ts
 M packages/pt-runtime/src/__tests__/terminal/command-state-machine.test.ts
 M packages/pt-runtime/src/handlers/poll-deferred.ts
 M packages/pt-runtime/src/handlers/registration/experimental-handlers.ts
 M packages/pt-runtime/src/handlers/registration/runtime-registration.ts
 M packages/pt-runtime/src/handlers/registration/stable-handlers.ts
 M packages/pt-runtime/src/pt/kernel/execution-engine.ts
 M packages/pt-runtime/src/pt/terminal/terminal-engine.ts
 M packages/pt-runtime/src/terminal/engine/command-state-machine.ts
 M packages/pt-runtime/src/terminal/terminal-ready.ts
?? .pt-validation-reports/
?? packages/pt-control/src/__tests__/omni/runtime-omni-adapter.test.ts
```


## packages/pt-runtime/src/terminal/engine/command-state-machine.ts
```ts
// ============================================================================
// Command State Machine - Máquina de estados para ejecución de comandos
// ============================================================================
// Extraído de command-executor.ts (líneas 266-787) como clase testeable.
// No realiza llamadas directas a la PT API - recibe las dependencias via config.

import type { TerminalMode, TerminalSessionKind } from "../session-state";
import type { TerminalEventRecord } from "../../pt/terminal/terminal-events";
import type { TerminalErrorCode } from "../terminal-errors";
import type { CommandEndedPayload } from "../../pt/terminal/terminal-events";

function isEnableOrEndCommand(command: string): boolean {
  const cmd = command.trim().toLowerCase();
  return cmd === "enable" || cmd === "end" || cmd === "exit";
}

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

  private debug(message: string): void {
    try {
      dprint(
        "[cmd-sm] device=" +
          this.config.deviceName +
          " command=" +
          JSON.stringify(this.config.command) +
          " " +
          message,
      );
    } catch {}
  }

  private wakeTerminalIfNeeded(): void {
    const terminal = this.config.terminal;

    try {
      const prompt = this.config.getPromptSafeFn(terminal);
      let mode = "";

      try {
        if (typeof (terminal as any).getMode === "function") {
          mode = String((terminal as any).getMode() || "");
        }
      } catch {}

      const needsWake =
        !prompt ||
        mode.toLowerCase() === "logout" ||
        String(this.config.session.lastMode || "") === "logout" ||
        this.config.session.lastMode === "unknown";

      if (!needsWake) return;

      this.debug(
        "wake begin prompt=" +
          JSON.stringify(prompt) +
          " mode=" +
          JSON.stringify(mode) +
          " sessionMode=" +
          JSON.stringify(this.config.session.lastMode),
      );

      try {
        terminal.enterChar(13, 0);
      } catch {
        try {
          terminal.enterCommand("");
        } catch {}
      }

      this.lastOutputAt = this.config.now();
      this.config.session.lastActivityAt = this.config.now();
      this.debug("wake sent enter");
    } catch (error) {
      this.debug("wake failed error=" + String(error));
    }
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

    this.debug(
      "run start promptBefore=" +
        JSON.stringify(this.config.promptBefore) +
        " modeBefore=" +
        JSON.stringify(this.config.modeBefore) +
        " timeoutMs=" +
        commandTimeoutMs +
        " stallMs=" +
        stallTimeoutMs,
    );

    this.setupHandlers();
    this.debug("handlers setup complete");

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
    this.wakeTerminalIfNeeded();

    sleep(250).then(() => {
      if (this.settled) return;

      try {
        this.debug("enterCommand begin");
        terminal.enterCommand(this.config.command);
        this.startedSeen = true;
        this.resetStallTimer();
        this.debug("enterCommand sent");

        sleep(100).then(() => {
          if (!this.settled) {
            this.scheduleFinalizeAfterCommandEnd();
          }
        });
      } catch (e) {
        this.finalizeFailure(TerminalErrors.UNKNOWN_STATE, "Failed to send command: " + String(e));
      }
    });

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
      const rawTail = String(currentRaw.raw || "").slice(-500);
      const pagerVisible = /--More--|More:|Press RETURN to get started|Press any key to continue/i.test(rawTail);

      if (pagerVisible) {
        this.config.session.pagerActive = true;
        this.debug("poll pager visible tail=" + JSON.stringify(rawTail.slice(-120)));

        if (this.config.options.autoAdvancePager !== false) {
          try {
            this.config.terminal.enterChar(32, 0);
            this.debug("poll pager advanced with space");
            this.config.session.pagerActive = false;
            this.lastOutputAt = this.config.now();
            this.config.session.lastActivityAt = this.config.now();
          } catch (error) {
            this.debug("poll pager advance failed error=" + String(error));
          }
        }
      }

      // Handle buffer reset/rotation
      if (currentRaw.raw.length < this.lastTerminalSnapshot.raw.length) {
        this.lastTerminalSnapshot = { raw: "", source: "reset" };
      }

      try {
        const prompt = this.config.getPromptSafeFn(this.config.terminal);
        if (prompt && prompt !== this.previousPrompt) {
          this.previousPrompt = prompt;
          this.promptStableSince = this.config.now();

          const mode = detectModeFromPrompt(normalizePrompt(prompt));
          this.config.session.lastPrompt = normalizePrompt(prompt);
          this.config.session.lastMode = mode;

          this.debug("poll prompt=" + JSON.stringify(prompt) + " mode=" + mode);
          this.scheduleFinalizeAfterCommandEnd();
        }
      } catch {}

      if (currentRaw.raw.length > this.lastTerminalSnapshot.raw.length) {
        const delta = currentRaw.raw.substring(this.lastTerminalSnapshot.raw.length);
        this.lastTerminalSnapshot = currentRaw;
        this.debug("poll output deltaLen=" + delta.length);
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

    const snapshot = this.config.readTerminalSnapshotFn!(this.config.terminal);
    const diff = diffSnapshotStrict(this.config.baselineOutput, snapshot.raw);
    const snapshotDelta = String(diff.delta || "");
    const hasAnyOutput = this.outputBuffer.trim().length > 0 || snapshotDelta.trim().length > 0;
    const promptLooksReady = /^[A-Za-z0-9._-]+(?:\(config[^)]*\))?[>#]\s*$/.test(String(currentPrompt || "").trim());
    const quietLongEnough = this.config.now() - this.lastOutputAt >= 700;

    if (
      this.startedSeen &&
      promptLooksReady &&
      quietLongEnough &&
      !this.config.session.pagerActive &&
      !this.config.session.confirmPromptActive
    ) {
      if (hasAnyOutput || this.config.options.allowEmptyOutput === true || isEnableOrEndCommand(this.config.command)) {
        this.debug(
          "finalize by prompt-ready fallback prompt=" +
            JSON.stringify(currentPrompt) +
            " hasAnyOutput=" +
            hasAnyOutput,
        );
        this.finalize(true, this.endedStatus, "prompt-ready-fallback");
        return;
      }
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
```

## packages/pt-runtime/src/terminal/engine/command-executor.ts
```ts
// ============================================================================
// Terminal Executor - Orquestación de executeTerminalCommand
// ============================================================================
// Este archivo orquesta la ejecución de comandos usando los componentes modulares:
// - CommandStateMachine: el state machine principal
// - PagerHandler: manejo de paginación
// - ConfirmHandler: manejo de confirmaciones
//
// Este archivo NO contiene lógica de estado - solo coordina.

import type { TerminalMode, TerminalSessionKind } from "../session-state";
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
import { sanitizeCommandOutput } from "../command-sanitizer";
import type { CommandEndedPayload, TerminalEventRecord } from "../../pt/terminal/terminal-events";
import { TerminalErrors, type TerminalErrorCode } from "../terminal-errors";
import { ensureSession } from "../session-registry";
import { checkCommandCompletion } from "../stability-heuristic";
import { verifyIosOutput, verifyHostOutput } from "../terminal-semantic-verifier";
import { recoverTerminalSync } from "../terminal-recovery";
import {
  getPromptSafe,
  getModeSafe,
  isTerminalReadyForCommand,
  wakeTerminal,
  ensureTerminalReadySync,
} from "../terminal-ready";
import { extractCommandOutput, type CommandSessionKind } from "../command-output-extractor";
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
} from "./index.js";
import { detectWizardFromOutput, sleep, terminalOutputHasPager } from "../terminal-utils";
import { CommandStateMachine } from "./command-state-machine";

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
const COMMAND_END_GRACE_MS = 250;
const COMMAND_END_MAX_WAIT_MS = 1000;
const HOST_COMMAND_END_GRACE_MS = 1500;

/**
 * Wrapper that delegates to CommandStateMachine while preserving
 * the same signature as the original executeTerminalCommand.
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

  // Run the state machine
  const stateMachine = new CommandStateMachine({
    deviceName,
    command,
    terminal,
    options,
    session,
    events,
    warnings,
    sessionKind,
    promptBefore,
    modeBefore,
    baselineSnapshot,
    baselineOutput,
  });

  return stateMachine.run();
}
```

## packages/pt-runtime/src/terminal/terminal-ready.ts
```ts
// ============================================================================
// Terminal Ready - Verifica y prepara el terminal para ejecutar comandos
// ============================================================================
// Proporciona funciones para verificar si el terminal está listo para recibir
// comandos, leer el prompt/modo de forma segura, y despertar el terminal si es necesario.
// Incluye detección de log storms (syslog noise) y soporte para enable automático.

import { detectModeFromPrompt, normalizePrompt, readTerminalSnapshot } from "./prompt-detector";
import type { TerminalSessionKind, TerminalMode } from "./session-state";

export interface TerminalReadyOptions {
  maxRetries?: number;
  retryDelayMs?: number;
  wakeUpOnFail?: boolean;
  ensurePrivileged?: boolean;
  quietThresholdMs?: number;
}

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 500;
const DEFAULT_QUIET_THRESHOLD_MS = 2000;

/**
 * Lee el prompt del terminal de forma segura, sin lanzar excepciones.
 */
function inferPromptFromText(output: string): string {
  const lines = String(output || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i] || "";

    if (/^[A-Za-z0-9._-]+(?:\(config[^)]*\))?[>#]$/.test(line)) {
      return line;
    }

    if (/[A-Z]:\\>$/.test(line)) {
      return line;
    }

    if (/\b(?:PC|Server|Laptop|Host)[A-Za-z0-9._-]*>$/.test(line)) {
      return line;
    }
  }

  return "";
}

export function getPromptSafe(terminal: any): string {
  try {
    if (typeof terminal.getPrompt === "function") {
      const p = terminal.getPrompt();
      if (p && typeof p === "string" && p.trim()) {
        return p.trim();
      }
    }
  } catch {}

  try {
    const snapshot = readTerminalSnapshot(terminal);
    const inferred = inferPromptFromText(snapshot.raw);
    if (inferred) return inferred;
  } catch {}

  return "";
}

/**
 * Canonicaliza el modo nativo de Packet Tracer al nombre canónico del proyecto.
 * PT devuelve: "global", "enable", "interface" etc.
 * El proyecto usa: "global-config", "privileged-exec", "config-if" etc.
 */
function canonicalizeTerminalMode(mode: string): TerminalMode {
  const normalized = mode.trim().toLowerCase();

  if (normalized === "enable") return "privileged-exec";
  if (normalized === "privileged") return "privileged-exec";
  if (normalized === "privileged-exec") return "privileged-exec";

  if (normalized === "user") return "user-exec";
  if (normalized === "user-exec") return "user-exec";

  if (normalized === "global") return "global-config";
  if (normalized === "config") return "global-config";
  if (normalized === "global-config") return "global-config";

  if (normalized === "interface") return "config-if";
  if (normalized === "config-if") return "config-if";

  if (normalized === "line") return "config-line";
  if (normalized === "config-line") return "config-line";

  if (normalized === "router") return "config-router";
  if (normalized === "config-router") return "config-router";

  if (normalized === "vlan") return "config-vlan";
  if (normalized === "config-vlan") return "config-vlan";

  if (normalized === "config-subif") return "config-subif";
  if (normalized === "config-if-range") return "config-if-range";
  if (normalized === "dhcp-config") return "dhcp-config";
  if (normalized === "dhcp-pool") return "dhcp-pool";
  if (normalized === "host-prompt") return "host-prompt";
  if (normalized === "host-busy") return "host-busy";
  if (normalized === "wizard") return "wizard";
  if (normalized === "pager") return "pager";
  if (normalized === "confirm") return "confirm";
  if (normalized === "boot") return "boot";

  return "unknown";
}

/**
 * Lee el modo del terminal de forma segura, sin lanzar excepciones.
 * Usa el prompt como fuente canónica (contiene el modo real del dispositivo).
 * Si el prompt no es concluyente, cae a terminal.getMode() y canonicaliza el resultado.
 */
export function getModeSafe(terminal: any): string {
  try {
    const prompt = getPromptSafe(terminal);

    if (prompt) {
      const promptMode = detectModeFromPrompt(prompt);
      if (promptMode !== "unknown") {
        return promptMode;
      }
    }

    if (typeof terminal.getMode === "function") {
      const rawMode = terminal.getMode();
      if (rawMode && typeof rawMode === "string") {
        return canonicalizeTerminalMode(rawMode);
      }
    }

    return "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Verifica si el terminal está listo para recibir un comando.
 * Para IOS: verifica que haya un prompt válido.
 * Para Host: verifica que haya un prompt de host válido.
 */
export function isTerminalReadyForCommand(
  terminal: any,
  kind: TerminalSessionKind
): boolean {
  const prompt = getPromptSafe(terminal);
  if (!prompt || !prompt.trim()) return false;

  const normalizedPrompt = normalizePrompt(prompt);

  if (kind === "host") {
    return (
      /[A-Z]:\\>/i.test(normalizedPrompt) ||
      /\b(pc|server|laptop|client|terminal)[a-zA-Z0-9_-]*>/i.test(normalizedPrompt) ||
      normalizedPrompt === "js>" ||
      normalizedPrompt === "python>>>"
    );
  }

  return (
    />$/.test(normalizedPrompt) ||
    /#$/.test(normalizedPrompt) ||
    /\(config[^)]*\)#$/.test(normalizedPrompt)
  );
}

/**
 * Despierta el terminal enviando un Enter.
 * Útil para IOS donde el terminal puede estar dormido después de un comando largo.
 */
export function wakeTerminal(terminal: any): void {
  try {
    if (typeof terminal.enterChar === "function") {
      terminal.enterChar(13, 0);
    }
  } catch {
  }
}

/**
 * Detecta si hay syslog reciente en el output del terminal.
 * Útil para switches con log storm (CDP, STP, etc.).
 */
export function hasRecentSyslog(terminal: any, quietThresholdMs: number): boolean {
  try {
    const snapshot = readTerminalSnapshot(terminal);
    const output = snapshot.raw;

    if (!output) return true;

    const syslogPatterns = [
      "%CDP-4-",
      "%LINEPROTO-5-UPDOWN",
      "%LINK-3-UPDOWN",
      "%SYS-5-CONFIG_I",
      "%SYS-5-RELOAD",
      "%STP-5-",
      "%PVST-5-",
      "%VLAN-",
    ];

    const lines = output.split("\n");
    const recentLines = lines.slice(-10);

    for (let i = 0; i < recentLines.length; i++) {
      const line = recentLines[i] || "";
      for (let j = 0; j < syslogPatterns.length; j++) {
        if (line.indexOf(syslogPatterns[j]) !== -1) {
          return true;
        }
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Asegura que el terminal esté listo para ejecutar un comando.
 * Intenta múltiples veces si es necesario.
 * Soporta:
 * - waiting for stable prompt (not just present)
 * - detection de log storm (syslog noise)
 * - enable automático si ensurePrivileged=true
 */
export async function ensureTerminalReady(
  terminal: any,
  kind: TerminalSessionKind,
  options: TerminalReadyOptions = {}
): Promise<{ ready: boolean; prompt: string; mode: string }> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const wakeUpOnFail = options.wakeUpOnFail ?? true;
  const ensurePrivileged = options.ensurePrivileged ?? false;
  const quietThresholdMs = options.quietThresholdMs ?? DEFAULT_QUIET_THRESHOLD_MS;

  let lastOutputLength = 0;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const prompt = getPromptSafe(terminal);
    const mode = getModeSafe(terminal);

    if (isTerminalReadyForCommand(terminal, kind)) {
      const snapshot = readTerminalSnapshot(terminal);
      const currentLength = snapshot.raw.length;
      const outputDelta = currentLength - lastOutputLength;

      if (outputDelta > 0) {
        const hasNoise = hasRecentSyslog(terminal, quietThresholdMs);
        if (hasNoise) {
          lastOutputLength = currentLength;
          if (attempt < maxRetries - 1) {
            await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
            continue;
          }
        }
      }

      if (ensurePrivileged && kind === "ios" && mode !== "privileged-exec") {
        try {
          terminal.enterCommand("enable");
          terminal.enterChar(13, 0);
          await new Promise((resolve) => setTimeout(resolve, 300));
          const newPrompt = getPromptSafe(terminal);
          const newMode = getModeSafe(terminal);
          if (newMode === "privileged-exec") {
            return { ready: true, prompt: newPrompt, mode: newMode };
          }
        } catch {}
      }

      return { ready: true, prompt, mode };
    }

    if (attempt < maxRetries - 1) {
      if (wakeUpOnFail) {
        wakeTerminal(terminal);
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }

  const finalPrompt = getPromptSafe(terminal);
  const finalMode = getModeSafe(terminal);
  return { ready: false, prompt: finalPrompt, mode: finalMode };
}

/**
 * Version síncrona de ensureTerminalReady para casos donde no se puede usar async.
 */
export function ensureTerminalReadySync(
  terminal: any,
  kind: TerminalSessionKind,
  options: TerminalReadyOptions = {}
): { ready: boolean; prompt: string; mode: string } {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const wakeUpOnFail = options.wakeUpOnFail ?? true;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const prompt = getPromptSafe(terminal);
    const mode = getModeSafe(terminal);

    if (isTerminalReadyForCommand(terminal, kind)) {
      return { ready: true, prompt, mode };
    }

    if (attempt < maxRetries - 1) {
      if (wakeUpOnFail) {
        wakeTerminal(terminal);
      }
    }
  }

  const finalPrompt = getPromptSafe(terminal);
  const finalMode = getModeSafe(terminal);
  return { ready: false, prompt: finalPrompt, mode: finalMode };
}```

## packages/pt-runtime/src/terminal/prompt-detector.ts
```ts
// ============================================================================
// Prompt Detector - Detecta modo, wizard, confirmaciones, paginación e idioma de sesión
// ============================================================================
// Utilizado por el terminal engine para inferir estado IOS desde prompts.
// Trabaja sobre output sanitizado (sin ANSI, sin \r).

import type { TerminalMode, TerminalSessionKind } from "./session-state";
import { 
  stripAnsi, 
  normalizeWhitespace, 
  sanitizeCommandOutput as internalSanitizeOutput 
} from "./command-sanitizer";

function lastNonEmptyLine(input: string): string {
  const lines = stripAnsi(input)
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.length > 0 ? lines[lines.length - 1]! : "";
}

/**
 * Normaliza un prompt eliminando ANSI y whitespace extra.
 * Para uso en matching y logging.
 * 
 * @param prompt - Prompt raw del terminal
 * @returns Prompt normalizado sin colores ni espacios extras
 */
export function normalizePrompt(prompt: string): string {
  return normalizeWhitespace(prompt);
}

/**
 * Compara un prompt contra un patrón.
 * 
 * @param pattern - String o RegExp a buscar
 * @param prompt - Prompt normalizado
 * @returns true si el patrón matches
 */
export function promptMatches(pattern: string | RegExp, prompt: string): boolean {
  const normalized = normalizePrompt(prompt);
  if (!normalized) return false;
  if (typeof pattern === "string") return normalized.includes(pattern);
  return pattern.test(normalized);
}

/**
 * Detecta qué tipo de sesión está corriendo: IOS CLI, host prompt, o desconocido.
 * Analiza el prompt/output para determinar si es un router/switch (IOS) o PC/Server (host).
 * 
 * @param promptOrOutput - Prompt actual o output del terminal
 * @returns "ios", "host", o "unknown"
 * 
 * @example
 * detectSessionKind("Router#") // → "ios"
 * detectSessionKind("PC>") // → "host"
 * detectSessionKind("something else") // → "unknown"
 */
export function detectSessionKind(promptOrOutput: string): TerminalSessionKind {
  const text = normalizeWhitespace(promptOrOutput);
  if (!text) return "unknown";

  const p = text.toLowerCase();

  // Heurísticas de Host
  if (
    /[A-Z]:\\>$/i.test(text) || 
    /\b(pc|server|laptop|client|tablet|host|station|terminal|workstation|node)[a-zA-Z0-9_-]*>/i.test(text) ||
    p === "js>" || 
    p === "python>>>"
  ) {
    return "host";
  }

  // IOS: Termina en # (todos los modos privileged/config) o > (user-exec)
  if (/#$/.test(text) || /\(config[^)]*\)#$/i.test(text)) {
    return "ios";
  }

  // WLC / ASA / Wizards
  if (
    p.indexOf("cisco controller") !== -1 || 
    p.indexOf("ciscoasa") !== -1 || 
    p.indexOf("initial configuration dialog") !== -1
  ) {
    return "ios";
  }

  if (/>$/.test(text)) {
    if (p.indexOf("router") !== -1 || p.indexOf("switch") !== -1) {
      return "ios";
    }
    // Por defecto, si termina en > y no es host conocido, asumimos IOS user-exec
    return "ios";
  }

  return "unknown";
}

/**
 * Detecta el modo IOS desde un prompt normalizado.
 */
export function detectModeFromPrompt(prompt: string): TerminalMode {
  const p = normalizePrompt(prompt);

  if (!p) return "unknown";

  // WLC Prompt: (Cisco Controller) >
  if (/\(Cisco Controller\)\s*>$/i.test(p)) {
    return "user-exec";
  }

  // Boot / ROMMON
  if (/rommon|boot>/i.test(p)) return "boot";

  // Specific config submodes first
  if (/\(config-subif\)#$/i.test(p)) return "config-subif";
  if (/\(config-if\)#$/i.test(p)) return "config-if";
  if (/\(config-line\)#$/i.test(p)) return "config-line";
  if (/\(config-router\)#$/i.test(p)) return "config-router";
  if (/\(config-vlan\)#$/i.test(p)) return "config-vlan";
  if (/\(config-if-range\)#$/i.test(p)) return "config-if-range";
  if (/\(dhcp-config\)#$/i.test(p)) return "dhcp-config";
  if (/\(dhcp-pool\)#$/i.test(p)) return "dhcp-pool";
  if (/\(config-telephony\)#$/i.test(p)) return "config-telephony";
  if (/\(config-ephone\)#$/i.test(p)) return "config-ephone";
  if (/\(config-ephone-dn\)#$/i.test(p)) return "config-ephone-dn";
  if (/\(config-voip\)#$/i.test(p)) return "config-voip";

  // Generic config / unknown config submodes collapse to global-config
  if (/\(config[^)]*\)#$/i.test(p)) return "global-config";

  // Pager / Wizard / Confirm
  if (/--more--/i.test(p) || /\bMore\b/i.test(p)) return "pager";
  if (/\[confirm\]$/i.test(p)) return "confirm";
  if (
    /would you like to enter the initial configuration dialog\?/i.test(p) ||
    /\[yes\/no\]:?$/i.test(p)
  ) {
    return "wizard";
  }

  // Host prompt
  if (/>$/.test(p)) {
    // Si detectamos que es un host (por nombre o heurística)
    if (/\b(pc|server|laptop|printer|tablet|host|station|client)[a-zA-Z0-9_-]*>/i.test(p)) {
      return "host-prompt";
    }
    
    // El prompt de Windows C:\> NO es user-exec de IOS
    if (/[A-Z]:\\>$/i.test(p)) {
      return "host-prompt";
    }

    // Sub-shells comunes en PT
    if (p === "js>" || p === "python>>>") {
      return "host-prompt";
    }

    return "user-exec";
  }

  if (/#$/.test(p)) return "privileged-exec";

  return "unknown";
}

/**
 * Detecta si el output contiene el diálogo de initial configuration wizard.
 * Este diálogo bloquea la terminal hasta que se responda "no".
 * 
 * @param output - Output del terminal
 * @returns true si se detectó el wizard
 */
export function detectWizardFromOutput(output: string): boolean {
  const text = normalizeWhitespace(output).toLowerCase();
  if (!text) return false;

  return (
    text.indexOf("initial configuration dialog") !== -1 ||
    text.indexOf("would you like to enter the initial") !== -1 ||
    text.indexOf("press return to get started") !== -1 ||
    text.indexOf("continue with configuration dialog") !== -1 ||
    text.indexOf("cisco wireless lan controller setup wizard") !== -1 ||
    text.indexOf("welcome to the cisco wireless") !== -1
  );
}

/**
 * Detecta prompts de confirmación del IOS.
 * Incluye [confirm], [yes/no]:, overwrite, destination filename.
 * 
 * @param output - Output del terminal
 * @returns true si se detectó prompt de confirmación
 */
export function detectConfirmPrompt(output: string): boolean {
  const line = lastNonEmptyLine(output);
  if (!line) return false;

  return (
    /\[confirm\]$/i.test(line) ||
    /\[yes\/no\]:?$/i.test(line) ||
    /\(y\/n\)\??:?\s*$/i.test(line) ||
    /destination filename \[[^\]]+\]\??$/i.test(line) ||
    /overwrite\?? \[confirm\]$/i.test(line) ||
    /erase.*\[confirm\]$/i.test(line) ||
    /delete.*\[confirm\]$/i.test(line) ||
    /reload\? \[confirm\]$/i.test(line)
  );
}

/**
 * Detecta si el output contiene paging (--More--).
 * El pager aparece en outputs largos y requiere SPACE para continuar.
 * 
 * @param output - Output del terminal
 * @returns true si se detectó pager
 */
export function detectPager(output: string): boolean {
  const text = stripAnsi(output);
  return /--More--/i.test(text) || /\bMore\b/i.test(text);
}

/**
 * Detecta output de boot de router (ROMMON, bootstrap).
 * Usado para identificar si el dispositivo está en proceso de booteo.
 * 
 * @param output - Output del terminal
 * @returns true si parece output de boot
 */
export function detectBootOutput(output: string): boolean {
  const text = normalizeWhitespace(output).toLowerCase();
  return (
    text.includes("self decompressing the image") ||
    text.includes("bootstrap") ||
    text.includes("rommon") ||
    text.includes("boot loader")
  );
}

/**
 * Detecta output de comandos host busy (ping, traceroute).
 * Reconoce respuestas de ping, timeouts, unreachables, y trace complete.
 * 
 * @param output - Output del terminal
 * @returns true si parece output de ping/traceroute
 */
export function detectHostBusy(output: string): boolean {
  const text = normalizeWhitespace(output).toLowerCase();
  if (!text) return false;

  return (
    text.includes("reply from") ||
    text.includes("request timed out") ||
    text.includes("destination host unreachable") ||
    text.includes("tracing route") ||
    text.includes("trace complete") ||
    text.includes("ping statistics") ||
    text.includes("connected to") ||
    text.includes("trying") ||
    text.includes("escape character is") ||
    text.includes("connection closed")
  );
}

export function detectDnsLookup(output: string): boolean {
  const text = output.toLowerCase();
  return text.indexOf("translating") !== -1 && (text.indexOf("domain server") !== -1 || text.indexOf("...") !== -1);
}

export function detectAuthPrompt(output: string): boolean {
  const line = lastNonEmptyLine(output);
  if (!line) return false;

  return (
    /username:/i.test(line) ||
    /password:/i.test(line) ||
    /login:/i.test(line) ||
    /usuario:/i.test(line) ||
    /contraseña:/i.test(line) ||
    /acceso:/i.test(line)
  );
}

export function detectReloadPrompt(output: string): boolean {
  const text = normalizeWhitespace(output).toLowerCase();
  return (
    text.includes("reload") &&
    text.includes("confirm")
  );
}

export function detectErasePrompt(output: string): boolean {
  const text = normalizeWhitespace(output).toLowerCase();
  return (
    text.includes("erase") &&
    text.includes("confirm")
  );
}

export function isPrivilegedMode(mode: TerminalMode): boolean {
  return mode === "privileged-exec" || isConfigMode(mode);
}

export function isConfigMode(mode: TerminalMode): boolean {
  return (
    mode === "global-config" ||
    mode === "config-if" ||
    mode === "config-line" ||
    mode === "config-router" ||
    mode === "config-vlan" ||
    mode === "config-subif" ||
    mode === "config-if-range" ||
    mode === "dhcp-config" ||
    mode === "dhcp-pool" ||
    mode === "config-telephony" ||
    mode === "config-ephone" ||
    mode === "config-ephone-dn" ||
    mode === "config-voip"
  );
}

export function isHostMode(mode: TerminalMode): boolean {
  return mode === "host-prompt" || mode === "host-busy";
}

export function needsEnable(currentMode: TerminalMode): boolean {
  return currentMode === "user-exec";
}

export function needsConfigTerminal(currentMode: TerminalMode): boolean {
  return !isConfigMode(currentMode);
}

/**
 * Lee el output actual del terminal intentando varios métodos de PT.
 * Devuelve el output junto con el método que funcionó.
 */
export interface TerminalSnapshot {
  raw: string;
  source: string;
}

/**
 * Lee el output actual del terminal intentando múltiples métodos de PT.
 * Devuelve el output junto con el método que funcionó.
 */
export function readTerminalSnapshot(terminal: any): TerminalSnapshot {
  try {
    const methods = [
      { name: "getAllOutput", fn: (t: any) => t.getAllOutput?.() },
      { name: "getBuffer", fn: (t: any) => t.getBuffer?.() },
      { name: "getOutput", fn: (t: any) => t.getOutput?.() },
      { name: "getText", fn: (t: any) => t.getText?.() },
      { name: "readAll", fn: (t: any) => t.readAll?.() },
      { name: "read", fn: (t: any) => t.read?.() },
      { name: "getHistory", fn: (t: any) => t.getHistory?.() },
      { name: "history", fn: (t: any) => t.history?.() },
    ];

    for (const m of methods) {
      try {
        const out = m.fn(terminal);
        if (out && typeof out === "string" && out.length > 0) {
          return { raw: out, source: m.name };
        }
      } catch (e) {}
    }

    if (typeof terminal.getConsole === "function") {
      try {
        const consoleObj = terminal.getConsole();
        if (consoleObj) {
          for (const m of methods) {
            try {
              const out = m.fn(consoleObj);
              if (out && typeof out === "string" && out.length > 0) {
                return { raw: out, source: m.name + " (console)" };
              }
            } catch (e) {}
          }
        }
      } catch (e) {}
    }

    if (typeof terminal.toString === "function") {
      try {
        const s = terminal.toString();
        if (s && s.indexOf("Terminal") === -1 && s.indexOf("[object") === -1) {
          return { raw: s, source: "toString" };
        }
      } catch (e) {}
    }

    return { raw: "", source: "none" };
  } catch {
    return { raw: "", source: "error" };
  }
}

/**
 * Sanitiza texto del terminal eliminando backspaces, ANSI, Bell y caracteres de control.
 */
export function sanitizeTerminalText(output: string): string {
  if (!output) return "";

  let result = output;

  result = result.replace(/\u0007/g, "");

  result = result.replace(/\u001b\[[0-9;]*[a-zA-Z]/g, "");

  result = result.replace(/[\b]+\x08/g, "");

  result = result.replace(/[\b]/g, "");

  result = result.replace(/[\r\n]+/g, "\n");

  return result.trim();
}

/**
 * Calcula el delta entre dos snapshots del terminal.
 * Busca los sufijos del output anterior en el nuevo para encontrar qué parte es nueva.
 */
export function diffSnapshotStrict(before: string, after: string): { delta: string; matched: boolean } {
  if (!before || !after) {
    return { delta: after || "", matched: false };
  }

  const beforeClean = sanitizeTerminalText(before);
  const afterClean = sanitizeTerminalText(after);

  if (afterClean.startsWith(beforeClean)) {
    const delta = after.substring(before.length);
    return { delta: sanitizeTerminalText(delta), matched: true };
  }

  const beforeLines = beforeClean.split("\n");
  const afterLines = afterClean.split("\n");

  let matchIndex = -1;
  for (let i = beforeLines.length - 1; i >= 0; i--) {
    const lineToFind = beforeLines[i];
    if (lineToFind && lineToFind.trim()) {
      const foundIdx = afterLines.lastIndexOf(lineToFind);
      if (foundIdx !== -1) {
        matchIndex = foundIdx;
        break;
      }
    }
  }

  if (matchIndex !== -1) {
    const newLines = afterLines.slice(matchIndex + 1);
    return { delta: newLines.join("\n"), matched: true };
  }

  return { delta: afterClean, matched: false };
}

/**
 * Sanitiza una cadena de output de terminal para detección de prompt.
 * Elimina \r y caracteres de control pero preserva \n.
 */
export function sanitizeOutput(output: string): string {
    if (!output) return "";
    return output
      .replace(/\r/g, "")
      .replace(/\u0007/g, "") // Bell
      .replace(/\u001b\[[0-9;]*[a-zA-Z]/g, ""); // ANSI
}

/**
 * Lee el output del terminal para compatibilidad hacia atrás.
 * Usa readTerminalSnapshot internamente.
 */
export function readTerminalOutput(terminal: any): string {
  const snapshot = readTerminalSnapshot(terminal);
  return sanitizeTerminalText(snapshot.raw);
}
/**
 * Elimina el output base (baseline) de una cadena de output completa.
 * Desactivado para IOS para evitar pérdida de datos en ráfagas de logs.
 */
export function stripBaselineOutput(output: string, baseline: string): string {
  if (!output) return "";
  if (!baseline) return output;

  // No recortar NADA en IOS. Devolvemos todo el buffer para máxima visibilidad.
  // Heurística: si no detectamos un prompt de Host, asumimos que es IOS/Red.
  const isHost = /^[A-Z]:\\>/i.test(baseline) || /^[A-Z]:\\>/i.test(output);
  if (!isHost) {
      return output;
  }

  // Lógica de recorte solo para Host (PC)
  if (output.substring(0, baseline.length) === baseline) {
    return output.substring(baseline.length);
  }

  const lines = baseline.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]?.trim();
    if (!line || line === "C:\\>") continue;

    const idx = output.lastIndexOf(line);
    if (idx !== -1) {
      return output.substring(idx + line.length);
    }
  }

  return output;
}```

## packages/pt-runtime/src/pt/terminal/terminal-engine.ts
```ts
// TerminalEngine - Gestor de sesiones IOS en PT
// Delega ejecución de comandos a CommandExecutor

import type { TerminalSessionState } from "./terminal-session";
import type { SessionStateSnapshot } from "../../domain";
import {
  createTerminalSession,
  toSnapshot,
  updateMode,
  updatePrompt,
  setPaging,
} from "./terminal-session";
import type { IosMode } from "./prompt-parser";
import {
  createCommandExecutor,
  type ExecutionOptions as ExecuteOptions,
  type CommandExecutionResult,
} from "../../terminal/command-executor";
import { getPromptSafe } from "../../terminal/terminal-ready";

export interface TerminalEngineConfig {
  commandTimeoutMs: number;
  stallTimeoutMs: number;
  pagerTimeoutMs: number;
}

export interface TerminalResult {
  ok: boolean;
  output: string;
  status: number;
  session: SessionStateSnapshot;
  mode: IosMode;
}

export type { ExecuteOptions };

function normalizePacketTracerMode(mode: unknown, prompt: string): string {
  const raw = String(mode ?? "").trim().toLowerCase();
  const p = String(prompt ?? "").trim();

  if (/\(config[^)]*\)#\s*$/.test(p)) return "global-config";
  if (/#\s*$/.test(p)) return "privileged-exec";
  if (/>$/.test(p)) return "user-exec";

  if (raw === "user") return "user-exec";
  if (raw === "enable" || raw === "privileged" || raw === "privileged-exec") return "privileged-exec";
  if (raw === "config" || raw === "global-config") return "global-config";
  if (raw === "logout") return "logout";

  return raw || "unknown";
}

interface PTCommandLine {
  getPrompt(): string;
  enterCommand(cmd: string): void;
  registerEvent(
    eventName: string,
    filter: unknown,
    callback: (src: unknown, args: unknown) => void,
  ): void;
  unregisterEvent(
    eventName: string,
    filter: unknown,
    callback: (src: unknown, args: unknown) => void,
  ): void;
  enterChar(charCode: number, modifiers: number): void;
}

export function createTerminalEngine(config: TerminalEngineConfig) {
  const sessions: Record<string, TerminalSessionState> = {};
  const terminals: Record<string, PTCommandLine> = {};

  const { executeCommand } = createCommandExecutor({
    commandTimeoutMs: config.commandTimeoutMs,
  });

  function attach(device: string, term: PTCommandLine): void {
    try {
      dprint("[term] ATTACH device=" + device);
    } catch {}
    terminals[device] = term;
    sessions[device] = createTerminalSession(device);

    try {
      const prompt = getPromptSafe(term);
      const rawMode = typeof (term as any).getMode === "function" ? (term as any).getMode() : "";
      let updated = updatePrompt(sessions[device], prompt);
      updated = updateMode(updated, normalizePacketTracerMode(rawMode, prompt));
      sessions[device] = updated;
    } catch {}

    term.registerEvent("promptChanged", null, (_src, args) => {
      const current = sessions[device];
      if (!current) return;
      const prompt = (args as { prompt?: string })?.prompt || "";
      const rawMode = typeof (term as any).getMode === "function" ? (term as any).getMode() : "";
      let updated = updatePrompt(current, prompt);
      updated = updateMode(updated, normalizePacketTracerMode(rawMode, prompt));
      sessions[device] = updated;
    });

    term.registerEvent("moreDisplayed", null, (_src, args) => {
      const current = sessions[device];
      if (!current) return;
      const active = (args as { active?: boolean })?.active || false;
      sessions[device] = setPaging(current, active);
    });

    term.registerEvent("modeChanged", null, (_src, args) => {
      const current = sessions[device];
      if (!current) return;
      const newMode = (args as { newMode?: string })?.newMode || "";
      if (newMode) {
        sessions[device] = updateMode(current, normalizePacketTracerMode(newMode, current.prompt));
      }
    });

    term.registerEvent("commandStarted", null, (_src, args) => {
      const current = sessions[device];
      if (!current) return;
      const inputMode = (args as { inputMode?: string })?.inputMode || "";
      if (inputMode && typeof inputMode === "string") {
        sessions[device] = updateMode(current, normalizePacketTracerMode(inputMode, current.prompt));
      }
    });
    try {
      dprint("[term] ATTACH OK device=" + device);
    } catch {}
  }

  function detach(device: string): void {
    try {
      dprint("[term] DETACH device=" + device);
    } catch {}
    delete terminals[device];
    delete sessions[device];
    try {
      dprint("[term] DETACH OK device=" + device);
    } catch {}
  }

  function getSession(device: string): SessionStateSnapshot | null {
    const state = sessions[device];
    return state ? toSnapshot(state) : null;
  }

  function getMode(device: string): IosMode {
    const state = sessions[device];
    return state ? (state.mode as IosMode) : "unknown";
  }

  function isBusy(device: string): boolean {
    const state = sessions[device];
    return state ? state.busyJobId !== null : false;
  }

  function isAnyBusy(): boolean {
    for (const device in sessions) {
      if (sessions[device].busyJobId !== null) return true;
    }
    return false;
  }

  async function executeCmd(
    device: string,
    command: string,
    options?: ExecuteOptions,
  ): Promise<TerminalResult> {
    const term = terminals[device];
    if (!term) {
      try {
        dprint("[term] EXEC ERROR: no terminal for device=" + device);
      } catch {}
      return Promise.reject(new Error(`No terminal attached to ${device}`));
    }

    const execResult = await executeCommand(device, command, term as any, options);
    
    // Mapear al formato antiguo esperado por ExecutionEngine
    return {
      ok: execResult.ok,
      output: execResult.output,
      status: execResult.status ?? 0,
      session: {
        mode: execResult.modeAfter as any,
        prompt: execResult.promptAfter,
        paging: execResult.warnings.some(w => w.toLowerCase().includes("paginación")),
        awaitingConfirm: execResult.warnings.some(w => w.toLowerCase().includes("confirmación")),
      },
      mode: execResult.modeAfter as IosMode,
    };
  }

  function continuePager(device: string): void {
    try {
      dprint("[term] PAGER CONTINUE device=" + device);
    } catch {}
    const term = terminals[device];
    if (term) {
      term.enterChar(32, 0);
    }
  }

  function confirmPrompt(device: string): void {
    try {
      dprint("[term] CONFIRM device=" + device);
    } catch {}
    const term = terminals[device];
    if (term) {
      term.enterChar(13, 0);
    }
  }

  return {
    attach,
    detach,
    getSession,
    getMode,
    isBusy,
    isAnyBusy,
    executeCommand: executeCmd,
    continuePager,
    confirmPrompt,
  };
}

export type { PTCommandLine };
export type TerminalEngine = ReturnType<typeof createTerminalEngine>;
```

## packages/pt-runtime/src/pt/kernel/execution-engine.ts
```ts
// packages/pt-runtime/src/pt/kernel/execution-engine.ts
// Execution Engine para Deferred Jobs IOS
// Responsabilidades: tipos de job, contexto, ejecución de steps, serialización a KernelJobState

import type {
  DeferredJobPlan,
  DeferredStep,
  DeferredStepType,
  KernelJobState,
} from "../../runtime/contracts";
import type { TerminalEngine, TerminalResult } from "../terminal/terminal-engine";

export type JobPhase =
  | "pending"
  | "waiting-ensure-mode"
  | "waiting-command"
  | "waiting-confirm"
  | "waiting-prompt"
  | "waiting-save"
  | "waiting-delay"
  | "completed"
  | "error";

export interface JobStepResult {
  stepIndex: number;
  stepType: DeferredStepType;
  command: string;
  raw: string;
  status: number | null;
  error?: string;
  completedAt: number;
}

export interface JobContext {
  plan: DeferredJobPlan;
  currentStep: number;
  phase: JobPhase;
  outputBuffer: string;
  startedAt: number;
  updatedAt: number;
  stepResults: JobStepResult[];
  lastMode: string;
  lastPrompt: string;
  paged: boolean;
  waitingForCommandEnd: boolean;
  finished: boolean;
  result: TerminalResult | null;
  error: string | null;
  errorCode: string | null;
  pendingDelay: number | null;
  waitingForConfirm: boolean;
}

export interface ActiveJob {
  id: string;
  device: string;
  context: JobContext;
  pendingCommand: Promise<TerminalResult> | null;
}

// ============================================================================
// INTERFAZ PÚBLICA
// ============================================================================

export interface ExecutionEngine {
  startJob(plan: DeferredJobPlan): ActiveJob;
  advanceJob(jobId: string): void;
  getJob(jobId: string): ActiveJob | null;
  getActiveJobs(): ActiveJob[];
  isJobFinished(jobId: string): boolean;
}

// ============================================================================
// IMPLEMENTACIÓN
// ============================================================================

export function createExecutionEngine(terminal: TerminalEngine): ExecutionEngine {
  const jobs: Record<string, ActiveJob> = {};

  function execLog(message: string): void {
    try {
      dprint("[exec] " + message);
    } catch {}
  }

  function getJobTimeoutMs(job: ActiveJob): number {
    const commandTimeout = Number(job.context.plan.options.commandTimeoutMs || 30000);
    const stallTimeout = Number(job.context.plan.options.stallTimeoutMs || 15000);
    return Math.max(commandTimeout + stallTimeout + 2000, 5000);
  }

  function isJobFinished(jobId: string): boolean {
    const job = jobs[jobId];
    if (!job) return true;
    return job.context.finished === true || job.context.phase === "completed" || job.context.phase === "error";
  }

  function createJobContext(plan: DeferredJobPlan): JobContext {
    const now = Date.now();

    return {
      plan,
      currentStep: 0,
      phase: "pending",
      outputBuffer: "",
      startedAt: now,
      updatedAt: now,
      stepResults: [],
      lastMode: "unknown",
      lastPrompt: "",
      paged: false,
      waitingForCommandEnd: false,
      finished: false,
      result: null,
      error: null,
      errorCode: null,
      pendingDelay: null,
      waitingForConfirm: false,
    };
  }

  function resolvePacketTracerIpc(): any {
    // 1. self — funciona en PT QTScript, browsers y Node
    try {
      if (typeof self !== "undefined" && self) {
        const root = self as any;
        if (root.ipc && typeof root.ipc.network === "function") {
          return root.ipc;
        }
      }
    } catch {}
 
    // 2. Free variable 'ipc' — Packet Tracer nativo (QTScript)
    try {
      if (typeof ipc !== "undefined" && ipc && typeof ipc.network === "function") {
        return ipc;
      }
    } catch {}
 
    // 3. _ScriptModule.context.ipc — fallback PT
    try {
      if (typeof _ScriptModule !== "undefined" && _ScriptModule) {
        const scriptModule = _ScriptModule as any;
        const context = scriptModule.context;
        const scriptModuleIpc = context && context.ipc;
        if (scriptModuleIpc && typeof scriptModuleIpc.network === "function") {
          return scriptModuleIpc;
        }
      }
    } catch {}
 
    return null;
  }

  function readTerminalTextSafe(term: any): string {
    const methods = [
      "getAllOutput",
      "getBuffer",
      "getOutput",
      "getText",
      "readAll",
      "read",
      "getHistory",
      "history",
    ];

    for (let i = 0; i < methods.length; i += 1) {
      const name = methods[i];

      try {
        if (typeof term[name] === "function") {
          const value = term[name]();
          if (value && typeof value === "string") {
            return value;
          }
        }
      } catch {}
    }

    try {
      if (typeof term.getConsole === "function") {
        const consoleObj = term.getConsole();

        if (consoleObj) {
          for (let i = 0; i < methods.length; i += 1) {
            const name = methods[i];

            try {
              if (typeof consoleObj[name] === "function") {
                const value = consoleObj[name]();
                if (value && typeof value === "string") {
                  return value;
                }
              }
            } catch {}
          }
        }
      }
    } catch {}

    return "";
  }

  function inferPromptFromTerminalText(text: string): string {
    const lines = String(text || "")
      .replace(/\r/g, "")
      .split("\n")
      .map(function (line) {
        return line.trim();
      })
      .filter(Boolean);

    for (let i = lines.length - 1; i >= 0; i -= 1) {
      const line = lines[i] || "";

      if (/^[A-Za-z0-9._-]+(?:\(config[^)]*\))?[>#]$/.test(line)) {
        return line;
      }

      if (/[A-Z]:\\>$/.test(line)) {
        return line;
      }
    }

    return "";
  }

  function createAttachableTerminal(term: any): any {
    return {
      getPrompt: function () {
        try {
          if (typeof term.getPrompt === "function") {
            const prompt = term.getPrompt();
            if (prompt && typeof prompt === "string") {
              return prompt;
            }
          }
        } catch {}

        return inferPromptFromTerminalText(readTerminalTextSafe(term));
      },

      getMode: function () {
        try {
          if (typeof term.getMode === "function") {
            return term.getMode();
          }
        } catch {}

        const prompt = inferPromptFromTerminalText(readTerminalTextSafe(term));
        if (/\(config[^)]*\)#\s*$/.test(prompt)) return "global-config";
        if (/#\s*$/.test(prompt)) return "privileged-exec";
        if (/>$/.test(prompt)) return "user-exec";
        return "unknown";
      },

      getOutput: function () {
        try {
          if (typeof term.getOutput === "function") {
            return term.getOutput();
          }
        } catch {}

        return readTerminalTextSafe(term);
      },

      getAllOutput: function () {
        try {
          if (typeof term.getAllOutput === "function") {
            return term.getAllOutput();
          }
        } catch {}

        return readTerminalTextSafe(term);
      },

      getBuffer: function () {
        try {
          if (typeof term.getBuffer === "function") {
            return term.getBuffer();
          }
        } catch {}

        return readTerminalTextSafe(term);
      },

      getCommandInput: function () {
        try {
          if (typeof term.getCommandInput === "function") {
            return term.getCommandInput();
          }
        } catch {}

        return "";
      },

      enterCommand: function (cmd: string) {
        return term.enterCommand(cmd);
      },

      enterChar: function (charCode: number, modifiers: number) {
        return term.enterChar(charCode, modifiers);
      },

      registerEvent: function (
        eventName: string,
        context: unknown,
        handler: (src: unknown, args: unknown) => void,
      ) {
        return term.registerEvent(eventName, context, handler);
      },

      unregisterEvent: function (
        eventName: string,
        context: unknown,
        handler: (src: unknown, args: unknown) => void,
      ) {
        return term.unregisterEvent(eventName, context, handler);
      },

      println: function (text: string) {
        if (typeof term.println === "function") {
          return term.println(text);
        }
      },

      flush: function () {
        if (typeof term.flush === "function") {
          return term.flush();
        }
      },

      getConsole: function () {
        if (typeof term.getConsole === "function") {
          return term.getConsole();
        }

        return null;
      },
    };
  }

  function tryAttachTerminal(device: string): boolean {
    try {
      const resolvedIpc = resolvePacketTracerIpc();

      if (!resolvedIpc) {
        execLog("ATTACH failed device=" + device + " reason=no-ipc");
        return false;
      }

      const net = typeof resolvedIpc.network === "function" ? resolvedIpc.network() : null;

      if (!net || typeof net.getDevice !== "function") {
        execLog("ATTACH failed device=" + device + " reason=no-network");
        return false;
      }

      const dev = net.getDevice(device);

      if (!dev) {
        execLog("ATTACH failed device=" + device + " reason=no-device");
        return false;
      }

      if (typeof dev.getCommandLine !== "function") {
        execLog("ATTACH failed device=" + device + " reason=no-get-command-line");
        return false;
      }

      const term = dev.getCommandLine();

      if (!term) {
        execLog("ATTACH failed device=" + device + " reason=no-command-line");
        return false;
      }

      if (typeof term.enterCommand !== "function") {
        execLog("ATTACH failed device=" + device + " reason=no-enter-command");
        return false;
      }

      if (typeof term.registerEvent !== "function") {
        execLog("ATTACH failed device=" + device + " reason=no-register-event");
        return false;
      }

      if (typeof term.unregisterEvent !== "function") {
        execLog("ATTACH failed device=" + device + " reason=no-unregister-event");
        return false;
      }

      terminal.attach(device, createAttachableTerminal(term) as any);
      return true;
    } catch (error) {
      execLog("ATTACH failed device=" + device + " error=" + String(error));
      return false;
    }
  }

  function isConfigMode(mode: string | null | undefined): boolean {
    return String(mode ?? "").startsWith("config");
  }

  function cleanupConfigSession(device: string, mode: string | null | undefined, prompt: string | null | undefined): void {
    if (!isConfigMode(mode) && !/\(config[^)]*\)#\s*$/.test(String(prompt ?? ""))) {
      return;
    }

    execLog("CLEANUP config session device=" + device);
    void terminal
      .executeCommand(device, "end", {
        commandTimeoutMs: 5000,
        allowPager: false,
        autoConfirm: false,
      })
      .catch(function (error) {
        execLog("CLEANUP failed device=" + device + " error=" + String(error));
      });
  }

  // ============================================================================
  // Helpers para detección de prompt y output completo
  // ============================================================================

  function normalizeEol(value: unknown): string {
    return String(value ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  }

  function isIosPrompt(value: unknown): boolean {
    const line = String(value ?? "").trim();
    return /^[A-Za-z0-9._-]+(?:\(config[^)]*\))?[>#]$/.test(line);
  }

  function lastNonEmptyLine(value: unknown): string {
    const lines = normalizeEol(value)
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    return lines.length > 0 ? lines[lines.length - 1] : "";
  }

  function outputLooksComplete(output: string, command: string): boolean {
    const text = normalizeEol(output);
    const cmd = String(command ?? "").trim().toLowerCase();

    if (!text.trim()) return false;

    const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
    const hasCommandEcho = cmd.length > 0 && lines.some((line) => line.toLowerCase() === cmd);
    const hasPromptAtEnd = isIosPrompt(lastNonEmptyLine(text));
    const hasMeaningfulBody = lines.some((line) => {
      if (!line) return false;
      if (cmd && line.toLowerCase() === cmd) return false;
      if (isIosPrompt(line)) return false;
      return true;
    });

    return hasCommandEcho && hasPromptAtEnd && hasMeaningfulBody;
  }

  function reapStaleJobs(): void {
    const now = Date.now();

    for (const key in jobs) {
      const job = jobs[key];
      if (!job || job.context.finished || job.context.phase === "completed" || job.context.phase === "error") {
        continue;
      }

      if (job.pendingCommand === null) {
        continue;
      }

      if (now - job.context.updatedAt <= getJobTimeoutMs(job)) {
        const output = String(job.context.outputBuffer ?? "");
        const lastPrompt = String(job.context.lastPrompt ?? "");
        const waitingForCommandEnd = job.context.waitingForCommandEnd === true;

        const looksBackAtPrompt =
          /^[A-Za-z0-9._-]+(?:\(config[^)]*\))?[>#]$/.test(lastPrompt.trim());

        const hasOutput = output.trim().length > 0;

        if (
          waitingForCommandEnd &&
          job.context.phase === "waiting-command" &&
          looksBackAtPrompt &&
          hasOutput &&
          now - job.context.updatedAt > 750
        ) {
          execLog(
            "JOB FORCE COMPLETE FROM PROMPT id=" +
              job.id +
              " device=" +
              job.device +
              " prompt=" +
              lastPrompt,
          );

          job.pendingCommand = null;
          job.context.waitingForCommandEnd = false;
          job.context.phase = "completed";
          job.context.finished = true;
          job.context.error = null;
          job.context.errorCode = null;
          job.context.updatedAt = now;

          job.context.result = {
            ok: true,
            output,
            status: 0,
            prompt: lastPrompt,
            mode: job.context.lastMode,
          } as any;

          cleanupConfigSession(job.device, job.context.lastMode, job.context.lastPrompt);
          wakePendingJobsForDevice(job.device);
        }
        continue;
      }

      execLog("JOB TIMEOUT id=" + job.id + " device=" + job.device + " phase=" + job.context.phase);
      job.pendingCommand = null;
      job.context.phase = "error";
      job.context.finished = true;
      job.context.error = "Job timed out while waiting for terminal command completion";
      job.context.errorCode = "JOB_TIMEOUT";
      job.context.updatedAt = now;
      cleanupConfigSession(job.device, job.context.lastMode, job.context.lastPrompt);
      wakePendingJobsForDevice(job.device);
    }
  }

  function wakePendingJobsForDevice(device: string): void {
    setTimeout(function () {
      for (const key in jobs) {
        const other = jobs[key];
        if (!other) continue;
        if (other.device !== device) continue;
        if (isJobFinished(key)) continue;
        if (other.pendingCommand !== null) continue;
        advanceJob(key);
      }
    }, 0);
  }

  function modeMatches(actual: unknown, expected: unknown): boolean {
    const current = String(actual ?? "").trim();
    const target = String(expected ?? "").trim();

    if (!target) return true;
    if (current === target) return true;

    if (target === "global-config") {
      return current === "config" || current === "global-config";
    }

    if (target === "privileged-exec") {
      return current === "privileged-exec";
    }

    return false;
  }

  function inferModeFromPrompt(prompt: string): string {
    const value = String(prompt ?? "").trim();

    if (/\(config[^)]*\)#$/.test(value)) return "config";
    if (/#$/.test(value)) return "privileged-exec";
    if (/>$/.test(value)) return "user-exec";

    return "unknown";
  }

  function readSession(device: string): { mode: string; prompt: string } {
    try {
      const session = terminal.getSession(device) as any;
      const prompt = String(session?.prompt ?? "");
      const mode = String(session?.mode ?? "unknown");

      return {
        mode: mode === "unknown" ? inferModeFromPrompt(prompt) : mode,
        prompt,
      };
    } catch {
      return { mode: "unknown", prompt: "" };
    }
  }

  function commandForEnsureMode(currentMode: string, targetMode: string): string | null {
    if (modeMatches(currentMode, targetMode)) return null;

    if (targetMode === "privileged-exec") {
      if (isConfigMode(currentMode)) return "end";
      return "enable";
    }

    if (targetMode === "global-config" || targetMode === "config") {
      if (currentMode === "user-exec" || currentMode === "unknown") return "enable";
      if (currentMode === "privileged-exec") return "configure terminal";
    }

    return null;
  }

  function completeJobIfLastStep(job: ActiveJob, result: TerminalResult | null): boolean {
    const ctx = job.context;

    if (ctx.currentStep < ctx.plan.plan.length) {
      return false;
    }

    execLog("JOB COMPLETED id=" + job.id + " steps=" + ctx.stepResults.length);
    ctx.phase = "completed";
    ctx.result = result;
    ctx.finished = true;
    ctx.updatedAt = Date.now();
    wakePendingJobsForDevice(job.device);
    return true;
  }

  function promptMatches(prompt: string, expectedPrompt: string): boolean {
    if (!expectedPrompt) return true;
    if (prompt.indexOf(expectedPrompt) >= 0) return true;

    try {
      return new RegExp(expectedPrompt).test(prompt);
    } catch {
      return false;
    }
  }

  function getCurrentStep(ctx: JobContext): DeferredStep | null {
    if (ctx.currentStep >= ctx.plan.plan.length) return null;
    return ctx.plan.plan[ctx.currentStep];
  }

  function executeCurrentStep(job: ActiveJob): void {
    const ctx = job.context;
    const step = getCurrentStep(ctx);

    if (!step) {
      execLog("JOB COMPLETE id=" + job.id + " device=" + job.device);
      ctx.phase = "completed";
      ctx.finished = true;
      return;
    }

    const stepType = step.type;
    const timeout = step.options?.timeoutMs ?? ctx.plan.options.commandTimeoutMs;
    const stopOnError = step.options?.stopOnError ?? ctx.plan.options.stopOnError;

    switch (stepType) {
      case "delay": {
        const delayMs = parseInt(step.value || "1000", 10);
        execLog("DELAY id=" + job.id + " ms=" + delayMs);
        ctx.phase = "waiting-delay";
        ctx.pendingDelay = delayMs;
        setTimeout(function () {
          ctx.pendingDelay = null;
          advanceJob(job.id);
        }, delayMs);
        break;
      }

      case "ensure-mode": {
        const targetMode = String(
          (step as any).expectMode ||
            (step.options as any)?.expectedMode ||
            step.value ||
            "privileged-exec",
        );

        const session = readSession(job.device);
        const command = commandForEnsureMode(session.mode, targetMode);

        ctx.phase = "waiting-ensure-mode";
        ctx.lastMode = session.mode;
        ctx.lastPrompt = session.prompt;

        if (!targetMode || command === null) {
          if (targetMode && !modeMatches(session.mode, targetMode)) {
            execLog("ENSURE MODE unsupported target=" + targetMode + " current=" + session.mode + " id=" + job.id);
            if (stopOnError) {
              ctx.phase = "error";
              ctx.error = "Cannot ensure terminal mode " + targetMode + " from " + session.mode;
              ctx.errorCode = "ENSURE_MODE_UNSUPPORTED";
              ctx.finished = true;
              ctx.updatedAt = Date.now();
              wakePendingJobsForDevice(job.device);
              return;
            }
          }

          ctx.stepResults.push({
            stepIndex: ctx.currentStep,
            stepType: stepType,
            command: "",
            raw: "",
            status: 0,
            completedAt: Date.now(),
          });
          ctx.currentStep++;
          ctx.phase = "pending";
          ctx.updatedAt = Date.now();
          if (!completeJobIfLastStep(job, null)) advanceJob(job.id);
          return;
        }

        execLog(
          "ENSURE MODE id=" +
            job.id +
            " device=" +
            job.device +
            " current=" +
            session.mode +
            " target=" +
            targetMode +
            " cmd='" +
            command +
            "'",
        );

        const ensureModeTimeoutMs = Number((step.options as any)?.timeoutMs ?? 8000);

        ctx.waitingForCommandEnd = true;
        job.pendingCommand = terminal.executeCommand(job.device, command, {
          commandTimeoutMs: ensureModeTimeoutMs,
          stallTimeoutMs: ctx.plan.options.stallTimeoutMs,
          expectedMode: targetMode as any,
          allowPager: false,
          autoAdvancePager: false,
          maxPagerAdvances: 0,
          autoConfirm: false,
          autoDismissWizard: true,
          allowEmptyOutput: true,
          sendEnterFallback: false,
        });

        job.pendingCommand
          .then(function (result) {
            if (ctx.finished) return;

            job.pendingCommand = null;
            ctx.waitingForCommandEnd = false;
            ctx.outputBuffer += result.output;
            ctx.lastPrompt = result.session.prompt;
            ctx.lastMode = result.session.mode;
            ctx.paged = result.session.paging;

            ctx.stepResults.push({
              stepIndex: ctx.currentStep,
              stepType: stepType,
              command: command,
              raw: result.output,
              status: result.status,
              completedAt: Date.now(),
            });

            if (!modeMatches(result.session.mode, targetMode)) {
              execLog(
                "ENSURE MODE FAILED id=" +
                  job.id +
                  " expected=" +
                  targetMode +
                  " actual=" +
                  result.session.mode,
              );
              ctx.phase = "error";
              ctx.error = "Expected mode " + targetMode + ", got " + result.session.mode;
              ctx.errorCode = "ENSURE_MODE_FAILED";
              ctx.finished = true;
              ctx.updatedAt = Date.now();
              cleanupConfigSession(job.device, result.session.mode, result.session.prompt);
              wakePendingJobsForDevice(job.device);
              return;
            }

            ctx.currentStep++;
            ctx.phase = "pending";
            ctx.error = null;
            ctx.errorCode = null;
            ctx.updatedAt = Date.now();

            if (!completeJobIfLastStep(job, result)) advanceJob(job.id);
          })
          .catch(function (err) {
            if (ctx.finished) return;
            execLog("ENSURE MODE ERROR id=" + job.id + " error=" + String(err));
            job.pendingCommand = null;
            ctx.waitingForCommandEnd = false;
            ctx.phase = "error";
            ctx.error = String(err);
            ctx.errorCode = "ENSURE_MODE_EXEC_ERROR";
            ctx.finished = true;
            ctx.updatedAt = Date.now();
            cleanupConfigSession(job.device, ctx.lastMode, ctx.lastPrompt);
            wakePendingJobsForDevice(job.device);
          });
        break;
      }

      case "expect-prompt": {
        const expectedPrompt = String(
          (step.options as any)?.expectedPrompt ||
            (step as any).expectPromptPattern ||
            step.value ||
            "",
        );

        const session = readSession(job.device);
        const prompt = session.prompt || ctx.lastPrompt;
        const matched = promptMatches(prompt, expectedPrompt);

        if (!matched && stopOnError) {
          ctx.phase = "error";
          ctx.error = "Expected prompt " + expectedPrompt + ", got " + prompt;
          ctx.errorCode = "EXPECT_PROMPT_FAILED";
          ctx.finished = true;
          ctx.updatedAt = Date.now();
          wakePendingJobsForDevice(job.device);
          return;
        }

        ctx.stepResults.push({
          stepIndex: ctx.currentStep,
          stepType: stepType,
          command: "",
          raw: prompt,
          status: 0,
          completedAt: Date.now(),
        });
        ctx.lastMode = session.mode;
        ctx.lastPrompt = prompt;
        ctx.currentStep++;
        ctx.phase = "pending";
        ctx.updatedAt = Date.now();
        if (!completeJobIfLastStep(job, null)) advanceJob(job.id);
        break;
      }

      case "release-session":
      case "close-session": {
        execLog("RELEASE SESSION id=" + job.id + " device=" + job.device);
        terminal.detach(job.device);
        ctx.phase = "completed";
        ctx.finished = true;
        wakePendingJobsForDevice(job.device);
        break;
      }

      case "logout-session": {
        execLog("LOGOUT SESSION id=" + job.id + " device=" + job.device);
        try {
          // Obtener el terminal directamente y enviar exit
          var net = typeof ipc !== "undefined" ? ipc.network() : null;
          if (net) {
            var dev = net.getDevice(job.device);
            if (dev && dev.getCommandLine) {
              var term = dev.getCommandLine();
              if (term && term.enterCommand) {
                term.enterCommand("exit");
              }
            }
          }
        } catch (e) {}
        terminal.detach(job.device);
        ctx.phase = "completed";
        ctx.finished = true;
        wakePendingJobsForDevice(job.device);
        break;
      }

      case "confirm": {
        execLog("CONFIRM id=" + job.id + " device=" + job.device);
        terminal.confirmPrompt(job.device);
        ctx.currentStep++;
        ctx.phase = "pending";
        ctx.updatedAt = Date.now();
        advanceJob(job.id);
        break;
      }

      case "command":
      case "save-config": {
        let command = step.value || "";
        if (stepType === "save-config") {
          command = "write memory";
        }

        if (!command) {
          execLog("SKIP empty command step=" + ctx.currentStep + " id=" + job.id);
          ctx.currentStep++;
          advanceJob(job.id);
          return;
        }

        ctx.phase = stepType === "save-config" ? "waiting-save" : "waiting-command";
```

## packages/pt-runtime/src/handlers/terminal-plan-run.ts
```ts
import type { RuntimeApi, RuntimeResult, DeferredJobPlan } from "../runtime/contracts.js";
import { createDeferredResult, createErrorResult } from "./result-factories.js";

interface TerminalPlanRunPayload {
  type: "terminal.plan.run";
  plan?: {
    id?: string;
    device?: string;
    targetMode?: string;
    steps?: Array<{
      kind?: string;
      command?: string;
      expectMode?: string;
      expectPromptPattern?: string;
      allowPager?: boolean;
      allowConfirm?: boolean;
      optional?: boolean;
      timeout?: number;
      metadata?: Record<string, unknown>;
    }>;
    timeouts?: {
      commandTimeoutMs?: number;
      stallTimeoutMs?: number;
    };
    policies?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  };
  options?: {
    timeoutMs?: number;
    stallTimeoutMs?: number;
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function normalizeStep(step: any): any {
  var kind = String(step.kind || "command");

  if (kind === "ensureMode") kind = "ensure-mode";
  if (kind === "expectPrompt") kind = "expect-prompt";
  if (kind === "saveConfig") kind = "save-config";
  if (kind === "closeSession") kind = "close-session";

  const timeoutMs = Number(step.timeout || 0) || undefined;

  return {
    type: kind,
    kind: kind,
    value: String(step.command || step.expectMode || step.expectPromptPattern || ""),
    command: step.command ? String(step.command) : undefined,
    expectMode: step.expectMode ? String(step.expectMode) : undefined,
    expectPromptPattern: step.expectPromptPattern ? String(step.expectPromptPattern) : undefined,
    allowPager: step.allowPager !== false,
    allowConfirm: step.allowConfirm === true,
    optional: step.optional === true,
    timeoutMs,
    options: {
      timeoutMs,
      expectedPrompt: step.expectPromptPattern ? String(step.expectPromptPattern) : undefined,
    },
    metadata: isObject(step.metadata) ? step.metadata : {},
  };
}

function buildDeferredPlan(payload: TerminalPlanRunPayload, api: RuntimeApi): DeferredJobPlan | null {
  var plan = payload.plan;

  if (!plan || !String(plan.device || "").trim()) {
    return null;
  }

  var steps = Array.isArray(plan.steps) ? plan.steps : [];
  if (!Array.isArray(plan.steps)) {
    return null;
  }

  var id = String(plan.id || "");
  if (!id) {
    id = "terminal_plan_" + String(api.now()) + "_" + String(Math.floor(Math.random() * 100000));
  }

  return {
    id: id,
    kind: "ios-session",
    version: 1,
    device: String(plan.device),
    plan: steps.map(normalizeStep),
    options: {
      stopOnError: true,
      commandTimeoutMs: Number(plan.timeouts?.commandTimeoutMs || payload.options?.timeoutMs || 30000),
      stallTimeoutMs: Number(plan.timeouts?.stallTimeoutMs || payload.options?.stallTimeoutMs || 15000),
    },
    payload: {
      source: "terminal.plan.run",
      metadata: isObject(plan.metadata) ? plan.metadata : {},
      policies: isObject(plan.policies) ? plan.policies : {},
    },
  } as unknown as DeferredJobPlan;
}

export function handleTerminalPlanRun(
  payload: TerminalPlanRunPayload,
  api: RuntimeApi,
): RuntimeResult {
  var deferredPlan = buildDeferredPlan(payload, api);

  if (!deferredPlan) {
    return createErrorResult("terminal.plan.run requiere plan.device y plan.steps", "INVALID_TERMINAL_PLAN");
  }

  if (!api || typeof api.createJob !== "function") {
    return createErrorResult(
      "terminal.plan.run requiere RuntimeApi.createJob para registrar el job diferido",
      "RUNTIME_API_MISSING_CREATE_JOB",
      {
        details: { job: deferredPlan },
      } as any,
    );
  }

  var ticket = String(api.createJob(deferredPlan) || deferredPlan.id || payload.plan?.id || "terminal_plan");
  deferredPlan.id = ticket;

  return createDeferredResult(ticket, deferredPlan);
}
```

## packages/pt-runtime/src/handlers/poll-deferred.ts
```ts
import type { RuntimeApi, RuntimeResult } from "../runtime/contracts.js";

interface PollDeferredPayload {
  ticket?: string;
}

export function handlePollDeferred(payload: PollDeferredPayload, api: RuntimeApi): RuntimeResult {
  const ticket = String(payload.ticket ?? "").trim();

  if (!ticket) {
    return { ok: false, error: "Missing ticket", code: "INVALID_PAYLOAD" } as RuntimeResult;
  }

  const jobState = api.getJobState(ticket);
  if (!jobState) {
    return { ok: false, error: `Job not found: ${ticket}`, code: "UNKNOWN_COMMAND" } as RuntimeResult;
  }

  const finished =
    jobState.finished === true ||
    (jobState as any).done === true ||
    jobState.state === "completed" ||
    jobState.state === "error";

  if (!finished) {
    const currentStep = jobState.currentStep ?? 0;
    const currentStepData = jobState.plan.plan[currentStep];
    return {
      ok: true,
      deferred: true,
      ticket,
      done: false,
      state: jobState.state,
      currentStep,
      totalSteps: jobState.plan.plan.length,
      stepType: currentStepData?.type,
      stepValue: currentStepData?.value,
      outputTail: jobState.outputBuffer ? jobState.outputBuffer.slice(-500) : "",
      lastPrompt: jobState.lastPrompt,
      lastMode: jobState.lastMode,
      waitingForCommandEnd: jobState.waitingForCommandEnd,
      updatedAt: jobState.updatedAt,
      ageMs: Date.now() - jobState.startedAt,
      idleMs: Date.now() - jobState.updatedAt,
    } as unknown as RuntimeResult;
  }

  const output = String(jobState.outputBuffer ?? (jobState.result as any)?.raw ?? (jobState.result as any)?.output ?? "");
  const status = jobState.error || jobState.state === "error" ? 1 : Number((jobState.result as any)?.status ?? 0);

  return {
    done: true,
    ok: !jobState.error && jobState.state !== "error",
    status,
    result: jobState.result,
    error: jobState.error || undefined,
    code: jobState.errorCode || undefined,
    errorCode: jobState.errorCode || undefined,
    raw: output,
    output,
    source: "terminal",
    session: {
      mode: String(jobState.lastMode ?? ""),
      prompt: String(jobState.lastPrompt ?? ""),
      paging: jobState.paged === true,
      awaitingConfirm: false,
    },
  } as unknown as RuntimeResult;
}
```

## packages/pt-control/src/adapters/runtime-terminal/adapter.ts
```ts
// RuntimeTerminalAdapter — orchestrator (runTerminalPlan)
// Coordinates step handlers, status normalization, and device detection.
// No pure logic lives here — it delegates to specialized modules.

import type { FileBridgePort } from "../../application/ports/file-bridge.port.js";
import type {
  RuntimeTerminalPort,
  TerminalPortOptions,
  TerminalPortResult,
  TerminalPlan,
  TerminalPlanTimeouts,
  TerminalPlanPolicies,
} from "../../ports/runtime-terminal-port.js";
import { detectDeviceType } from "./device-type-detector.js";
import { handleEnsureModeStep } from "./step-handlers/ensure-mode-handler.js";
import { handleConfirmStep } from "./step-handlers/confirm-handler.js";
import { ensureSession, pollTerminalJob } from "./terminal-session.js";
import { createPayloadBuilder } from "./payload-builder.js";
import { createResponseParser } from "./response-parser.js";
import { createTerminalPlanAdapter } from "./terminal-plan-adapter.js";

export interface RuntimeTerminalAdapterDeps {
  bridge: FileBridgePort;
  generateId: () => string;
  defaultTimeout?: number;
}

export function createRuntimeTerminalAdapter(
  deps: RuntimeTerminalAdapterDeps,
): RuntimeTerminalPort {
  const { bridge, generateId, defaultTimeout = 30000 } = deps;

  const payloadBuilder = createPayloadBuilder({ bridge });
  const responseParser = createResponseParser();
  const planAdapter = createTerminalPlanAdapter();

  function normalizeBridgeValue(result: unknown): unknown {
    return (result as { value?: unknown })?.value ?? result ?? {};
  }

  function buildTimingsEvidence(timings: unknown): Record<string, unknown> {
    return timings ? { timings } : {};
  }

  function isDeferredValue(value: unknown): value is { deferred: true; ticket: string } {
    return (
      typeof value === "object" &&
      value !== null &&
      (value as { deferred?: unknown }).deferred === true &&
      typeof (value as { ticket?: unknown }).ticket === "string"
    );
  }

  function isStillPending(value: unknown): boolean {
    if (!value || typeof value !== "object") {
      return false;
    }

    const record = value as Record<string, unknown>;
    if (record.deferred === true) return true;
    if (record.done === false) return true;
    if (record.status === "pending") return true;
    if (record.status === "in-flight") return true;
    if (record.status === "running") return true;
    return false;
  }

  function isUnsupportedTerminalPlanRun(result: unknown): boolean {
    const value = result as { error?: unknown; value?: { error?: unknown } } | null | undefined;
    const text = String(value?.error ?? value?.value?.error ?? "").toLowerCase();
    return (
      text.includes("unknown command") ||
      text.includes("not found") ||
      text.includes("unsupported") ||
      text.includes("unrecognized") ||
      text.includes("no existe")
    );
  }

  function buildTerminalTransportFailure(
    message: string,
    evidence?: Record<string, unknown>,
  ): TerminalPortResult {
    return {
      ok: false,
      output: "",
      status: 1,
      promptBefore: "",
      promptAfter: "",
      modeBefore: "",
      modeAfter: "",
      events: [],
      warnings: [message],
      parsed: {
        ok: false,
        code: "TERMINAL_PLAN_TRANSPORT_FAILED",
        error: message,
      },
      evidence,
      confidence: 0,
    };
  }

  function buildTerminalDeferredFailure(
    code: string,
    message: string,
    evidence?: Record<string, unknown>,
  ): TerminalPortResult {
    return {
      ok: false,
      output: "",
      status: 1,
      promptBefore: "",
      promptAfter: "",
      modeBefore: "",
      modeAfter: "",
      events: [],
      warnings: [message],
      parsed: {
        ok: false,
        code,
        error: message,
      },
      evidence,
      confidence: 0,
    };
  }

  async function executeLegacyPlan(normalizedPlan: ReturnType<typeof planAdapter.normalizePlan>): Promise<TerminalPortResult> {
    let promptBefore = "";
    let modeBefore = "";
    let promptAfter = "";
    let modeAfter = "";
    let aggregatedOutput = "";
    let finalStatus = 0;
    let finalParsed: unknown = undefined;
    let finalTimings: unknown = undefined;

    const warnings: string[] = [];
    const events: Array<Record<string, unknown>> = [];

    const deviceType = await detectDeviceType(bridge, normalizedPlan.device);
    const isHost = deviceType === "host";
    const handlerName = isHost ? "execPc" : "execIos";

    const defaultTimeouts = normalizedPlan.timeouts ?? payloadBuilder.getDefaultTimeouts();
    const defaultPolicies = normalizedPlan.policies ?? payloadBuilder.getDefaultPolicies();

    for (let i = 0; i < normalizedPlan.steps.length; i += 1) {
      const step = normalizedPlan.steps[i]!;

      if (step.kind === "ensureMode") {
        const { event, result, returnEarly, returnValue } = await handleEnsureModeStep(
          {
            bridge,
            device: normalizedPlan.device,
            isHost,
            handlerName,
            defaultTimeouts,
            planTargetMode: normalizedPlan.targetMode,
          },
          step,
          i,
        );

        if (result.promptBefore && !promptBefore) promptBefore = result.promptBefore;
        if (result.modeBefore && !modeBefore) modeBefore = result.modeBefore;
        if (result.promptAfter) promptAfter = result.promptAfter;
        if (result.modeAfter) modeAfter = result.modeAfter;
        if (result.finalParsed) finalParsed = result.finalParsed;

        events.push(event);

        if (returnEarly && returnValue) return returnValue;
        continue;
      }

      if (step.kind === "expectPrompt") {
        events.push({
          stepIndex: i,
          kind: "expectPrompt",
          expectPromptPattern: step.expectPromptPattern,
        });
        continue;
      }

      if (step.kind === "confirm") {
        const { event } = await handleConfirmStep(
          {
            bridge,
            device: normalizedPlan.device,
            isHost,
            handlerName,
            defaultTimeouts,
          },
          i,
        );
        events.push(event);
        continue;
      }

      const command = String(step.command ?? "");
      const stepTimeout = step.timeout ?? defaultTimeouts.commandTimeoutMs;
      const stepStallTimeout = defaultTimeouts.stallTimeoutMs;

      const payload = payloadBuilder.buildCommandPayload({
        handlerName,
        device: normalizedPlan.device,
        command,
        targetMode: normalizedPlan.targetMode,
        expectMode: step.expectMode,
        expectPromptPattern: step.expectPromptPattern,
        allowPager: step.allowPager ?? defaultPolicies.autoAdvancePager,
        allowConfirm: step.allowConfirm ?? false,
        ensurePrivileged: payloadBuilder.shouldEnsurePrivilegedForStep({
          isHost,
          planTargetMode: normalizedPlan.targetMode,
          command,
          stepIndex: i,
        }),
        commandTimeoutMs: stepTimeout,
        stallTimeoutMs: stepStallTimeout,
      });

      const bridgeResult = await bridge.sendCommandAndWait<unknown>(handlerName, payload, stepTimeout);
      finalTimings = bridgeResult.timings;
      const parsed = responseParser.parseCommandResponse(normalizeBridgeValue(bridgeResult), {
        stepIndex: i,
        isHost,
        command,
      });

      if (i === 0) {
        promptBefore = parsed.promptBefore;
        modeBefore = parsed.modeBefore;
      }

      promptAfter = parsed.promptAfter;
      modeAfter = parsed.modeAfter;
      aggregatedOutput += parsed.raw.endsWith("\n") ? parsed.raw : `${parsed.raw}\n`;
      finalStatus = parsed.status;
      finalParsed = parsed.parsed;

      warnings.push(...parsed.warnings);
      const event = responseParser.buildEventFromResponse(parsed, step, i);
      events.push(event);

      const mismatchWarning = responseParser.checkPromptMismatch(parsed, step);
      if (mismatchWarning) warnings.push(mismatchWarning);

      if (!parsed.ok || parsed.status !== 0) {
        return {
          ok: false,
          output: aggregatedOutput.trim(),
          status: parsed.status || 1,
          promptBefore,
          promptAfter,
          modeBefore,
          modeAfter,
          events,
          warnings,
          parsed: finalParsed,
          evidence: buildTimingsEvidence(bridgeResult.timings),
          confidence: 0,
        };
      }
    }

    return {
      ok: true,
      output: aggregatedOutput.trim(),
      status: finalStatus,
      promptBefore,
      promptAfter,
      modeBefore,
      modeAfter,
      events,
      warnings,
      parsed: finalParsed,
      evidence: buildTimingsEvidence(finalTimings),
      confidence: warnings.length > 0 ? 0.8 : 1,
    };
  }

  function computeDeferredPollTimeoutMs(plan: TerminalPlan, requestedTimeoutMs: number): number {
    const planTimeouts = plan.timeouts as TerminalPlanTimeouts | undefined;
    const commandTimeoutMs = Number(planTimeouts?.commandTimeoutMs ?? requestedTimeoutMs ?? 30000);
    const stallTimeoutMs = Number(planTimeouts?.stallTimeoutMs ?? 15000);
    const stepCount = Math.max(plan.steps.length, 1);

    const perStepBudgetMs = commandTimeoutMs + stallTimeoutMs + 3000;
    const totalBudgetMs = perStepBudgetMs * stepCount;

    return Math.max(requestedTimeoutMs, totalBudgetMs, 25000);
  }

  async function executeTerminalPlanRun(
    plan: TerminalPlan,
    timeoutMs: number,
  ): Promise<TerminalPortResult | null> {
    const submitTimeoutMs = Math.min(Number(plan.steps[0]?.timeout ?? timeoutMs), 5000);
    const submitResult = await bridge.sendCommandAndWait(
      "terminal.plan.run",
      { plan, options: { timeoutMs } },
      submitTimeoutMs,
      { resolveDeferred: false },
    );
    let finalTimings: unknown = submitResult.timings;

    if (isUnsupportedTerminalPlanRun(submitResult)) {
      return null;
    }

    const submitValue = normalizeBridgeValue(submitResult);

    if (
      submitValue &&
      typeof submitValue === "object" &&
      (submitValue as { ok?: unknown }).ok === false
    ) {
      const parsed = responseParser.parseCommandResponse(submitValue, {
        stepIndex: 0,
        isHost: false,
        command: "terminal.plan.run",
      });

      return {
        ok: false,
        output: parsed.raw.trim(),
        status: parsed.status || 1,
        promptBefore: parsed.promptBefore,
        promptAfter: parsed.promptAfter,
        modeBefore: parsed.modeBefore,
        modeAfter: parsed.modeAfter,
        events: [
          responseParser.buildEventFromResponse(
            parsed,
            { kind: "command", command: "terminal.plan.run" },
            0,
          ),
        ],
        warnings: parsed.warnings,
        parsed: parsed.parsed,
        evidence: buildTimingsEvidence(submitResult.timings),
        confidence: 0,
      };
    }

    if (isDeferredValue(submitValue)) {
      const startedAt = Date.now();
      const pollTimeoutMs = computeDeferredPollTimeoutMs(plan, timeoutMs);
      const pollIntervalMs = 300;

      let pollValue: unknown = null;

      while (Date.now() - startedAt < pollTimeoutMs) {
        try {
          const pollResult = await bridge.sendCommandAndWait(
            "__pollDeferred",
            { ticket: submitValue.ticket },
            Math.max(pollTimeoutMs - (Date.now() - startedAt), 1000),
            { resolveDeferred: false },
          );

          finalTimings = pollResult.timings;
          pollValue = normalizeBridgeValue(pollResult);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error ?? "Unknown poll error");

          return buildTerminalDeferredFailure(
            "TERMINAL_DEFERRED_POLL_TIMEOUT",
            `__pollDeferred no respondió en ${pollTimeoutMs}ms para ticket ${submitValue.ticket}: ${message}`,
            {
              phase: "terminal-plan-poll",
              ticket: submitValue.ticket,
              pollTimeoutMs,
              elapsedMs: Date.now() - startedAt,
              error: message,
            },
          );
        }

        if (!isStillPending(pollValue)) {
          break;
        }

        const remainingMs = pollTimeoutMs - (Date.now() - startedAt);
        if (remainingMs <= 0) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, Math.min(pollIntervalMs, remainingMs)));
      }

      if (isStillPending(pollValue)) {
        return buildTerminalDeferredFailure(
          "TERMINAL_DEFERRED_STALLED",
          `terminal.plan.run creó el ticket ${submitValue.ticket}, pero el job siguió pendiente después de ${pollTimeoutMs}ms.`,
          {
            phase: "terminal-plan-poll",
            ticket: submitValue.ticket,
            pollTimeoutMs,
            elapsedMs: Date.now() - startedAt,
            pollValue,
          },
        );
      }

      const parsed = responseParser.parseCommandResponse(pollValue, {
        stepIndex: 0,
        isHost: false,
        command: "terminal.plan.run",
      });

      const warnings = [...parsed.warnings];
      const mismatchWarning = responseParser.checkPromptMismatch(parsed, plan.steps[0] ?? {});
      if (mismatchWarning) warnings.push(mismatchWarning);

      return {
        ok: parsed.ok,
        output: parsed.raw.trim(),
        status: parsed.status,
        promptBefore: parsed.promptBefore,
        promptAfter: parsed.promptAfter,
        modeBefore: parsed.modeBefore,
        modeAfter: parsed.modeAfter,
        events: [responseParser.buildEventFromResponse(parsed, { kind: "command", command: "terminal.plan.run" }, 0)],
        warnings,
        parsed: parsed.parsed,
        evidence: buildTimingsEvidence(finalTimings),
        confidence: !parsed.ok || parsed.status !== 0 ? 0 : warnings.length > 0 ? 0.8 : 1,
      };
    }

    const parsed = responseParser.parseCommandResponse(submitValue, {
      stepIndex: 0,
      isHost: false,
      command: "terminal.plan.run",
    });

    const warnings = [...parsed.warnings];
    const mismatchWarning = responseParser.checkPromptMismatch(parsed, plan.steps[0] ?? {});
    if (mismatchWarning) warnings.push(mismatchWarning);

    return {
      ok: parsed.ok,
      output: parsed.raw.trim(),
      status: parsed.status,
      promptBefore: parsed.promptBefore,
      promptAfter: parsed.promptAfter,
      modeBefore: parsed.modeBefore,
      modeAfter: parsed.modeAfter,
      events: [responseParser.buildEventFromResponse(parsed, { kind: "command", command: "terminal.plan.run" }, 0)],
      warnings,
      parsed: parsed.parsed,
      evidence: buildTimingsEvidence(submitResult.timings),
      confidence: !parsed.ok || parsed.status !== 0 ? 0 : warnings.length > 0 ? 0.8 : 1,
    };
  }

  async function runTerminalPlan(
    plan: TerminalPlan,
    options?: TerminalPortOptions,
  ): Promise<TerminalPortResult> {
    const timeoutMs = options?.timeoutMs ?? defaultTimeout;

    const validation = planAdapter.validatePlan(plan);
    if (!validation.valid) {
      return {
        ok: false,
        output: "",
        status: 1,
        promptBefore: "",
        promptAfter: "",
        modeBefore: "",
        modeAfter: "",
        events: [],
        warnings: validation.errors,
        confidence: 0,
      };
    }

    if (validation.warnings.length > 0) {
      console.warn("[runtime-terminal] Plan warnings:", validation.warnings);
    }

    const normalizedPlan = planAdapter.normalizePlan(plan);

    const deferredResult = await executeTerminalPlanRun(normalizedPlan, timeoutMs);
    if (deferredResult) return deferredResult;

    return executeLegacyPlan(normalizedPlan);
  }

  return {
    runTerminalPlan,
    ensureSession,
    pollTerminalJob,
  };
}
```

## grep timers/promises/debug
```
packages/pt-runtime/src/terminal/command-output-extractor.ts:142: * Limpia el output final: elimina duplicados, trim, pager residual.
packages/pt-runtime/src/terminal/command-output-extractor.ts:149:  const pagerPatterns = [
packages/pt-runtime/src/terminal/command-output-extractor.ts:151:    /--More--/gi,
packages/pt-runtime/src/terminal/command-output-extractor.ts:158:  for (const pattern of pagerPatterns) {
packages/pt-runtime/src/terminal/stability-heuristic.ts:12:  pagerActive: boolean;
packages/pt-runtime/src/terminal/stability-heuristic.ts:90:  if (ctx.pagerActive) return { finished: false };
packages/pt-runtime/src/terminal/mode-guard.ts:46:  async function ensureNotInWizard(deviceName: string, terminal: PTCommandLine): Promise<ModeTransitionResult> {
packages/pt-runtime/src/terminal/mode-guard.ts:70:  async function escapeToExec(deviceName: string, terminal: PTCommandLine): Promise<ModeTransitionResult> {
packages/pt-runtime/src/terminal/mode-guard.ts:105:  async function ensureUserExec(deviceName: string, terminal: PTCommandLine): Promise<ModeTransitionResult> {
packages/pt-runtime/src/terminal/mode-guard.ts:152:  ): Promise<ModeTransitionResult> {
packages/pt-runtime/src/terminal/mode-guard.ts:154:      terminal.enterChar?.(13, 0);
packages/pt-runtime/src/terminal/mode-guard.ts:200:  async function sleepMs(ms: number): Promise<void> {
packages/pt-runtime/src/terminal/mode-guard.ts:201:    return new Promise((resolve) => setTimeout(resolve, ms));
packages/pt-runtime/src/terminal/mode-guard.ts:204:  async function ensurePrivilegedExec(deviceName: string, terminal: PTCommandLine): Promise<ModeTransitionResult> {
packages/pt-runtime/src/terminal/mode-guard.ts:214:    ): Promise<ModeTransitionResult> {
packages/pt-runtime/src/terminal/mode-guard.ts:285:  async function ensureGlobalConfig(deviceName: string, terminal: PTCommandLine): Promise<ModeTransitionResult> {
packages/pt-runtime/src/terminal/mode-guard.ts:336:  ): Promise<ModeTransitionResult> {
packages/pt-runtime/src/terminal/terminal-recovery.ts:18:  if (terminal.enterChar) {
packages/pt-runtime/src/terminal/terminal-recovery.ts:20:      terminal.enterChar(3, 0);
packages/pt-runtime/src/terminal/terminal-recovery.ts:26:    warnings.push("terminal.enterChar no disponible");
packages/pt-runtime/src/terminal/terminal-recovery.ts:29:  if (terminal.enterChar) {
packages/pt-runtime/src/terminal/terminal-recovery.ts:31:      terminal.enterChar(13, 0);
packages/pt-runtime/src/terminal/pager-handler.ts:2:// Pager Handler - Maneja --More-- y paginación
packages/pt-runtime/src/terminal/pager-handler.ts:26:  return /--More--\s*$/i.test(text) || /--More--/i.test(text);
packages/pt-runtime/src/terminal/pager-handler.ts:70:  let pagerState = createPagerState(maxDefaults);
packages/pt-runtime/src/terminal/pager-handler.ts:75:      return pagerState;
packages/pt-runtime/src/terminal/pager-handler.ts:78:      pagerState = advance(pagerState);
packages/pt-runtime/src/terminal/pager-handler.ts:83:        pagerState = activate(pagerState);
packages/pt-runtime/src/terminal/pager-handler.ts:85:      } else if (pagerState.active && !detectPager(output)) {
packages/pt-runtime/src/terminal/pager-handler.ts:86:        pagerState = deactivate(pagerState);
packages/pt-runtime/src/terminal/pager-handler.ts:92:      return detectLoop(pagerState);
packages/pt-runtime/src/terminal/pager-handler.ts:95:      return config.enabled !== false && shouldAdvance(pagerState);
packages/pt-runtime/src/terminal/pager-handler.ts:98:      pagerState = createPagerState(maxDefaults);
packages/pt-runtime/src/terminal/plan-engine.ts:19:  ): Promise<TerminalPlanResult> {
packages/pt-runtime/src/terminal/plan-engine.ts:95:          terminal.enterChar(13, 0);
packages/pt-runtime/src/terminal/command-executor.ts:31:  ): Promise<CommandExecutionResult> {
packages/pt-runtime/src/terminal/session-state.ts:28:  | "pager"
packages/pt-runtime/src/terminal/session-state.ts:44:  pagerActive: boolean;
packages/pt-runtime/src/terminal/session-state.ts:73:    pagerActive: false,
packages/pt-runtime/src/terminal/session-state.ts:95:    paging: state.pagerActive,
packages/pt-runtime/src/terminal/session-state.ts:119:  return { ...state, pagerActive: paging };
packages/pt-runtime/src/terminal/prompt-detector.ts:136:  if (/--more--/i.test(p) || /\bMore\b/i.test(p)) return "pager";
packages/pt-runtime/src/terminal/prompt-detector.ts:215: * Detecta si el output contiene paging (--More--).
packages/pt-runtime/src/terminal/prompt-detector.ts:216: * El pager aparece en outputs largos y requiere SPACE para continuar.
packages/pt-runtime/src/terminal/prompt-detector.ts:219: * @returns true si se detectó pager
packages/pt-runtime/src/terminal/prompt-detector.ts:223:  return /--More--/i.test(text) || /\bMore\b/i.test(text);
packages/pt-runtime/src/terminal/terminal-ready.ts:109:  if (normalized === "pager") return "pager";
packages/pt-runtime/src/terminal/terminal-ready.ts:181:    if (typeof terminal.enterChar === "function") {
packages/pt-runtime/src/terminal/terminal-ready.ts:182:      terminal.enterChar(13, 0);
packages/pt-runtime/src/terminal/terminal-ready.ts:240:): Promise<{ ready: boolean; prompt: string; mode: string }> {
packages/pt-runtime/src/terminal/terminal-ready.ts:263:            await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
packages/pt-runtime/src/terminal/terminal-ready.ts:271:          terminal.enterCommand("enable");
packages/pt-runtime/src/terminal/terminal-ready.ts:272:          terminal.enterChar(13, 0);
packages/pt-runtime/src/terminal/terminal-ready.ts:273:          await new Promise((resolve) => setTimeout(resolve, 300));
packages/pt-runtime/src/terminal/terminal-ready.ts:289:      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
packages/pt-runtime/src/terminal/terminal-utils.ts:20: * Promise-based sleep.
packages/pt-runtime/src/terminal/terminal-utils.ts:23:export async function sleep(ms: number): Promise<void> {
packages/pt-runtime/src/terminal/terminal-utils.ts:24:  return new Promise((resolve) => setTimeout(resolve, ms));
packages/pt-runtime/src/terminal/terminal-utils.ts:28: * Verifica si el terminal tiene paging activo (--More--).
packages/pt-runtime/src/terminal/terminal-utils.ts:45:    return /--More--/i.test(String(output));
packages/pt-runtime/src/terminal/ios-evidence.ts:20:  pagerAdvances: number;
packages/pt-runtime/src/terminal/ios-evidence.ts:32:  pagerActive?: boolean;
packages/pt-runtime/src/terminal/ios-evidence.ts:53:        paging: session.pagerActive,
packages/pt-runtime/src/terminal/ios-evidence.ts:62:        paging: session.pagerActive,
packages/pt-runtime/src/terminal/ios-evidence.ts:67:  const pagerAdvances = events.filter((e) => e.eventType === "moreDisplayed").length;
packages/pt-runtime/src/terminal/ios-evidence.ts:72:  if (output.includes("--More--") && pagerAdvances === 0) {
packages/pt-runtime/src/terminal/ios-evidence.ts:94:    pagerAdvances,
packages/pt-runtime/src/terminal/index.ts:52:} from "./pager-handler";
packages/pt-runtime/src/terminal/engine/command-executor.ts:24:import { createPagerHandler } from "../pager-handler";
packages/pt-runtime/src/terminal/engine/command-executor.ts:61:  enterCommand(cmd: string): unknown;
packages/pt-runtime/src/terminal/engine/command-executor.ts:64:  enterChar(charCode: number, modifiers: number): void;
packages/pt-runtime/src/terminal/engine/command-executor.ts:126:): Promise<CommandExecutionResult> {
packages/pt-runtime/src/terminal/engine/command-executor.ts:186:  const pagerHandler = createPagerHandler({
packages/pt-runtime/src/terminal/engine/terminal-observability.ts:103:    hasPager: /--More--/i.test(output),
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:29:import { createPagerHandler } from "../pager-handler";
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:76:  setTimeout?: typeof setTimeout;
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:78:  setInterval?: typeof setInterval;
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:101:    terminal.enterChar?.(32, 0);
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:109:    sent ? "pagerAdvance" : "pagerAdvanceFailed",
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:111:    sent ? `SPACE sent to pager from ${source}` : `Failed to send SPACE to pager from ${source}`,
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:114:  setTimeout(() => {
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:118:      terminal.enterCommand?.(" ");
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:124:        "pagerAdvanceFallback",
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:126:        `Fallback SPACE command sent to pager from ${source}`,
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:133:        "pagerAdvanceFallbackFailed",
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:148: * - Eventos de output, fin de comando, cambio de prompt, pager
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:176:  private commandEndGraceTimer: ReturnType<typeof setTimeout> | null = null;
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:177:  private stallTimer: ReturnType<typeof setTimeout> | null = null;
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:178:  private globalTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:179:  private startTimer: ReturnType<typeof setTimeout> | null = null;
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:180:  private outputPollTimer: ReturnType<typeof setInterval> | null = null;
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:190:  private readonly pagerHandler;
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:203:      setTimeout: setTimeout,
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:205:      setInterval: setInterval,
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:222:    this.pagerHandler = createPagerHandler({
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:241:        "[cmd-sm] device=" +
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:251:  private wakeTerminalIfNeeded(): void {
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:282:        terminal.enterChar(13, 0);
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:285:          terminal.enterCommand("");
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:300:  async run(): Promise<CommandExecutionResult> {
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:331:    this.startOutputPolling();
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:334:    this.globalTimeoutTimer = this.config.setTimeout(() => {
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:336:      this.finalizeFailure(TerminalErrors.COMMAND_END_TIMEOUT, `Global timeout reached (${commandTimeoutMs}ms)`);
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:340:    this.startTimer = this.config.setTimeout(() => {
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:345:          this.scheduleFinalizeAfterCommandEnd();
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:347:          this.finalizeFailure(TerminalErrors.COMMAND_START_TIMEOUT, "Command did not start");
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:353:    this.wakeTerminalIfNeeded();
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:355:    sleep(250).then(() => {
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:359:        this.debug("enterCommand begin");
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:360:        terminal.enterCommand(this.config.command);
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:363:        this.debug("enterCommand sent");
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:365:        sleep(100).then(() => {
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:367:            this.scheduleFinalizeAfterCommandEnd();
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:371:        this.finalizeFailure(TerminalErrors.UNKNOWN_STATE, "Failed to send command: " + String(e));
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:376:    return new Promise((resolve) => {
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:381:          this.config.setTimeout!(checkSettled, 50);
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:443:      const hasPager = /--More--/i.test(finalOutput) || /--More--/i.test(this.outputBuffer);
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:445:        this.config.warnings.push("Output truncated (pager detected, auto-advance disabled)");
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:475:    session.pagerActive = false;
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:531:  private startOutputPolling(): void {
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:536:      const pagerVisible = /--More--|More:|Press RETURN to get started|Press any key to continue/i.test(rawTail);
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:538:      if (pagerVisible) {
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:539:        this.config.session.pagerActive = true;
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:540:        this.debug("poll pager visible tail=" + JSON.stringify(rawTail.slice(-120)));
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:544:            this.config.terminal.enterChar(32, 0);
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:545:            this.debug("poll pager advanced with space");
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:546:            this.config.session.pagerActive = false;
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:550:            this.debug("poll pager advance failed error=" + String(error));
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:571:          this.scheduleFinalizeAfterCommandEnd();
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:584:    this.outputPollTimer = this.config.setInterval!(poll, 250) as unknown as ReturnType<typeof setInterval>;
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:596:        this.config.clearTimeout!(this.outputPollTimer as unknown as ReturnType<typeof setTimeout>);
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:616:    this.stallTimer = this.config.setTimeout!(() => {
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:641:        pagerActive: this.config.session.pagerActive,
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:650:      this.finalizeFailure(
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:675:        this.config.terminal.enterChar(3, 0);
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:685:        try { this.config.terminal.enterCommand("no"); this.resetStallTimer(); } catch {}
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:696:            this.config.terminal.enterCommand("y");
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:698:            this.config.terminal.enterChar(13, 0);
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:709:      this.commandEndGraceTimer = this.config.setTimeout!(() => {
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:716:      this.config.session.pagerActive = true;
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:717:      this.pagerHandler.handleOutput(chunk);
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:719:      if (this.pagerHandler.isLoop()) {
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:720:        this.finalizeFailure(
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:728:        const hasPager = /--More--/i.test(chunk);
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:737:        this.pagerHandler.canContinue() &&
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:740:        this.pagerHandler.advance();
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:742:        this.config.setTimeout!(() => {
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:749:            "pagerHandler",
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:753:            this.finalizeFailure(
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:760:          this.config.session.pagerActive = false;
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:767:    this.scheduleFinalizeAfterCommandEnd();
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:785:    this.scheduleFinalizeAfterCommandEnd();
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:797:    this.scheduleFinalizeAfterCommandEnd();
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:801:    this.config.session.pagerActive = true;
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:802:    this.pagerHandler.handleOutput("--More--");
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:804:    if (this.pagerHandler.isLoop()) {
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:805:      this.finalizeFailure(
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:817:      "--More--",
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:818:      "--More--",
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:823:      this.pagerHandler.canContinue() &&
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:826:      this.pagerHandler.advance();
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:828:      this.config.setTimeout!(() => {
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:839:          this.finalizeFailure(
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:846:        this.config.session.pagerActive = false;
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:852:  private scheduleFinalizeAfterCommandEnd(): void {
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:877:      !this.config.session.pagerActive &&
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:905:      pagerActive: this.config.session.pagerActive,
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:915:    this.commandEndGraceTimer = this.config.setTimeout!(() => {
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:917:      this.scheduleFinalizeAfterCommandEnd();
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:951:  private finalizeFailure(code: TerminalErrorCode, message: string): void {
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:953:      "finalizeFailure code=" +
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:971:      this.config.setTimeout!(() => {
packages/pt-runtime/src/terminal/engine/terminal-recovery-controller.ts:56: * Extraído de finalizeFailure en command-executor.ts.
packages/pt-runtime/src/terminal/engine/terminal-completion-controller.ts:26: * Extraído de scheduleFinalizeAfterCommandEnd en command-executor.ts.
packages/pt-runtime/src/terminal/engine/terminal-completion-controller.ts:34:  pagerActive: boolean;
packages/pt-runtime/src/terminal/engine/terminal-completion-controller.ts:37:  const { state, currentPrompt, currentMode, expectedMode, sessionKind, pagerActive, confirmPromptActive } = input;
packages/pt-runtime/src/terminal/engine/terminal-completion-controller.ts:39:  if (pagerActive) return { finished: false };
packages/pt-runtime/src/terminal/engine/terminal-completion-controller.ts:57:    pagerActive,
packages/pt-runtime/src/terminal/engine/terminal-completion-controller.ts:77:  pagerActive: boolean,
packages/pt-runtime/src/terminal/engine/terminal-completion-controller.ts:95:    pagerActive,
packages/pt-runtime/src/pt/kernel/execution-engine.ts:58:  pendingCommand: Promise<TerminalResult> | null;
packages/pt-runtime/src/pt/kernel/execution-engine.ts:297:      enterCommand: function (cmd: string) {
packages/pt-runtime/src/pt/kernel/execution-engine.ts:298:        return term.enterCommand(cmd);
packages/pt-runtime/src/pt/kernel/execution-engine.ts:301:      enterChar: function (charCode: number, modifiers: number) {
packages/pt-runtime/src/pt/kernel/execution-engine.ts:302:        return term.enterChar(charCode, modifiers);
packages/pt-runtime/src/pt/kernel/execution-engine.ts:378:      if (typeof term.enterCommand !== "function") {
packages/pt-runtime/src/pt/kernel/execution-engine.ts:537:    setTimeout(function () {
packages/pt-runtime/src/pt/kernel/execution-engine.ts:661:        setTimeout(function () {
packages/pt-runtime/src/pt/kernel/execution-engine.ts:743:          .then(function (result) {
packages/pt-runtime/src/pt/kernel/execution-engine.ts:863:              if (term && term.enterCommand) {
packages/pt-runtime/src/pt/kernel/execution-engine.ts:864:                term.enterCommand("exit");
packages/pt-runtime/src/pt/kernel/execution-engine.ts:930:          .then(function (result) {
packages/pt-runtime/src/pt/terminal/terminal-engine.ts:24:  pagerTimeoutMs: number;
packages/pt-runtime/src/pt/terminal/terminal-engine.ts:55:  enterCommand(cmd: string): void;
packages/pt-runtime/src/pt/terminal/terminal-engine.ts:66:  enterChar(charCode: number, modifiers: number): void;
packages/pt-runtime/src/pt/terminal/terminal-engine.ts:168:  ): Promise<TerminalResult> {
packages/pt-runtime/src/pt/terminal/terminal-engine.ts:174:      return Promise.reject(new Error(`No terminal attached to ${device}`));
packages/pt-runtime/src/pt/terminal/terminal-engine.ts:200:      term.enterChar(32, 0);
packages/pt-runtime/src/pt/terminal/terminal-engine.ts:210:      term.enterChar(13, 0);
```

## git diff clave
```diff
diff --git a/packages/pt-control/src/adapters/runtime-terminal/adapter.ts b/packages/pt-control/src/adapters/runtime-terminal/adapter.ts
index af60ecc6..1fd3b520 100644
--- a/packages/pt-control/src/adapters/runtime-terminal/adapter.ts
+++ b/packages/pt-control/src/adapters/runtime-terminal/adapter.ts
@@ -282,6 +282,18 @@ export function createRuntimeTerminalAdapter(
     };
   }
 
+  function computeDeferredPollTimeoutMs(plan: TerminalPlan, requestedTimeoutMs: number): number {
+    const planTimeouts = plan.timeouts as TerminalPlanTimeouts | undefined;
+    const commandTimeoutMs = Number(planTimeouts?.commandTimeoutMs ?? requestedTimeoutMs ?? 30000);
+    const stallTimeoutMs = Number(planTimeouts?.stallTimeoutMs ?? 15000);
+    const stepCount = Math.max(plan.steps.length, 1);
+
+    const perStepBudgetMs = commandTimeoutMs + stallTimeoutMs + 3000;
+    const totalBudgetMs = perStepBudgetMs * stepCount;
+
+    return Math.max(requestedTimeoutMs, totalBudgetMs, 25000);
+  }
+
   async function executeTerminalPlanRun(
     plan: TerminalPlan,
     timeoutMs: number,
@@ -336,7 +348,7 @@ export function createRuntimeTerminalAdapter(
 
     if (isDeferredValue(submitValue)) {
       const startedAt = Date.now();
-      const pollTimeoutMs = Math.max(timeoutMs, 2000);
+      const pollTimeoutMs = computeDeferredPollTimeoutMs(plan, timeoutMs);
       const pollIntervalMs = 300;
 
       let pollValue: unknown = null;
diff --git a/packages/pt-runtime/src/handlers/poll-deferred.ts b/packages/pt-runtime/src/handlers/poll-deferred.ts
index 9a59bb2c..1f02349e 100644
--- a/packages/pt-runtime/src/handlers/poll-deferred.ts
+++ b/packages/pt-runtime/src/handlers/poll-deferred.ts
@@ -23,19 +23,25 @@ export function handlePollDeferred(payload: PollDeferredPayload, api: RuntimeApi
     jobState.state === "error";
 
   if (!finished) {
+    const currentStep = jobState.currentStep ?? 0;
+    const currentStepData = jobState.plan.plan[currentStep];
     return {
       ok: true,
       deferred: true,
       ticket,
       done: false,
       state: jobState.state,
-      currentStep: jobState.currentStep,
+      currentStep,
       totalSteps: jobState.plan.plan.length,
+      stepType: currentStepData?.type,
+      stepValue: currentStepData?.value,
       outputTail: jobState.outputBuffer ? jobState.outputBuffer.slice(-500) : "",
       lastPrompt: jobState.lastPrompt,
       lastMode: jobState.lastMode,
       waitingForCommandEnd: jobState.waitingForCommandEnd,
       updatedAt: jobState.updatedAt,
+      ageMs: Date.now() - jobState.startedAt,
+      idleMs: Date.now() - jobState.updatedAt,
     } as unknown as RuntimeResult;
   }
 
diff --git a/packages/pt-runtime/src/pt/kernel/execution-engine.ts b/packages/pt-runtime/src/pt/kernel/execution-engine.ts
index 0d68d678..0cfa0e6a 100644
--- a/packages/pt-runtime/src/pt/kernel/execution-engine.ts
+++ b/packages/pt-runtime/src/pt/kernel/execution-engine.ts
@@ -119,18 +119,278 @@ export function createExecutionEngine(terminal: TerminalEngine): ExecutionEngine
     };
   }
 
+  function resolvePacketTracerIpc(): any {
+    // 1. self — funciona en PT QTScript, browsers y Node
+    try {
+      if (typeof self !== "undefined" && self) {
+        const root = self as any;
+        if (root.ipc && typeof root.ipc.network === "function") {
+          return root.ipc;
+        }
+      }
+    } catch {}
+ 
+    // 2. Free variable 'ipc' — Packet Tracer nativo (QTScript)
+    try {
+      if (typeof ipc !== "undefined" && ipc && typeof ipc.network === "function") {
+        return ipc;
+      }
+    } catch {}
+ 
+    // 3. _ScriptModule.context.ipc — fallback PT
+    try {
+      if (typeof _ScriptModule !== "undefined" && _ScriptModule) {
+        const scriptModule = _ScriptModule as any;
+        const context = scriptModule.context;
+        const scriptModuleIpc = context && context.ipc;
+        if (scriptModuleIpc && typeof scriptModuleIpc.network === "function") {
+          return scriptModuleIpc;
+        }
+      }
+    } catch {}
+ 
+    return null;
+  }
+
+  function readTerminalTextSafe(term: any): string {
+    const methods = [
+      "getAllOutput",
+      "getBuffer",
+      "getOutput",
+      "getText",
+      "readAll",
+      "read",
+      "getHistory",
+      "history",
+    ];
+
+    for (let i = 0; i < methods.length; i += 1) {
+      const name = methods[i];
+
+      try {
+        if (typeof term[name] === "function") {
+          const value = term[name]();
+          if (value && typeof value === "string") {
+            return value;
+          }
+        }
+      } catch {}
+    }
+
+    try {
+      if (typeof term.getConsole === "function") {
+        const consoleObj = term.getConsole();
+
+        if (consoleObj) {
+          for (let i = 0; i < methods.length; i += 1) {
+            const name = methods[i];
+
+            try {
+              if (typeof consoleObj[name] === "function") {
+                const value = consoleObj[name]();
+                if (value && typeof value === "string") {
+                  return value;
+                }
+              }
+            } catch {}
+          }
+        }
+      }
+    } catch {}
+
+    return "";
+  }
+
+  function inferPromptFromTerminalText(text: string): string {
+    const lines = String(text || "")
+      .replace(/\r/g, "")
+      .split("\n")
+      .map(function (line) {
+        return line.trim();
+      })
+      .filter(Boolean);
+
+    for (let i = lines.length - 1; i >= 0; i -= 1) {
+      const line = lines[i] || "";
+
+      if (/^[A-Za-z0-9._-]+(?:\(config[^)]*\))?[>#]$/.test(line)) {
+        return line;
+      }
+
+      if (/[A-Z]:\\>$/.test(line)) {
+        return line;
+      }
+    }
+
+    return "";
+  }
+
+  function createAttachableTerminal(term: any): any {
+    return {
+      getPrompt: function () {
+        try {
+          if (typeof term.getPrompt === "function") {
+            const prompt = term.getPrompt();
+            if (prompt && typeof prompt === "string") {
+              return prompt;
+            }
+          }
+        } catch {}
+
+        return inferPromptFromTerminalText(readTerminalTextSafe(term));
+      },
+
+      getMode: function () {
+        try {
+          if (typeof term.getMode === "function") {
+            return term.getMode();
+          }
+        } catch {}
+
+        const prompt = inferPromptFromTerminalText(readTerminalTextSafe(term));
+        if (/\(config[^)]*\)#\s*$/.test(prompt)) return "global-config";
+        if (/#\s*$/.test(prompt)) return "privileged-exec";
+        if (/>$/.test(prompt)) return "user-exec";
+        return "unknown";
+      },
+
+      getOutput: function () {
+        try {
+          if (typeof term.getOutput === "function") {
+            return term.getOutput();
+          }
+        } catch {}
+
+        return readTerminalTextSafe(term);
+      },
+
+      getAllOutput: function () {
+        try {
+          if (typeof term.getAllOutput === "function") {
+            return term.getAllOutput();
+          }
+        } catch {}
+
+        return readTerminalTextSafe(term);
+      },
+
+      getBuffer: function () {
+        try {
+          if (typeof term.getBuffer === "function") {
+            return term.getBuffer();
+          }
+        } catch {}
+
+        return readTerminalTextSafe(term);
+      },
+
+      getCommandInput: function () {
+        try {
+          if (typeof term.getCommandInput === "function") {
+            return term.getCommandInput();
+          }
+        } catch {}
+
+        return "";
+      },
+
+      enterCommand: function (cmd: string) {
+        return term.enterCommand(cmd);
+      },
+
+      enterChar: function (charCode: number, modifiers: number) {
+        return term.enterChar(charCode, modifiers);
+      },
+
+      registerEvent: function (
+        eventName: string,
+        context: unknown,
+        handler: (src: unknown, args: unknown) => void,
+      ) {
+        return term.registerEvent(eventName, context, handler);
+      },
+
+      unregisterEvent: function (
+        eventName: string,
+        context: unknown,
+        handler: (src: unknown, args: unknown) => void,
+      ) {
+        return term.unregisterEvent(eventName, context, handler);
+      },
+
+      println: function (text: string) {
+        if (typeof term.println === "function") {
+          return term.println(text);
+        }
+      },
+
+      flush: function () {
+        if (typeof term.flush === "function") {
+          return term.flush();
+        }
+      },
+
+      getConsole: function () {
+        if (typeof term.getConsole === "function") {
+          return term.getConsole();
+        }
+
+        return null;
+      },
+    };
+  }
+
   function tryAttachTerminal(device: string): boolean {
     try {
-      var net = typeof ipc !== "undefined" && ipc && typeof ipc.network === "function" ? ipc.network() : null;
-      var dev = net && typeof net.getDevice === "function" ? net.getDevice(device) : null;
-      var term = dev && typeof dev.getCommandLine === "function" ? dev.getCommandLine() : null;
+      const resolvedIpc = resolvePacketTracerIpc();
+
+      if (!resolvedIpc) {
+        execLog("ATTACH failed device=" + device + " reason=no-ipc");
+        return false;
+      }
+
+      const net = typeof resolvedIpc.network === "function" ? resolvedIpc.network() : null;
+
+      if (!net || typeof net.getDevice !== "function") {
+        execLog("ATTACH failed device=" + device + " reason=no-network");
+        return false;
+      }
+
+      const dev = net.getDevice(device);
+
+      if (!dev) {
+        execLog("ATTACH failed device=" + device + " reason=no-device");
+        return false;
+      }
+
+      if (typeof dev.getCommandLine !== "function") {
+        execLog("ATTACH failed device=" + device + " reason=no-get-command-line");
+        return false;
+      }
+
+      const term = dev.getCommandLine();
 
       if (!term) {
         execLog("ATTACH failed device=" + device + " reason=no-command-line");
         return false;
       }
 
-      terminal.attach(device, term);
+      if (typeof term.enterCommand !== "function") {
+        execLog("ATTACH failed device=" + device + " reason=no-enter-command");
+        return false;
+      }
+
+      if (typeof term.registerEvent !== "function") {
+        execLog("ATTACH failed device=" + device + " reason=no-register-event");
+        return false;
+      }
+
+      if (typeof term.unregisterEvent !== "function") {
+        execLog("ATTACH failed device=" + device + " reason=no-unregister-event");
+        return false;
+      }
+
+      terminal.attach(device, createAttachableTerminal(term) as any);
       return true;
     } catch (error) {
       execLog("ATTACH failed device=" + device + " error=" + String(error));
@@ -286,6 +546,92 @@ export function createExecutionEngine(terminal: TerminalEngine): ExecutionEngine
     }, 0);
   }
 
+  function modeMatches(actual: unknown, expected: unknown): boolean {
+    const current = String(actual ?? "").trim();
+    const target = String(expected ?? "").trim();
+
+    if (!target) return true;
+    if (current === target) return true;
+
+    if (target === "global-config") {
+      return current === "config" || current === "global-config";
+    }
+
+    if (target === "privileged-exec") {
+      return current === "privileged-exec";
+    }
+
+    return false;
+  }
+
+  function inferModeFromPrompt(prompt: string): string {
+    const value = String(prompt ?? "").trim();
+
+    if (/\(config[^)]*\)#$/.test(value)) return "config";
+    if (/#$/.test(value)) return "privileged-exec";
+    if (/>$/.test(value)) return "user-exec";
+
+    return "unknown";
+  }
+
+  function readSession(device: string): { mode: string; prompt: string } {
+    try {
+      const session = terminal.getSession(device) as any;
+      const prompt = String(session?.prompt ?? "");
+      const mode = String(session?.mode ?? "unknown");
+
+      return {
+        mode: mode === "unknown" ? inferModeFromPrompt(prompt) : mode,
+        prompt,
+      };
+    } catch {
+      return { mode: "unknown", prompt: "" };
+    }
+  }
+
+  function commandForEnsureMode(currentMode: string, targetMode: string): string | null {
+    if (modeMatches(currentMode, targetMode)) return null;
+
+    if (targetMode === "privileged-exec") {
+      if (isConfigMode(currentMode)) return "end";
+      return "enable";
+    }
+
+    if (targetMode === "global-config" || targetMode === "config") {
+      if (currentMode === "user-exec" || currentMode === "unknown") return "enable";
+      if (currentMode === "privileged-exec") return "configure terminal";
+    }
+
+    return null;
+  }
+
+  function completeJobIfLastStep(job: ActiveJob, result: TerminalResult | null): boolean {
+    const ctx = job.context;
+
+    if (ctx.currentStep < ctx.plan.plan.length) {
+      return false;
+    }
+
+    execLog("JOB COMPLETED id=" + job.id + " steps=" + ctx.stepResults.length);
+    ctx.phase = "completed";
+    ctx.result = result;
+    ctx.finished = true;
+    ctx.updatedAt = Date.now();
+    wakePendingJobsForDevice(job.device);
+    return true;
+  }
+
+  function promptMatches(prompt: string, expectedPrompt: string): boolean {
+    if (!expectedPrompt) return true;
+    if (prompt.indexOf(expectedPrompt) >= 0) return true;
+
+    try {
+      return new RegExp(expectedPrompt).test(prompt);
+    } catch {
+      return false;
+    }
+  }
+
   function getCurrentStep(ctx: JobContext): DeferredStep | null {
     if (ctx.currentStep >= ctx.plan.plan.length) return null;
     return ctx.plan.plan[ctx.currentStep];
@@ -319,6 +665,182 @@ export function createExecutionEngine(terminal: TerminalEngine): ExecutionEngine
         break;
       }
 
+      case "ensure-mode": {
+        const targetMode = String(
+          (step as any).expectMode ||
+            (step.options as any)?.expectedMode ||
+            step.value ||
+            "privileged-exec",
+        );
+
+        const session = readSession(job.device);
+        const command = commandForEnsureMode(session.mode, targetMode);
+
+        ctx.phase = "waiting-ensure-mode";
+        ctx.lastMode = session.mode;
+        ctx.lastPrompt = session.prompt;
+
+        if (!targetMode || command === null) {
+          if (targetMode && !modeMatches(session.mode, targetMode)) {
+            execLog("ENSURE MODE unsupported target=" + targetMode + " current=" + session.mode + " id=" + job.id);
+            if (stopOnError) {
+              ctx.phase = "error";
+              ctx.error = "Cannot ensure terminal mode " + targetMode + " from " + session.mode;
+              ctx.errorCode = "ENSURE_MODE_UNSUPPORTED";
+              ctx.finished = true;
+              ctx.updatedAt = Date.now();
+              wakePendingJobsForDevice(job.device);
+              return;
+            }
+          }
+
+          ctx.stepResults.push({
+            stepIndex: ctx.currentStep,
+            stepType: stepType,
+            command: "",
+            raw: "",
+            status: 0,
+            completedAt: Date.now(),
+          });
+          ctx.currentStep++;
+          ctx.phase = "pending";
+          ctx.updatedAt = Date.now();
+          if (!completeJobIfLastStep(job, null)) advanceJob(job.id);
+          return;
+        }
+
+        execLog(
+          "ENSURE MODE id=" +
+            job.id +
+            " device=" +
+            job.device +
+            " current=" +
+            session.mode +
+            " target=" +
+            targetMode +
+            " cmd='" +
+            command +
+            "'",
+        );
+
+        const ensureModeTimeoutMs = Number((step.options as any)?.timeoutMs ?? 8000);
+
+        ctx.waitingForCommandEnd = true;
+        job.pendingCommand = terminal.executeCommand(job.device, command, {
+          commandTimeoutMs: ensureModeTimeoutMs,
+          stallTimeoutMs: ctx.plan.options.stallTimeoutMs,
+          expectedMode: targetMode as any,
+          allowPager: false,
+          autoAdvancePager: false,
+          maxPagerAdvances: 0,
+          autoConfirm: false,
+          autoDismissWizard: true,
+          allowEmptyOutput: true,
+          sendEnterFallback: false,
+        });
+
+        job.pendingCommand
+          .then(function (result) {
+            if (ctx.finished) return;
+
+            job.pendingCommand = null;
+            ctx.waitingForCommandEnd = false;
+            ctx.outputBuffer += result.output;
+            ctx.lastPrompt = result.session.prompt;
+            ctx.lastMode = result.session.mode;
+            ctx.paged = result.session.paging;
+
+            ctx.stepResults.push({
+              stepIndex: ctx.currentStep,
+              stepType: stepType,
+              command: command,
+              raw: result.output,
+              status: result.status,
+              completedAt: Date.now(),
+            });
+
+            if (!modeMatches(result.session.mode, targetMode)) {
+              execLog(
+                "ENSURE MODE FAILED id=" +
+                  job.id +
+                  " expected=" +
+                  targetMode +
+                  " actual=" +
+                  result.session.mode,
+              );
+              ctx.phase = "error";
+              ctx.error = "Expected mode " + targetMode + ", got " + result.session.mode;
+              ctx.errorCode = "ENSURE_MODE_FAILED";
+              ctx.finished = true;
+              ctx.updatedAt = Date.now();
+              cleanupConfigSession(job.device, result.session.mode, result.session.prompt);
+              wakePendingJobsForDevice(job.device);
+              return;
+            }
+
+            ctx.currentStep++;
+            ctx.phase = "pending";
+            ctx.error = null;
+            ctx.errorCode = null;
+            ctx.updatedAt = Date.now();
+
+            if (!completeJobIfLastStep(job, result)) advanceJob(job.id);
+          })
+          .catch(function (err) {
+            if (ctx.finished) return;
+            execLog("ENSURE MODE ERROR id=" + job.id + " error=" + String(err));
+            job.pendingCommand = null;
+            ctx.waitingForCommandEnd = false;
+            ctx.phase = "error";
+            ctx.error = String(err);
+            ctx.errorCode = "ENSURE_MODE_EXEC_ERROR";
+            ctx.finished = true;
+            ctx.updatedAt = Date.now();
+            cleanupConfigSession(job.device, ctx.lastMode, ctx.lastPrompt);
+            wakePendingJobsForDevice(job.device);
+          });
+        break;
+      }
+
+      case "expect-prompt": {
+        const expectedPrompt = String(
+          (step.options as any)?.expectedPrompt ||
+            (step as any).expectPromptPattern ||
+            step.value ||
+            "",
+        );
+
+        const session = readSession(job.device);
+        const prompt = session.prompt || ctx.lastPrompt;
+        const matched = promptMatches(prompt, expectedPrompt);
+
+        if (!matched && stopOnError) {
+          ctx.phase = "error";
+          ctx.error = "Expected prompt " + expectedPrompt + ", got " + prompt;
+          ctx.errorCode = "EXPECT_PROMPT_FAILED";
+          ctx.finished = true;
+          ctx.updatedAt = Date.now();
+          wakePendingJobsForDevice(job.device);
+          return;
+        }
+
+        ctx.stepResults.push({
+          stepIndex: ctx.currentStep,
+          stepType: stepType,
+          command: "",
+          raw: prompt,
+          status: 0,
+          completedAt: Date.now(),
+        });
+        ctx.lastMode = session.mode;
+        ctx.lastPrompt = prompt;
+        ctx.currentStep++;
+        ctx.phase = "pending";
+        ctx.updatedAt = Date.now();
+        if (!completeJobIfLastStep(job, null)) advanceJob(job.id);
+        break;
+      }
+
       case "release-session":
       case "close-session": {
         execLog("RELEASE SESSION id=" + job.id + " device=" + job.device);
@@ -390,19 +912,18 @@ export function createExecutionEngine(terminal: TerminalEngine): ExecutionEngine
             job.id,
         );
 
-        const policies = ((ctx.plan.payload || {}) as any).policies || {};
         const stepOptions = (step.options || {}) as any;
-        const allowPager = (step as any).allowPager !== false;
 
         job.pendingCommand = terminal.executeCommand(job.device, command, {
           commandTimeoutMs: timeout,
           stallTimeoutMs: ctx.plan.options.stallTimeoutMs,
           expectedMode: (step as any).expectMode,
           expectedPromptPattern: stepOptions.expectedPrompt,
-          allowPager,
-          autoAdvancePager: allowPager && policies.autoAdvancePager !== false,
-          maxPagerAdvances: Number(policies.maxPagerAdvances ?? 80),
-          autoConfirm: (step as any).allowConfirm === true,
+          allowPager: true,
+          autoAdvancePager: true,
+          maxPagerAdvances: 25,
+          autoConfirm: false,
+          autoDismissWizard: true,
         });
 
         job.pendingCommand
@@ -452,13 +973,7 @@ export function createExecutionEngine(terminal: TerminalEngine): ExecutionEngine
             ctx.phase = "pending";
             ctx.updatedAt = Date.now();
 
-            if (ctx.currentStep >= ctx.plan.plan.length) {
-              execLog("JOB COMPLETED id=" + job.id + " steps=" + ctx.stepResults.length);
-              ctx.phase = "completed";
-              ctx.result = result;
-              ctx.finished = true;
-              wakePendingJobsForDevice(job.device);
-            } else {
+            if (!completeJobIfLastStep(job, result)) {
               advanceJob(job.id);
             }
           })
diff --git a/packages/pt-runtime/src/pt/terminal/terminal-engine.ts b/packages/pt-runtime/src/pt/terminal/terminal-engine.ts
index 4a4b68a5..9c0038a3 100644
--- a/packages/pt-runtime/src/pt/terminal/terminal-engine.ts
+++ b/packages/pt-runtime/src/pt/terminal/terminal-engine.ts
@@ -10,12 +10,13 @@ import {
   updatePrompt,
   setPaging,
 } from "./terminal-session";
-import { parsePrompt, type IosMode } from "./prompt-parser";
+import type { IosMode } from "./prompt-parser";
 import {
   createCommandExecutor,
   type ExecutionOptions as ExecuteOptions,
   type CommandExecutionResult,
 } from "../../terminal/command-executor";
+import { getPromptSafe } from "../../terminal/terminal-ready";
 
 export interface TerminalEngineConfig {
   commandTimeoutMs: number;
@@ -33,6 +34,22 @@ export interface TerminalResult {
 
 export type { ExecuteOptions };
 
+function normalizePacketTracerMode(mode: unknown, prompt: string): string {
+  const raw = String(mode ?? "").trim().toLowerCase();
+  const p = String(prompt ?? "").trim();
+
+  if (/\(config[^)]*\)#\s*$/.test(p)) return "global-config";
+  if (/#\s*$/.test(p)) return "privileged-exec";
+  if (/>$/.test(p)) return "user-exec";
+
+  if (raw === "user") return "user-exec";
+  if (raw === "enable" || raw === "privileged" || raw === "privileged-exec") return "privileged-exec";
+  if (raw === "config" || raw === "global-config") return "global-config";
+  if (raw === "logout") return "logout";
+
+  return raw || "unknown";
+}
+
 interface PTCommandLine {
   getPrompt(): string;
   enterCommand(cmd: string): void;
@@ -64,13 +81,21 @@ export function createTerminalEngine(config: TerminalEngineConfig) {
     terminals[device] = term;
     sessions[device] = createTerminalSession(device);
 
+    try {
+      const prompt = getPromptSafe(term);
+      const rawMode = typeof (term as any).getMode === "function" ? (term as any).getMode() : "";
+      let updated = updatePrompt(sessions[device], prompt);
+      updated = updateMode(updated, normalizePacketTracerMode(rawMode, prompt));
+      sessions[device] = updated;
+    } catch {}
+
     term.registerEvent("promptChanged", null, (_src, args) => {
       const current = sessions[device];
       if (!current) return;
       const prompt = (args as { prompt?: string })?.prompt || "";
-      const parsed = parsePrompt(prompt);
-      let updated = updatePrompt(current, parsed.hostname);
-      updated = updateMode(updated, parsed.mode);
+      const rawMode = typeof (term as any).getMode === "function" ? (term as any).getMode() : "";
+      let updated = updatePrompt(current, prompt);
+      updated = updateMode(updated, normalizePacketTracerMode(rawMode, prompt));
       sessions[device] = updated;
     });
 
@@ -86,7 +111,7 @@ export function createTerminalEngine(config: TerminalEngineConfig) {
       if (!current) return;
       const newMode = (args as { newMode?: string })?.newMode || "";
       if (newMode) {
-        sessions[device] = updateMode(current, newMode);
+        sessions[device] = updateMode(current, normalizePacketTracerMode(newMode, current.prompt));
       }
     });
 
@@ -95,9 +120,7 @@ export function createTerminalEngine(config: TerminalEngineConfig) {
       if (!current) return;
       const inputMode = (args as { inputMode?: string })?.inputMode || "";
       if (inputMode && typeof inputMode === "string") {
-        const validModes = ["user-exec", "privileged-exec", "config", "config-if", "config-line", "config-router", "config-subif", "config-vlan", "unknown"] as const;
-        const normalizedMode = validModes.includes(inputMode as typeof validModes[number]) ? inputMode : "unknown";
-        sessions[device] = updateMode(current, normalizedMode);
+        sessions[device] = updateMode(current, normalizePacketTracerMode(inputMode, current.prompt));
       }
     });
     try {
diff --git a/packages/pt-runtime/src/terminal/engine/command-state-machine.ts b/packages/pt-runtime/src/terminal/engine/command-state-machine.ts
index 7047a770..48e99900 100644
--- a/packages/pt-runtime/src/terminal/engine/command-state-machine.ts
+++ b/packages/pt-runtime/src/terminal/engine/command-state-machine.ts
@@ -9,6 +9,11 @@ import type { TerminalEventRecord } from "../../pt/terminal/terminal-events";
 import type { TerminalErrorCode } from "../terminal-errors";
 import type { CommandEndedPayload } from "../../pt/terminal/terminal-events";
 
+function isEnableOrEndCommand(command: string): boolean {
+  const cmd = command.trim().toLowerCase();
+  return cmd === "enable" || cmd === "end" || cmd === "exit";
+}
+
 import {
   detectConfirmPrompt,
   detectPager,
@@ -230,6 +235,65 @@ export class CommandStateMachine {
     this.onMoreDisplayedHandler = this.onMoreDisplayed.bind(this);
   }
 
+  private debug(message: string): void {
+    try {
+      dprint(
+        "[cmd-sm] device=" +
+          this.config.deviceName +
+          " command=" +
+          JSON.stringify(this.config.command) +
+          " " +
+          message,
+      );
+    } catch {}
+  }
+
+  private wakeTerminalIfNeeded(): void {
+    const terminal = this.config.terminal;
+
+    try {
+      const prompt = this.config.getPromptSafeFn(terminal);
+      let mode = "";
+
+      try {
+        if (typeof (terminal as any).getMode === "function") {
+          mode = String((terminal as any).getMode() || "");
+        }
+      } catch {}
+
+      const needsWake =
+        !prompt ||
+        mode.toLowerCase() === "logout" ||
+        String(this.config.session.lastMode || "") === "logout" ||
+        this.config.session.lastMode === "unknown";
+
+      if (!needsWake) return;
+
+      this.debug(
+        "wake begin prompt=" +
+          JSON.stringify(prompt) +
+          " mode=" +
+          JSON.stringify(mode) +
+          " sessionMode=" +
+          JSON.stringify(this.config.session.lastMode),
+      );
+
+      try {
+        terminal.enterChar(13, 0);
+      } catch {
+        try {
+          terminal.enterCommand("");
+        } catch {}
+      }
+
+      this.lastOutputAt = this.config.now();
+      this.config.session.lastActivityAt = this.config.now();
+      this.debug("wake sent enter");
+    } catch (error) {
+      this.debug("wake failed error=" + String(error));
+    }
+  }
+
   /**
    * Ejecuta el comando y retorna el resultado.
    */
@@ -249,7 +313,19 @@ export class CommandStateMachine {
       this.config.warnings.push("Terminal not ready after retries: " + readyResult.prompt);
     }
 
+    this.debug(
+      "run start promptBefore=" +
+        JSON.stringify(this.config.promptBefore) +
+        " modeBefore=" +
+        JSON.stringify(this.config.modeBefore) +
+        " timeoutMs=" +
+        commandTimeoutMs +
+        " stallMs=" +
+        stallTimeoutMs,
+    );
+
     this.setupHandlers();
+    this.debug("handlers setup complete");
 
     // Start output polling fallback
     this.startOutputPolling();
@@ -274,21 +350,27 @@ export class CommandStateMachine {
     }, 2000);
 
     // Send the command
-    try {
-      if (sessionKind === "ios") {
-        try { terminal.enterChar(13, 0); } catch (e) {}
-      }
+    this.wakeTerminalIfNeeded();
 
-      terminal.enterCommand(this.config.command);
+    sleep(250).then(() => {
+      if (this.settled) return;
 
-      sleep(100).then(() => {
-        if (!this.settled && this.startedSeen) {
-          this.scheduleFinalizeAfterCommandEnd();
-        }
-      });
-    } catch (e) {
-      this.finalizeFailure(TerminalErrors.UNKNOWN_STATE, "Failed to send command: " + String(e));
-    }
+      try {
+        this.debug("enterCommand begin");
+        terminal.enterCommand(this.config.command);
+        this.startedSeen = true;
+        this.resetStallTimer();
+        this.debug("enterCommand sent");
+
+        sleep(100).then(() => {
+          if (!this.settled) {
+            this.scheduleFinalizeAfterCommandEnd();
+          }
+        });
+      } catch (e) {
+        this.finalizeFailure(TerminalErrors.UNKNOWN_STATE, "Failed to send command: " + String(e));
+      }
+    });
 
     // Return promise that resolves when settled
     return new Promise((resolve) => {
@@ -450,15 +532,50 @@ export class CommandStateMachine {
     const poll = (): void => {
       if (this.settled) return;
       const currentRaw = this.config.readTerminalSnapshotFn!(this.config.terminal);
+      const rawTail = String(currentRaw.raw || "").slice(-500);
+      const pagerVisible = /--More--|More:|Press RETURN to get started|Press any key to continue/i.test(rawTail);
+
+      if (pagerVisible) {
+        this.config.session.pagerActive = true;
+        this.debug("poll pager visible tail=" + JSON.stringify(rawTail.slice(-120)));
+
+        if (this.config.options.autoAdvancePager !== false) {
+          try {
+            this.config.terminal.enterChar(32, 0);
+            this.debug("poll pager advanced with space");
+            this.config.session.pagerActive = false;
+            this.lastOutputAt = this.config.now();
+            this.config.session.lastActivityAt = this.config.now();
+          } catch (error) {
+            this.debug("poll pager advance failed error=" + String(error));
+          }
+        }
+      }
 
       // Handle buffer reset/rotation
       if (currentRaw.raw.length < this.lastTerminalSnapshot.raw.length) {
         this.lastTerminalSnapshot = { raw: "", source: "reset" };
       }
 
+      try {
+        const prompt = this.config.getPromptSafeFn(this.config.terminal);
+        if (prompt && prompt !== this.previousPrompt) {
+          this.previousPrompt = prompt;
+          this.promptStableSince = this.config.now();
+
+          const mode = detectModeFromPrompt(normalizePrompt(prompt));
+          this.config.session.lastPrompt = normalizePrompt(prompt);
+          this.config.session.lastMode = mode;
+
+          this.debug("poll prompt=" + JSON.stringify(prompt) + " mode=" + mode);
+          this.scheduleFinalizeAfterCommandEnd();
+        }
+      } catch {}
+
       if (currentRaw.raw.length > this.lastTerminalSnapshot.raw.length) {
         const delta = currentRaw.raw.substring(this.lastTerminalSnapshot.raw.length);
         this.lastTerminalSnapshot = currentRaw;
+        this.debug("poll output deltaLen=" + delta.length);
         this.onOutput(null, { chunk: delta, newOutput: delta });
       }
     };
@@ -746,6 +863,32 @@ export class CommandStateMachine {
 
     const currentPrompt = this.config.getPromptSafeFn(this.config.terminal);
 
+    const snapshot = this.config.readTerminalSnapshotFn!(this.config.terminal);
+    const diff = diffSnapshotStrict(this.config.baselineOutput, snapshot.raw);
+    const snapshotDelta = String(diff.delta || "");
+    const hasAnyOutput = this.outputBuffer.trim().length > 0 || snapshotDelta.trim().length > 0;
+    const promptLooksReady = /^[A-Za-z0-9._-]+(?:\(config[^)]*\))?[>#]\s*$/.test(String(currentPrompt || "").trim());
+    const quietLongEnough = this.config.now() - this.lastOutputAt >= 700;
+
+    if (
+      this.startedSeen &&
+      promptLooksReady &&
+      quietLongEnough &&
+      !this.config.session.pagerActive &&
+      !this.config.session.confirmPromptActive
+    ) {
+      if (hasAnyOutput || this.config.options.allowEmptyOutput === true || isEnableOrEndCommand(this.config.command)) {
+        this.debug(
+          "finalize by prompt-ready fallback prompt=" +
+            JSON.stringify(currentPrompt) +
+            " hasAnyOutput=" +
+            hasAnyOutput,
+        );
+        this.finalize(true, this.endedStatus, "prompt-ready-fallback");
+        return;
+      }
+    }
+
     const verdict = shouldFinalizeCommand({
       state: {
         startedSeen: this.startedSeen,
@@ -778,6 +921,23 @@ export class CommandStateMachine {
   private finalize(cmdOk: boolean, status: number | null, error?: string, code?: TerminalErrorCode): void {
     if (this.settled) return;
 
+    this.debug(
+      "finalize ok=" +
+        cmdOk +
+        " status=" +
+        status +
+        " error=" +
+        JSON.stringify(error || "") +
+        " code=" +
+        JSON.stringify(code || "") +
+        " outputLen=" +
+        this.outputBuffer.length +
+        " startedSeen=" +
+        this.startedSeen +
+        " endedSeen=" +
+        this.commandEndedSeen,
+    );
+
     this.finalizedOk = cmdOk;
     if (status !== null) this.endedStatus = status;
     this.finalizedError = error;
@@ -789,6 +949,17 @@ export class CommandStateMachine {
   }
 
   private finalizeFailure(code: TerminalErrorCode, message: string): void {
+    this.debug(
+      "finalizeFailure code=" +
+        String(code) +
+        " message=" +
+        JSON.stringify(message) +
+        " outputLen=" +
+        this.outputBuffer.length,
+    );
+
+    this.finalize(false, 1, message, code);
+
     const recoverable =
       code === TerminalErrors.COMMAND_START_TIMEOUT ||
       code === TerminalErrors.COMMAND_END_TIMEOUT ||
@@ -797,17 +968,17 @@ export class CommandStateMachine {
       message.includes("No output received");
 
     if (recoverable && this.config.terminal) {
-      try {
-        const recovery = this.config.recoverTerminalSyncFn!(
-          this.config.terminal,
-          this.config.sessionKind === "host" ? "host" : "ios"
-        );
-        this.config.warnings.push(
-          `Recovery attempted: ${recovery.actions.join(", ")}; prompt=${recovery.prompt}; mode=${recovery.mode}`,
-        );
-      } catch {}
+      this.config.setTimeout!(() => {
+        try {
+          const recovery = this.config.recoverTerminalSyncFn!(
+            this.config.terminal,
+            this.config.sessionKind === "host" ? "host" : "ios"
+          );
+          this.config.warnings.push(
+            `Recovery attempted: ${recovery.actions.join(", ")}; prompt=${recovery.prompt}; mode=${recovery.mode}`,
+          );
+        } catch {}
+      }, 0);
     }
-
-    this.finalize(false, 1, message, code);
   }
 }
diff --git a/packages/pt-runtime/src/terminal/terminal-ready.ts b/packages/pt-runtime/src/terminal/terminal-ready.ts
index df432202..733cb0d8 100644
--- a/packages/pt-runtime/src/terminal/terminal-ready.ts
+++ b/packages/pt-runtime/src/terminal/terminal-ready.ts
@@ -23,18 +23,49 @@ const DEFAULT_QUIET_THRESHOLD_MS = 2000;
 /**
  * Lee el prompt del terminal de forma segura, sin lanzar excepciones.
  */
+function inferPromptFromText(output: string): string {
+  const lines = String(output || "")
+    .replace(/\r/g, "")
+    .split("\n")
+    .map((line) => line.trim())
+    .filter(Boolean);
+
+  for (let i = lines.length - 1; i >= 0; i -= 1) {
+    const line = lines[i] || "";
+
+    if (/^[A-Za-z0-9._-]+(?:\(config[^)]*\))?[>#]$/.test(line)) {
+      return line;
+    }
+
+    if (/[A-Z]:\\>$/.test(line)) {
+      return line;
+    }
+
+    if (/\b(?:PC|Server|Laptop|Host)[A-Za-z0-9._-]*>$/.test(line)) {
+      return line;
+    }
+  }
+
+  return "";
+}
+
 export function getPromptSafe(terminal: any): string {
   try {
     if (typeof terminal.getPrompt === "function") {
       const p = terminal.getPrompt();
-      if (p && typeof p === "string") {
-        return p;
+      if (p && typeof p === "string" && p.trim()) {
+        return p.trim();
       }
     }
-    return "";
-  } catch {
-    return "";
-  }
+  } catch {}
+
+  try {
+    const snapshot = readTerminalSnapshot(terminal);
+    const inferred = inferPromptFromText(snapshot.raw);
+    if (inferred) return inferred;
+  } catch {}
+
+  return "";
 }
 
 /**
```
