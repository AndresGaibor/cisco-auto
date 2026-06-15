// ============================================================================
// FinalizeScheduler - Gestiona timers y scheduling de finalización
// ============================================================================
// Extraído de command-state-machine.ts para separar la lógica de scheduling.
// Maneja todos los timers (commandEndGrace, stall, global, start) y la
// lógica de cuándo finalizar un comando.

import type { TerminalMode, TerminalSessionKind } from "../session-state";
import type { TerminalErrorCode } from "../terminal-errors";
import { shouldFinalizeCommand } from "./index.js";
import { terminalSnapshotTailHasActivePager } from "./pager-advance-controller";
import { TerminalErrors } from "../terminal-errors";

export interface FinalizeSchedulerConfig {
  command: string;
  sessionKind: TerminalSessionKind;
  options: {
    commandTimeoutMs?: number;
    stallTimeoutMs?: number;
    expectedMode?: TerminalMode;
    allowEmptyOutput?: boolean;
  };
  session: {
    pagerActive: boolean;
    confirmPromptActive: boolean;
  };
  setTimeout: typeof setTimeout;
  clearTimeout: typeof clearTimeout;
  getPromptSafeFn: (terminal: any) => string;
  getModeSafeFn: (terminal: any) => string;
  now: () => number;
}

export interface FinalizeSchedulerCallbacks {
  finalize: (cmdOk: boolean, status: number | null, error?: string, code?: TerminalErrorCode) => void;
  finalizeFailure: (code: TerminalErrorCode, message: string) => void;
  resetStallTimer: () => void;
  debug: (message: string) => void;
}

export interface FinalizeScheduler {
  scheduleFinalizeAfterCommandEnd: () => void;
  resetStallTimer: () => void;
  clearTimers: () => void;
  syncState: (state: {
    startedSeen?: boolean;
    commandEndedSeen?: boolean;
    commandEndSeenAt?: number | null;
    lastOutputAt?: number;
    promptStableSince?: number | null;
    previousPrompt?: string;
  }) => void;
  getCommandEndGraceTimer: () => ReturnType<typeof setTimeout> | null;
  getStallTimer: () => ReturnType<typeof setTimeout> | null;
  getGlobalTimeoutTimer: () => ReturnType<typeof setTimeout> | null;
  getStartTimer: () => ReturnType<typeof setTimeout> | null;
  setGlobalTimeoutTimer: (timer: ReturnType<typeof setTimeout> | null) => void;
  setStartTimer: (timer: ReturnType<typeof setTimeout> | null) => void;
  setCommandEndGraceTimer: (timer: ReturnType<typeof setTimeout> | null) => void;
  setStallTimer: (timer: ReturnType<typeof setTimeout> | null) => void;
  canAdvancePagerNow: () => boolean;
  isSettled: () => boolean;
  setSettled: (value: boolean) => void;
}

const DEFAULT_COMMAND_TIMEOUT = 15000;
const DEFAULT_STALL_TIMEOUT = 5000;

export function createFinalizeScheduler(
  config: FinalizeSchedulerConfig,
  callbacks: FinalizeSchedulerCallbacks,
  terminal: any,
  state: {
    startedSeen: boolean;
    commandEndedSeen: boolean;
    commandEndSeenAt: number | null;
    lastOutputAt: number;
    promptStableSince: number | null;
    previousPrompt: string;
  },
): FinalizeScheduler {
  let settled = false;
  let startedSeen = state.startedSeen;
  let commandEndedSeen = state.commandEndedSeen;
  let commandEndSeenAt = state.commandEndSeenAt;
  let lastOutputAt = state.lastOutputAt;
  let promptStableSince = state.promptStableSince;
  let previousPrompt = state.previousPrompt;

  let commandEndGraceTimer: ReturnType<typeof setTimeout> | null = null;
  let stallTimer: ReturnType<typeof setTimeout> | null = null;
  let globalTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  let startTimer: ReturnType<typeof setTimeout> | null = null;
  let lastPagerAdvanceAt = 0;

  function canAdvancePagerNow(): boolean {
    const now = config.now();
    if (now - lastPagerAdvanceAt < 120) {
      return false;
    }
    lastPagerAdvanceAt = now;
    return true;
  }

  function resetStallTimer(): void {
    if (stallTimer) config.clearTimeout(stallTimer);

    const stallTimeoutMs = config.options.stallTimeoutMs ?? DEFAULT_STALL_TIMEOUT;

    stallTimer = config.setTimeout(() => {
      if (settled) return;

      const currentPrompt = config.getPromptSafeFn(terminal);
      const currentMode = config.getModeSafeFn(terminal) as TerminalMode;
      const now = config.now();

      if (currentPrompt !== previousPrompt) {
        previousPrompt = currentPrompt;
        promptStableSince = now;
      }

      const verdict = shouldFinalizeCommand({
        state: {
          startedSeen,
          commandEndedSeen,
          commandEndSeenAt,
          lastOutputAt,
          promptStableSince,
          previousPrompt,
        },
        currentPrompt,
        currentMode,
        expectedMode: config.options.expectedMode,
        sessionKind: config.sessionKind,
        pagerActive: config.session.pagerActive,
        confirmPromptActive: config.session.confirmPromptActive,
      });

      if (verdict.finished) {
        callbacks.finalize(true, null, verdict.reason);
        return;
      }

      callbacks.finalizeFailure(
        TerminalErrors.COMMAND_END_TIMEOUT,
        "Command stalled before completion",
      );
    }, stallTimeoutMs);
  }

  function scheduleFinalizeAfterCommandEnd(): void {
    if (settled) return;

    if (commandEndedSeen && commandEndSeenAt) {
      const waitedAfterEnd = config.now() - commandEndSeenAt;

      if (waitedAfterEnd >= 1000) {
        callbacks.finalize(true, null, "command-ended-max-wait");
        return;
      }
    }

    if (terminalSnapshotTailHasActivePager(terminal)) {
      config.session.pagerActive = true;

      if (canAdvancePagerNow()) {
        callbacks.debug("finalize blocked by active pager");
        lastOutputAt = config.now();
        callbacks.resetStallTimer();
      }

      return;
    }

    if (config.session.pagerActive) {
      config.session.pagerActive = false;
      callbacks.debug("pager cleared by snapshot tail");
    }

    const currentPrompt = config.getPromptSafeFn(terminal);

    const promptLooksReady = /^[A-Za-z0-9._-]+(?:\(config[^)]*\))?[>#]\s*$/.test(String(currentPrompt || "").trim());
    const quietLongEnough = config.now() - lastOutputAt >= 700;

    if (
      startedSeen &&
      promptLooksReady &&
      quietLongEnough &&
      !config.session.pagerActive &&
      !config.session.confirmPromptActive
    ) {
      if (config.options.allowEmptyOutput === true || isEnableOrEndCommand(config.command)) {
        callbacks.debug(
          "finalize by prompt-ready fallback prompt=" +
            JSON.stringify(currentPrompt),
        );
        callbacks.finalize(true, null, "prompt-ready-fallback");
        return;
      }
    }

    const verdict = shouldFinalizeCommand({
      state: {
        startedSeen,
        commandEndedSeen,
        commandEndSeenAt,
        lastOutputAt,
        promptStableSince,
        previousPrompt,
      },
      currentPrompt,
      currentMode: config.getModeSafeFn(terminal) as TerminalMode,
      expectedMode: config.options.expectedMode,
      sessionKind: config.sessionKind,
      pagerActive: config.session.pagerActive,
      confirmPromptActive: config.session.confirmPromptActive,
    });

    if (verdict.finished) {
      callbacks.finalize(true, null, verdict.reason);
      return;
    }

    if (commandEndGraceTimer) config.clearTimeout(commandEndGraceTimer);
    commandEndGraceTimer = config.setTimeout(() => {
      commandEndGraceTimer = null;
      scheduleFinalizeAfterCommandEnd();
    }, config.sessionKind === "host" ? 800 : 250);
  }

  function clearTimers(): void {
    if (commandEndGraceTimer) config.clearTimeout(commandEndGraceTimer);
    if (stallTimer) config.clearTimeout(stallTimer);
    if (globalTimeoutTimer) config.clearTimeout(globalTimeoutTimer);
    if (startTimer) config.clearTimeout(startTimer);
  }

  function syncState(state: {
    startedSeen?: boolean;
    commandEndedSeen?: boolean;
    commandEndSeenAt?: number | null;
    lastOutputAt?: number;
    promptStableSince?: number | null;
    previousPrompt?: string;
  }): void {
    if (typeof state.startedSeen === "boolean") startedSeen = state.startedSeen;
    if (typeof state.commandEndedSeen === "boolean") commandEndedSeen = state.commandEndedSeen;
    if (typeof state.commandEndSeenAt !== "undefined") commandEndSeenAt = state.commandEndSeenAt;
    if (typeof state.lastOutputAt === "number") lastOutputAt = state.lastOutputAt;
    if (typeof state.promptStableSince !== "undefined") promptStableSince = state.promptStableSince;
    if (typeof state.previousPrompt === "string") previousPrompt = state.previousPrompt;
  }

  return {
    scheduleFinalizeAfterCommandEnd,

    resetStallTimer,

    clearTimers,

    syncState,

    getCommandEndGraceTimer: () => commandEndGraceTimer,
    getStallTimer: () => stallTimer,
    getGlobalTimeoutTimer: () => globalTimeoutTimer,
    getStartTimer: () => startTimer,

    setGlobalTimeoutTimer: (timer) => { globalTimeoutTimer = timer; },
    setStartTimer: (timer) => { startTimer = timer; },
    setCommandEndGraceTimer: (timer) => { commandEndGraceTimer = timer; },
    setStallTimer: (timer) => { stallTimer = timer; },

    canAdvancePagerNow,

    isSettled: () => settled,
    setSettled: (value) => { settled = value; },
  };
}

function isEnableOrEndCommand(command: string): boolean {
  const cmd = command.trim().toLowerCase();
  return cmd === "enable" || cmd === "end" || cmd === "exit";
}
