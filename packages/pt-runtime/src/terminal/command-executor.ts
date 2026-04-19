// ============================================================================
// Command Executor - Ejecución interactiva robusta para IOS y Host Prompt
// ============================================================================

import type { TerminalMode } from "./session-state";
import { ensureSession } from "./session-registry";
import {
  detectModeFromPrompt,
  detectWizardFromOutput,
  detectConfirmPrompt,
  detectPager,
  detectHostBusy,
  detectSessionKind,
  isHostMode,
  normalizePrompt,
} from "./prompt-detector";
import { createPagerHandler } from "./pager-handler";
import { isStatusOk, type CommandEndedPayload, type TerminalEventRecord } from "../pt/terminal/terminal-events";
import { TerminalErrors, type TerminalErrorCode } from "./terminal-errors";

export interface PTCommandLine {
  getPrompt(): string;
  enterCommand(cmd: string): void;
  registerEvent(eventName: string, context: null, handler: (src: unknown, args: unknown) => void): void;
  unregisterEvent(eventName: string, context: null, handler: (src: unknown, args: unknown) => void): void;
  enterChar(charCode: number, modifiers: number): void;
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

export function createCommandExecutor(config?: { commandTimeoutMs?: number; stallTimeoutMs?: number }) {
  const defaultCommandTimeout = config?.commandTimeoutMs ?? DEFAULT_COMMAND_TIMEOUT;
  const defaultStallTimeout = config?.stallTimeoutMs ?? DEFAULT_STALL_TIMEOUT;

  function executeCommand(
    deviceName: string,
    command: string,
    terminal: PTCommandLine,
    options: ExecutionOptions = {},
  ): Promise<CommandExecutionResult> {
    const session = ensureSession(deviceName);

    const startedAt = Date.now();
    const promptBefore = normalizePrompt(terminal.getPrompt());
    const modeBefore = detectModeFromPrompt(promptBefore);
    const sessionKindBefore = detectSessionKind(promptBefore);

    if (session.sessionKind === "unknown" && sessionKindBefore !== "unknown") {
      session.sessionKind = sessionKindBefore;
    }

    if (session.health === "broken") {
      return Promise.resolve({
        ok: false,
        command,
        status: 1,
        startedAt,
        endedAt: Date.now(),
        durationMs: 0,
        promptBefore,
        promptAfter: promptBefore,
        modeBefore,
        modeAfter: modeBefore,
        output: "",
        events: [],
        warnings: [...session.warnings],
        error: "Session is broken",
        code: TerminalErrors.SESSION_BROKEN,
        confidence: 0,
      });
    }

    return new Promise((resolve) => {
      const events: TerminalEventRecord[] = [];
      const outputBuffer: string[] = [];
      const warnings: string[] = [...session.warnings];

      const pagerHandler = createPagerHandler({
        maxAdvances: options.maxPagerAdvances ?? 50,
        enabled: options.autoAdvancePager ?? true,
      });

      const commandTimeoutMs = options.commandTimeoutMs ?? defaultCommandTimeout;
      const stallTimeoutMs = options.stallTimeoutMs ?? defaultStallTimeout;

      let settled = false;
      let started = false;
      let endedStatus: number | null = null;
      let wizardDismissed = false;
      let confirmHandled = false;
      let hostBusy = false;

      let startTimer: ReturnType<typeof setTimeout> | null = null;
      let stallTimer: ReturnType<typeof setTimeout> | null = null;
      let hardTimer: ReturnType<typeof setTimeout> | null = null;

      function clearTimers(): void {
        if (startTimer) clearTimeout(startTimer);
        if (stallTimer) clearTimeout(stallTimer);
        if (hardTimer) clearTimeout(hardTimer);
        startTimer = null;
        stallTimer = null;
        hardTimer = null;
      }

      function resetStallTimer(): void {
        if (stallTimer) clearTimeout(stallTimer);
        stallTimer = setTimeout(() => {
          if (settled) return;
          finalizeFailure(
            TerminalErrors.COMMAND_END_TIMEOUT,
            "Command stalled before completion",
          );
        }, stallTimeoutMs);
      }

      function cleanup(): void {
        const handlers = [
          ["commandStarted", onStarted],
          ["outputWritten", onOutput],
          ["commandEnded", onEnded],
          ["modeChanged", onModeChanged],
          ["promptChanged", onPromptChanged],
          ["moreDisplayed", onMoreDisplayed],
        ] as const;

        for (const [eventName, handler] of handlers) {
          try {
            terminal.unregisterEvent(eventName, null, handler);
          } catch {
            // no-op
          }
        }
      }

      function finalize(cmdOk: boolean, status: number, error?: string, code?: TerminalErrorCode): void {
        if (settled) return;
        settled = true;
        clearTimers();
        cleanup();

        const endedAt = Date.now();
        const promptAfter = normalizePrompt(terminal.getPrompt());
        let modeAfter = detectModeFromPrompt(promptAfter);
        const output = outputBuffer.join("");

        if (session.sessionKind === "host" && detectHostBusy(output)) {
          hostBusy = true;
        }

        if (hostBusy && modeAfter === "unknown") {
          modeAfter = "host-busy";
        }

        session.lastActivityAt = endedAt;
        session.lastCommandEndedAt = endedAt;
        session.pendingCommand = null;
        session.lastPrompt = promptAfter;
        session.lastMode = modeAfter;
        session.outputBuffer = output;
        session.pagerActive = false;
        session.confirmPromptActive = false;

        if (!cmdOk) {
          session.health = "desynced";
        }

        const promptMatched =
          !options.expectedPromptPattern ||
          promptAfter.includes(options.expectedPromptPattern);

        const modeMatched =
          !options.expectedMode || modeAfter === options.expectedMode;

        const finalWarnings = [...warnings];
        if (!promptMatched) {
          finalWarnings.push(
            `Expected prompt "${options.expectedPromptPattern}" not reached. Final prompt: "${promptAfter}"`,
          );
        }
        if (!modeMatched) {
          finalWarnings.push(
            `Expected mode "${options.expectedMode}" not reached. Final mode: "${modeAfter}"`,
          );
        }
        if (wizardDismissed) {
          finalWarnings.push("Initial configuration dialog was auto-dismissed");
        }
        if (hostBusy) {
          finalWarnings.push("Host command produced long-running/busy output");
        }

        const confidence = computeConfidence(cmdOk, finalWarnings, output, modeMatched, promptMatched);

        resolve({
          ok: cmdOk && promptMatched && modeMatched,
          command,
          status,
          startedAt,
          endedAt,
          durationMs: endedAt - startedAt,
          promptBefore,
          promptAfter,
          modeBefore,
          modeAfter,
          output,
          events,
          warnings: finalWarnings,
          error,
          code,
          confidence,
        });
      }

      function finalizeFailure(errorCode: TerminalErrorCode, errorMessage: string): void {
        const status = (endedStatus ?? guessFailureStatus(outputBuffer.join(""))) || 1;
        finalize(false, status, errorMessage, errorCode);
      }

      function onStarted(_src: unknown, args: unknown): void {
        started = true;
        if (startTimer) {
          clearTimeout(startTimer);
          startTimer = null;
        }

        session.lastActivityAt = Date.now();
        session.lastCommand = command;
        session.lastCommandStartedAt = startedAt;
        session.pendingCommand = command;

        const startedCommand = String((args as { command?: string })?.command ?? command);
        pushEvent(events, session.sessionId, deviceName, "commandStarted", startedCommand, startedCommand);
        resetStallTimer();
      }

      function onOutput(_src: unknown, args: unknown): void {
        const payload = args as { newOutput?: string; data?: string; output?: string };
        const chunk = String(payload?.newOutput ?? payload?.data ?? payload?.output ?? "");
        if (!chunk) return;

        session.lastActivityAt = Date.now();
        session.outputBuffer += chunk;
        session.recentOutputs.push(chunk);
        if (session.recentOutputs.length > 10) session.recentOutputs.shift();

        outputBuffer.push(chunk);
        pushEvent(events, session.sessionId, deviceName, "outputWritten", chunk, chunk.trim());

        if (session.sessionKind === "unknown") {
          const detected = detectSessionKind(chunk);
          if (detected !== "unknown") session.sessionKind = detected;
        }

        if (detectWizardFromOutput(chunk)) {
          session.wizardDetected = true;
          session.sessionKind = "ios";

          if (options.autoDismissWizard !== false && !wizardDismissed) {
            wizardDismissed = true;
            try {
              terminal.enterCommand("no");
              pushEvent(events, session.sessionId, deviceName, "wizardDismissed", "no", "no");
            } catch {
              warnings.push("Failed to auto-dismiss initial configuration dialog");
            }
          }
        }

        if (detectConfirmPrompt(chunk)) {
          session.confirmPromptActive = true;
          if (options.autoConfirm && !confirmHandled) {
            confirmHandled = true;
            try {
              terminal.enterChar(13, 0);
              pushEvent(events, session.sessionId, deviceName, "confirmAccepted", "ENTER", "ENTER");
            } catch {
              warnings.push("Failed to auto-confirm interactive prompt");
            }
          }
        }

        if (detectPager(chunk)) {
          session.pagerActive = true;
          pagerHandler.handleOutput(chunk);

          if (pagerHandler.isLoop()) {
            finalizeFailure(TerminalErrors.PAGER_LOOP_DETECTED, "Pager loop detected");
            return;
          }

          if (options.autoAdvancePager !== false && pagerHandler.canContinue()) {
            try {
              terminal.enterChar(32, 0);
              pagerHandler.advance();
              pushEvent(events, session.sessionId, deviceName, "pagerAdvance", "SPACE", "SPACE");
            } catch {
              warnings.push("Failed to advance pager");
            }
          }
        } else {
          session.pagerActive = false;
        }

        if (detectHostBusy(chunk)) {
          session.sessionKind = "host";
          hostBusy = true;
        }

        resetStallTimer();
      }

      function onModeChanged(_src: unknown, args: unknown): void {
        const to = String((args as { to?: string })?.to ?? "");
        const normalizedMode = detectModeFromPrompt(to) || detectModeFromPrompt(terminal.getPrompt());

        session.lastActivityAt = Date.now();
        session.lastMode = normalizedMode;
        if (isHostMode(normalizedMode)) session.sessionKind = "host";
        pushEvent(events, session.sessionId, deviceName, "modeChanged", to, normalizedMode);
        resetStallTimer();
      }

      function onPromptChanged(_src: unknown, args: unknown): void {
        const prompt = normalizePrompt(String((args as { prompt?: string })?.prompt ?? terminal.getPrompt()));
        const mode = detectModeFromPrompt(prompt);

        session.lastActivityAt = Date.now();
        session.lastPrompt = prompt;
        session.lastMode = mode;
        if (isHostMode(mode)) session.sessionKind = "host";
        pushEvent(events, session.sessionId, deviceName, "promptChanged", prompt, prompt);
        resetStallTimer();
      }

      function onMoreDisplayed(_src: unknown, _args: unknown): void {
        session.pagerActive = true;
        pushEvent(events, session.sessionId, deviceName, "moreDisplayed", "--More--", "--More--");

        if (pagerHandler.isLoop()) {
          finalizeFailure(TerminalErrors.PAGER_LOOP_DETECTED, "Pager loop detected");
          return;
        }

        if (options.autoAdvancePager !== false && pagerHandler.canContinue()) {
          try {
            terminal.enterChar(32, 0);
            pagerHandler.advance();
            pushEvent(events, session.sessionId, deviceName, "pagerAdvance", "SPACE", "SPACE");
          } catch {
            warnings.push("Failed to advance pager after moreDisplayed");
          }
        }

        resetStallTimer();
      }

      function onEnded(_src: unknown, args: unknown): void {
        const payload = args as CommandEndedPayload;
        endedStatus = typeof payload?.status === "number" ? payload.status : guessFailureStatus(outputBuffer.join(""));

        pushEvent(
          events,
          session.sessionId,
          deviceName,
          "commandEnded",
          String(endedStatus),
          String(endedStatus),
        );

        finalize(
          isStatusOk(endedStatus),
          endedStatus,
          isStatusOk(endedStatus) ? undefined : `Command failed with status ${endedStatus}`,
          isStatusOk(endedStatus) ? undefined : TerminalErrors.COMMAND_END_TIMEOUT,
        );
      }

      const handlers = [
        ["commandStarted", onStarted],
        ["outputWritten", onOutput],
        ["commandEnded", onEnded],
        ["modeChanged", onModeChanged],
        ["promptChanged", onPromptChanged],
        ["moreDisplayed", onMoreDisplayed],
      ] as const;

      for (const [eventName, handler] of handlers) {
        try {
          terminal.registerEvent(eventName, null, handler);
        } catch {
          // PT no siempre expone todos los eventos de forma consistente
        }
      }

      session.lastCommand = command;
      session.lastCommandStartedAt = startedAt;
      session.pendingCommand = command;
      session.outputBuffer = "";
      session.lastPrompt = promptBefore;
      session.lastMode = modeBefore;
      if (sessionKindBefore !== "unknown") {
        session.sessionKind = sessionKindBefore;
      }

      startTimer = setTimeout(() => {
        if (!started) {
          finalizeFailure(TerminalErrors.COMMAND_START_TIMEOUT, "Command did not start within timeout");
        }
      }, Math.min(2000, commandTimeoutMs));

      stallTimer = setTimeout(() => {
        finalizeFailure(TerminalErrors.COMMAND_END_TIMEOUT, "Command stalled before completion");
      }, stallTimeoutMs);

      hardTimer = setTimeout(() => {
        finalizeFailure(TerminalErrors.COMMAND_END_TIMEOUT, "Command exceeded hard timeout");
      }, commandTimeoutMs);

      try {
        terminal.enterCommand(command);
      } catch (e) {
        finalizeFailure(TerminalErrors.UNKNOWN_STATE, `enterCommand() failed: ${String(e)}`);
      }
    });
  }

  return { executeCommand };
}