// packages/pt-runtime/src/pt/kernel/poller/queue-poller.ts
// Queue poller principal — extraído de queue-poller.ts original

import { finishActiveCommand } from "../command-finalizer";
import { createRuntimeApi } from "../runtime-api";
import { safeFM } from "../safe-fm";
import type { KernelSubsystems } from "../kernel-lifecycle";
import type { KernelState } from "../kernel-state";
import { getControlCommandTypes, handleKernelControlCommand } from "./control-commands";
import { tryResolveFastDeferredResult } from "./fast-deferred";

let terminalBusySince: number | null = null;

const TERMINAL_BUSY_GRACE_MS = 1500;

export function getTerminalBusy(terminal: unknown): boolean {
  try {
    if (terminal && typeof (terminal as any).isAnyBusy === "function") {
      return (terminal as any).isAnyBusy() === true;
    }
  } catch {}

  return false;
}

export function shouldTreatAsBusy(
  activeJobsCount: number,
  terminalBusy: boolean,
  now: number,
  kernelLogSubsystem: (name: string, message: string) => void,
): boolean {
  if (activeJobsCount > 0) {
    terminalBusySince = terminalBusy ? terminalBusySince ?? now : null;
    return true;
  }

  if (!terminalBusy) {
    terminalBusySince = null;
    return false;
  }

  if (terminalBusySince === null) {
    terminalBusySince = now;
  }

  const busyForMs = now - terminalBusySince;

  if (busyForMs <= TERMINAL_BUSY_GRACE_MS) {
    return true;
  }

  kernelLogSubsystem(
    "queue",
    "terminalBusy stale ignored: activeJobs=0 busyForMs=" +
      busyForMs +
      " graceMs=" +
      TERMINAL_BUSY_GRACE_MS,
  );

  return false;
}

export function pollCommandQueue(subsystems: KernelSubsystems, state: KernelState): void {
  const {
    queue,
    runtimeLoader,
    executionEngine,
    terminal,
    heartbeat,
    kernelLog,
    kernelLogSubsystem,
  } = subsystems;

  let stage = "start";

  try {
    stage = "log-poll-tick";
    kernelLogSubsystem(
      "queue",
      "poll tick: isRunning=" +
        state.isRunning +
        " isShuttingDown=" +
        state.isShuttingDown +
        " active=" +
        (state.activeCommand ? state.activeCommand.id : "null"),
    );

    stage = "state-check";
    if (!state.isRunning || state.isShuttingDown) return;

    stage = "active-command-check";
    if (state.activeCommand) {
      state.pollStats.skippedBusyCount += 1;
      kernelLogSubsystem("queue", "Skipping poll: command already active=" + state.activeCommand.id);
      return;
    }

    stage = "get-active-jobs";
    const activeJobs = executionEngine.getActiveJobs();

    stage = "get-terminal-busy";
    const terminalBusy = getTerminalBusy(terminal);

    stage = "compute-busy";
    const now = Date.now();
    const busyForPoll = shouldTreatAsBusy(
      activeJobs.length,
      terminalBusy,
      now,
      kernelLogSubsystem,
    );

    stage = "loader-log";
    kernelLogSubsystem(
      "loader",
      "Checking runtime reload... activeJobs=" +
        activeJobs.length +
        " terminalBusy=" +
        terminalBusy +
        " busyForPoll=" +
        busyForPoll,
    );

    stage = "skip-hot-reload";
    if (false) {
      runtimeLoader.reloadIfNeeded(() => busyForPoll);
    }

    let claimed = null as ReturnType<typeof queue.poll>;

    stage = "poll-claim";
    if (busyForPoll) {
      stage = "poll-allowed-types";
      claimed =
        typeof (queue as any).pollAllowedTypes === "function"
          ? (queue as any).pollAllowedTypes(getControlCommandTypes())
          : null;

      if (!claimed) {
        stage = "busy-no-claim";
        state.pollStats.skippedBusyCount += 1;

        kernelLogSubsystem(
          "queue",
          "System busy, skipping non-control poll. Active jobs=" +
            activeJobs.length +
            " terminalBusy=" +
            terminalBusy,
        );

        stage = "busy-count";
        heartbeat.setQueuedCount(queue.count());
        return;
      }

      stage = "busy-control-claim-log";
      kernelLogSubsystem(
        "queue",
        "System busy, but processing control command=" +
          claimed.id +
          " type=" +
          String((claimed as any).type),
      );
    } else {
      stage = "poll-normal";
      claimed = queue.poll();
    }

    stage = "poll-result-log";
    kernelLogSubsystem("queue", "Poll result: claimed=" + (claimed ? claimed.id : "null"));

    if (!claimed) {
      stage = "no-claim-log";
      state.pollStats.emptyCount += 1;

      kernelLogSubsystem("queue", "No command claimed, checking files...");

      stage = "no-claim-count";
      heartbeat.setQueuedCount(queue.count());
      return;
    }

    stage = "set-active-command";
    state.activeCommand = { ...claimed, startedAt: Date.now() };
    state.activeCommandFilename = (claimed as any).filename ?? null;
    heartbeat.setActiveCommand(claimed.id);

    state.pollStats.processedCount += 1;
    state.pollStats.lastClaimedCommandId = String(claimed.id || "");
    state.pollStats.lastClaimedCommandType = String((claimed as any).type || "");

    stage = "dispatch-log";
    kernelLog(
      ">>> DISPATCH: " + claimed.id + " type=" + ((claimed as any).type || "unknown"),
      "info",
    );

    stage = "kernel-control-command";
    if (handleKernelControlCommand(subsystems, state, claimed)) {
      return;
    }

    stage = "get-runtime-fn";
    const runtimeFn = runtimeLoader.getRuntimeFn();

    if (!runtimeFn) {
      stage = "runtime-missing-finalize";
      kernelLog("RUNTIME NOT LOADED - rejecting command", "error");
      finishActiveCommand(subsystems, state, {
        ok: false,
        error: "Runtime not loaded",
        code: "RUNTIME_NOT_FOUND",
      });
      return;
    }

    stage = "create-runtime-api";
    const runtimeApi = createRuntimeApi(subsystems);

    stage = "runtime-dispatch";
    Promise.resolve(runtimeFn(claimed.payload, runtimeApi))
      .then(async (result) => {
        try {
          const keys =
            result && typeof result === "object"
              ? Object.keys(result as Record<string, unknown>)
              : [];

          kernelLogSubsystem(
            "queue",
            "runtime result resolved type=" +
              typeof result +
              " keys=" +
              keys.join(",") +
              " ok=" +
              String((result as any)?.ok),
          );
        } catch (debugError) {
          kernelLogSubsystem("queue", "runtime result debug failed: " + String(debugError));
        }

        const fastResolvedResult = await tryResolveFastDeferredResult(
          claimed,
          result,
          executionEngine,
          kernelLogSubsystem,
        );

        finishActiveCommand(subsystems, state, fastResolvedResult ?? result);
      })
      .catch((e) => {
        state.pollStats.errorCount += 1;
        state.pollStats.lastError = String(e);

        kernelLog("RUNTIME ASYNC ERROR: " + String(e), "error");
        finishActiveCommand(subsystems, state, {
          ok: false,
          error: "Runtime async error: " + String(e),
          code: "EXEC_ERROR",
        });
      });
  } catch (e) {
    state.pollStats.errorCount += 1;
    state.pollStats.lastError = "stage=" + stage + " error=" + String(e);

    kernelLog("POLL COMMAND QUEUE STAGE ERROR stage=" + stage + " error=" + String(e), "error");
    throw e;
  }
}
