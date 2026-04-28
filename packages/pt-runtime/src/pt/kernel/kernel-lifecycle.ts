// packages/pt-runtime/src/pt/kernel/kernel-lifecycle.ts
// Lifecycle del kernel: boot y shutdown

import type { KernelConfig } from "./types";
import type { CommandEnvelope } from "./types";
import { finishActiveCommand } from "./command-finalizer";
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
  config: KernelConfig;
  kernelLog: (message: string, level?: "debug" | "info" | "warn" | "error") => void;
  kernelLogSubsystem: (name: string, message: string) => void;
}

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

  let commandPollInterval: ReturnType<typeof setInterval> | null = null;

  function safePollTick(): void {
    try {
      pollCommandQueue(subsystems, state);
    } catch (e) {
      kernelLog("FATAL POLL ERROR: " + String(e), "error");
    }
  }

  function boot(): void {
    kernelLog("=== KERNEL BOOT STARTING ===", "info");
    kernelLog("Initializing subsystems...");
    try {
      state.isShuttingDown = false;
      kernelLogSubsystem("dir", "Creating directories...");
      dirs.ensureDirectories();
      kernelLogSubsystem("dir", "Directories created OK");

      kernelLogSubsystem("lease", "Initializing lease manager...");
      kernelLogSubsystem("lease", "Lease manager ready");

      kernelLogSubsystem("queue", "Initializing command queue...");
      kernelLogSubsystem("queue", "Queue ready, count=" + queue.count());
      kernelLogSubsystem(
        "queue",
        "Paths commandsDir=" +
          config.commandsDir +
          " inFlightDir=" +
          config.inFlightDir +
          " resultsDir=" +
          config.resultsDir,
      );

      kernelLogSubsystem("loader", "Loading runtime...");
      runtimeLoader.load();

      if (runtimeLoader.getRuntimeFn()) {
        kernelLogSubsystem("loader", "Runtime loaded successfully");
        state.isRunning = true;
        kernelLog("Starting poll interval (" + config.pollIntervalMs + "ms)...");
        commandPollInterval = setInterval(() => safePollTick(), config.pollIntervalMs);
        kernelLogSubsystem("queue", "Forcing immediate poll...");
        kernelLogSubsystem(
          "queue",
          " Pre-poll: count=" +
            queue.count() +
            " active=" +
            (state.activeCommand ? state.activeCommand.id : "null"),
        );
        safePollTick();
        heartbeat.setQueuedCount(queue.count());
        kernelLogSubsystem(
          "queue",
          "Post-poll: claimed=" +
            (state.activeCommand ? state.activeCommand.id : "none") +
            " running=" +
            state.isRunning,
        );

        kernelLogSubsystem(
          "heartbeat",
          "Starting heartbeat (" + config.heartbeatIntervalMs + "ms)...",
        );
        heartbeat.start();
        heartbeat.write();

        kernelLogSubsystem("exec", "Initializing execution engine...");
        kernelLogSubsystem("exec", "Execution engine ready");

        kernelLog("=== KERNEL BOOT COMPLETE === isRunning=" + state.isRunning, "info");
      } else {
        kernelLog("FATAL: Runtime not available. Retrying in 5s...", "error");
        setTimeout(boot, 5000);
      }
    } catch (e) {
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
    kernelLog("State: isRunning=false, isShuttingDown=true");

    if (commandPollInterval) {
      kernelLog("Clearing poll interval...");
      clearInterval(commandPollInterval);
      commandPollInterval = null;
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
