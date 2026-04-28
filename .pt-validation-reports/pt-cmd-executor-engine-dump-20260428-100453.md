# PT cmd executor engine dump

Fecha: Tue Apr 28 10:04:53 -05 2026
PT_DEV_DIR: /Users/andresgaibor/pt-dev

## Archivos reales en terminal/
```
packages/pt-runtime/src/terminal/command-executor.ts
packages/pt-runtime/src/terminal/command-output-extractor.test.ts
packages/pt-runtime/src/terminal/command-output-extractor.ts
packages/pt-runtime/src/terminal/command-sanitizer.ts
packages/pt-runtime/src/terminal/confirm-handler.ts
packages/pt-runtime/src/terminal/engine/command-executor.ts
packages/pt-runtime/src/terminal/engine/command-state-machine.ts
packages/pt-runtime/src/terminal/engine/index.ts
packages/pt-runtime/src/terminal/engine/terminal-completion-controller.ts
packages/pt-runtime/src/terminal/engine/terminal-error-resolver.ts
packages/pt-runtime/src/terminal/engine/terminal-event-collector.ts
packages/pt-runtime/src/terminal/engine/terminal-observability.ts
packages/pt-runtime/src/terminal/engine/terminal-output-pipeline.ts
packages/pt-runtime/src/terminal/engine/terminal-recovery-controller.ts
packages/pt-runtime/src/terminal/index.ts
packages/pt-runtime/src/terminal/ios-evidence.ts
packages/pt-runtime/src/terminal/mode-guard.ts
packages/pt-runtime/src/terminal/pager-handler.ts
packages/pt-runtime/src/terminal/plan-engine.ts
packages/pt-runtime/src/terminal/prompt-detector.ts
packages/pt-runtime/src/terminal/session-registry.ts
packages/pt-runtime/src/terminal/session-state.ts
packages/pt-runtime/src/terminal/stability-heuristic.ts
packages/pt-runtime/src/terminal/standard-plans.ts
packages/pt-runtime/src/terminal/terminal-errors.ts
packages/pt-runtime/src/terminal/terminal-execution-result.ts
packages/pt-runtime/src/terminal/terminal-plan.ts
packages/pt-runtime/src/terminal/terminal-ready.ts
packages/pt-runtime/src/terminal/terminal-recovery.ts
packages/pt-runtime/src/terminal/terminal-semantic-verifier.ts
packages/pt-runtime/src/terminal/terminal-utils.ts
```

## engine/command-executor.ts
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

## engine/command-state-machine.ts
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
```

## engine/*.ts

### packages/pt-runtime/src/terminal/engine/command-executor.ts
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

### packages/pt-runtime/src/terminal/engine/command-state-machine.ts
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
```

### packages/pt-runtime/src/terminal/engine/index.ts
```ts
// ============================================================================
// Terminal Engine - Componentes modulares del motor de ejecución
// ============================================================================
// Exports públicos de los componentes extraídos de command-executor.ts.
// Estos componentes pueden ser usados individualmente o en conjunto.

// Command State Machine
export {
  CommandStateMachine,
  type CommandStateMachineConfig,
  type SendPagerAdvanceFn,
} from "./command-state-machine";

// Command Executor (orchestration)
export {
  executeTerminalCommand,
  type PTCommandLine,
  type ExecutionOptions,
  type CommandExecutionResult,
} from "./command-executor";

// Event Collection
export {
  createTerminalEventCollector,
  pushEvent,
  compactTerminalEvents,
  type TerminalEventCollector,
} from "./terminal-event-collector";

// Completion Controller
export {
  shouldFinalizeCommand,
  checkCommandFinished,
  COMMAND_END_GRACE_MS,
  COMMAND_END_MAX_WAIT_MS,
  HOST_COMMAND_END_GRACE_MS,
  type CompletionState,
} from "./terminal-completion-controller";

// Output Pipeline
export {
  buildFinalOutput,
  normalizeSessionKind,
  type OutputPipelineInput,
  type OutputPipelineResult,
} from "./terminal-output-pipeline";

// Error Resolver
export {
  resolveTerminalError,
  guessFailureStatus,
  isOnlyPrompt,
  normalizeStatus,
  type ErrorResolution,
} from "./terminal-error-resolver";

// Recovery Controller
export {
  detectDnsHangup,
  recover,
  shouldRetry,
  createRecoveryController,
  isRecoverableError,
  type TerminalRecoveryController,
} from "./terminal-recovery-controller";

// Observability
export {
  computeConfidenceString,
  computeConfidenceFromFactors,
  detectAnomalies,
  type ConfidenceLevel,
  type AnomalyReport,
} from "./terminal-observability";```

### packages/pt-runtime/src/terminal/engine/terminal-completion-controller.ts
```ts
// ============================================================================
// Terminal Completion Controller - Control de completado de comandos
// ============================================================================
// Gestiona la lógica de decisión para cuándo un comando ha terminado.
// Extraído de command-executor.ts para separar la heurística de finalización.

import { checkCommandCompletion, type CompletionContext } from "../stability-heuristic";
import type { TerminalMode } from "../session-state";

export const COMMAND_END_GRACE_MS = 900;
export const COMMAND_END_MAX_WAIT_MS = 1000;
export const HOST_COMMAND_END_GRACE_MS = 1500;

export interface CompletionState {
  startedSeen: boolean;
  commandEndedSeen: boolean;
  commandEndSeenAt: number | null;
  lastOutputAt: number;
  promptStableSince: number | null;
  previousPrompt: string;
}

/**
 * Decide si el comando debe finalizarse basado en el estado actual.
 * Implementa la heurística de quiet-window para determinar estabilidad.
 * Extraído de scheduleFinalizeAfterCommandEnd en command-executor.ts.
 */
export function shouldFinalizeCommand(input: {
  state: CompletionState;
  currentPrompt: string;
  currentMode: TerminalMode;
  expectedMode?: TerminalMode;
  sessionKind: string;
  pagerActive: boolean;
  confirmPromptActive: boolean;
}): { finished: boolean; reason?: string } {
  const { state, currentPrompt, currentMode, expectedMode, sessionKind, pagerActive, confirmPromptActive } = input;

  if (pagerActive) return { finished: false };
  if (confirmPromptActive) return { finished: false };

  if (state.commandEndedSeen && state.commandEndSeenAt) {
    const waitedAfterEnd = Date.now() - state.commandEndSeenAt;
    if (waitedAfterEnd >= COMMAND_END_MAX_WAIT_MS) {
      return { finished: true, reason: "command-ended-max-wait" };
    }
  }

  const ctx: CompletionContext = {
    currentPrompt,
    previousPrompt: state.previousPrompt,
    commandEndedSeen: state.commandEndedSeen,
    lastOutputAt: state.lastOutputAt,
    now: Date.now(),
    promptStableSince: state.promptStableSince,
    sessionKind: sessionKind as "ios" | "host" | "unknown",
    pagerActive,
    confirmPromptActive,
    expectedMode,
    currentMode,
  };

  return checkCommandCompletion(ctx);
}

/**
 * Wrapper para verificar si un comando ha terminado usando la heurística legacy.
 */
export function checkCommandFinished(
  currentPrompt: string,
  previousPrompt: string,
  commandEndedSeen: boolean,
  lastOutputAt: number,
  now: number,
  promptStableSince: number | null,
  sessionKind: "ios" | "host" | "unknown",
  pagerActive: boolean,
  confirmPromptActive: boolean,
  expectedMode: TerminalMode | undefined,
  currentMode: TerminalMode,
): { finished: boolean; reason?: string } {
  return shouldFinalizeCommand({
    state: {
      startedSeen: false,
      commandEndedSeen,
      commandEndSeenAt: null,
      lastOutputAt,
      promptStableSince,
      previousPrompt,
    },
    currentPrompt,
    currentMode,
    expectedMode,
    sessionKind,
    pagerActive,
    confirmPromptActive,
  });
}```

### packages/pt-runtime/src/terminal/engine/terminal-error-resolver.ts
```ts
// ============================================================================
// Terminal Error Resolver - Resolución de errores del terminal
// ============================================================================
// Determina el status final y errores basándose en el output y estado.
// Extraído de command-executor.ts para separar la lógica de error handling.

import { TerminalErrors, type TerminalErrorCode } from "../terminal-errors";
import type { TerminalMode } from "../session-state";

/**
 * Resultado de la resolución de errores.
 */
export interface ErrorResolution {
  ok: boolean;
  status: number;
  code?: TerminalErrorCode;
  message?: string;
  warnings: string[];
}

/**
 * Resuelve el estado de error final basándose en múltiples factores.
 * Extraído de la lógica de finalize en command-executor.ts.
 */
export function resolveTerminalError(input: {
  output: string;
  sessionKind: string;
  cmdOk: boolean;
  status: number | null;
  promptMatched: boolean;
  modeMatched: boolean;
  expectedPrompt?: string;
  expectedMode?: TerminalMode;
  startedSeen: boolean;
  endedSeen: boolean;
  outputEvents: number;
  wizardDismissed?: boolean;
  hostBusy?: boolean;
  allowEmptyOutput?: boolean;
  finalOutput: string;
}): ErrorResolution {
  const warnings: string[] = [];

  let { cmdOk, status, promptMatched, modeMatched } = input;
  let finalError: string | undefined;
  let finalCode: TerminalErrorCode | undefined;

  if (cmdOk && !modeMatched) {
    finalError = `Expected mode "${input.expectedMode}" not reached; got "${input.expectedMode}" at prompt "${input.expectedPrompt}".`;
    finalCode = TerminalErrors.PROMPT_MISMATCH;
  }

  if (cmdOk && !promptMatched) {
    finalError = `Expected prompt "${input.expectedPrompt}" not reached; got "${input.expectedPrompt}".`;
    finalCode = TerminalErrors.PROMPT_MISMATCH;
  }

  if (!cmdOk && status === null) {
    status = guessFailureStatus(input.output);
  }

  if (!promptMatched) {
    warnings.push(`Expected prompt "${input.expectedPrompt}" not reached.`);
  }
  if (!modeMatched) {
    warnings.push(`Expected mode "${input.expectedMode}" not reached.`);
  }
  if (input.wizardDismissed) {
    warnings.push("Initial configuration dialog was auto-dismissed");
  }
  if (input.hostBusy) {
    warnings.push("Host command produced long-running output");
  }

  const isOnlyPromptResult = isOnlyPrompt(input.finalOutput, input.expectedPrompt ?? "");
  const emptyWithoutEnded = !input.finalOutput.trim() && !input.endedSeen;
  if (!input.allowEmptyOutput && (isOnlyPromptResult || emptyWithoutEnded)) {
    cmdOk = false;
    if (!warnings.includes("No output received")) {
      warnings.push("No output received");
    }
  }

  return {
    ok: cmdOk,
    status: status ?? 1,
    code: finalCode,
    message: finalError,
    warnings,
  };
}

/**
 * Detecta si el output contiene errores IOS conocidos.
 * Extraído de command-executor.ts line 131-144.
 */
export function guessFailureStatus(output: string): number {
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

/**
 * Verifica si el output es solo un prompt (sin contenido real).
 */
export function isOnlyPrompt(output: string, prompt: string): boolean {
  if (!output || !prompt) return false;
  const normalizedOutput = output.trim();
  const normalizedPrompt = prompt.trim();
  return (
    normalizedOutput === normalizedPrompt ||
    normalizedOutput === normalizedPrompt.replace(/#|>/, "").trim()
  );
}

/**
 * Normaliza el status del comando a un valor válido.
 */
export function normalizeStatus(status: number | null): number {
  if (status === null) return 1;
  if (status < 0 || status > 255) return 1;
  return status;
}```

### packages/pt-runtime/src/terminal/engine/terminal-event-collector.ts
```ts
// ============================================================================
// Terminal Event Collector - Colección de eventos del terminal
// ============================================================================
// Gestiona el buffer de output y la colección de eventos de terminal.
// Las funciones pushEvent y compactTerminalEvents fueron extraídas de
// command-executor.ts para separar responsabilidades.

import type { TerminalEventRecord } from "../../pt/terminal/terminal-events";
import { normalizePrompt } from "../prompt-detector";

/**
 * Interfaz pública del coleccionador de eventos de terminal.
 */
export interface TerminalEventCollector {
  events: TerminalEventRecord[];
  outputBuffer: string;
  outputEventsCount: number;
  push(eventType: string, raw: string, normalized?: string): void;
  appendOutput(chunk: string): void;
  compact(): TerminalEventRecord[];
}

/**
 * Crea un coleccionador de eventos de terminal.
 * Mantiene el estado de eventos y buffer de output.
 */
export function createTerminalEventCollector(
  sessionId: string,
  deviceName: string
): TerminalEventCollector {
  const events: TerminalEventRecord[] = [];
  let outputBuffer = "";
  let outputEventsCount = 0;

  return {
    get events() {
      return events;
    },
    get outputBuffer() {
      return outputBuffer;
    },
    get outputEventsCount() {
      return outputEventsCount;
    },
    push(eventType: string, raw: string, normalized?: string): void {
      events.push({
        sessionId,
        deviceName,
        eventType,
        timestamp: Date.now(),
        raw,
        normalized: normalized ?? normalizePrompt(raw),
      });
    },
    appendOutput(chunk: string): void {
      outputBuffer += chunk;
      outputEventsCount++;
    },
    compact(): TerminalEventRecord[] {
      return compactTerminalEvents(events);
    },
  };
}

/**
 * Registra un evento en la colección de eventos del terminal.
 * Extraído de command-executor.ts lines 101-117.
 */
export function pushEvent(
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

/**
 * Compacta eventos de output adyacentes en un solo evento outputWritten.
 * Reduces the number of events by merging consecutive outputWritten events.
 * Extraído de command-executor.ts lines 186-222.
 */
export function compactTerminalEvents(events: TerminalEventRecord[]): TerminalEventRecord[] {
  const compacted: TerminalEventRecord[] = [];
  let buffer = "";

  for (const event of events) {
    if (event.eventType === "outputWritten") {
      buffer += event.raw;
      continue;
    }

    if (buffer) {
      compacted.push({
        ...event,
        eventType: "outputWritten",
        raw: buffer,
        normalized: buffer.trim(),
        timestamp: event.timestamp,
      });
      buffer = "";
    }

    compacted.push(event);
  }

  if (buffer) {
    compacted.push({
      sessionId: events[events.length - 1]?.sessionId ?? "",
      deviceName: events[events.length - 1]?.deviceName ?? "",
      eventType: "outputWritten",
      timestamp: events[events.length - 1]?.timestamp ?? Date.now(),
      raw: buffer,
      normalized: buffer.trim(),
    });
  }

  return compacted;
}```

### packages/pt-runtime/src/terminal/engine/terminal-observability.ts
```ts
// ============================================================================
// Terminal Observability - Funciones de observabilidad y confianza
// ============================================================================
// Proporciona métricas de confianza y diagnóstico para el terminal.
// Extraído de command-executor.ts para separar la lógica de métricas.

/**
 * Niveles de confianza para el resultado de un comando.
 */
export type ConfidenceLevel = "high" | "medium" | "low" | "failure";

/**
 * Calcula el nivel de confianza del resultado de un comando.
 * Analiza múltiples factores para determinar la calidad del output.
 * Extraído de command-executor.ts lines 146-177.
 */
export function computeConfidenceString(
  cmdOk: boolean,
  warnings: string[],
  output: string,
  modeMatched: boolean,
  promptMatched: boolean,
  startedSeen: boolean,
  endedSeen: boolean,
  outputEvents: number,
): ConfidenceLevel {
  if (!cmdOk) return "failure";

  const factors: string[] = [];

  if (!startedSeen) factors.push("no-started");
  if (!endedSeen) factors.push("no-ended");
  if (outputEvents === 0) factors.push("no-events");
  if (!output.trim()) factors.push("empty-output");
  if (!modeMatched) factors.push("mode-mismatch");
  if (!promptMatched) factors.push("prompt-mismatch");
  if (warnings.length > 0) factors.push("warnings");

  if (factors.length === 0 && startedSeen && endedSeen && output.trim()) {
    return "high";
  }

  if (factors.length <= 2 && (startedSeen || endedSeen) && output.trim()) {
    return "medium";
  }

  return "low";
}

/**
 * Versión simplificada que recibe los factores ya calculados.
 */
export function computeConfidenceFromFactors(input: {
  startedSeen: boolean;
  endedSeen: boolean;
  outputEvents: number;
  hasOutput: boolean;
  modeMatched: boolean;
  promptMatched: boolean;
  warningCount: number;
}): ConfidenceLevel {
  const { startedSeen, endedSeen, outputEvents, hasOutput, modeMatched, promptMatched, warningCount } = input;

  const factors: string[] = [];
  if (!startedSeen) factors.push("no-started");
  if (!endedSeen) factors.push("no-ended");
  if (outputEvents === 0) factors.push("no-events");
  if (!hasOutput) factors.push("empty-output");
  if (!modeMatched) factors.push("mode-mismatch");
  if (!promptMatched) factors.push("prompt-mismatch");
  if (warningCount > 0) factors.push("warnings");

  if (factors.length === 0 && startedSeen && endedSeen && hasOutput) {
    return "high";
  }

  if (factors.length <= 2 && (startedSeen || endedSeen) && hasOutput) {
    return "medium";
  }

  return "low";
}

/**
 * Analiza el output para detectar anomalías.
 */
export interface AnomalyReport {
  hasAsyncNoise: boolean;
  hasEmptyOutput: boolean;
  hasPager: boolean;
  hasConfirmPrompt: boolean;
  hasWizard: boolean;
  hasDnsHangup: boolean;
  anomalyCount: number;
}

export function detectAnomalies(output: string): AnomalyReport {
  const text = output.toLowerCase();

  return {
    hasAsyncNoise: /^%[A-Z0-9_-]+-\d+-[A-Z0-9_-]+:/m.test(output),
    hasEmptyOutput: !output.trim(),
    hasPager: /--More--/i.test(output),
    hasConfirmPrompt: /\[confirm\]|\[yes\/no\]|\(y\/n\)/i.test(text),
    hasWizard: /initial configuration dialog|would you like to enter/i.test(text),
    hasDnsHangup: /translating\s+["']?.+["']?\.\.\./i.test(text),
    anomalyCount: 0,
  };
}```

### packages/pt-runtime/src/terminal/engine/terminal-output-pipeline.ts
```ts
// ============================================================================
// Terminal Output Pipeline - Pipeline de procesamiento de output
// ============================================================================
// Construye el output final del comando combinando eventos y snapshots.
// Extraído de command-executor.ts (función finalize) para separar la
// lógica de construcción de output.

import type { CommandSessionKind } from "../command-output-extractor";
import { extractCommandOutput } from "../command-output-extractor";
import type { TerminalSnapshot } from "../prompt-detector";

export interface OutputPipelineInput {
  command: string;
  sessionKind: "ios" | "host" | "unknown";
  promptBefore: string;
  promptAfter: string;
  eventOutput: string;
  snapshotDelta: string;
  snapshotAfter: TerminalSnapshot;
  commandEndedSeen: boolean;
  outputEventsCount: number;
}

export interface OutputPipelineResult {
  output: string;
  raw: string;
  source: string;
  confidence: "high" | "medium" | "low";
  warnings: string[];
  asyncNoise: string[];
}

/**
 * Construye el output final combinando múltiples fuentes de datos.
 * Extraído de la lógica de finalize en command-executor.ts.
 */
export function buildFinalOutput(input: {
  command: string;
  sessionKind: "ios" | "host" | "unknown";
  promptBefore: string;
  promptAfter: string;
  eventOutput: string;
  snapshotDelta: string;
  commandEndedSeen: boolean;
  outputEventsCount: number;
  snapshotAfter?: TerminalSnapshot;
}): {
  output: string;
  raw: string;
  warnings: string[];
  asyncNoise: string[];
  confidence: "high" | "medium" | "low" | "failure";
} {
  const kind: CommandSessionKind = input.sessionKind === "unknown" ? "ios" : input.sessionKind as CommandSessionKind;

  const extractResult = extractCommandOutput({
    command: input.command,
    sessionKind: kind,
    promptBefore: input.promptBefore,
    promptAfter: input.promptAfter,
    eventOutput: input.eventOutput,
    snapshotDelta: input.snapshotDelta,
    snapshotAfter: input.snapshotAfter,
    commandEndedSeen: input.commandEndedSeen,
    outputEventsCount: input.outputEventsCount,
  });

  return {
    output: extractResult.output,
    raw: extractResult.raw,
    warnings: extractResult.warnings,
    asyncNoise: extractResult.asyncNoise,
    confidence: extractResult.confidence,
  };
}

/**
 * Normaliza el session kind para extracción de output.
 */
export function normalizeSessionKind(kind: string): CommandSessionKind {
  if (kind === "ios" || kind === "host") return kind;
  return "ios";
}```

### packages/pt-runtime/src/terminal/engine/terminal-recovery-controller.ts
```ts
// ============================================================================
// Terminal Recovery Controller - Control de recuperación ante fallos
// ============================================================================
// Detecta condiciones de error y ejecuta recuperación sincronica.
// Extraído de command-executor.ts para separar la lógica de recuperación.

import { recoverTerminalSync, type RecoveryResult } from "../terminal-recovery";
import { TerminalErrors } from "../terminal-errors";

/**
 * Interfaz del controlador de recuperación.
 */
export interface TerminalRecoveryController {
  detectDnsHangup(output: string): boolean;
  recover(terminal: any, sessionKind: "ios" | "host"): RecoveryResult;
  shouldRetry(attempt: number, maxRetries?: number): boolean;
}

/**
 * Detecta si el output contiene un DNS hangup (comando bloqueado en DNS lookup).
 * Extraído de command-executor.ts line 119-121.
 */
export function detectDnsHangup(chunk: string): boolean {
  return /Translating\s+["']?.+["']?\.\.\./i.test(chunk);
}

/**
 * Recupera el terminal síncronamente usando Ctrl+C y Enter.
 */
export function recover(terminal: any, sessionKind: "ios" | "host"): RecoveryResult {
  return recoverTerminalSync(terminal, sessionKind);
}

/**
 * Determina si se debe reintentar basado en el número de intento.
 */
export function shouldRetry(attempt: number, maxRetries: number = 3): boolean {
  return attempt < maxRetries;
}

/**
 * Crea un controlador de recuperación configurado.
 */
export function createRecoveryController(config: { maxRetries?: number } = {}): TerminalRecoveryController {
  const maxRetries = config.maxRetries ?? 3;

  return {
    detectDnsHangup,
    recover: (terminal, sessionKind) => recover(terminal, sessionKind),
    shouldRetry: (attempt) => shouldRetry(attempt, maxRetries),
  };
}

/**
 * Verifica si un error es recuperable.
 * Extraído de finalizeFailure en command-executor.ts.
 */
export function isRecoverableError(code: string, message?: string): boolean {
  const recoverableCodes = [
    TerminalErrors.COMMAND_START_TIMEOUT,
    TerminalErrors.COMMAND_END_TIMEOUT,
    TerminalErrors.PROMPT_MISMATCH,
    TerminalErrors.MODE_MISMATCH,
  ];

  if (recoverableCodes.includes(code as any)) return true;
  if (message?.includes("No output received")) return true;
  return false;
}```

## Últimos resultados del ticket cmd-5d690803
```

----- /Users/andresgaibor/pt-dev/results/cmd_000000017336.json -----
{"protocolVersion":2,"id":"cmd_000000017336","seq":17336,"type":"__pollDeferred","startedAt":1777388438276,"completedAt":1777388438363,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-5d690803","done":false,"state":"waiting-ensure-mode","currentStep":0,"totalSteps":2,"stepType":"ensure-mode","stepValue":"privileged-exec","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777388421220,"ageMs":17115,"idleMs":17115}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017335.json -----
{"protocolVersion":2,"id":"cmd_000000017335","seq":17335,"type":"__pollDeferred","startedAt":1777388437757,"completedAt":1777388437854,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-5d690803","done":false,"state":"waiting-ensure-mode","currentStep":0,"totalSteps":2,"stepType":"ensure-mode","stepValue":"privileged-exec","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777388421220,"ageMs":16601,"idleMs":16601}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017334.json -----
{"protocolVersion":2,"id":"cmd_000000017334","seq":17334,"type":"__pollDeferred","startedAt":1777388437260,"completedAt":1777388437355,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-5d690803","done":false,"state":"waiting-ensure-mode","currentStep":0,"totalSteps":2,"stepType":"ensure-mode","stepValue":"privileged-exec","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777388421220,"ageMs":16099,"idleMs":16099}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017333.json -----
{"protocolVersion":2,"id":"cmd_000000017333","seq":17333,"type":"__pollDeferred","startedAt":1777388436756,"completedAt":1777388436849,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-5d690803","done":false,"state":"waiting-ensure-mode","currentStep":0,"totalSteps":2,"stepType":"ensure-mode","stepValue":"privileged-exec","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777388421220,"ageMs":15591,"idleMs":15591}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017332.json -----
{"protocolVersion":2,"id":"cmd_000000017332","seq":17332,"type":"__pollDeferred","startedAt":1777388436189,"completedAt":1777388436281,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-5d690803","done":false,"state":"waiting-ensure-mode","currentStep":0,"totalSteps":2,"stepType":"ensure-mode","stepValue":"privileged-exec","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777388421220,"ageMs":15021,"idleMs":15021}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017331.json -----
{"protocolVersion":2,"id":"cmd_000000017331","seq":17331,"type":"__pollDeferred","startedAt":1777388435562,"completedAt":1777388435668,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-5d690803","done":false,"state":"waiting-ensure-mode","currentStep":0,"totalSteps":2,"stepType":"ensure-mode","stepValue":"privileged-exec","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777388421220,"ageMs":14420,"idleMs":14420}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017330.json -----
{"protocolVersion":2,"id":"cmd_000000017330","seq":17330,"type":"__pollDeferred","startedAt":1777388434960,"completedAt":1777388435093,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-5d690803","done":false,"state":"waiting-ensure-mode","currentStep":0,"totalSteps":2,"stepType":"ensure-mode","stepValue":"privileged-exec","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777388421220,"ageMs":13839,"idleMs":13839}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017329.json -----
{"protocolVersion":2,"id":"cmd_000000017329","seq":17329,"type":"__pollDeferred","startedAt":1777388434257,"completedAt":1777388434345,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-5d690803","done":false,"state":"waiting-ensure-mode","currentStep":0,"totalSteps":2,"stepType":"ensure-mode","stepValue":"privileged-exec","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777388421220,"ageMs":13098,"idleMs":13098}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017328.json -----
{"protocolVersion":2,"id":"cmd_000000017328","seq":17328,"type":"__pollDeferred","startedAt":1777388433757,"completedAt":1777388433849,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-5d690803","done":false,"state":"waiting-ensure-mode","currentStep":0,"totalSteps":2,"stepType":"ensure-mode","stepValue":"privileged-exec","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777388421220,"ageMs":12589,"idleMs":12589}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017327.json -----
{"protocolVersion":2,"id":"cmd_000000017327","seq":17327,"type":"__pollDeferred","startedAt":1777388433261,"completedAt":1777388433354,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-5d690803","done":false,"state":"waiting-ensure-mode","currentStep":0,"totalSteps":2,"stepType":"ensure-mode","stepValue":"privileged-exec","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777388421220,"ageMs":12098,"idleMs":12098}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017326.json -----
{"protocolVersion":2,"id":"cmd_000000017326","seq":17326,"type":"__pollDeferred","startedAt":1777388432748,"completedAt":1777388432824,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-5d690803","done":false,"state":"waiting-ensure-mode","currentStep":0,"totalSteps":2,"stepType":"ensure-mode","stepValue":"privileged-exec","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777388421220,"ageMs":11577,"idleMs":11577}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017325.json -----
{"protocolVersion":2,"id":"cmd_000000017325","seq":17325,"type":"__pollDeferred","startedAt":1777388432256,"completedAt":1777388432353,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-5d690803","done":false,"state":"waiting-ensure-mode","currentStep":0,"totalSteps":2,"stepType":"ensure-mode","stepValue":"privileged-exec","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777388421220,"ageMs":11092,"idleMs":11092}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017324.json -----
{"protocolVersion":2,"id":"cmd_000000017324","seq":17324,"type":"__pollDeferred","startedAt":1777388431758,"completedAt":1777388431837,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-5d690803","done":false,"state":"waiting-ensure-mode","currentStep":0,"totalSteps":2,"stepType":"ensure-mode","stepValue":"privileged-exec","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777388421220,"ageMs":10588,"idleMs":10588}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017323.json -----
{"protocolVersion":2,"id":"cmd_000000017323","seq":17323,"type":"__pollDeferred","startedAt":1777388431255,"completedAt":1777388431337,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-5d690803","done":false,"state":"waiting-ensure-mode","currentStep":0,"totalSteps":2,"stepType":"ensure-mode","stepValue":"privileged-exec","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777388421220,"ageMs":10083,"idleMs":10083}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017322.json -----
{"protocolVersion":2,"id":"cmd_000000017322","seq":17322,"type":"__pollDeferred","startedAt":1777388430750,"completedAt":1777388430827,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-5d690803","done":false,"state":"waiting-ensure-mode","currentStep":0,"totalSteps":2,"stepType":"ensure-mode","stepValue":"privileged-exec","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777388421220,"ageMs":9577,"idleMs":9577}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017321.json -----
{"protocolVersion":2,"id":"cmd_000000017321","seq":17321,"type":"__pollDeferred","startedAt":1777388430260,"completedAt":1777388430350,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-5d690803","done":false,"state":"waiting-ensure-mode","currentStep":0,"totalSteps":2,"stepType":"ensure-mode","stepValue":"privileged-exec","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777388421220,"ageMs":9095,"idleMs":9095}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017320.json -----
{"protocolVersion":2,"id":"cmd_000000017320","seq":17320,"type":"__pollDeferred","startedAt":1777388429753,"completedAt":1777388429839,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-5d690803","done":false,"state":"waiting-ensure-mode","currentStep":0,"totalSteps":2,"stepType":"ensure-mode","stepValue":"privileged-exec","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777388421220,"ageMs":8586,"idleMs":8586}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017319.json -----
{"protocolVersion":2,"id":"cmd_000000017319","seq":17319,"type":"__pollDeferred","startedAt":1777388429257,"completedAt":1777388429354,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-5d690803","done":false,"state":"waiting-ensure-mode","currentStep":0,"totalSteps":2,"stepType":"ensure-mode","stepValue":"privileged-exec","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777388421220,"ageMs":8098,"idleMs":8098}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017318.json -----
{"protocolVersion":2,"id":"cmd_000000017318","seq":17318,"type":"__pollDeferred","startedAt":1777388428760,"completedAt":1777388428834,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-5d690803","done":false,"state":"waiting-ensure-mode","currentStep":0,"totalSteps":2,"stepType":"ensure-mode","stepValue":"privileged-exec","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777388421220,"ageMs":7587,"idleMs":7587}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017317.json -----
{"protocolVersion":2,"id":"cmd_000000017317","seq":17317,"type":"__pollDeferred","startedAt":1777388428260,"completedAt":1777388428346,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-5d690803","done":false,"state":"waiting-ensure-mode","currentStep":0,"totalSteps":2,"stepType":"ensure-mode","stepValue":"privileged-exec","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777388421220,"ageMs":7089,"idleMs":7089}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017316.json -----
{"protocolVersion":2,"id":"cmd_000000017316","seq":17316,"type":"__pollDeferred","startedAt":1777388427749,"completedAt":1777388427832,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-5d690803","done":false,"state":"waiting-ensure-mode","currentStep":0,"totalSteps":2,"stepType":"ensure-mode","stepValue":"privileged-exec","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777388421220,"ageMs":6585,"idleMs":6585}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017315.json -----
{"protocolVersion":2,"id":"cmd_000000017315","seq":17315,"type":"__pollDeferred","startedAt":1777388427251,"completedAt":1777388427329,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-5d690803","done":false,"state":"waiting-ensure-mode","currentStep":0,"totalSteps":2,"stepType":"ensure-mode","stepValue":"privileged-exec","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777388421220,"ageMs":6077,"idleMs":6077}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017314.json -----
{"protocolVersion":2,"id":"cmd_000000017314","seq":17314,"type":"__pollDeferred","startedAt":1777388426749,"completedAt":1777388426824,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-5d690803","done":false,"state":"waiting-ensure-mode","currentStep":0,"totalSteps":2,"stepType":"ensure-mode","stepValue":"privileged-exec","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777388421220,"ageMs":5575,"idleMs":5575}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017313.json -----
{"protocolVersion":2,"id":"cmd_000000017313","seq":17313,"type":"__pollDeferred","startedAt":1777388426252,"completedAt":1777388426326,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-5d690803","done":false,"state":"waiting-ensure-mode","currentStep":0,"totalSteps":2,"stepType":"ensure-mode","stepValue":"privileged-exec","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777388421220,"ageMs":5077,"idleMs":5077}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017312.json -----
{"protocolVersion":2,"id":"cmd_000000017312","seq":17312,"type":"__pollDeferred","startedAt":1777388425749,"completedAt":1777388425828,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-5d690803","done":false,"state":"waiting-ensure-mode","currentStep":0,"totalSteps":2,"stepType":"ensure-mode","stepValue":"privileged-exec","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777388421220,"ageMs":4575,"idleMs":4575}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017311.json -----
{"protocolVersion":2,"id":"cmd_000000017311","seq":17311,"type":"__pollDeferred","startedAt":1777388425264,"completedAt":1777388425350,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-5d690803","done":false,"state":"waiting-ensure-mode","currentStep":0,"totalSteps":2,"stepType":"ensure-mode","stepValue":"privileged-exec","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777388421220,"ageMs":4096,"idleMs":4096}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017310.json -----
{"protocolVersion":2,"id":"cmd_000000017310","seq":17310,"type":"__pollDeferred","startedAt":1777388424762,"completedAt":1777388424867,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-5d690803","done":false,"state":"waiting-ensure-mode","currentStep":0,"totalSteps":2,"stepType":"ensure-mode","stepValue":"privileged-exec","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777388421220,"ageMs":3608,"idleMs":3608}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017309.json -----
{"protocolVersion":2,"id":"cmd_000000017309","seq":17309,"type":"__pollDeferred","startedAt":1777388424252,"completedAt":1777388424330,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-5d690803","done":false,"state":"waiting-ensure-mode","currentStep":0,"totalSteps":2,"stepType":"ensure-mode","stepValue":"privileged-exec","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777388421220,"ageMs":3081,"idleMs":3081}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017308.json -----
{"protocolVersion":2,"id":"cmd_000000017308","seq":17308,"type":"__pollDeferred","startedAt":1777388423752,"completedAt":1777388423835,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-5d690803","done":false,"state":"waiting-ensure-mode","currentStep":0,"totalSteps":2,"stepType":"ensure-mode","stepValue":"privileged-exec","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777388421220,"ageMs":2581,"idleMs":2581}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017307.json -----
{"protocolVersion":2,"id":"cmd_000000017307","seq":17307,"type":"__pollDeferred","startedAt":1777388423274,"completedAt":1777388423360,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-5d690803","done":false,"state":"waiting-ensure-mode","currentStep":0,"totalSteps":2,"stepType":"ensure-mode","stepValue":"privileged-exec","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777388421220,"ageMs":2110,"idleMs":2110}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017306.json -----
{"protocolVersion":2,"id":"cmd_000000017306","seq":17306,"type":"__pollDeferred","startedAt":1777388422750,"completedAt":1777388422836,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-5d690803","done":false,"state":"waiting-ensure-mode","currentStep":0,"totalSteps":2,"stepType":"ensure-mode","stepValue":"privileged-exec","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777388421220,"ageMs":1585,"idleMs":1585}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017305.json -----
{"protocolVersion":2,"id":"cmd_000000017305","seq":17305,"type":"__pollDeferred","startedAt":1777388422261,"completedAt":1777388422354,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-5d690803","done":false,"state":"waiting-ensure-mode","currentStep":0,"totalSteps":2,"stepType":"ensure-mode","stepValue":"privileged-exec","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777388421220,"ageMs":1103,"idleMs":1103}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017304.json -----
{"protocolVersion":2,"id":"cmd_000000017304","seq":17304,"type":"__pollDeferred","startedAt":1777388421736,"completedAt":1777388421820,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-5d690803","done":false,"state":"waiting-ensure-mode","currentStep":0,"totalSteps":2,"stepType":"ensure-mode","stepValue":"privileged-exec","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777388421220,"ageMs":560,"idleMs":560}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017303.json -----
{"protocolVersion":2,"id":"cmd_000000017303","seq":17303,"type":"terminal.plan.run","startedAt":1777388421165,"completedAt":1777388421657,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-5d690803","job":{"id":"cmd-5d690803","kind":"ios-session","version":1,"device":"SW-SRV-DIST","plan":[{"type":"ensure-mode","kind":"ensure-mode","value":"privileged-exec","expectMode":"privileged-exec","allowPager":true,"allowConfirm":false,"optional":false,"timeoutMs":12000,"options":{"timeoutMs":12000},"metadata":{"reason":"auto-enable-for-privileged-ios-command"}},{"type":"command","kind":"command","value":"show running-config","command":"show running-config","allowPager":true,"allowConfirm":false,"optional":false,"timeoutMs":12000,"options":{"timeoutMs":12000},"metadata":{}}],"options":{"stopOnError":true,"commandTimeoutMs":12000,"stallTimeoutMs":15000},"payload":{"source":"terminal.plan.run","metadata":{"deviceKind":"ios","source":"pt-control.terminal-plan-builder","lineCount":1},"policies":{"autoBreakWizard":true,"autoAdvancePager":true,"maxPagerAdvances":80,"maxConfirmations":0,"abortOnPromptMismatch":false,"abortOnModeMismatch":true}}}}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017300.json -----
{"protocolVersion":2,"id":"cmd_000000017300","seq":17300,"type":"terminal.plan.run","startedAt":1777388390549,"completedAt":1777388390731,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-37487fc3","job":{"id":"cmd-37487fc3","kind":"ios-session","version":1,"device":"SW-SRV-DIST","plan":[{"type":"command","kind":"command","value":"show ip interface brief","command":"show ip interface brief","allowPager":true,"allowConfirm":false,"optional":false,"timeoutMs":12000,"options":{"timeoutMs":12000},"metadata":{}}],"options":{"stopOnError":true,"commandTimeoutMs":12000,"stallTimeoutMs":15000},"payload":{"source":"terminal.plan.run","metadata":{"deviceKind":"ios","source":"pt-control.terminal-plan-builder","lineCount":1},"policies":{"autoBreakWizard":true,"autoAdvancePager":true,"maxPagerAdvances":80,"maxConfirmations":0,"abortOnPromptMismatch":false,"abortOnModeMismatch":true}}}}}```

## grep logs ejecución terminal
```
```
