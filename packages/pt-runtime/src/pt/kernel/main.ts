// packages/pt-runtime/src/pt/kernel/main.ts
// Kernel Core - Packet Tracer Script Module Entry Point
// Responsibilities: Coordinate subsystems, lifecycle, queue polling, runtime loading, API injection

import type { KernelConfig, CommandEnvelope, ResultEnvelope } from "./types";
import type {
  DeferredJobPlan,
  KernelJobState,
  RuntimeApi,
  DeviceRef,
} from "../../runtime/contracts";
import type {
  PTNetwork,
  PTDevice,
  PTCommandLine,
  PTIpc,
  PTAppWindow,
} from "../../pt-api/pt-api-registry.js";
import { createDirectoryManager } from "./directories";
import { createLeaseManager } from "./lease";
import { createCommandQueue } from "./command-queue";
import { createRuntimeLoader } from "./runtime-loader";
import { createHeartbeat, type HeartbeatManager } from "./heartbeat";
import { createCleanupManager } from "./cleanup";
import { createTerminalEngine } from "../terminal/terminal-engine";
import { createExecutionEngine, type ActiveJob, toKernelJobState } from "./execution-engine";
import { safeFM } from "./safe-fm";
import { createKernelLifecycle } from "./kernel-lifecycle";
import { createKernelState, type KernelState } from "./kernel-state";
import { initDebugLog, writeDebugLog } from "./debug-log.js";

export { createDirectoryManager } from "./directories";
export { createLeaseManager } from "./lease";
export { createCommandQueue } from "./command-queue";
export { createRuntimeLoader } from "./runtime-loader";
export { createHeartbeat, type HeartbeatManager } from "./heartbeat";
export { createCleanupManager } from "./cleanup";
export { createExecutionEngine } from "./execution-engine";

export interface Kernel {
  boot(): void;
  shutdown(): void;
  isRunning(): boolean;
  startDeferredJob(plan: DeferredJobPlan): string;
  getDeferredJob(jobId: string): ActiveJob | null;
}

declare var dprint: (msg: string) => void;
declare var print: (msg: string) => void;

function isDebugEnabled(): boolean {
  try {
    const scope = (typeof self !== "undefined" ? self : Function("return this")()) as any;
    return scope.PT_DEBUG === 1 || scope.PT_DEBUG === "1" || scope.PT_DEBUG === true;
  } catch {
    return false;
  }
}

export function createKernel(config: KernelConfig) {
  const state = createKernelState();

  const dirs = createDirectoryManager(config);
  initDebugLog(config.logsDir);
  const lease = createLeaseManager({ devDir: config.devDir, checkIntervalMs: 1000 });
  const queue = createCommandQueue({
    commandsDir: config.commandsDir,
    inFlightDir: config.inFlightDir,
    deadLetterDir: config.deadLetterDir,
  });
  const runtimeLoader = createRuntimeLoader({ runtimeFile: config.devDir + "/runtime.js" });
  const heartbeat = createHeartbeat({
    devDir: config.devDir,
    intervalMs: config.heartbeatIntervalMs,
  });

  const terminal = createTerminalEngine({
    commandTimeoutMs: 8000,
    stallTimeoutMs: 15000,
    pagerTimeoutMs: 30000,
  });
  const executionEngine = createExecutionEngine(terminal);

  function kernelLog(message: string): void {
    try {
      writeDebugLog("kernel", message);
    } catch {}
    try {
      dprint("[kernel] " + message);
    } catch {}
  }

  function kernelLogSubsystem(name: string, message: string): void {
    if (!isDebugEnabled()) return;
    kernelLog("[" + name + "] " + message);
  }

  const subsystems = {
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
  };

  const lifecycle = createKernelLifecycle(subsystems, state);

  return {
    boot: lifecycle.boot,
    shutdown: lifecycle.shutdown,
    isRunning: function () {
      return state.isRunning;
    },
    startDeferredJob: function (plan: DeferredJobPlan) {
      return executionEngine.startJob(plan).id;
    },
    getDeferredJob: function (id: string) {
      return executionEngine.getJob(id);
    },
  };
}
