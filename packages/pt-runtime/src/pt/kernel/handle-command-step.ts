// packages/pt-runtime/src/pt/kernel/handle-command-step.ts
// Handler para el caso "command" / "save-config" del execution engine
// Divide la lógica en sub-funciones para facilitar testing

import type { ActiveJob, DeferredStep, DeferredStepType, JobContext } from "./execution-engine-types";
import type { TerminalResult } from "../terminal/terminal-engine";

export function prepareCommandStep(
  job: ActiveJob,
  step: DeferredStep,
  stepType: DeferredStepType,
  timeout: number | undefined,
  deps: CommandStepDeps,
): { command: string; stepOptions: any } | null {
  const ctx = job.context;
  let command = step.value || "";
  if (stepType === "save-config") {
    command = "write memory";
  }

  if (!command) {
    deps.execLog("SKIP empty command step=" + ctx.currentStep + " id=" + job.id);
    ctx.currentStep++;
    deps.advanceJob(job.id);
    return null;
  }

  ctx.phase = stepType === "save-config" ? "waiting-save" : "waiting-command";
  ctx.waitingForCommandEnd = true;
  deps.execLog(
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

  const stepOptions = (step.options || {}) as any;

  return { command, stepOptions };
}

export function handleCommandStep(
  job: ActiveJob,
  step: DeferredStep,
  stepType: DeferredStepType,
  timeout: number | undefined,
  stopOnError: boolean,
  deps: CommandStepDeps,
): void {
  const prepared = prepareCommandStep(job, step, stepType, timeout, deps);

  if (!prepared) {
    return;
  }

  executeCommandAndHandleResult(
    job,
    step,
    prepared.command,
    prepared.stepOptions,
    stepType,
    timeout,
    stopOnError,
    deps,
  );
}

export function executeCommandAndHandleResult(
  job: ActiveJob,
  step: DeferredStep,
  command: string,
  stepOptions: any,
  stepType: DeferredStepType,
  timeout: number | undefined,
  stopOnError: boolean,
  deps: CommandStepDeps,
): void {
  const ctx = job.context;

  deps.captureNativeBaselineForCurrentStep(job);
  job.pendingCommand = deps.terminal.executeCommand(job.device, command, {
    commandTimeoutMs: timeout,
    stallTimeoutMs: ctx.plan.options.stallTimeoutMs,
    expectedMode: (step as any).expectMode,
    expectedPromptPattern: stepOptions.expectedPrompt,
    allowPager: true,
    autoAdvancePager: true,
    maxPagerAdvances: deps.readPlanMaxPagerAdvances(ctx),
    autoConfirm: false,
    autoDismissWizard: true,
    sessionKind: deps.resolveJobSessionKind(job),
  });

  const runningCommand = job.pendingCommand;

  runningCommand
    .then(function (result: TerminalResult) {
      finalizeCommandStepResult(job, step, command, stepType, stopOnError, result, runningCommand, deps);
    })
    .catch(function (err: unknown) {
      handleCommandStepError(job, command, runningCommand, err, deps);
    });
}

export function finalizeCommandStepResult(
  job: ActiveJob,
  step: DeferredStep,
  command: string,
  stepType: DeferredStepType,
  stopOnError: boolean,
  result: TerminalResult,
  runningCommand: Promise<TerminalResult>,
  deps: CommandStepDeps,
): void {
  const ctx = job.context;

  if (ctx.finished) return;
  if (job.pendingCommand !== runningCommand) {
    deps.execLog(
      "STALE COMMAND RESULT ignored id=" +
        job.id +
        " device=" +
        job.device +
        " command=" +
        command +
        " step=" +
        ctx.currentStep,
    );
    return;
  }
  deps.execLog(
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
  ctx.lastPrompt = result.session.prompt;
  ctx.lastMode = result.session.mode;
  ctx.paged = result.session.paging;

  const rawOutput = String(
    (result as any).rawOutput ?? (result as any).raw ?? result.output ?? "",
  );
  const strictResultBlock = deps.extractCurrentCommandBlockStrict(rawOutput || result.output, command);
  const commandReportedFailure =
    Number(result.status ?? 0) !== 0 ||
    (result as any).ok === false ||
    Boolean((result as any).code);
  const nativeOutput = deps.readNativeTerminalOutput(job.device);
  const nativeDelta = deps.getNativeDeltaForCurrentStep(job, nativeOutput, command);
  const nativeBaselinePrompt = deps.inferPromptFromTerminalText(ctx.nativeBaselineOutput || "");
  const nativeBaselineMode = deps.inferModeFromPrompt(nativeBaselinePrompt);
  const nativeLooksConfig = deps.nativeSnapshotIsStillInConfigMode({
    prompt: nativeBaselinePrompt,
    mode: nativeBaselineMode,
  });

  const semanticError =
    (strictResultBlock.hasCommandEcho
      ? deps.detectIosSemanticErrorFromOutput(strictResultBlock.block)
      : null) ??
    (commandReportedFailure
      ? deps.detectIosSemanticErrorFromOutput(result.output)
      : nativeLooksConfig
        ? deps.detectIosSemanticErrorFromOutput(nativeDelta || nativeOutput)
        : null);

  ctx.stepResults.push({
    stepIndex: ctx.currentStep,
    stepType: stepType,
    command: command,
    raw: semanticError ? semanticError.message : (strictResultBlock.block || result.output),
    status: result.status,
    completedAt: Date.now(),
  });

  if (semanticError) {
    deps.execLog(
      "JOB STEP IOS SEMANTIC ERROR id=" +
        job.id +
        " device=" +
        job.device +
        " command=" +
        command +
        " code=" +
        semanticError.code,
    );

    deps.cleanupToPrivilegedExecBeforeSemanticError(job, semanticError, ctx.lastPrompt, ctx.lastMode);
    return;
  }

  ctx.outputBuffer = deps.appendStepOutput(ctx.outputBuffer, result.output);

  if (result.status !== 0 && stopOnError) {
    deps.execLog("CMD FAILED (stopOnError) id=" + job.id + " status=" + result.status);
    ctx.phase = "error";
    ctx.error = "Command failed with status " + result.status + ": " + command;
    ctx.errorCode = "CMD_FAILED";
    ctx.finished = true;
    deps.cleanupConfigSession(job.device, result.session.mode, result.session.prompt);
    return;
  }

  if (ctx.paged && stepType === "save-config") {
    deps.terminal.continuePager(job.device);
  }

  ctx.currentStep++;
  ctx.phase = "pending";
  ctx.updatedAt = Date.now();

  if (!deps.completeJobIfLastStep(job, result)) {
    deps.deferAdvanceJob(job.id, command);
  }
}

export function handleCommandStepError(
  job: ActiveJob,
  command: string,
  runningCommand: Promise<TerminalResult>,
  err: unknown,
  deps: CommandStepDeps,
): void {
  const ctx = job.context;

  if (ctx.finished) return;
  if (job.pendingCommand !== runningCommand) {
    deps.execLog(
      "STALE COMMAND ERROR ignored id=" +
        job.id +
        " device=" +
        job.device +
        " command=" +
        command +
        " step=" +
        ctx.currentStep +
        " error=" +
        String(err),
    );
    return;
  }
  deps.execLog("CMD ERROR id=" + job.id + " error=" + String(err));
  job.pendingCommand = null;
  ctx.waitingForCommandEnd = false;
  ctx.phase = "error";
  ctx.error = String(err);
  ctx.errorCode = "EXEC_ERROR";
  ctx.finished = true;
  deps.cleanupConfigSession(job.device, ctx.lastMode, ctx.lastPrompt);
  deps.wakePendingJobsForDevice(job.device);
}

export interface CommandStepDeps {
  execLog: (message: string) => void;
  advanceJob: (jobId: string) => void;
  captureNativeBaselineForCurrentStep: (job: ActiveJob) => void;
  readPlanMaxPagerAdvances: (ctx: JobContext) => number;
  resolveJobSessionKind: (job: ActiveJob) => string;
  extractCurrentCommandBlockStrict: (output: string, command: string) => { block: string; hasCommandEcho: boolean };
  readNativeTerminalOutput: (device: string) => string;
  getNativeDeltaForCurrentStep: (job: ActiveJob, currentOutput: string, command: string) => string;
  inferPromptFromTerminalText: (text: string) => string;
  inferModeFromPrompt: (prompt: string) => string;
  nativeSnapshotIsStillInConfigMode: (args: { prompt: string; mode: string }) => boolean;
  detectIosSemanticErrorFromOutput: (output: string) => { code: string; message: string } | null;
  cleanupToPrivilegedExecBeforeSemanticError: (job: ActiveJob, error: { code: string; message: string }, prompt: string, mode: string) => void;
  appendStepOutput: (buffer: string, output: string) => string;
  completeJobIfLastStep: (job: ActiveJob, result: TerminalResult | null) => boolean;
  deferAdvanceJob: (jobId: string, command: string) => void;
  cleanupConfigSession: (device: string, mode: string | null, prompt: string | null) => void;
  wakePendingJobsForDevice: (device: string) => void;
  terminal: {
    executeCommand(device: string, command: string, options?: any): Promise<TerminalResult>;
    continuePager(device: string): void;
  };
}
