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
      ipc: ipc as any,
      dprint,
      getDeviceByName(name: string) {
        if (!net) return null as any;
        const dev = (net as { getDevice: (n: string) => unknown }).getDevice(name);
        if (!dev) return null;
        const term = (dev as { getCommandLine: () => unknown }).getCommandLine();
        return {
          name: (dev as { getName: () => string }).getName(),
          hasTerminal: !!term,
          getTerminal: () => term as any,
          getNetwork: () => net as any,
        } as any;
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
      querySessionState(deviceName: string) {
        // Read actual state from TerminalEngine, not null
        return terminal.getSession(deviceName);
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
      // Job management methods
      createJob(plan: DeferredJobPlan): string {
        const job = jobExecutor.startJob(plan);
        return job.id;
      },
      getJobState(ticket: string) {
        const job = jobExecutor.getJob(ticket);
        if (!job) return null;
        const ctx = job.context;
        return {
          id: ctx.plan.id,
          device: ctx.plan.device,
          state: ctx.phase,
          currentStep: ctx.currentStep,
          totalSteps: ctx.plan.plan.length,
          outputTail: ctx.outputBuffer ? ctx.outputBuffer.slice(-500) : "",
          output: ctx.outputBuffer,
          finished: ctx.finished,
          result: ctx.error ? null : { raw: ctx.outputBuffer },
          error: ctx.error,
          errorCode: ctx.errorCode,
          done: ctx.finished,
        };
      },
      getActiveJobs() {
        return jobExecutor.getActiveJobs().map(j => ({
          id: j.id,
          device: j.device,
          finished: isJobContextFinished(j.context),
          state: j.context.phase,
        }));
      },
      jobPayload(ticket: string) {
        const job = jobExecutor.getJob(ticket);
        return job ? job.context.plan.payload : null;
      },
    };
  }

  // Helper to check if job context is finished
  function isJobContextFinished(ctx: any): boolean {
    return ctx.finished || ctx.phase === "completed" || ctx.phase === "error";
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
      result = { ok: false, error: "Runtime fatal: " + String(e) };
    }

    // Determine result type
    const isDeferred = (result as { deferred?: boolean })?.deferred === true;
    const isOk = (result as { ok?: boolean })?.ok !== false;

    if (isDeferred) {
      // Deferred result: command NOT finished, job will run asynchronously
      const ticket = (result as { ticket?: string })?.ticket;
      dprint("[kernel] DEFERRED ticket=" + (ticket || "none"));

      writeResultEnvelope(cmd.id, {
        protocolVersion: 3,
        id: cmd.id,
        seq: cmd.seq || 0,
        startedAt,
        completedAt: Date.now(),
        status: "pending",
        ok: true,
        value: result as ResultEnvelope["value"],
        jobId: ticket,
        device: (cmd.payload as { device?: string })?.device,
      });

      // Don't clear activeCommand - it stays deferred until jobs complete
      // But do cleanup the file from queue
      if (activeCommandFilename) {
        queue.cleanup(activeCommandFilename);
      }
      activeCommand = null;
      activeCommandFilename = null;
      heartbeat.setActiveCommand(null);
      return;
    }

    // Immediate result: completed or failed
    const status = isOk ? "completed" : "failed";

    writeResultEnvelope(cmd.id, {
      protocolVersion: 3,
      id: cmd.id,
      seq: cmd.seq || 0,
      startedAt,
      completedAt: Date.now(),
      status,
      ok: isOk,
      value: result as ResultEnvelope["value"],
      jobId: undefined,
      device: (cmd.payload as { device?: string })?.device,
    });

    // Cleanup
    if (activeCommandFilename) {
      queue.cleanup(activeCommandFilename);
    }

    activeCommand = null;
    activeCommandFilename = null;
    heartbeat.setActiveCommand(null);
  }

  // Poll command queue
  function pollCommandQueue(): void {
    if (!isRunning || isShuttingDown) return;
    if (activeCommand !== null) return;

    // Comprehensive busy check: active command OR active deferred jobs OR busy terminals
    function isSystemBusy(): boolean {
      if (activeCommand !== null) return true;
      const activeJobs = jobExecutor.getActiveJobs();
      if (activeJobs.length > 0) return true;
      return false;
    }

    runtimeLoader.reloadIfNeeded(isSystemBusy);

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

  // Shutdown kernel (idempotent)
  function shutdown(): void {
    if (isShuttingDown || !isRunning) {
      dprint("[kernel] Shutdown already in progress or not running");
      return;
    }

    dprint("[kernel] Shutting down...");

    isShuttingDown = true;
    isRunning = false;

    if (commandPollInterval) {
      clearInterval(commandPollInterval);
      commandPollInterval = null;
    }

    // Clean up active jobs
    const activeJobs = jobExecutor.getActiveJobs();
    for (const job of activeJobs) {
      try {
        terminal.detach(job.device);
      } catch (e) {
        dprint("[kernel] Error detaching terminal for " + job.device + ": " + String(e));
      }
    }

    heartbeat.stop();
    lease.stop();

    isShuttingDown = false;
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
