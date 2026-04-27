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

  function execLog(msg: string): void {
    try {
      dprint("[exec] " + msg);
    } catch {}
  }

  function createJobContext(plan: DeferredJobPlan): JobContext {
    return {
      plan,
      currentStep: 0,
      phase: "pending",
      outputBuffer: "",
      startedAt: Date.now(),
      updatedAt: Date.now(),
      stepResults: [],
      lastMode: "",
      lastPrompt: "",
      paged: false,
      waitingForCommandEnd: false,
      finished: false,
      result: null,
      error: null,
      errorCode: null,
      pendingDelay: null,
      waitingForConfirm: false,
    };
  }

  function tryAttachTerminal(deviceName: string): boolean {
    try {
      const scope = (typeof self !== "undefined" ? self : Function("return this")()) as any;
      const ipc = scope && scope.ipc ? scope.ipc : null;

      if (!ipc || typeof ipc.network !== "function") {
        execLog("ATTACH SKIP no ipc.network/getDevice device=" + deviceName);
        return false;
      }

      const net = ipc.network();
      if (!net || typeof net.getDevice !== "function") {
        execLog("ATTACH FAIL no network/getDevice device=" + deviceName);
        return false;
      }

      const dev = net.getDevice(deviceName);
      if (!dev) {
        execLog("ATTACH FAIL device not found=" + deviceName);
        return false;
      }

      if (typeof (dev as any).getCommandLine !== "function") {
        execLog("ATTACH FAIL getCommandLine missing device=" + deviceName);
        return false;
      }

      const term = (dev as any).getCommandLine();
      if (!term) {
        execLog("ATTACH FAIL getCommandLine returned null device=" + deviceName);
        return false;
      }

      terminal.attach(deviceName, term);
      execLog("ATTACH OK device=" + deviceName);
      return true;
    } catch (error) {
      execLog("ATTACH ERROR device=" + deviceName + " error=" + String(error));
      return false;
    }
  }

  function isJobFinished(jobId: string): boolean {
    const job = jobs[jobId];
    if (!job) return true;
    const ctx = job.context;
    return ctx.finished || ctx.phase === "completed" || ctx.phase === "error";
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
      case "ensure-mode":
      case "save-config": {
        let command = step.value || "";
        if (stepType === "ensure-mode") {
          const targetMode = step.value || "privileged-exec";
          if (targetMode === "privileged-exec") command = "enable";
          else if (targetMode === "config") command = "configure terminal";
          else if (targetMode === "config-if")
            command = "interface " + (step.options?.expectedPrompt || "");
        } else if (stepType === "save-config") {
          command = "write memory";
        }

        if (!command && stepType === "command") {
          execLog("SKIP empty command step=" + ctx.currentStep + " id=" + job.id);
          ctx.currentStep++;
          advanceJob(job.id);
          return;
        }

        ctx.phase =
          stepType === "ensure-mode"
            ? "waiting-ensure-mode"
            : stepType === "save-config"
              ? "waiting-save"
              : "waiting-command";
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

        job.pendingCommand = terminal.executeCommand(job.device, command, { commandTimeoutMs: timeout });

        job.pendingCommand
          .then(function (result) {
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

            if (stepType === "ensure-mode") {
              const target = step.value || "privileged-exec";
              if (result.session.mode !== target && result.status !== 0) {
                execLog(
                  "MODE TRANSITION FAILED id=" +
                    job.id +
                    " expected=" +
                    target +
                    " got=" +
                    result.session.mode,
                );
                ctx.phase = "error";
                ctx.error =
                  "Mode transition failed: expected " + target + " but got " + result.session.mode;
                ctx.errorCode = "MODE_TRANSITION_FAILED";
                ctx.finished = true;
                return;
              }
            }

            if (result.status !== 0 && stopOnError) {
              execLog("CMD FAILED (stopOnError) id=" + job.id + " status=" + result.status);
              ctx.phase = "error";
              ctx.error = "Command failed with status " + result.status + ": " + command;
              ctx.errorCode = "CMD_FAILED";
              ctx.finished = true;
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
            } else {
              advanceJob(job.id);
            }
          })
          .catch(function (err) {
            execLog("CMD ERROR id=" + job.id + " error=" + String(err));
            job.pendingCommand = null;
            ctx.waitingForCommandEnd = false;
            ctx.phase = "error";
            ctx.error = String(err);
            ctx.errorCode = "EXEC_ERROR";
            ctx.finished = true;
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
      return jobs[id] || null;
    },
    getActiveJobs: function () {
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
