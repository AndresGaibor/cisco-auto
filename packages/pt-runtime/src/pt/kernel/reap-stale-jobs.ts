// packages/pt-runtime/src/pt/kernel/reap-stale-jobs.ts
// Recolector de jobs stale que no han progresado
// Divide la lógica en sub-funciones para facilitar testing

import type { ActiveJob } from "./execution-engine-types";
import type { TerminalResult } from "../terminal/terminal-engine";

export interface ReapStaleJobsDeps {
  jobs: Record<string, ActiveJob>;
  execLog: (message: string) => void;
  getJobTimeoutMs: (job: ActiveJob) => number;
  tickNativeFallback: (job: ActiveJob, reason: string) => boolean;
  forceCompleteFromNativeTerminal: (job: ActiveJob, reason: string) => boolean;
  getCurrentStep: (ctx: any) => any;
  jobRequiresPrivilegedExecFinalMode: (job: ActiveJob) => boolean;
  nativeSnapshotIsStillInConfigMode: (args: { prompt: string; mode: string }) => boolean;
  readNativeTerminalOutput: (device: string) => string;
  getNativePrompt: (device: string, output: string) => string;
  getNativeMode: (device: string, prompt: string) => string;
  cleanupConfigSession: (device: string, mode: string | null | undefined, prompt: string | null | undefined) => void;
  terminal: { detach: (device: string) => void };
  wakePendingJobsForDevice: (device: string) => void;
  isDeviceTerminalBusy: (device: string) => boolean;
  isJobFinished: (jobId: string) => boolean;
  advanceJob: (jobId: string) => void;
}

export function reapStaleJobs(deps: ReapStaleJobsDeps): void {
  const now = Date.now();

  for (const key in deps.jobs) {
    const job = deps.jobs[key];
    if (!job || job.context.finished || job.context.phase === "completed" || job.context.phase === "error") {
      continue;
    }

    const completedFromNative = deps.tickNativeFallback(job, "reapStaleJobs");
    if (completedFromNative) {
      continue;
    }

    if (job.pendingCommand === null) {
      continue;
    }

    const elapsedMs = now - job.context.updatedAt;
    const withinTimeout = elapsedMs <= deps.getJobTimeoutMs(job);
    const waitingForCommandEnd = job.context.waitingForCommandEnd === true;
    const waitingPhase =
      job.context.phase === "waiting-command" ||
      job.context.phase === "waiting-ensure-mode";

    if (
      waitingForCommandEnd &&
      waitingPhase &&
      elapsedMs > 5000 &&
      (job.context as any).semanticErrorCleanupInProgress !== true
    ) {
      try {
        const completedFromNative = deps.forceCompleteFromNativeTerminal(
          job,
          "reapStaleJobs elapsedMs=" + elapsedMs,
        );
        if (completedFromNative) {
          continue;
        }
      } catch (error) {
        deps.execLog(
          "JOB NATIVE FALLBACK ERROR id=" +
            job.id +
            " device=" +
            job.device +
            " error=" +
            String(error),
        );
      }
    }

    if (!withinTimeout) {
      handleJobTimeout(job, deps, now);
      continue;
    }

    if (withinTimeout) {
      const output = String(job.context.outputBuffer ?? "");
      const lastPrompt = String(job.context.lastPrompt ?? "");

      const looksBackAtPrompt =
        /^[A-Za-z0-9._-]+(?:\(config[^)]*\))?[>#]$/.test(lastPrompt.trim());
      const hasOutput = output.trim().length > 0;

      if (
        waitingForCommandEnd &&
        job.context.phase === "waiting-command" &&
        looksBackAtPrompt &&
        hasOutput &&
        now - job.context.updatedAt > 3000
      ) {
        const shouldForceComplete = checkPromptForceSkip(job, deps, lastPrompt, output);
        if (shouldForceComplete === "continue") {
          continue;
        }
        if (shouldForceComplete === "skip") {
          continue;
        }
      }
      continue;
    }

    deps.execLog("JOB TIMEOUT id=" + job.id + " device=" + job.device + " phase=" + job.context.phase);
    job.pendingCommand = null;
    job.context.phase = "error";
    job.context.finished = true;
    job.context.error = "Job timed out while waiting for terminal command completion";
    job.context.errorCode = "JOB_TIMEOUT";
    job.context.updatedAt = now;
    deps.cleanupConfigSession(job.device, job.context.lastMode, job.context.lastPrompt);
    deps.wakePendingJobsForDevice(job.device);
  }
}

function handleJobTimeout(job: ActiveJob, deps: ReapStaleJobsDeps, now: number): void {
  deps.execLog("JOB HARD TIMEOUT id=" + job.id + " device=" + job.device + " phase=" + job.context.phase + " elapsedMs=" + (now - job.context.updatedAt) + " timeoutMs=" + deps.getJobTimeoutMs(job));
  job.pendingCommand = null;
  job.context.phase = "error";
  job.context.finished = true;
  job.context.error = "Job timed out while waiting for terminal command completion";
  job.context.errorCode = "JOB_TIMEOUT";
  job.context.updatedAt = now;
  deps.cleanupConfigSession(job.device, job.context.lastMode, job.context.lastPrompt);
  deps.terminal.detach(job.device);
  deps.wakePendingJobsForDevice(job.device);
}

type PromptForceResult = "continue" | "skip" | "force" | "timeout";

function checkPromptForceSkip(job: ActiveJob, deps: ReapStaleJobsDeps, lastPrompt: string, output: string): PromptForceResult {
  const currentStepForPromptForce = deps.getCurrentStep(job.context);
  const isLastStepForPromptForce =
    job.context.currentStep >= job.context.plan.plan.length - 1;

  if (currentStepForPromptForce && !isLastStepForPromptForce) {
    try {
      job.context.debug.push(
        String(Date.now()) +
          " prompt-force-skip-non-final step=" +
          String(job.context.currentStep) +
          "/" +
          String(job.context.plan.plan.length - 1) +
          " command=" +
          String((currentStepForPromptForce as any).value || (currentStepForPromptForce as any).command || "") +
          " prompt=" +
          String(lastPrompt || ""),
      );
    } catch {}

    deps.execLog(
      "JOB PROMPT FORCE SKIP non-final id=" +
        job.id +
        " device=" +
        job.device +
        " step=" +
        job.context.currentStep +
        "/" +
        (job.context.plan.plan.length - 1) +
        " prompt=" +
        String(lastPrompt || ""),
    );

    job.context.updatedAt = Date.now();
    return "continue";
  }

  const promptForceCurrentStep = currentStepForPromptForce;
  const promptForceCommand = String(
    (promptForceCurrentStep as any)?.value ??
      (promptForceCurrentStep as any)?.command ??
      "",
  ).trim();

  const nativeOutputForPromptForce = deps.readNativeTerminalOutput(job.device);
  const nativePromptForPromptForce = deps.getNativePrompt(job.device, nativeOutputForPromptForce);
  const nativeModeForPromptForce = deps.getNativeMode(job.device, nativePromptForPromptForce);

  if (
    promptForceCommand.toLowerCase() === "end" &&
    nativePromptForPromptForce &&
    nativePromptForPromptForce !== lastPrompt
  ) {
    deps.execLog(
      "JOB PROMPT FORCE SKIP stale prompt for end id=" +
        job.id +
        " device=" +
        job.device +
        " lastPrompt=" +
        String(lastPrompt || "") +
        " nativePrompt=" +
        String(nativePromptForPromptForce || "") +
        " nativeMode=" +
        String(nativeModeForPromptForce || ""),
    );

    job.context.updatedAt = Date.now();
    return "skip";
  }

  if (
    deps.jobRequiresPrivilegedExecFinalMode(job) &&
    deps.nativeSnapshotIsStillInConfigMode({
      prompt: lastPrompt,
      mode: job.context.lastMode,
    })
  ) {
    deps.execLog(
      "JOB PROMPT FORCE REFUSE CONFIG MODE id=" +
        job.id +
        " device=" +
        job.device +
        " step=" +
        job.context.currentStep +
        "/" +
        job.context.plan.plan.length +
        " prompt=" +
        String(lastPrompt || "") +
        " mode=" +
        String(job.context.lastMode || ""),
    );

    job.context.updatedAt = Date.now();
    return "skip";
  }

  deps.execLog(
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
  job.context.updatedAt = Date.now();

  job.context.result = {
    ok: true,
    output,
    status: 0,
    prompt: lastPrompt,
    mode: job.context.lastMode,
  } as unknown as TerminalResult;

  deps.cleanupConfigSession(job.device, job.context.lastMode, job.context.lastPrompt);
  deps.wakePendingJobsForDevice(job.device);

  return "force";
}
