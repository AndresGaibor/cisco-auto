// packages/pt-runtime/src/pt/kernel/force-complete-native.ts
// Fuerza completación de jobs desde el terminal nativo de Packet Tracer
// Divide la lógica en sub-funciones para facilitar testing

import type { ActiveJob } from "./execution-engine-types";
import type { TerminalResult } from "../terminal/terminal-engine";

export function forceCompleteFromNativeTerminal(job: ActiveJob, reason: string, deps: ForceCompleteDeps): boolean {
  const ctx = job.context;

  if ((ctx as any).semanticErrorCleanupInProgress === true) {
    deps.jobDebug(job, "native-fallback-skip-semantic-cleanup reason=" + reason);
    return false;
  }

  const step = deps.getCurrentStep(ctx);
  const command = String(step?.value || "");

  if (!step || !command) return false;

  deps.jobDebug(job, "native-fallback-enter reason=" + reason);

  const outputResult = nativeFallbackOutput(job, command, deps);
  if (!outputResult.ready) {
    return false;
  }

  if (step.type === "ensure-mode") {
    deps.jobDebug(
      job,
      "native-ensure-check command=" +
        JSON.stringify(command) +
        " prompt=" +
        JSON.stringify(outputResult.prompt) +
        " mode=" +
        JSON.stringify(outputResult.mode),
    );

    return deps.completeEnsureModeFromNativeTerminal(job, step, outputResult.prompt, outputResult.mode);
  }

  const blockResult = nativeFallbackResult(job, command, outputResult, deps);
  if (!blockResult.complete) {
    deps.execLog(
      "JOB NATIVE INCOMPLETE id=" +
        job.id +
        " device=" +
        job.device +
        " command=" +
        command +
        " prompt=" +
        blockResult.prompt +
        " blockTail=" +
        blockResult.block.slice(-300),
    );
    return false;
  }

  if (blockResult.semanticError) {
    deps.execLog(
      "JOB NATIVE IOS SEMANTIC ERROR id=" +
        job.id +
        " device=" +
        job.device +
        " command=" +
        command +
        " code=" +
        blockResult.semanticError.code,
    );

    return deps.cleanupToPrivilegedExecBeforeSemanticError(job, blockResult.semanticError, blockResult.prompt, blockResult.mode);
  }

  return nativeFallbackCleanup(job, command, reason, blockResult, deps);
}

export interface NativeFallbackOutput {
  ready: boolean;
  fullOutput: string;
  output: string;
  fallbackOutput: string;
  prompt: string;
  mode: string;
}

export function nativeFallbackOutput(job: ActiveJob, command: string, deps: ForceCompleteDeps): NativeFallbackOutput {
  const ctx = job.context;
  const fullOutput = deps.readNativeTerminalOutput(job.device);
  const output = deps.getNativeDeltaForCurrentStep(job, fullOutput, command);
  const fallbackOutput = output || (deps.isLongOutputReadOnlyIosCommand(command) ? fullOutput : "");

  deps.jobDebug(
    job,
    "native-output-len=" +
      String(fullOutput.length) +
      " deltaLen=" +
      String(fallbackOutput.length) +
      " baselineStep=" +
      String(ctx.nativeBaselineStep) +
      " currentStep=" +
      String(ctx.currentStep),
  );

  if (!fallbackOutput.trim()) {
    deps.jobDebug(job, "native-no-output");
    return { ready: false, fullOutput, output, fallbackOutput, prompt: "", mode: "" };
  }

  if (deps.outputHasPager(fallbackOutput)) {
    const advanced = deps.advanceNativePager(job.device);
    deps.execLog(
      "JOB NATIVE PAGER id=" +
        job.id +
        " device=" +
        job.device +
        " advanced=" +
        advanced,
    );

    ctx.updatedAt = Date.now();
    return { ready: false, fullOutput, output, fallbackOutput, prompt: "", mode: "" };
  }

  if (deps.nativeOutputTailHasActivePager(fallbackOutput)) {
    const advanced = deps.advanceNativePager(job.device);

    deps.jobDebug(
      job,
      "native-active-pager advanced=" +
        String(advanced) +
        " tail=" +
        JSON.stringify(deps.normalizeEol(output).slice(-300)),
    );

    ctx.paged = true;
    ctx.updatedAt = Date.now();

    return { ready: false, fullOutput, output, fallbackOutput, prompt: "", mode: "" };
  }

  const prompt = deps.getNativePrompt(job.device, output);
  const mode = deps.getNativeMode(job.device, prompt);

  const nativeInput = deps.getNativeInput(job.device);
  deps.jobDebug(job, "native-input=" + JSON.stringify(nativeInput));

  if (deps.nativeInputIsOnlyPagerResidue(nativeInput)) {
    deps.clearNativeInputIfPagerResidue(job.device);
  }

  return { ready: true, fullOutput, output, fallbackOutput, prompt, mode };
}

export interface NativeFallbackBlockResult {
  complete: boolean;
  block: string;
  longOutputBlock: string;
  strictBlock: { block: string; hasCommandEcho: boolean };
  prompt: string;
  mode: string;
  semanticError: { code: string; message: string } | null;
  echoLessLongOutputComplete: boolean;
  hostOutputComplete: boolean;
}

export function nativeFallbackResult(
  job: ActiveJob,
  command: string,
  outputResult: NativeFallbackOutput,
  deps: ForceCompleteDeps,
): NativeFallbackBlockResult {
  const ctx = job.context;
  const { fallbackOutput, prompt, mode } = outputResult;

  const strictBlock = deps.extractCurrentCommandBlockStrict(fallbackOutput, command);
  const block = strictBlock.hasCommandEcho
    ? strictBlock.block
    : deps.extractLatestCommandBlock(fallbackOutput, command);
  const baselinePrompt = deps.inferPromptFromTerminalText(ctx.nativeBaselineOutput || "");
  const baselineMode = deps.inferModeFromPrompt(baselinePrompt);

  const semanticError = strictBlock.hasCommandEcho
    ? deps.detectIosSemanticErrorFromOutput(strictBlock.block)
    : deps.nativeSnapshotIsStillInConfigMode({ prompt: baselinePrompt, mode: baselineMode })
      ? deps.detectIosSemanticErrorFromOutput(fallbackOutput)
      : null;

  const longOutputBlock = block || outputResult.output;

  const echoLessLongOutputComplete = deps.nativeLongOutputCanCompleteWithoutEcho({
    block: longOutputBlock,
    command,
    prompt,
  });
  const hostOutputComplete =
    deps.resolveJobSessionKind(job) === "host" && deps.nativeHostFallbackBlockLooksComplete(longOutputBlock, command, prompt);

  const complete = deps.nativeFallbackBlockLooksComplete(block, command, prompt) || echoLessLongOutputComplete || hostOutputComplete;

  if (
    !complete &&
    !strictBlock.hasCommandEcho &&
    !echoLessLongOutputComplete &&
    !hostOutputComplete &&
    !deps.isEndCommand(command) &&
    !deps.isPromptOnlyTransitionCommand(command)
  ) {
    deps.execLog(
      "JOB NATIVE REFUSE STALE BLOCK id=" +
        job.id +
        " device=" +
        job.device +
        " command=" +
        command +
        " step=" +
        ctx.currentStep +
        " blockTail=" +
        longOutputBlock.slice(-240),
    );

    return { complete: false, block, longOutputBlock, strictBlock, prompt, mode, semanticError, echoLessLongOutputComplete, hostOutputComplete };
  }

  if (echoLessLongOutputComplete) {
    deps.jobDebug(
      job,
      "native-long-output-complete-without-echo command=" +
        JSON.stringify(command) +
        " prompt=" +
        JSON.stringify(prompt) +
        " blockLen=" +
        String(longOutputBlock.length),
    );
  }

  if (hostOutputComplete) {
    deps.jobDebug(
      job,
      "native-host-output-complete-without-echo command=" +
        JSON.stringify(command) +
        " prompt=" +
        JSON.stringify(prompt) +
        " blockLen=" +
        String(longOutputBlock.length),
    );
  }

  deps.jobDebug(
    job,
    "native-check command=" +
      JSON.stringify(command) +
      " prompt=" +
      JSON.stringify(prompt) +
      " mode=" +
      JSON.stringify(mode) +
      " blockLen=" +
      String(block.length) +
      " complete=" +
      String(complete) +
      " promptOk=" +
      String(deps.isIosPrompt(prompt) || deps.isIosPrompt(deps.lastNonEmptyLine(block))) +
      " pager=" +
      String(deps.outputHasPager(block)) +
      " blockHead=" +
      JSON.stringify(block.slice(0, 300)) +
      " blockTail=" +
      JSON.stringify(block.slice(-300)),
  );

  return { complete, block, longOutputBlock, strictBlock, prompt, mode, semanticError, echoLessLongOutputComplete, hostOutputComplete };
}

export function nativeFallbackCleanup(
  job: ActiveJob,
  command: string,
  reason: string,
  blockResult: NativeFallbackBlockResult,
  deps: ForceCompleteDeps,
): boolean {
  const ctx = job.context;
  const { block, longOutputBlock, strictBlock, prompt, mode, echoLessLongOutputComplete, hostOutputComplete } = blockResult;

  if (deps.jobRequiresPrivilegedExecFinalMode(job) && deps.nativeSnapshotIsStillInConfigMode({ prompt, mode })) {
    if (deps.hasRemainingEndStep(job)) {
      deps.execLog(
        "JOB NATIVE FORCE STEP CONFIG MODE WITH END PENDING id=" +
          job.id +
          " device=" +
          job.device +
          " step=" +
          ctx.currentStep +
          "/" +
          ctx.plan.plan.length +
          " nextCommand=" +
          JSON.stringify(deps.getNextCommandStep(job)),
      );
    }

    deps.execLog(
      "JOB NATIVE FORCE REFUSE FINAL CONFIG MODE id=" +
        job.id +
        " device=" +
        job.device +
        " step=" +
        ctx.currentStep +
        "/" +
        ctx.plan.plan.length +
        " prompt=" +
        String(prompt || "") +
        " mode=" +
        String(mode || ""),
    );

    return false;
  }

  deps.execLog(
    "JOB FORCE COMPLETE FROM NATIVE TERMINAL id=" +
      job.id +
      " device=" +
      job.device +
      " reason=" +
      reason +
      " prompt=" +
      prompt +
      " mode=" +
      mode +
      " blockLen=" +
      block.length,
  );

  job.pendingCommand = null;
  ctx.waitingForCommandEnd = false;
  ctx.outputBuffer = deps.appendStepOutput(ctx.outputBuffer, block);
  ctx.lastPrompt = prompt;
  ctx.lastMode = mode;
  ctx.paged = false;

  ctx.stepResults.push({
    stepIndex: ctx.currentStep,
    stepType: deps.getCurrentStep(ctx)?.type || "command",
    command,
    raw: block,
    status: 0,
    completedAt: Date.now(),
    warnings: deps.buildNativeLongOutputWarnings({
      command,
      block: longOutputBlock || block,
      hasCommandEcho: strictBlock.hasCommandEcho,
    }),
  } as any);

  const semanticCleanupActive = (ctx as any).semanticErrorCleanupInProgress === true;

  ctx.currentStep++;
  if (!semanticCleanupActive) {
    ctx.error = null;
    ctx.errorCode = null;
  }
  ctx.updatedAt = Date.now();

  const nativeWarnings = deps.buildNativeLongOutputWarnings({
    command,
    block: longOutputBlock || block,
    hasCommandEcho: strictBlock.hasCommandEcho,
  });

  const terminalResult: TerminalResult = {
    ok: true,
    output: block,
    rawOutput: block,
    raw: block,
    status: 0,
    session: {
      mode,
      prompt,
      paging: false,
      awaitingConfirm: false,
    },
    mode,
    warnings: nativeWarnings,
    diagnostics: {
      statusCode: 0,
      completionReason: echoLessLongOutputComplete
        ? "native-long-output-without-echo"
        : hostOutputComplete
          ? "native-host-output-without-echo"
          : "native-fallback-complete",
      partialOutput: nativeWarnings.length > 0,
    },
  } as unknown as TerminalResult;

  if (semanticCleanupActive) {
    ctx.phase = "waiting-delay";
    return true;
  }

  if (!deps.completeJobIfLastStep(job, terminalResult)) {
    ctx.phase = "pending";
    deps.advanceJob(job.id);
  }

  return true;
}

export interface ForceCompleteDeps {
  jobDebug: (job: ActiveJob, message: string) => void;
  execLog: (message: string) => void;
  advanceJob: (jobId: string) => void;
  getCurrentStep: (ctx: any) => any;
  readNativeTerminalOutput: (device: string) => string;
  getNativeDeltaForCurrentStep: (job: ActiveJob, currentOutput: string, command: string) => string;
  isLongOutputReadOnlyIosCommand: (command: unknown) => boolean;
  outputHasPager: (output: string) => boolean;
  advanceNativePager: (device: string) => boolean;
  normalizeEol: (value: unknown) => string;
  nativeOutputTailHasActivePager: (output: string) => boolean;
  getNativePrompt: (device: string, output: string) => string;
  getNativeMode: (device: string, prompt: string) => string;
  getNativeInput: (device: string) => string;
  nativeInputIsOnlyPagerResidue: (input: string) => boolean;
  clearNativeInputIfPagerResidue: (device: string) => void;
  extractCurrentCommandBlockStrict: (output: string, command: string) => { block: string; hasCommandEcho: boolean };
  extractLatestCommandBlock: (output: string, command: string) => string;
  inferPromptFromTerminalText: (text: string) => string;
  inferModeFromPrompt: (prompt: string) => string;
  nativeSnapshotIsStillInConfigMode: (args: { prompt: string; mode: string }) => boolean;
  detectIosSemanticErrorFromOutput: (output: string) => { code: string; message: string } | null;
  nativeLongOutputCanCompleteWithoutEcho: (args: { block: string; command: string; prompt: string }) => boolean;
  resolveJobSessionKind: (job: ActiveJob) => string;
  nativeHostFallbackBlockLooksComplete: (block: string, command: string, prompt: string) => boolean;
  nativeFallbackBlockLooksComplete: (block: string, command: string, prompt: string) => boolean;
  isEndCommand: (command: string) => boolean;
  isPromptOnlyTransitionCommand: (command: string) => boolean;
  isIosPrompt: (value: unknown) => boolean;
  lastNonEmptyLine: (value: unknown) => string;
  completeEnsureModeFromNativeTerminal: (job: ActiveJob, step: any, prompt: string, mode: string) => boolean;
  cleanupToPrivilegedExecBeforeSemanticError: (job: ActiveJob, error: { code: string; message: string }, prompt: string, mode: string) => boolean;
  jobRequiresPrivilegedExecFinalMode: (job: ActiveJob) => boolean;
  hasRemainingEndStep: (job: ActiveJob) => boolean;
  getNextCommandStep: (job: ActiveJob) => string | null;
  appendStepOutput: (buffer: string, output: string) => string;
  buildNativeLongOutputWarnings: (args: { command: string; block: string; hasCommandEcho: boolean }) => string[];
  completeJobIfLastStep: (job: ActiveJob, result: TerminalResult | null) => boolean;
}
