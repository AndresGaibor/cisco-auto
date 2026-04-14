// packages/pt-runtime/src/pt/kernel/job-executor.ts
// Job executor that runs deferred job plans

import type { DeferredJobPlan, DeferredStepType } from "../../domain";
import type { TerminalEngine, TerminalResult } from "../terminal/terminal-engine";
import { 
  createJobContext, 
  getCurrentStep, 
  isJobFinished as isContextFinished,
  getStepTimeout,
  isStepStopOnError,
  type JobContext 
} from "./job-state";

export interface ActiveJob {
  id: string;
  device: string;
  context: JobContext;
  pendingCommand: Promise<TerminalResult> | null;
}

export interface JobExecutor {
  startJob(plan: DeferredJobPlan): ActiveJob;
  advanceJob(jobId: string): void;
  getJob(jobId: string): ActiveJob | null;
  getActiveJobs(): ActiveJob[];
  isJobFinished(jobId: string): boolean;
}

export function createJobExecutor(terminal: TerminalEngine) {
  const jobs = new Map<string, ActiveJob>();
  
  function startJob(plan: DeferredJobPlan): ActiveJob {
    const context = createJobContext(plan);
    const job: ActiveJob = {
      id: plan.id,
      device: plan.device,
      context,
      pendingCommand: null,
    };
    
    jobs.set(plan.id, job);
    advanceJob(plan.id);
    
    return job;
  }
  
  async function executeCurrentStep(job: ActiveJob): Promise<void> {
    const ctx = job.context;
    const step = getCurrentStep(ctx);
    
    if (!step) {
      ctx.phase = "completed";
      ctx.finished = true;
      return;
    }
    
    const stepType = step.type;
    
    if (stepType === "delay") {
      const delayMs = parseInt(step.value || "1000", 10);
      ctx.phase = "waiting-delay";
      ctx.pendingDelay = delayMs;
      
      setTimeout(() => {
        ctx.pendingDelay = null;
        advanceJob(job.id);
      }, delayMs);
      
      return;
    }
    
    if (stepType === "close-session") {
      terminal.detach(job.device);
      ctx.phase = "completed";
      ctx.finished = true;
      return;
    }
    
    if (stepType === "command") {
      const command = step.value || "";
      ctx.phase = "waiting-command";
      ctx.waitingForCommandEnd = true;

      job.pendingCommand = terminal.executeCommand(job.device, command, {
        timeout: getStepTimeout(ctx),
      });

      try {
        const result = await job.pendingCommand;
        job.pendingCommand = null;
        ctx.waitingForCommandEnd = false;
        ctx.outputBuffer += result.output;
        ctx.lastPrompt = result.session.prompt;
        ctx.lastMode = result.session.mode;
        ctx.paged = result.session.paging;

        ctx.stepResults.push({
          stepIndex: ctx.currentStep,
          stepType,
          command,
          raw: result.output,
          status: result.status,
          completedAt: Date.now(),
        });

        if (result.status !== 0 && isStepStopOnError(ctx)) {
          ctx.phase = "error";
          ctx.error = "Command failed with status " + result.status + ": " + command;
          ctx.errorCode = "CMD_FAILED";
          ctx.finished = true;
          return;
        }

        ctx.currentStep++;
        ctx.phase = "pending";
        ctx.updatedAt = Date.now();

        if (ctx.currentStep >= ctx.plan.plan.length) {
          ctx.phase = "completed";
          ctx.finished = true;
        } else {
          advanceJob(job.id);
        }
      } catch (err) {
        job.pendingCommand = null;
        ctx.waitingForCommandEnd = false;
        ctx.phase = "error";
        ctx.error = String(err);
        ctx.errorCode = "EXEC_ERROR";
        ctx.finished = true;
      }

      return;
    }
    
    if (stepType === "confirm") {
      terminal.confirmPrompt(job.device);
      ctx.currentStep++;
      ctx.phase = "pending";
      ctx.updatedAt = Date.now();
      advanceJob(job.id);
      return;
    }
    
    if (stepType === "ensure-mode") {
      let command = "";
      const targetMode = step.value || "privileged-exec";

      if (targetMode === "privileged-exec" || targetMode === "priv-exec") {
        command = "enable";
      } else if (targetMode === "config") {
        command = "configure terminal";
      } else if (targetMode === "config-if") {
        command = "interface " + (step.options?.expectedPrompt || "");
      }

      if (command) {
        ctx.phase = "waiting-command";
        ctx.waitingForCommandEnd = true;

        job.pendingCommand = terminal.executeCommand(job.device, command, {
          timeout: getStepTimeout(ctx),
        });

        job.pendingCommand
          .then((result) => {
            job.pendingCommand = null;
            ctx.waitingForCommandEnd = false;
            ctx.lastMode = result.session.mode;
            ctx.lastPrompt = result.session.prompt;
            ctx.paged = result.session.paging;

            // VERIFY actual mode transition
            if (targetMode === "privileged-exec" || targetMode === "priv-exec") {
              if (result.session.mode !== "privileged-exec" && result.status !== 0) {
                ctx.phase = "error";
                ctx.error = "ensure-mode priv-exec failed: mode=" + result.session.mode + " status=" + result.status;
                ctx.errorCode = "MODE_TRANSITION_FAILED";
                ctx.finished = true;
                return;
              }
            } else if (targetMode === "config") {
              if (result.session.mode !== "config" && result.status !== 0) {
                ctx.phase = "error";
                ctx.error = "ensure-mode config failed: mode=" + result.session.mode + " status=" + result.status;
                ctx.errorCode = "MODE_TRANSITION_FAILED";
                ctx.finished = true;
                return;
              }
            }

            ctx.currentStep++;
            ctx.phase = "pending";
            ctx.updatedAt = Date.now();
            advanceJob(job.id);
          })
          .catch((err) => {
            job.pendingCommand = null;
            ctx.waitingForCommandEnd = false;
            ctx.phase = "error";
            ctx.error = String(err);
            ctx.errorCode = "EXEC_ERROR";
            ctx.finished = true;
          });

        return;
      }

      ctx.currentStep++;
      ctx.phase = "pending";
      ctx.updatedAt = Date.now();
      advanceJob(job.id);
      return;
    }
    
    if (stepType === "save-config") {
      ctx.phase = "waiting-command";
      ctx.waitingForCommandEnd = true;

      job.pendingCommand = terminal.executeCommand(job.device, "write memory", {
        timeout: getStepTimeout(ctx),
      });

      job.pendingCommand
        .then((result) => {
          job.pendingCommand = null;
          ctx.waitingForCommandEnd = false;
          ctx.outputBuffer += result.output;
          ctx.lastMode = result.session.mode;
          ctx.lastPrompt = result.session.prompt;
          ctx.paged = result.session.paging;

          // If paged, continue; if confirmation prompt appeared, handle it
          if (ctx.paged) {
            terminal.continuePager(job.device);
          }

          ctx.currentStep++;
          ctx.phase = "pending";
          ctx.updatedAt = Date.now();
          advanceJob(job.id);
        })
        .catch((err) => {
          job.pendingCommand = null;
          ctx.waitingForCommandEnd = false;
          ctx.phase = "error";
          ctx.error = "save-config: " + String(err);
          ctx.errorCode = "SAVE_CONFIG_ERROR";
          ctx.finished = true;
        });

      return;
    }
    
    ctx.currentStep++;
    ctx.phase = "pending";
    ctx.updatedAt = Date.now();
    advanceJob(job.id);
  }
  
  function advanceJob(jobId: string): void {
    const job = jobs.get(jobId);
    if (!job) return;

    if (isContextFinished(job.context)) {
      return;
    }

    // Don't advance if there's already a pending command
    if (job.pendingCommand !== null) {
      return;
    }

    // Don't advance if device is busy in another job
    const allJobs = Array.from(jobs.values());
    for (const otherJob of allJobs) {
      if (otherJob.id !== job.id && !isContextFinished(otherJob.context)) {
        if (otherJob.pendingCommand !== null) {
          // Another job has active command on a device - check if same device
          if (otherJob.device === job.device) {
            return; // Same device busy, wait
          }
        }
      }
    }

    if (job.context.paged) {
      terminal.continuePager(job.device);
      job.context.paged = false; // Reset paging flag after sending space
    }

    executeCurrentStep(job);
  }
  
  function getJob(jobId: string): ActiveJob | null {
    return jobs.get(jobId) || null;
  }
  
  function getActiveJobs(): ActiveJob[] {
    return Array.from(jobs.values()).filter(j => !isContextFinished(j.context));
  }
  
  function isJobFinished(jobId: string): boolean {
    const job = jobs.get(jobId);
    return job ? isContextFinished(job.context) : true;
  }
  
  return {
    startJob,
    advanceJob,
    getJob,
    getActiveJobs,
    isJobFinished,
  };
}