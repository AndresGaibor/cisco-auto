// packages/pt-runtime/src/pt/kernel/lifecycle/kernel-lifecycle.ts
// Lifecycle principal: polling adaptativo, schedule, safePollTick y createKernelLifecycle

import { pollCommandQueue } from "../queue-poller";
import type { KernelState } from "../kernel-state";
import { readPollTuning, isControlPollCommandType, type PollTuning } from "./poll-tuning";
import { getGlobalScope, setBootFlag, writeBootDiagnostic } from "./kernel-boot";
import { createBootFunction } from "./kernel-boot";
import { createShutdownFunction } from "./kernel-shutdown";
import type { KernelSubsystems } from "./kernel-subsystems";

export type { KernelSubsystems } from "./kernel-subsystems";
export interface KernelLifecycle {
  boot: () => void;
  shutdown: () => void;
}

export function createKernelLifecycle(
  subsystems: KernelSubsystems,
  state: KernelState,
): KernelLifecycle {
  const {
    dirs,
    queue,
    runtimeLoader,
    heartbeat,
    executionEngine,
    terminal,
    lease,
    config,
    kernelLog,
    kernelLogSubsystem,
  } = subsystems;

  const pollTuning = readPollTuning(config);

  let commandPollTimer: ReturnType<typeof setTimeout> | null = null;
  let bootRetryTimer: ReturnType<typeof setTimeout> | null = null;
  let idlePollDelayMs = pollTuning.minPollDelayMs;
  let pollInProgress = false;
  let hotPollBudget = 0;

  function scheduleNextPoll(delayMs: number): void {
    if (!state.isRunning || state.isShuttingDown) return;

    if (commandPollTimer) {
      clearTimeout(commandPollTimer);
      commandPollTimer = null;
    }

    commandPollTimer = setTimeout(() => {
      commandPollTimer = null;
      safePollTick();
    }, delayMs);
  }

  function getQueueCountSafe(): number {
    try {
      return queue.count();
    } catch {
      return 0;
    }
  }

  function formatKernelError(error: unknown): string {
    try {
      const anyError = error as any;

      const message =
        anyError && anyError.message
          ? String(anyError.message)
          : String(error);

      const stack =
        anyError && anyError.stack
          ? String(anyError.stack)
          : "";

      return stack ? message + " stack=" + stack : message;
    } catch {
      return String(error);
    }
  }

  function safePollTick(): void {
    if (!state.isRunning || state.isShuttingDown) return;

    if (pollInProgress) {
      state.pollStats.skippedBusyCount += 1;
      state.pollStats.nextDelayMs = pollTuning.maxIdlePollDelayMs;
      state.pollStats.idlePollDelayMs = pollTuning.maxIdlePollDelayMs;
      state.pollStats.hotPollBudget = hotPollBudget;

      kernelLogSubsystem("queue", "Skipping poll: previous poll still in progress");
      scheduleNextPoll(pollTuning.maxIdlePollDelayMs);
      return;
    }

    const pollStartedAt = Date.now();

    state.pollStats.tickCount += 1;
    state.pollStats.lastPollAt = pollStartedAt;
    state.pollStats.lastError = null;

    pollInProgress = true;

    try {
      if (executionEngine && typeof executionEngine.reapStaleJobs === "function") {
        executionEngine.reapStaleJobs();
      }

      const beforeCount = getQueueCountSafe();
      const processedBefore = state.pollStats.processedCount;
      state.pollStats.lastBeforeCount = beforeCount;

      try {
        pollCommandQueue(subsystems, state);
      } catch (pollError) {
        state.pollStats.errorCount += 1;
        state.pollStats.lastError = formatKernelError(pollError);
        kernelLog("POLL COMMAND QUEUE ERROR: " + formatKernelError(pollError), "error");
      }

      const afterCount = getQueueCountSafe();
      const claimedCommandType =
        state.pollStats.processedCount > processedBefore
          ? state.pollStats.lastClaimedCommandType
          : null;
      const activeCommandType =
        state.activeCommand && typeof state.activeCommand === "object"
          ? (state.activeCommand as { type?: unknown; payload?: { type?: unknown } }).type ??
            (state.activeCommand as { payload?: { type?: unknown } }).payload?.type
          : null;

      const claimedControlCommand = isControlPollCommandType(claimedCommandType);
      const activeControlCommand = isControlPollCommandType(activeCommandType);
      const recentControlCommand = isControlPollCommandType(state.pollStats.lastClaimedCommandType);

      state.pollStats.lastAfterCount = afterCount;

      if (claimedControlCommand || activeControlCommand) {
        hotPollBudget = pollTuning.controlHotPollTicksAfterActivity;
        idlePollDelayMs = pollTuning.controlPollDelayMs;
      } else if (state.activeCommand || beforeCount > 0 || afterCount > 0) {
        hotPollBudget = pollTuning.hotPollTicksAfterActivity;
        idlePollDelayMs = pollTuning.minPollDelayMs;
      } else if (hotPollBudget > 0) {
        hotPollBudget -= 1;
        idlePollDelayMs = recentControlCommand ? pollTuning.controlPollDelayMs : pollTuning.minPollDelayMs;
      } else {
        idlePollDelayMs = Math.min(
          Math.max(idlePollDelayMs * 2, pollTuning.minPollDelayMs),
          pollTuning.maxIdlePollDelayMs,
        );
      }
    } catch (e) {
      state.pollStats.errorCount += 1;
      state.pollStats.lastError = formatKernelError(e);
      kernelLog("FATAL POLL ERROR: " + formatKernelError(e), "error");
      idlePollDelayMs = pollTuning.pollErrorDelayMs;
    } finally {
      state.pollStats.lastPollDurationMs = Date.now() - pollStartedAt;
      state.pollStats.idlePollDelayMs = idlePollDelayMs;
      state.pollStats.nextDelayMs = idlePollDelayMs;
      state.pollStats.hotPollBudget = hotPollBudget;
      pollInProgress = false;
    }

    scheduleNextPoll(idlePollDelayMs);
  }

  const bootDeps = {
    getGlobalScope,
    setBootFlag,
    writeBootDiagnostic: (stage: string, error?: unknown) =>
      writeBootDiagnostic(config, state, stage, error),
    getQueueCountSafe,
    pollTuning,
    get idlePollDelayMs() {
      return idlePollDelayMs;
    },
    state,
    subsystems,
    scheduleNextPoll,
    kernelLog,
    kernelLogSubsystem,
    bootRetryTimer,
  };

  const boot = createBootFunction(bootDeps);

  const shutdownDeps = {
    state,
    subsystems,
    commandPollTimer,
    bootRetryTimer,
    kernelLog,
    kernelLogSubsystem,
  };

  const shutdown = createShutdownFunction(shutdownDeps);

  return { boot, shutdown };
}
