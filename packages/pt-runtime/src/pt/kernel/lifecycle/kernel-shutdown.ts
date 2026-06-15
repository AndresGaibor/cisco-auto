// packages/pt-runtime/src/pt/kernel/lifecycle/kernel-shutdown.ts
// Shutdown del kernel: limpia timers, detiene heartbeat, lease, detach terminals activos

import type { KernelState } from "../kernel-state";
import type { KernelSubsystems } from "./kernel-subsystems";

export interface ShutdownDeps {
  state: KernelState;
  subsystems: KernelSubsystems;
  commandPollTimer: ReturnType<typeof setTimeout> | null;
  bootRetryTimer: ReturnType<typeof setTimeout> | null;
  kernelLog: (message: string, level?: "debug" | "info" | "warn" | "error") => void;
  kernelLogSubsystem: (name: string, message: string) => void;
}

export function createShutdownFunction(deps: ShutdownDeps): () => void {
  const { state, subsystems, kernelLog, kernelLogSubsystem } = deps;

  let commandPollTimer = deps.commandPollTimer;
  let bootRetryTimer = deps.bootRetryTimer;

  return function shutdown(): void {
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

    const activeJobs = subsystems.executionEngine.getActiveJobs();
    kernelLog("Detaching " + activeJobs.length + " active job(s)...");

    for (let i = 0; i < activeJobs.length; i++) {
      const j = activeJobs[i];

      try {
        subsystems.terminal.detach(j.device);
        kernelLogSubsystem("exec", "Detached device: " + j.device);
      } catch (e) {
        kernelLogSubsystem("exec", "Error detaching device " + j.device + ": " + String(e));
      }
    }

    kernelLogSubsystem("heartbeat", "Stopping heartbeat...");
    subsystems.heartbeat.stop();

    kernelLogSubsystem("lease", "Stopping lease manager...");
    subsystems.lease.stop();

    kernelLog("=== KERNEL SHUTDOWN COMPLETE ===", "info");
  };
}
