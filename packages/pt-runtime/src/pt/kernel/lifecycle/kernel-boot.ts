// packages/pt-runtime/src/pt/kernel/lifecycle/kernel-boot.ts
// Boot del kernel con stages: dirs, lease, queue, runtime-load, runtime-loaded-check, activate

import type { KernelState } from "../kernel-state";
import type { KernelSubsystems } from "./kernel-subsystems";
import type { PollTuning } from "./poll-tuning";

export interface BootDeps {
  getGlobalScope: () => any;
  setBootFlag: (name: string, value: unknown) => void;
  writeBootDiagnostic: (stage: string, error?: unknown) => void;
  getQueueCountSafe: () => number;
  pollTuning: PollTuning;
  idlePollDelayMs: number;
  state: KernelState;
  subsystems: KernelSubsystems;
  scheduleNextPoll: (delayMs: number) => void;
  kernelLog: (message: string, level?: "debug" | "info" | "warn" | "error") => void;
  kernelLogSubsystem: (name: string, message: string) => void;
  bootRetryTimer: ReturnType<typeof setTimeout> | null;
}

export function createBootFunction(deps: BootDeps): () => void {
  const {
    getGlobalScope,
    setBootFlag,
    writeBootDiagnostic,
    getQueueCountSafe,
    pollTuning,
    idlePollDelayMs,
    state,
    subsystems,
    scheduleNextPoll,
    kernelLog,
    kernelLogSubsystem,
  } = deps;

  let bootRetryTimer = deps.bootRetryTimer;
  let _idlePollDelayMs = idlePollDelayMs;

  return function boot(): void {
    setBootFlag("__ptKernelBootEntered", true);
    setBootFlag("__ptKernelBootStage", "boot-enter");
    writeBootDiagnostic("boot-enter");

    try {
      kernelLog("=== KERNEL BOOT STARTING ===", "info");
      kernelLog("Initializing subsystems...");

      state.isShuttingDown = false;

      setBootFlag("__ptKernelBootStage", "dirs");
      kernelLogSubsystem("dir", "Creating directories...");
      subsystems.dirs.ensureDirectories();
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
          subsystems.config.commandsDir +
          " inFlightDir=" +
          subsystems.config.inFlightDir +
          " resultsDir=" +
          subsystems.config.resultsDir,
      );

      setBootFlag("__ptKernelBootStage", "runtime-load");
      kernelLogSubsystem("loader", "Loading runtime...");
      subsystems.runtimeLoader.load();

      setBootFlag("__ptKernelBootStage", "runtime-loaded-check");

      if (!subsystems.runtimeLoader.getRuntimeFn()) {
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
      _idlePollDelayMs = pollTuning.minPollDelayMs;

      subsystems.heartbeat.setQueuedCount(getQueueCountSafe());

      kernelLogSubsystem(
        "heartbeat",
        "Starting heartbeat (" + subsystems.config.heartbeatIntervalMs + "ms)...",
      );
      subsystems.heartbeat.start();
      subsystems.heartbeat.write();

      kernelLogSubsystem("exec", "Initializing execution engine...");
      kernelLogSubsystem("exec", "Execution engine ready");

      kernelLog(
        "Starting adaptive poll loop min=" +
          pollTuning.minPollDelayMs +
          " maxIdle=" +
          pollTuning.maxIdlePollDelayMs +
          " hotTicks=" +
          pollTuning.hotPollTicksAfterActivity +
          " controlDelay=" +
          pollTuning.controlPollDelayMs +
          " controlHotTicks=" +
          pollTuning.controlHotPollTicksAfterActivity +
          " errorDelay=" +
          pollTuning.pollErrorDelayMs +
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
  };
}

export function getGlobalScope(): any {
  try {
    return typeof self !== "undefined" ? self : Function("return this")();
  } catch {
    return {};
  }
}

export function setBootFlag(name: string, value: unknown): void {
  try {
    getGlobalScope()[name] = value;
  } catch {}
}

export function writeBootDiagnostic(
  config: { devDir: string },
  state: KernelState,
  stage: string,
  error?: unknown,
): void {
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
