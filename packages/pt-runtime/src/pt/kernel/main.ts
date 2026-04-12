// packages/pt-runtime/src/pt/kernel/main.ts
// Kernel boot implementation

import type { KernelConfig, CommandEnvelope, ResultEnvelope } from "./types";
import type { DeviceRef, DeferredJobPlan } from "../../runtime/contracts";
import { createDirectoryManager } from "./directories";
import { createLeaseManager } from "./lease";
import { createCommandQueue } from "./command-queue";
import { createRuntimeLoader } from "./runtime-loader";
import { createHeartbeat } from "./heartbeat";
import { createCleanupManager } from "./cleanup";
import { createTerminalEngine } from "../terminal/terminal-engine";
import { createJobExecutor, type ActiveJob } from "./job-executor";

export { createDirectoryManager } from "./directories";
export { createLeaseManager } from "./lease";
export { createCommandQueue } from "./command-queue";
export { createRuntimeLoader } from "./runtime-loader";
export { createHeartbeat, type HeartbeatManager } from "./heartbeat";
export { createCleanupManager } from "./cleanup";

export interface Kernel {
  boot(): void;
  shutdown(): void;
  isRunning(): boolean;
  startDeferredJob(plan: DeferredJobPlan): string;
  getDeferredJob(jobId: string): ActiveJob | null;
}

export function createKernel(config: KernelConfig) {
  // State
  let isRunning = false;
  let isShuttingDown = false;
  let activeCommand: CommandEnvelope | null = null;
  let activeCommandFilename: string | null = null;

  // Components
  const dirs = createDirectoryManager(config);
  const lease = createLeaseManager({ devDir: config.devDir, checkIntervalMs: 1000 });
  const queue = createCommandQueue({
    commandsDir: config.commandsDir,
    inFlightDir: config.inFlightDir,
    deadLetterDir: config.deadLetterDir,
  });
  const runtimeLoader = createRuntimeLoader({ runtimeFile: config.devDir + "/runtime.js" });
  const heartbeat = createHeartbeat({ devDir: config.devDir, intervalMs: config.heartbeatIntervalMs });
  const cleanup = createCleanupManager();
  
  const terminal = createTerminalEngine({
    commandTimeoutMs: 8000,
    stallTimeoutMs: 15000,
    pagerTimeoutMs: 30000,
  });
  const jobExecutor = createJobExecutor(terminal);

  // Intervals
  let commandPollInterval: ReturnType<typeof setInterval> | null = null;
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  // Runtime API factory
  function createRuntimeApi() {
    const ipc = (globalThis as unknown as { ipc: unknown }).ipc;
    const net = (ipc as { getNetwork?: () => unknown })?.getNetwork?.();

    return {
      ipc,
      dprint,
      getDeviceByName(name: string) {
        if (!net) return null;
        const dev = (net as { getDevice: (n: string) => unknown }).getDevice(name);
        if (!dev) return null;
        const terminal = (dev as { getCommandLine: () => unknown }).getCommandLine();
        return {
          name: (dev as { getName: () => string }).getName(),
          hasTerminal: !!terminal,
          getTerminal: () => terminal as DeviceRef["getTerminal"],
          getNetwork: () => net as unknown as DeviceRef["getNetwork"],
        };
      },
      listDevices(): string[] {
        if (!net) return [];
        const names: string[] = [];
        const count = (net as { getDeviceCount: () => number }).getDeviceCount();
        for (let i = 0; i < count; i++) {
          const dev = (net as { getDeviceAt: (i: number) => unknown }).getDeviceAt(i);
          if (dev) names.push((dev as { getName: () => string }).getName());
        }
        return names;
      },
      querySessionState() {
        return null;
      },
      getWorkspace() {
        const ipc = (globalThis as unknown as { ipc: unknown }).ipc;
        return (ipc as { getLogicalWorkspace?: () => unknown })?.getLogicalWorkspace?.();
      },
      now() { return Date.now(); },
      safeJsonClone<T>(data: T): T {
        try { return JSON.parse(JSON.stringify(data)); }
        catch (e) { return data; }
      },
      normalizePortName(name: string) {
        return String(name || "").replace(/\s+/g, "").toLowerCase();
      },
    };
  }

  // Write result envelope
  function writeResultEnvelope(cmdId: string, result: ResultEnvelope): void {
    try {
      const path = config.resultsDir + "/" + cmdId + ".json";
      fm.writePlainTextToFile(path, JSON.stringify(result));
    } catch (e) {
      dprint("[kernel] Result write error: " + String(e));
    }
  }

  // Execute active command
  function executeActiveCommand(): void {
    if (!activeCommand) return;

    const startedAt = Date.now();
    const cmd = activeCommand;

    dprint("[kernel] EXEC payload=" + JSON.stringify(cmd.payload).substring(0, 200));

    let result: unknown = null;
    try {
      const fn = runtimeLoader.getRuntimeFn();
      if (!fn) {
        result = { ok: false, error: "Runtime not loaded" };
      } else {
        result = fn(cmd.payload, createRuntimeApi());
      }
    } catch (e) {
      result = { ok: false, error: String(e) };
    }

    // Write result
    const isDeferred = (result as { deferred?: boolean })?.deferred;
    const isOk = (result as { ok?: boolean })?.ok !== false;
    const status = isDeferred ? "pending" : isOk ? "completed" : "failed";

    writeResultEnvelope(cmd.id, {
      protocolVersion: 3,
      id: cmd.id,
      seq: cmd.seq || 0,
      startedAt,
      completedAt: Date.now(),
      status,
      ok: isOk,
      value: result as ResultEnvelope["value"],
      jobId: (result as { ticket?: string })?.ticket,
      device: (cmd.payload as { device?: string })?.device,
    });

    // Cleanup
    if (activeCommandFilename) {
      queue.cleanup(activeCommandFilename);
    }

    if (!isDeferred) {
      activeCommand = null;
      activeCommandFilename = null;
    }

    heartbeat.setActiveCommand(null);
  }

  // Poll command queue
  function pollCommandQueue(): void {
    if (!isRunning || isShuttingDown) return;
    if (activeCommand !== null) return;

    runtimeLoader.reloadIfNeeded(() => activeCommand !== null);

    const claimed = queue.poll();
    if (!claimed) return;

    activeCommand = claimed;
    activeCommandFilename = (claimed as CommandEnvelope & { filename?: string }).filename ?? null;
    heartbeat.setActiveCommand(claimed.id);
    heartbeat.setQueuedCount(queue.count());

    executeActiveCommand();
  }

  // Boot kernel
  function boot(): void {
    dprint("[kernel] Starting...");

    try {
      isShuttingDown = false;
      isRunning = true;

      const ipc = (globalThis as unknown as { ipc: unknown }).ipc;
      const fmFromIpc = (ipc as { systemFileManager?: () => unknown })?.systemFileManager?.();
      if (fmFromIpc) {
        (globalThis as unknown as { fm: unknown }).fm = fmFromIpc;
      }

      dirs.ensureDirectories();

      if (lease.validate()) {
        activateRuntime();
      } else {
        lease.waitForLease(() => activateRuntime());
      }
    } catch (e) {
      dprint("[kernel] FATAL: " + String(e));
    }
  }

  // Activate runtime after lease
  function activateRuntime(): void {
    if (commandPollInterval || heartbeatInterval) {
      dprint("[kernel] Already active");
      return;
    }

    dprint("[kernel] Activating...");

    runtimeLoader.load();

    commandPollInterval = setInterval(pollCommandQueue, config.pollIntervalMs);
    heartbeat.start();

    isRunning = true;
    dprint("[kernel] Ready");
  }

  // Shutdown kernel
  function shutdown(): void {
    dprint("[kernel] Shutting down...");

    isShuttingDown = true;
    isRunning = false;

    if (commandPollInterval) {
      clearInterval(commandPollInterval);
      commandPollInterval = null;
    }

    heartbeat.stop();
    lease.stop();

    dprint("[kernel] Done");
  }

  return {
    boot,
    shutdown,
    isRunning: () => isRunning,
    startDeferredJob(plan: DeferredJobPlan): string {
      const job = jobExecutor.startJob(plan);
      return job.id;
    },
    getDeferredJob(jobId: string): ActiveJob | null {
      return jobExecutor.getJob(jobId);
    },
  };
}