// packages/pt-runtime/src/pt/kernel/execution-engine-serialization.ts
// Funciones de serialización para KernelJobState

import type { JobContext, KernelJobState, TerminalResult } from "./execution-engine-types";

export function toKernelJobState(ctx: JobContext): KernelJobState {
  const base: any = {
    id: ctx.plan.id,
    device: ctx.plan.device,
    plan: ctx.plan,
    currentStep: ctx.currentStep,
    state: ctx.phase,
    outputBuffer: ctx.outputBuffer,
    debug: (ctx as any).debug || [],
    startedAt: ctx.startedAt,
    updatedAt: ctx.updatedAt,
    stepResults: ctx.stepResults,
    lastMode: ctx.lastMode,
    lastPrompt: ctx.lastPrompt,
    paged: ctx.paged,
    waitingForCommandEnd: ctx.waitingForCommandEnd,
    finished: ctx.finished,
    done: ctx.finished,
    error: ctx.error,
    errorCode: ctx.errorCode,
  };

  if (ctx.result) {
    const result = ctx.result as any;
    const raw = result.rawOutput ?? result.raw ?? result.output;

    base.result = {
      ok: ctx.result.ok,
      raw,
      rawOutput: raw,
      output: ctx.result.output,
      status: ctx.result.status,
      code: result.code,
      error: result.error,
      session: ctx.result.session,
      warnings: Array.isArray(result.warnings) ? result.warnings : [],
      diagnostics: result.diagnostics,
    };
  }

  if (!ctx.result) {
    base.result = null;
  }

  return base as KernelJobState;
}
