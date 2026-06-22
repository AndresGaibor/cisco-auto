// packages/pt-runtime/src/pt/kernel/queue-poller.ts
// Poll de la cola de comandos

import { finishActiveCommand } from "./command-finalizer";
import { createRuntimeApi } from "./runtime-api";
import { safeFM } from "./safe-fm";
import type { KernelSubsystems } from "./kernel-lifecycle";
import type { KernelState } from "./kernel-state";

let terminalBusySince: number | null = null;

const TERMINAL_BUSY_GRACE_MS = 1500;

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clampFastDeferredWaitMs(value: unknown): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(Math.trunc(parsed), 1200));
}

function isDeferredRuntimeResult(value: unknown): value is {
  ok: true;
  deferred: true;
  ticket: string;
} {
  if (!value || typeof value !== "object") return false;

  const record = value as Record<string, unknown>;

  return (
    record.ok === true &&
    record.deferred === true &&
    typeof record.ticket === "string" &&
    record.ticket.trim().length > 0
  );
}

function isFinishedJobState(jobState: any): boolean {
  if (!jobState) return false;

  return (
    jobState.finished === true ||
    jobState.done === true ||
    jobState.state === "completed" ||
    jobState.state === "error" ||
    jobState.phase === "completed" ||
    jobState.phase === "error"
  );
}

function buildCompletedDeferredRuntimeResult(ticket: string, jobState: any, fastDeferred?: any): any {
  const result = jobState.result ?? {};
  const output = String(
    result.rawOutput ??
      result.raw ??
      result.output ??
      jobState.output ??
      jobState.outputBuffer ??
      "",
  );

  const status = Number(
    result.status ??
      (jobState.error || jobState.errorCode || jobState.state === "error" ? 1 : 0),
  );

  const ok = Boolean(
    result.ok ??
      (!jobState.error && !jobState.errorCode && jobState.state !== "error" && status === 0),
  );

  return {
    done: true,
    ok,
    status,
    inlineCompleted: true,
    fastDeferred: fastDeferred || undefined,
    diagnostics: fastDeferred ? { fastDeferred } : undefined,
    ticket,
    jobId: ticket,
    result: fastDeferred && result && typeof result === "object"
      ? { ...result, fastDeferred }
      : result,
    error: jobState.error || result.error || undefined,
    code: jobState.errorCode || result.code || result.errorCode || undefined,
    errorCode: jobState.errorCode || result.code || result.errorCode || undefined,
    raw: output,
    output,
    source: "terminal",
    stepResults: Array.isArray(jobState?.stepResults)
      ? jobState.stepResults
      : [],
    totalSteps: Array.isArray(jobState?.plan?.plan)
      ? jobState.plan.plan.length
      : undefined,
    currentStep: typeof jobState?.currentStep === "number"
      ? jobState.currentStep
      : undefined,
    session: {
      mode: String(jobState.lastMode ?? ""),
      prompt: String(jobState.lastPrompt ?? ""),
      paging: jobState.paged === true,
      awaitingConfirm: false,
    },
  };
}

function shouldAttemptFastDeferredResolution(claimed: any, result: any): boolean {
  if (!isDeferredRuntimeResult(result)) return false;

  const commandType = String(claimed?.type || claimed?.payload?.type || "");
  if (commandType !== "terminal.plan.run") return false;

  const payload = claimed?.payload ?? {};

  return payload.waitForCompletion === true;
}

async function tryResolveFastDeferredResult(
  claimed: any,
  result: any,
  executionEngine: any,
  kernelLogSubsystem: (name: string, message: string) => void,
): Promise<any | null> {
  if (!shouldAttemptFastDeferredResolution(claimed, result)) {
    return null;
  }

  if (!executionEngine || typeof executionEngine.getJobState !== "function") {
    return null;
  }

  const ticket = String(result.ticket || "").trim();
  if (!ticket) return null;

  const payload = claimed?.payload ?? {};
  const budgetMs = clampFastDeferredWaitMs(payload.inlineTimeoutMs ?? 1200);

  if (budgetMs <= 0) {
    return null;
  }

  const startedAt = Date.now();
  const intervalMs = 25;
  let fastDeferredChecks = 0;

  kernelLogSubsystem(
    "queue",
    "fast deferred resolution start ticket=" + ticket + " budgetMs=" + budgetMs,
  );

  while (Date.now() - startedAt <= budgetMs) {
    const jobState = executionEngine.getJobState(ticket);
    fastDeferredChecks += 1;

    if (isFinishedJobState(jobState)) {
      const elapsedMs = Date.now() - startedAt;

      kernelLogSubsystem(
        "queue",
        "fast deferred resolution hit ticket=" + ticket + " elapsedMs=" + elapsedMs,
      );

      return buildCompletedDeferredRuntimeResult(ticket, jobState, {
        enabled: true,
        hit: true,
        ticket,
        waitMs: elapsedMs,
        budgetMs,
        intervalMs,
        checks: fastDeferredChecks,
        resolvedState: String(jobState?.state ?? jobState?.phase ?? ''),
        resolvedFinished: jobState?.finished === true || jobState?.done === true,
      });
    }

    const remainingMs = budgetMs - (Date.now() - startedAt);
    if (remainingMs <= 0) break;

    await sleepMs(Math.min(intervalMs, remainingMs));
  }

  kernelLogSubsystem(
    "queue",
    "fast deferred resolution miss ticket=" + ticket + " elapsedMs=" + (Date.now() - startedAt),
  );

  return null;
}

function isControlCommand(type: string): boolean {
  return (
    type === "__pollDeferred" ||
    type === "__ping" ||
    type === "__runtimeStatus" ||
    type === "__reloadRuntime" ||
    type === "inspectDeviceFast" ||
    type === "readTerminal" ||
    type === "omni.evaluate.raw" ||
    type === "__evaluate"
  );
}

function getControlCommandTypes(): string[] {
  return [
    "__pollDeferred",
    "__ping",
    "__runtimeStatus",
    "__reloadRuntime",
    "inspectDeviceFast",
    "readTerminal",
    "omni.evaluate.raw",
    "__evaluate",
  ].filter(isControlCommand);
}

function readRuntimeManifest(config: any): unknown {
  try {
    const s = safeFM();
    const fm = s.fm;
    const manifestPath = String(config.devDir || "") + "/manifest.json";

    if (!fm || typeof fm.fileExists !== "function" || !fm.fileExists(manifestPath)) {
      return null;
    }

    const raw = String(fm.getFileContents(manifestPath) || "");
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return {
      error: String(error instanceof Error ? error.message : error),
    };
  }
}

function handleKernelControlCommand(subsystems: KernelSubsystems, state: KernelState, claimed: any): boolean {
  const type = String((claimed as any).type || (claimed as any).payload?.type || "");

  if (type === "__runtimeStatus") {
    const status =
      typeof (subsystems.runtimeLoader as any).getStatus === "function"
        ? (subsystems.runtimeLoader as any).getStatus()
        : {
            runtimeLoaded: !!subsystems.runtimeLoader.getRuntimeFn(),
            lastMtime: subsystems.runtimeLoader.getLastMtime(),
            pendingReload: subsystems.runtimeLoader.hasPendingReload(),
          };

    finishActiveCommand(subsystems, state, {
      ok: true,
      type: "__runtimeStatus",
      mainLoaded: true,
      runtimeLoaded: !!status.runtimeLoaded,
      runtime: status,
      manifest: readRuntimeManifest((subsystems as any).config),
      kernel: {
        isRunning: state.isRunning,
        isShuttingDown: state.isShuttingDown,
        activeCommandFilename: state.activeCommandFilename,
        pollStats: {
          ...state.pollStats,
        },
      },
      activeCommand: state.activeCommand
        ? {
            id: state.activeCommand.id,
            type: (state.activeCommand as any).type,
            startedAt: state.activeCommand.startedAt,
          }
        : null,
    });

    return true;
  }

  if (type === "__reloadRuntime") {
    const before =
      typeof (subsystems.runtimeLoader as any).getStatus === "function"
        ? (subsystems.runtimeLoader as any).getStatus()
        : null;

    const result =
      typeof (subsystems.runtimeLoader as any).reloadNow === "function"
        ? (subsystems.runtimeLoader as any).reloadNow()
        : { ok: false, error: "runtimeLoader.reloadNow is not available" };

    const after =
      typeof (subsystems.runtimeLoader as any).getStatus === "function"
        ? (subsystems.runtimeLoader as any).getStatus()
        : null;

    finishActiveCommand(subsystems, state, {
      ok: !!result.ok,
      type: "__reloadRuntime",
      reloaded: !!result.ok,
      before,
      after,
      result,
      error: result.ok
        ? undefined
        : {
            code: "RUNTIME_RELOAD_FAILED",
            message: String(result.error || "Runtime reload failed"),
          },
    });

    return true;
  }

  return false;
}

function getTerminalBusy(terminal: unknown): boolean {
  try {
    if (terminal && typeof (terminal as any).isAnyBusy === "function") {
      return (terminal as any).isAnyBusy() === true;
    }
  } catch {}

  return false;
}

function shouldTreatAsBusy(
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
      const elapsed = Date.now() - (state.activeCommand.startedAt || 0);
      const timeoutMs = (subsystems.config as any).activeCommandTimeoutMs || 30000;

      if (elapsed > timeoutMs) {
        kernelLogSubsystem(
          "queue",
          "ACTIVE COMMAND TIMEOUT id=" +
            state.activeCommand.id +
            " elapsedMs=" +
            elapsed +
            " timeoutMs=" +
            timeoutMs,
        );

        state.pollStats.activeCommandTimeoutCount += 1;
        finishActiveCommand(subsystems, state, {
          ok: false,
          error: "Active command timed out after " + elapsed + "ms",
          code: "ACTIVE_COMMAND_TIMEOUT",
        });
      } else {
        state.pollStats.skippedBusyCount += 1;
        kernelLogSubsystem("queue", "Skipping poll: command already active=" + state.activeCommand.id);
        return;
      }
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
    // Packet Tracer es sensible a recargas/evaluaciones frecuentes.
    // Desactivamos hot reload automático en el loop normal; se recarga manualmente con runtime reload/deploy.
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
