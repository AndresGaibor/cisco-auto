// packages/pt-runtime/src/pt/kernel/execution-engine-step-handlers.ts
// Step handlers para executeCurrentStep — extraídos como funciones puras parametrizadas

import type { ActiveJob, DeferredStep, DeferredStepType, JobContext } from "./execution-engine-types";
import type { TerminalResult } from "../terminal/terminal-engine";

export interface StepHandlerDeps {
  execLog: (message: string) => void;
  advanceJob: (jobId: string) => void;
  deferAdvanceJob: (jobId: string, command: string) => void;
  completeJobIfLastStep: (job: ActiveJob, result: TerminalResult | null) => boolean;
  cleanupConfigSession: (device: string, mode: string | null, prompt: string | null) => void;
  wakePendingJobsForDevice: (device: string) => void;
  captureNativeBaselineForCurrentStep: (job: ActiveJob) => void;
  readSession: (device: string) => { mode: string; prompt: string };
  commandForEnsureMode: (currentMode: string, targetMode: string) => string | null;
  modeMatches: (actual: unknown, expected: unknown) => boolean;
  resolveJobSessionKind: (job: ActiveJob) => "ios" | "host";
  terminal: {
    executeCommand(device: string, command: string, options?: any): Promise<TerminalResult>;
    getSession(device: string): { mode: string; prompt: string } | null;
    detach(device: string): void;
    confirmPrompt(device: string): void;
  };
  readNativeTerminalOutput: (device: string) => string;
  getNativePrompt: (device: string, output: string) => string;
  getNativeMode: (device: string, prompt: string) => string;
  appendStepOutput: (current: string, next: unknown) => string;
  inferModeFromPrompt: (prompt: string) => string;
}

export function handleDelayStep(
  job: ActiveJob,
  step: DeferredStep,
  deps: StepHandlerDeps,
): void {
  const ctx = job.context;
  const delayMs = parseInt(step.value || "1000", 10);
  deps.execLog("DELAY id=" + job.id + " ms=" + delayMs);
  ctx.phase = "waiting-delay";
  ctx.pendingDelay = delayMs;
  setTimeout(function () {
    ctx.pendingDelay = null;
    deps.advanceJob(job.id);
  }, delayMs);
}

export function handleEnsureModeStep(
  job: ActiveJob,
  step: DeferredStep,
  stopOnError: boolean,
  commandTimeoutMs: number | undefined,
  deps: StepHandlerDeps,
): void {
  const ctx = job.context;
  const targetMode = String(
    (step as any).expectMode ||
      (step.options as any)?.expectedMode ||
      step.value ||
      "privileged-exec",
  );

  const session = deps.readSession(job.device);
  const command = deps.commandForEnsureMode(session.mode, targetMode);

  ctx.phase = "waiting-ensure-mode";
  ctx.lastMode = session.mode;
  ctx.lastPrompt = session.prompt;

  if (!targetMode || command === null) {
    if (targetMode && !deps.modeMatches(session.mode, targetMode)) {
      deps.execLog("ENSURE MODE unsupported target=" + targetMode + " current=" + session.mode + " id=" + job.id);
      if (stopOnError) {
        ctx.phase = "error";
        ctx.error = "Cannot ensure terminal mode " + targetMode + " from " + session.mode;
        ctx.errorCode = "ENSURE_MODE_UNSUPPORTED";
        ctx.finished = true;
        ctx.updatedAt = Date.now();
        deps.wakePendingJobsForDevice(job.device);
        return;
      }
    }

    ctx.stepResults.push({
      stepIndex: ctx.currentStep,
      stepType: step.type,
      command: "",
      raw: "",
      status: 0,
      completedAt: Date.now(),
    });
    ctx.currentStep++;
    ctx.phase = "pending";
    ctx.updatedAt = Date.now();
    if (!deps.completeJobIfLastStep(job, null)) {
      deps.deferAdvanceJob(job.id, String(command || ""));
    }
    return;
  }

  deps.execLog(
    "ENSURE MODE id=" +
      job.id +
      " device=" +
      job.device +
      " current=" +
      session.mode +
      " target=" +
      targetMode +
      " cmd='" +
      command +
      "'",
  );

  const ensureModeTimeoutMs = Number((step.options as any)?.timeoutMs ?? 8000);

  ctx.waitingForCommandEnd = true;
  deps.captureNativeBaselineForCurrentStep(job);
  const cmdPromise = deps.terminal.executeCommand(job.device, command, {
    commandTimeoutMs: ensureModeTimeoutMs,
    stallTimeoutMs: ctx.plan.options.stallTimeoutMs,
    expectedMode: targetMode as any,
    allowPager: false,
    autoAdvancePager: false,
    maxPagerAdvances: 0,
    autoConfirm: false,
    autoDismissWizard: true,
    allowEmptyOutput: true,
    sendEnterFallback: false,
    sessionKind: deps.resolveJobSessionKind(job),
  });
  job.pendingCommand = new Promise(function (cmdResolve, cmdReject) {
    job.pendingCommandReject = cmdReject;
    cmdPromise.then(cmdResolve).catch(cmdReject);
  });
  job.pendingCommand.catch(function () {});

  const runningCommand = job.pendingCommand;

  runningCommand
    .then(function (result) {
      if (ctx.finished) return;
      if (job.pendingCommand !== runningCommand) {
        deps.execLog(
          "STALE ENSURE-MODE RESULT ignored id=" +
            job.id +
            " device=" +
            job.device +
            " step=" +
            ctx.currentStep,
        );
        return;
      }

      job.pendingCommand = null;
      ctx.waitingForCommandEnd = false;
      ctx.outputBuffer = deps.appendStepOutput(ctx.outputBuffer, result.output);
      ctx.lastPrompt = result.session.prompt;
      ctx.lastMode = result.session.mode;
      ctx.paged = result.session.paging;

      ctx.stepResults.push({
        stepIndex: ctx.currentStep,
        stepType: step.type,
        command: command,
        raw: result.output,
        status: result.status,
        completedAt: Date.now(),
      });

      if (!deps.modeMatches(result.session.mode, targetMode)) {
        deps.execLog(
          "ENSURE MODE FAILED id=" +
            job.id +
            " expected=" +
            targetMode +
            " actual=" +
            result.session.mode,
        );
        ctx.phase = "error";
        ctx.error = "Expected mode " + targetMode + ", got " + result.session.mode;
        ctx.errorCode = "ENSURE_MODE_FAILED";
        ctx.finished = true;
        ctx.updatedAt = Date.now();
        deps.cleanupConfigSession(job.device, result.session.mode, result.session.prompt);
        deps.wakePendingJobsForDevice(job.device);
        return;
      }

      ctx.currentStep++;
      ctx.phase = "pending";
      ctx.error = null;
      ctx.errorCode = null;
      ctx.updatedAt = Date.now();

      if (!deps.completeJobIfLastStep(job, result)) {
        deps.deferAdvanceJob(job.id, command);
      }
    })
    .catch(function (err) {
      if (ctx.finished) return;
      if (job.pendingCommand !== runningCommand) {
        deps.execLog(
          "STALE ENSURE-MODE ERROR ignored id=" +
            job.id +
            " device=" +
            job.device +
            " step=" +
            ctx.currentStep +
            " error=" +
            String(err),
        );
        return;
      }
      deps.execLog("ENSURE MODE ERROR id=" + job.id + " error=" + String(err));
      job.pendingCommand = null;
      ctx.waitingForCommandEnd = false;
      ctx.phase = "error";
      ctx.error = String(err);
      ctx.errorCode = "ENSURE_MODE_EXEC_ERROR";
      ctx.finished = true;
      ctx.updatedAt = Date.now();
      deps.cleanupConfigSession(job.device, ctx.lastMode, ctx.lastPrompt);
      deps.wakePendingJobsForDevice(job.device);
    });
}

export function handleExpectPromptStep(
  job: ActiveJob,
  step: DeferredStep,
  stopOnError: boolean,
  deps: StepHandlerDeps,
): void {
  const ctx = job.context;
  const expectedPrompt = String(
    (step.options as any)?.expectedPrompt ||
      (step as any).expectPromptPattern ||
      step.value ||
      "",
  );

  const session = deps.readSession(job.device);
  const prompt = session.prompt || ctx.lastPrompt;

  function promptMatches(prompt: string, expectedPrompt: string): boolean {
    if (!expectedPrompt) return true;
    if (prompt.indexOf(expectedPrompt) >= 0) return true;
    try {
      return new RegExp(expectedPrompt).test(prompt);
    } catch {
      return false;
    }
  }

  const matched = promptMatches(prompt, expectedPrompt);

  if (!matched && stopOnError) {
    ctx.phase = "error";
    ctx.error = "Expected prompt " + expectedPrompt + ", got " + prompt;
    ctx.errorCode = "EXPECT_PROMPT_FAILED";
    ctx.finished = true;
    ctx.updatedAt = Date.now();
    deps.wakePendingJobsForDevice(job.device);
    return;
  }

  ctx.stepResults.push({
    stepIndex: ctx.currentStep,
    stepType: step.type,
    command: "",
    raw: prompt,
    status: 0,
    completedAt: Date.now(),
  });
  ctx.lastMode = session.mode;
  ctx.lastPrompt = prompt;
  ctx.currentStep++;
  ctx.phase = "pending";
  ctx.updatedAt = Date.now();
  if (!deps.completeJobIfLastStep(job, null)) {
    deps.advanceJob(job.id);
  }
}

export function handleReleaseCloseSessionStep(
  job: ActiveJob,
  _step: DeferredStep,
  deps: StepHandlerDeps,
): void {
  const ctx = job.context;
  deps.execLog("RELEASE SESSION id=" + job.id + " device=" + job.device);
  deps.terminal.detach(job.device);
  ctx.phase = "completed";
  ctx.finished = true;
  deps.wakePendingJobsForDevice(job.device);
}

export function handleLogoutSessionStep(
  job: ActiveJob,
  _step: DeferredStep,
  deps: StepHandlerDeps,
): void {
  const ctx = job.context;
  deps.execLog("LOGOUT SESSION id=" + job.id + " device=" + job.device);
  try {
    const ipc = typeof self !== "undefined" ? (self as any).ipc : null;
    if (!ipc) {
      const ipcTry = typeof ipc !== "undefined" ? ipc : null;
      if (ipcTry) {
        const net = ipcTry.network ? ipcTry.network() : null;
        if (net) {
          const dev = net.getDevice ? net.getDevice(job.device) : null;
          if (dev && dev.getCommandLine) {
            const term = dev.getCommandLine();
            if (term && term.enterCommand) {
              term.enterCommand("exit");
            }
          }
        }
      }
    } else {
      const net = ipc.network ? ipc.network() : null;
      if (net) {
        const dev = net.getDevice ? net.getDevice(job.device) : null;
        if (dev && dev.getCommandLine) {
          const term = dev.getCommandLine();
          if (term && term.enterCommand) {
            term.enterCommand("exit");
          }
        }
      }
    }
  } catch (e) {}
  deps.terminal.detach(job.device);
  ctx.phase = "completed";
  ctx.finished = true;
  deps.wakePendingJobsForDevice(job.device);
}

export function handleConfirmStep(
  job: ActiveJob,
  _step: DeferredStep,
  deps: StepHandlerDeps,
): void {
  const ctx = job.context;
  deps.execLog("CONFIRM id=" + job.id + " device=" + job.device);
  deps.terminal.confirmPrompt(job.device);
  ctx.currentStep++;
  ctx.phase = "pending";
  ctx.updatedAt = Date.now();
  deps.advanceJob(job.id);
}
