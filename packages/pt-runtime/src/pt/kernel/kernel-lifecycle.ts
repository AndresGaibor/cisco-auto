// packages/pt-runtime/src/pt/kernel/kernel-lifecycle.ts
// Lifecycle del kernel: boot y shutdown con polling adaptativo para reducir presión sobre Packet Tracer.

import { pollCommandQueue } from "./queue-poller";
import type { KernelState } from "./kernel-state";

export interface KernelSubsystems {
  dirs: ReturnType<typeof import("./directories").createDirectoryManager>;
  queue: ReturnType<typeof import("./command-queue").createCommandQueue>;
  runtimeLoader: ReturnType<typeof import("./runtime-loader").createRuntimeLoader>;
  heartbeat: ReturnType<typeof import("./heartbeat").createHeartbeat>;
  executionEngine: ReturnType<typeof import("./execution-engine").createExecutionEngine>;
  terminal: ReturnType<typeof import("../terminal/terminal-engine").createTerminalEngine>;
  lease: ReturnType<typeof import("./lease").createLeaseManager>;
  config: import("./types").KernelConfig;
  kernelLog: (message: string, level?: "debug" | "info" | "warn" | "error") => void;
  kernelLogSubsystem: (name: string, message: string) => void;
}

export interface KernelLifecycle {
  boot: () => void;
  shutdown: () => void;
}

const MIN_POLL_DELAY_MS = 250;
const MAX_IDLE_POLL_DELAY_MS = 2000;
const POLL_ERROR_DELAY_MS = 3000;

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

  let commandPollTimer: ReturnType<typeof setTimeout> | null = null;
  let bootRetryTimer: ReturnType<typeof setTimeout> | null = null;
  let idlePollDelayMs = Math.max(Number(config.pollIntervalMs || MIN_POLL_DELAY_MS), MIN_POLL_DELAY_MS);
  let pollInProgress = false;

  function getGlobalScope(): any {
    try {
      return typeof self !== "undefined" ? self : Function("return this")();
    } catch {
      return {};
    }
  }

  function setBootFlag(name: string, value: unknown): void {
    try {
      getGlobalScope()[name] = value;
    } catch {}
  }

  function writeBootDiagnostic(stage: string, error?: unknown): void {
    try {
      const scope = getGlobalScope();
      const fm = scope.fm || (typeof scope.safeFM === "function" ? scope.safeFM()?.fm : null);
      if (!fm || typeof fm.writePlainTextToFile !== "function") return;

      fm.writePlainTextToFile(
        config.devDir + "/boot-diagnostic.json",
        JSON.stringify({
          ts: Date.now(),
          stage,
          error: error == null ? null : String(error),
          isRunning: state.isRunning,
          isShuttingDown: state.isShuttingDown,
        }),
      );
    } catch {}
  }

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
      kernelLogSubsystem("queue", "Skipping poll: previous poll still in progress");
      scheduleNextPoll(MAX_IDLE_POLL_DELAY_MS);
      return;
    }

    pollInProgress = true;

      try {
        if (executionEngine && typeof executionEngine.reapStaleJobs === "function") {
          executionEngine.reapStaleJobs();
        }

        const beforeCount = getQueueCountSafe();
        try {
          pollCommandQueue(subsystems, state);
        } catch (pollError) {
          kernelLog("POLL COMMAND QUEUE ERROR: " + formatKernelError(pollError), "error");
        }
        const afterCount = getQueueCountSafe();

      if (state.activeCommand || beforeCount > 0 || afterCount > 0) {
        idlePollDelayMs = MIN_POLL_DELAY_MS;
      } else {
        idlePollDelayMs = Math.min(
          Math.max(idlePollDelayMs * 2, MIN_POLL_DELAY_MS),
          MAX_IDLE_POLL_DELAY_MS,
        );
      }
    } catch (e) {
      kernelLog("FATAL POLL ERROR: " + formatKernelError(e), "error");
      idlePollDelayMs = POLL_ERROR_DELAY_MS;
    } finally {
      pollInProgress = false;
    }

    scheduleNextPoll(idlePollDelayMs);
  }

  function boot(): void {
    setBootFlag("__ptKernelBootEntered", true);
    setBootFlag("__ptKernelBootStage", "boot-enter");
    writeBootDiagnostic("boot-enter");

    try {
      kernelLog("=== KERNEL BOOT STARTING ===", "info");
      kernelLog("Initializing subsystems...");

      state.isShuttingDown = false;

      setBootFlag("__ptKernelBootStage", "dirs");
      kernelLogSubsystem("dir", "Creating directories...");
      dirs.ensureDirectories();
      kernelLogSubsystem("dir", "Directories created OK");

      setBootFlag("__ptKernelBootStage", "lease");
      kernelLogSubsystem("lease", "Initializing lease manager...");
      kernelLogSubsystem("lease", "Lease manager ready");

      setBootFlag("__ptKernelBootStage", "queue");
      kernelLogSubsystem("queue", "Initializing command queue...");

      const initialQueueCount = getQueueCountSafe();
      kernelLogSubsystem("queue", "Queue ready, count=" + initialQueueCount);
      kernelLogSubsystem(
        "queue",
        "Paths commandsDir=" +
          config.commandsDir +
          " inFlightDir=" +
          config.inFlightDir +
          " resultsDir=" +
          config.resultsDir,
      );

      setBootFlag("__ptKernelBootStage", "runtime-load");
      kernelLogSubsystem("loader", "Loading runtime...");
      runtimeLoader.load();

      setBootFlag("__ptKernelBootStage", "runtime-loaded-check");

      if (!runtimeLoader.getRuntimeFn()) {
        setBootFlag("__ptKernelBootStage", "runtime-missing");
        kernelLog("FATAL: Runtime not available. Retrying in 5s...", "error");
        writeBootDiagnostic("runtime-missing");

        if (bootRetryTimer) {
          clearTimeout(bootRetryTimer);
          bootRetryTimer = null;
        }

        bootRetryTimer = setTimeout(() => {
          bootRetryTimer = null;
          boot();
        }, 5000);

        return;
      }

      kernelLogSubsystem("loader", "Runtime loaded successfully");

      setBootFlag("__ptKernelBootStage", "activate");
      state.isRunning = true;
      idlePollDelayMs = MIN_POLL_DELAY_MS;

      heartbeat.setQueuedCount(getQueueCountSafe());

      kernelLogSubsystem(
        "heartbeat",
        "Starting heartbeat (" + config.heartbeatIntervalMs + "ms)...",
      );
      heartbeat.start();
      heartbeat.write();

      kernelLogSubsystem("exec", "Initializing execution engine...");
      kernelLogSubsystem("exec", "Execution engine ready");

      kernelLog(
        "Starting adaptive poll loop min=" +
          MIN_POLL_DELAY_MS +
          " maxIdle=" +
          MAX_IDLE_POLL_DELAY_MS +
          "ms...",
      );

      scheduleNextPoll(0);

      setBootFlag("__ptKernelBootComplete", true);
      setBootFlag("__ptKernelBootStage", "complete");
      writeBootDiagnostic("complete");

      kernelLog("=== KERNEL BOOT COMPLETE === isRunning=" + state.isRunning, "info");
    } catch (e) {
      setBootFlag("__ptKernelBootError", String(e));
      setBootFlag("__ptKernelBootStage", "fatal-error");

      writeBootDiagnostic("fatal-error", e);

      kernelLog("FATAL BOOT ERROR: " + String(e), "error");
    }
  }

  function shutdown(): void {
    if (state.isShuttingDown || !state.isRunning) {
      kernelLog(
        "Shutdown skipped: isShuttingDown=" +
          state.isShuttingDown +
          " isRunning=" +
          state.isRunning,
      );
      return;
    }

    kernelLog("=== KERNEL SHUTDOWN STARTING ===", "info");

    state.isShuttingDown = true;
    state.isRunning = false;

    if (commandPollTimer) {
      kernelLog("Clearing poll timer...");
      clearTimeout(commandPollTimer);
      commandPollTimer = null;
    }

    if (bootRetryTimer) {
      kernelLog("Clearing boot retry timer...");
      clearTimeout(bootRetryTimer);
      bootRetryTimer = null;
    }

    const activeJobs = executionEngine.getActiveJobs();
    kernelLog("Detaching " + activeJobs.length + " active job(s)...");

    for (let i = 0; i < activeJobs.length; i++) {
      const j = activeJobs[i];

      try {
        terminal.detach(j.device);
        kernelLogSubsystem("exec", "Detached device: " + j.device);
      } catch (e) {
        kernelLogSubsystem("exec", "Error detaching device " + j.device + ": " + String(e));
      }
    }

    kernelLogSubsystem("heartbeat", "Stopping heartbeat...");
    heartbeat.stop();

    kernelLogSubsystem("lease", "Stopping lease manager...");
    lease.stop();

    kernelLog("=== KERNEL SHUTDOWN COMPLETE ===", "info");
  }

  return { boot, shutdown };
}
