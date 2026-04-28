// packages/pt-runtime/src/pt/kernel/execution-engine.ts
// Execution Engine para Deferred Jobs IOS
// Responsabilidades: tipos de job, contexto, ejecución de steps, serialización a KernelJobState

import type {
  DeferredJobPlan,
  DeferredStep,
  DeferredStepType,
  KernelJobState,
} from "../../runtime/contracts";
import type { TerminalEngine, TerminalResult } from "../terminal/terminal-engine";

export type JobPhase =
  | "pending"
  | "waiting-ensure-mode"
  | "waiting-command"
  | "waiting-confirm"
  | "waiting-prompt"
  | "waiting-save"
  | "waiting-delay"
  | "completed"
  | "error";

export interface JobStepResult {
  stepIndex: number;
  stepType: DeferredStepType;
  command: string;
  raw: string;
  status: number | null;
  error?: string;
  completedAt: number;
}

export interface JobContext {
  plan: DeferredJobPlan;
  currentStep: number;
  phase: JobPhase;
  outputBuffer: string;
  startedAt: number;
  updatedAt: number;
  stepResults: JobStepResult[];
  lastMode: string;
  lastPrompt: string;
  paged: boolean;
  waitingForCommandEnd: boolean;
  finished: boolean;
  result: TerminalResult | null;
  error: string | null;
  errorCode: string | null;
  pendingDelay: number | null;
  waitingForConfirm: boolean;
}

export interface ActiveJob {
  id: string;
  device: string;
  context: JobContext;
  pendingCommand: Promise<TerminalResult> | null;
}

// ============================================================================
// INTERFAZ PÚBLICA
// ============================================================================

export interface ExecutionEngine {
  startJob(plan: DeferredJobPlan): ActiveJob;
  advanceJob(jobId: string): void;
  getJob(jobId: string): ActiveJob | null;
  getActiveJobs(): ActiveJob[];
  isJobFinished(jobId: string): boolean;
}

// ============================================================================
// IMPLEMENTACIÓN
// ============================================================================

export function createExecutionEngine(terminal: TerminalEngine): ExecutionEngine {
  const jobs: Record<string, ActiveJob> = {};

  function isConfigMode(mode: string | null | undefined): boolean {
    return String(mode ?? "").startsWith("config");
  }

  function cleanupConfigSession(device: string, mode: string | null | undefined, prompt: string | null | undefined): void {
    if (!isConfigMode(mode) && !/\(config[^)]*\)#\s*$/.test(String(prompt ?? ""))) {
      return;
    }

    execLog("CLEANUP config session device=" + device);
    void terminal
      .executeCommand(device, "end", {
        commandTimeoutMs: 5000,
        allowPager: false,
        autoConfirm: false,
      })
      .catch(function (error) {
        execLog("CLEANUP failed device=" + device + " error=" + String(error));
      });
  }

  // ============================================================================
  // Helpers para detección de prompt y output completo
  // ============================================================================

  function normalizeEol(value: unknown): string {
    return String(value ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  }

  function isIosPrompt(value: unknown): boolean {
    const line = String(value ?? "").trim();
    return /^[A-Za-z0-9._-]+(?:\(config[^)]*\))?[>#]$/.test(line);
  }

  function lastNonEmptyLine(value: unknown): string {
    const lines = normalizeEol(value)
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    return lines.length > 0 ? lines[lines.length - 1] : "";
  }

  function outputLooksComplete(output: string, command: string): boolean {
    const text = normalizeEol(output);
    const cmd = String(command ?? "").trim().toLowerCase();

    if (!text.trim()) return false;

    const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
    const hasCommandEcho = cmd.length > 0 && lines.some((line) => line.toLowerCase() === cmd);
    const hasPromptAtEnd = isIosPrompt(lastNonEmptyLine(text));
    const hasMeaningfulBody = lines.some((line) => {
      if (!line) return false;
      if (cmd && line.toLowerCase() === cmd) return false;
      if (isIosPrompt(line)) return false;
      return true;
    });

    return hasCommandEcho && hasPromptAtEnd && hasMeaningfulBody;
  }

  function reapStaleJobs(): void {
    const now = Date.now();

    for (const key in jobs) {
      const job = jobs[key];
      if (!job || job.context.finished || job.context.phase === "completed" || job.context.phase === "error") {
        continue;
      }

      if (job.pendingCommand === null) {
        continue;
      }

      if (now - job.context.updatedAt <= getJobTimeoutMs(job)) {
        const output = String(job.context.outputBuffer ?? "");
        const lastPrompt = String(job.context.lastPrompt ?? "");
        const waitingForCommandEnd = job.context.waitingForCommandEnd === true;

        const looksBackAtPrompt =
          /^[A-Za-z0-9._-]+(?:\(config[^)]*\))?[>#]$/.test(lastPrompt.trim());

        const hasOutput = output.trim().length > 0;

        if (
          waitingForCommandEnd &&
          job.context.phase === "waiting-command" &&
          looksBackAtPrompt &&
          hasOutput &&
          now - job.context.updatedAt > 750
        ) {
          execLog(
            "JOB FORCE COMPLETE FROM PROMPT id=" +
              job.id +
              " device=" +
              job.device +
              " prompt=" +
              lastPrompt,
          );

          job.pendingCommand = null;
          job.context.waitingForCommandEnd = false;
          job.context.phase = "completed";
          job.context.finished = true;
          job.context.error = null;
          job.context.errorCode = null;
          job.context.updatedAt = now;

          job.context.result = {
            ok: true,
            output,
            status: 0,
            prompt: lastPrompt,
            mode: job.context.lastMode,
          } as any;

          cleanupConfigSession(job.device, job.context.lastMode, job.context.lastPrompt);
          wakePendingJobsForDevice(job.device);
        }
        continue;
      }

      execLog("JOB TIMEOUT id=" + job.id + " device=" + job.device + " phase=" + job.context.phase);
      job.pendingCommand = null;
      job.context.phase = "error";
      job.context.finished = true;
      job.context.error = "Job timed out while waiting for terminal command completion";
      job.context.errorCode = "JOB_TIMEOUT";
      job.context.updatedAt = now;
      cleanupConfigSession(job.device, job.context.lastMode, job.context.lastPrompt);
      wakePendingJobsForDevice(job.device);
    }
  }

  function wakePendingJobsForDevice(device: string): void {
    setTimeout(function () {
      for (const key in jobs) {
        const other = jobs[key];
        if (!other) continue;
        if (other.device !== device) continue;
        if (isJobFinished(key)) continue;
        if (other.pendingCommand !== null) continue;
        advanceJob(key);
      }
    }, 0);
  }

  function getCurrentStep(ctx: JobContext): DeferredStep | null {
    if (ctx.currentStep >= ctx.plan.plan.length) return null;
    return ctx.plan.plan[ctx.currentStep];
  }

  function executeCurrentStep(job: ActiveJob): void {
    const ctx = job.context;
    const step = getCurrentStep(ctx);

    if (!step) {
      execLog("JOB COMPLETE id=" + job.id + " device=" + job.device);
      ctx.phase = "completed";
      ctx.finished = true;
      return;
    }

    const stepType = step.type;
    const timeout = step.options?.timeoutMs ?? ctx.plan.options.commandTimeoutMs;
    const stopOnError = step.options?.stopOnError ?? ctx.plan.options.stopOnError;

    switch (stepType) {
      case "delay": {
        const delayMs = parseInt(step.value || "1000", 10);
        execLog("DELAY id=" + job.id + " ms=" + delayMs);
        ctx.phase = "waiting-delay";
        ctx.pendingDelay = delayMs;
        setTimeout(function () {
          ctx.pendingDelay = null;
          advanceJob(job.id);
        }, delayMs);
        break;
      }

      case "release-session":
      case "close-session": {
        execLog("RELEASE SESSION id=" + job.id + " device=" + job.device);
        terminal.detach(job.device);
        ctx.phase = "completed";
        ctx.finished = true;
        wakePendingJobsForDevice(job.device);
        break;
      }

      case "logout-session": {
        execLog("LOGOUT SESSION id=" + job.id + " device=" + job.device);
        try {
          // Obtener el terminal directamente y enviar exit
          var net = typeof ipc !== "undefined" ? ipc.network() : null;
          if (net) {
            var dev = net.getDevice(job.device);
            if (dev && dev.getCommandLine) {
              var term = dev.getCommandLine();
              if (term && term.enterCommand) {
                term.enterCommand("exit");
              }
            }
          }
        } catch (e) {}
        terminal.detach(job.device);
        ctx.phase = "completed";
        ctx.finished = true;
        wakePendingJobsForDevice(job.device);
        break;
      }

      case "confirm": {
        execLog("CONFIRM id=" + job.id + " device=" + job.device);
        terminal.confirmPrompt(job.device);
        ctx.currentStep++;
        ctx.phase = "pending";
        ctx.updatedAt = Date.now();
        advanceJob(job.id);
        break;
      }

      case "command":
      case "save-config": {
        let command = step.value || "";
        if (stepType === "save-config") {
          command = "write memory";
        }

        if (!command) {
          execLog("SKIP empty command step=" + ctx.currentStep + " id=" + job.id);
          ctx.currentStep++;
          advanceJob(job.id);
          return;
        }

        ctx.phase = stepType === "save-config" ? "waiting-save" : "waiting-command";
        ctx.waitingForCommandEnd = true;
        execLog(
          "EXEC CMD step=" +
            ctx.currentStep +
            "/" +
            (ctx.plan.plan.length - 1) +
            " type=" +
            stepType +
            " cmd='" +
            command.substring(0, 40) +
            "' id=" +
            job.id,
        );

        job.pendingCommand = terminal.executeCommand(job.device, command, {
          commandTimeoutMs: timeout,
        });

        job.pendingCommand
          .then(function (result) {
            if (ctx.finished) return;
            execLog(
              "CMD OK id=" +
                job.id +
                " step=" +
                ctx.currentStep +
                " status=" +
                result.status +
                " outputLen=" +
                result.output.length,
            );
            job.pendingCommand = null;
            ctx.waitingForCommandEnd = false;
            ctx.outputBuffer += result.output;
            ctx.lastPrompt = result.session.prompt;
            ctx.lastMode = result.session.mode;
            ctx.paged = result.session.paging;

            ctx.stepResults.push({
              stepIndex: ctx.currentStep,
              stepType: stepType,
              command: command,
              raw: result.output,
              status: result.status,
              completedAt: Date.now(),
            });

            if (result.status !== 0 && stopOnError) {
              execLog("CMD FAILED (stopOnError) id=" + job.id + " status=" + result.status);
              ctx.phase = "error";
              ctx.error = "Command failed with status " + result.status + ": " + command;
              ctx.errorCode = "CMD_FAILED";
              ctx.finished = true;
              cleanupConfigSession(job.device, result.session.mode, result.session.prompt);
              return;
            }

            if (ctx.paged && stepType === "save-config") {
              terminal.continuePager(job.device);
            }

            ctx.currentStep++;
            ctx.phase = "pending";
            ctx.updatedAt = Date.now();

            if (ctx.currentStep >= ctx.plan.plan.length) {
              execLog("JOB COMPLETED id=" + job.id + " steps=" + ctx.stepResults.length);
              ctx.phase = "completed";
              ctx.finished = true;
              wakePendingJobsForDevice(job.device);
            } else {
              advanceJob(job.id);
            }
          })
          .catch(function (err) {
            if (ctx.finished) return;
            execLog("CMD ERROR id=" + job.id + " error=" + String(err));
            job.pendingCommand = null;
            ctx.waitingForCommandEnd = false;
            ctx.phase = "error";
            ctx.error = String(err);
            ctx.errorCode = "EXEC_ERROR";
            ctx.finished = true;
            cleanupConfigSession(job.device, ctx.lastMode, ctx.lastPrompt);
            wakePendingJobsForDevice(job.device);
          });
        break;
      }

      default: {
        execLog("UNKNOWN STEP TYPE: " + stepType + " id=" + job.id);
        ctx.currentStep++;
        advanceJob(job.id);
      }
    }
  }

  function advanceJob(jobId: string): void {
    const job = jobs[jobId];
    if (!job || isJobFinished(jobId) || job.pendingCommand !== null) return;

    const device = job.device;
    const jobIdStr = job.id;

    for (const key in jobs) {
      if (key === jobIdStr) continue;
      const other = jobs[key];
      if (!isJobFinished(key) && other.device === device && other.pendingCommand !== null) {
        return;
      }
    }

    if (job.context.paged) {
      terminal.continuePager(job.device);
      job.context.paged = false;
    }

    executeCurrentStep(job);
  }

  return {
    startJob: function (plan) {
      execLog("START JOB id=" + plan.id + " device=" + plan.device + " steps=" + plan.plan.length);
      const context = createJobContext(plan);
      const job: ActiveJob = {
        id: plan.id,
        device: plan.device,
        context: context,
        pendingCommand: null,
      };
      jobs[plan.id] = job;

      const attached = tryAttachTerminal(plan.device);
      if (!attached) {
        context.phase = "error";
        context.finished = true;
        context.error = "No terminal attached to " + plan.device;
        context.errorCode = "NO_TERMINAL_ATTACHED";
        context.updatedAt = Date.now();
        return job;
      }

      advanceJob(plan.id);
      return job;
    },
    advanceJob: advanceJob,
    getJob: function (id) {
      reapStaleJobs();
      return jobs[id] || null;
    },
    getActiveJobs: function () {
      reapStaleJobs();
      const active: ActiveJob[] = [];
      for (const key in jobs) {
        if (!isJobFinished(key)) {
          active.push(jobs[key]);
        }
      }
      return active;
    },
    isJobFinished: isJobFinished,
  };
}

// ============================================================================
// SERIALIZACIÓN
// ============================================================================

export function toKernelJobState(ctx: JobContext): KernelJobState {
  const base: any = {
    id: ctx.plan.id,
    device: ctx.plan.device,
    plan: ctx.plan,
    currentStep: ctx.currentStep,
    state: ctx.phase,
    outputBuffer: ctx.outputBuffer,
    startedAt: ctx.startedAt,
    updatedAt: ctx.updatedAt,
    stepResults: ctx.stepResults,
    lastMode: ctx.lastMode,
    lastPrompt: ctx.lastPrompt,
    paged: ctx.paged,
    waitingForCommandEnd: ctx.waitingForCommandEnd,
    finished: ctx.finished,
    error: ctx.error,
    errorCode: ctx.errorCode,
  };

  if (ctx.result && ctx.result.ok) {
    base.result = {
      ok: true,
      raw: ctx.result.output,
      status: ctx.result.status,
      session: ctx.result.session,
    };
    return base as KernelJobState;
  }

  base.result = null;
  return base as KernelJobState;
}
