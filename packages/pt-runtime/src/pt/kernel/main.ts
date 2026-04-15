// packages/pt-runtime/src/pt/kernel/main.ts
// Kernel boot implementation

import type { KernelConfig, CommandEnvelope, ResultEnvelope } from "./types";
import type { DeviceRef, DeferredJobPlan, KernelJobState } from "../../runtime/contracts";
import type { PTNetwork, PTDevice, PTCommandLine, PTIpc } from "../../pt-api/pt-api-registry.js";
import { createDirectoryManager } from "./directories";
import { createLeaseManager } from "./lease";
import { createCommandQueue } from "./command-queue";
import { createRuntimeLoader } from "./runtime-loader";
import { createHeartbeat } from "./heartbeat";
import { createCleanupManager } from "./cleanup";
import { createTerminalEngine } from "../terminal/terminal-engine";
import { createJobExecutor, type ActiveJob } from "./job-executor";
import { safeFM } from "./safe-fm";

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
  const heartbeat = createHeartbeat({
    devDir: config.devDir,
    intervalMs: config.heartbeatIntervalMs,
  });
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

  function kernelLog(message: string): void {
    try {
      const appWindow = (typeof self !== "undefined" ? self.ipc : null)?.appWindow?.();
      if (appWindow && typeof appWindow.writeToPT === "function") {
        appWindow.writeToPT(String(message) + "\n");
      }
    } catch {}
    try {
      dprint(message);
    } catch {}
    try {
      if (typeof print === "function") print(String(message));
    } catch {}
  }

  // Runtime API factory
  function createRuntimeApi() {
    const ipc = typeof self !== "undefined" ? self.ipc : (null as any);
    const net = ipc?.getNetwork?.() ?? ipc?.network?.();

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
        const ipc = typeof self !== "undefined" ? self.ipc : (null as any);
        return ipc?.getLogicalWorkspace?.();
      },
      now() {
        return Date.now();
      },
      safeJsonClone<T>(data: T): T {
        try {
          return JSON.parse(JSON.stringify(data));
        } catch (e) {
          return data;
        }
      },
      normalizePortName(name: string) {
        return String(name || "")
          .replace(/\s+/g, "")
          .toLowerCase();
      },
      // Job management methods
      createJob(plan: DeferredJobPlan): string {
        const job = jobExecutor.startJob(plan);
        return job.id;
      },
      getJobState(ticket: string): KernelJobState | null {
        const job = jobExecutor.getJob(ticket);
        if (!job) return null;
        const ctx = job.context;
        return {
          id: ctx.plan.id,
          device: ctx.plan.device,
          plan: ctx.plan,
          state: ctx.phase,
          currentStep: ctx.currentStep,
          totalSteps: ctx.plan.plan.length,
          outputTail: ctx.outputBuffer ? ctx.outputBuffer.slice(-500) : "",
          output: ctx.outputBuffer,
          outputBuffer: ctx.outputBuffer,
          startedAt: ctx.startedAt,
          updatedAt: ctx.updatedAt,
          stepResults: ctx.stepResults,
          lastMode: ctx.lastMode,
          lastPrompt: ctx.lastPrompt,
          paged: ctx.paged,
          waitingForCommandEnd: ctx.waitingForCommandEnd,
          finished: ctx.finished,
          result: ctx.error
            ? null
            : { raw: ctx.outputBuffer, ok: true, status: undefined, session: undefined },
          error: ctx.error,
          errorCode: ctx.errorCode,
          done: ctx.finished,
        };
      },
      getActiveJobs() {
        return jobExecutor.getActiveJobs().map((j) => ({
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
      const s = safeFM();
      if (!s.available || !s.fm) {
        dprint("[kernel] fm unavailable — cannot write result");
        return;
      }
      const path = config.resultsDir + "/" + cmdId + ".json";
      s.fm.writePlainTextToFile(path, JSON.stringify(result));
    } catch (e) {
      dprint("[kernel] Result write error: " + String(e));
    }
  }

  // Execute active command
  function executeActiveCommand(): void {
    if (!activeCommand) return;

    const startedAt = Date.now();
    const cmd = activeCommand;

    const dispatchPayload = { ...cmd.payload, type: cmd.type || (cmd.payload as { type?: string }).type };
    dprint("[kernel] EXEC type=" + String(cmd.type || "none") + " payload=" + JSON.stringify(dispatchPayload).substring(0, 200));

    let result: unknown = null;
    try {
      const fn = runtimeLoader.getRuntimeFn();
      if (!fn) {
        result = { ok: false, error: "Runtime not loaded" };
      } else {
        result = fn(dispatchPayload, createRuntimeApi());
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
        protocolVersion: 2,
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

    const _r = result as Record<string, unknown>;
    const unwrappedValue = (_r && typeof _r === "object" && "value" in _r) ? _r.value : result;
    const unwrappedError = (_r && typeof _r === "object" && "error" in _r) ? _r.error : undefined;

    writeResultEnvelope(cmd.id, {
      protocolVersion: 2,
      id: cmd.id,
      seq: cmd.seq || 0,
      startedAt,
      completedAt: Date.now(),
      status,
      ok: isOk,
      value: unwrappedValue as ResultEnvelope["value"],
      jobId: undefined,
      device: (cmd.payload as { device?: string })?.device,
      errorCode: unwrappedError as string | undefined,
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
    if (!isRunning || isShuttingDown) {
      kernelLog("[kernel] poll skipped — running=" + String(isRunning) + " shuttingDown=" + String(isShuttingDown));
      return;
    }
    if (activeCommand !== null) {
      kernelLog("[kernel] poll skipped — active command=" + String(activeCommand.id));
      return;
    }

    const fmState = safeFM();
    try {
      const fm = fmState.fm;
      if (fmState.available && fm) {
        kernelLog("[kernel] queue-dir=" + String(config.commandsDir) + " inFlight-dir=" + String(config.inFlightDir));
        kernelLog("[kernel] queue-dir exists=" + String(fm.directoryExists(config.commandsDir)) + " inFlight-dir exists=" + String(fm.directoryExists(config.inFlightDir)));
        const rawQueueFiles = fm.getFilesInDirectory(config.commandsDir);
        kernelLog("[kernel] queue raw files=" + String(rawQueueFiles ? rawQueueFiles.length : 0) + " sample=" + String(rawQueueFiles && rawQueueFiles.length ? rawQueueFiles.slice(0, 5).join(",") : "none"));
        try {
          const appWindow = (typeof ipc !== "undefined" && ipc !== null) ? ipc.appWindow?.() : null;
          const appWindowFiles = appWindow && typeof appWindow.listDirectory === "function"
            ? appWindow.listDirectory(config.commandsDir)
            : [];
          kernelLog("[kernel] queue appWindow files=" + String(appWindowFiles ? appWindowFiles.length : 0) + " sample=" + String(appWindowFiles && appWindowFiles.length ? appWindowFiles.slice(0, 5).join(",") : "none"));
        } catch (appWindowErr) {
          kernelLog("[kernel] queue appWindow diagnostic error: " + String(appWindowErr));
        }
      } else {
        kernelLog("[kernel] queue-dir diagnostic skipped — fm unavailable");
      }
    } catch (diagErr) {
      kernelLog("[kernel] queue-dir diagnostic error: " + String(diagErr));
    }
    kernelLog(
      "[kernel] poll tick — fm=" + String(!!fmState.available && !!fmState.fm) +
      " queued=" + String(queue.count()) +
      " active=" + String(activeCommand ? activeCommand.id : "none")
    );

    // Comprehensive busy check: active command OR active deferred jobs OR busy terminals
    function isSystemBusy(): boolean {
      if (activeCommand !== null) return true;
      const activeJobs = jobExecutor.getActiveJobs();
      if (activeJobs.length > 0) return true;
      return false;
    }

    runtimeLoader.reloadIfNeeded(isSystemBusy);

    const claimed = queue.poll();
    if (!claimed) {
      kernelLog("[kernel] poll tick — no claim");
      return;
    }

    activeCommand = claimed;
    activeCommandFilename = (claimed as CommandEnvelope & { filename?: string }).filename ?? null;
    heartbeat.setActiveCommand(claimed.id);
    heartbeat.setQueuedCount(queue.count());

    kernelLog("[kernel] claimed command id=" + String(claimed.id) + " type=" + String(claimed.type || (claimed.payload as { type?: string }).type || "unknown"));

    executeActiveCommand();
  }

  // Boot kernel
  function boot(): void {
    try { (typeof self !== "undefined" ? self : Function("return this")()).__ptKernelBootEntered = true; } catch {}
    kernelLog("[kernel] Starting...");
    kernelLog("[kernel] boot() entered — demoRuntime=" + String(!!config.demoRuntime));

    try {
      isShuttingDown = false;
      isRunning = true;

      // fm is now initialized in the Kernel IIFE before boot() runs (Fase 1 fix)
      // No late assignment needed — safeFM() handles it in each module

      // Crear directorios ANTES de arrancar servicios para evitar race conditions.
      kernelLog("[kernel] boot() -> ensureDirectories()");
      try {
        dirs.ensureDirectories();
        kernelLog("[kernel] boot() -> ensureDirectories() done");
      } catch (e) {
        kernelLog("[kernel] ensureDirectories() failed: " + String(e));
      }

      // Arrancar el runtime de inmediato para no bloquear el consumer de cola.
      kernelLog("[kernel] boot() -> activateRuntime()");
      activateRuntime();
      kernelLog("[kernel] boot() -> activateRuntime() returned");

      // La lease sigue validándose en segundo plano, pero ya no bloquea el arranque.
      if (!lease.validate()) {
        kernelLog("[kernel] boot() -> lease invalid, waiting in background");
        lease.waitForLease(() => activateRuntime());
      } else {
        kernelLog("[kernel] boot() -> lease valid");
      }
    } catch (e) {
      dprint("[kernel] FATAL: " + String(e));
    }
  }

  // Activate runtime after lease
  var MAX_LOAD_ATTEMPTS = 5;
  var LOAD_RETRY_DELAY_MS = 2000;

  function startKernelServices(): void {
    kernelLog("[kernel] Starting services — pollIntervalMs=" + String(config.pollIntervalMs));
    commandPollInterval = setInterval(pollCommandQueue, config.pollIntervalMs);
    heartbeat.start();
    isRunning = true;
    kernelLog("[kernel] Ready");
  }

  function activateRuntime(attempt?: number): void {
    attempt = attempt || 0;
    try { (typeof self !== "undefined" ? self : Function("return this")()).__ptKernelActivateEntered = true; } catch {}
    if (commandPollInterval || heartbeatInterval) {
      kernelLog("[kernel] Already active");
      return;
    }

    kernelLog("[kernel] activateRuntime() start — attempt=" + String(attempt));
    runtimeLoader.load();
    const runtimeLoaded = runtimeLoader.getRuntimeFn() !== null;
    kernelLog("[kernel] activateRuntime() load done — runtimeLoaded=" + String(runtimeLoaded));

    if (runtimeLoaded) {
      const mtime = runtimeLoader.getLastMtime();
      kernelLog("[kernel] Runtime ready at mtime=" + mtime + " (attempt " + attempt + ")");
      startKernelServices();
    } else if (attempt < MAX_LOAD_ATTEMPTS) {
      const delay = LOAD_RETRY_DELAY_MS * Math.pow(1.5, attempt);
      kernelLog("[kernel] Runtime not loaded, retry in " + delay + "ms (attempt " + (attempt + 1) + "/" + MAX_LOAD_ATTEMPTS + ")");
      setTimeout(function() { activateRuntime(attempt + 1); }, delay);
    } else {
      kernelLog("[kernel] WARNING: Runtime failed after " + MAX_LOAD_ATTEMPTS + " attempts, falling back to demo runtime");
      runtimeLoader.loadDemo();
      startKernelServices();
    }
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
