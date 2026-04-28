// packages/pt-runtime/src/pt/kernel/queue-poller.ts
// Poll de la cola de comandos

import { finishActiveCommand } from "./command-finalizer";
import { createRuntimeApi } from "./runtime-api";
import type { KernelSubsystems } from "./kernel-lifecycle";
import type { KernelState } from "./kernel-state";

export function pollCommandQueue(subsystems: KernelSubsystems, state: KernelState): void {
  const {
    queue,
    runtimeLoader,
    executionEngine,
    terminal,
    heartbeat,
    config,
    kernelLog,
    kernelLogSubsystem,
  } = subsystems;

  kernelLogSubsystem(
    "queue",
    "poll tick: isRunning=" +
      state.isRunning +
      " isShuttingDown=" +
      state.isShuttingDown +
      " active=" +
      (state.activeCommand ? state.activeCommand.id : "null"),
  );
  if (!state.isRunning || state.isShuttingDown) return;

  if (state.activeCommand) {
    kernelLogSubsystem("queue", "Skipping poll: command already active=" + state.activeCommand.id);
    return;
  }

  function isControlCommand(type: string): boolean {
    return (
      type === "__pollDeferred" ||
      type === "__ping" ||
      type === "inspectDeviceFast" ||
      type === "readTerminal" ||
      type === "omni.evaluate.raw" ||
      type === "__evaluate"
    );
  }

  const activeJobs = executionEngine.getActiveJobs();
  const terminalIsBusy =
    typeof (terminal as any).isAnyBusy === "function" ? (terminal as any).isAnyBusy() : false;
  const isBusy = activeJobs.length > 0 || terminalIsBusy;
  kernelLogSubsystem("loader", "Checking runtime reload... busy=" + isBusy);
  runtimeLoader.reloadIfNeeded(() => isBusy);

  let claimed = null as ReturnType<typeof queue.poll>;

  if (isBusy) {
    claimed =
      typeof (queue as any).pollAllowedTypes === "function"
        ? (queue as any).pollAllowedTypes([
            "__pollDeferred",
            "__ping",
            "inspectDeviceFast",
            "readTerminal",
            "omni.evaluate.raw",
            "__evaluate",
          ].filter(isControlCommand))
        : null;

    if (!claimed) {
      kernelLogSubsystem(
        "queue",
        "System busy, skipping non-control poll. Active jobs=" +
          activeJobs.length +
          " terminalBusy=" +
          terminalIsBusy,
      );
      heartbeat.setQueuedCount(queue.count());
      return;
    }

    kernelLogSubsystem(
      "queue",
      "System busy, but processing control command=" +
        claimed.id +
        " type=" +
        String((claimed as any).type),
    );
  } else {
    claimed = queue.poll();
  }
  kernelLogSubsystem("queue", "Poll result: claimed=" + (claimed ? claimed.id : "null"));
  if (!claimed) {
    kernelLogSubsystem("queue", "No command claimed, checking files...");
    heartbeat.setQueuedCount(queue.count());
    return;
  }

  state.activeCommand = { ...claimed, startedAt: Date.now() };
  state.activeCommandFilename = (claimed as any).filename ?? null;
  heartbeat.setActiveCommand(claimed.id);
  kernelLog(
    ">>> DISPATCH: " + claimed.id + " type=" + ((claimed as any).type || "unknown"),
    "info",
  );

  try {
    const runtimeFn = runtimeLoader.getRuntimeFn();
    if (!runtimeFn) {
      kernelLog("RUNTIME NOT LOADED - rejecting command", "error");
      finishActiveCommand(subsystems, state, {
        ok: false,
        error: "Runtime not loaded",
        code: "RUNTIME_NOT_FOUND",
      });
      return;
    }

    const runtimeApi = createRuntimeApi(subsystems);
    Promise.resolve(runtimeFn(claimed.payload, runtimeApi))
      .then((result) => {
        try {
          const keys = result && typeof result === "object" ? Object.keys(result as Record<string, unknown>) : [];
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
        finishActiveCommand(subsystems, state, result);
      })
      .catch((e) => {
        kernelLog("RUNTIME ASYNC ERROR: " + String(e), "error");
        finishActiveCommand(subsystems, state, {
          ok: false,
          error: "Runtime async error: " + String(e),
          code: "EXEC_ERROR",
        });
      });
  } catch (e) {
    kernelLog("RUNTIME FATAL ERROR: " + String(e), "error");
    finishActiveCommand(subsystems, state, {
      ok: false,
      error: "Runtime fatal: " + String(e),
      code: "EXEC_ERROR",
    });
  }
}
