// packages/pt-runtime/src/pt/kernel/job-state.ts
// Job state and transitions for deferred execution

import type { DeferredJobPlan, DeferredStep, DeferredStepType, KernelJobState } from "../../domain";
import type { TerminalResult } from "../terminal/terminal-engine";

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

export function createJobContext(plan: DeferredJobPlan): JobContext {
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

export function getCurrentStep(ctx: JobContext): DeferredStep | null {
  if (ctx.currentStep >= ctx.plan.plan.length) {
    return null;
  }
  return ctx.plan.plan[ctx.currentStep];
}

export function isJobFinished(ctx: JobContext): boolean {
  return ctx.finished || ctx.phase === "completed" || ctx.phase === "error";
}

export function isStepStopOnError(ctx: JobContext): boolean {
  const step = getCurrentStep(ctx);
  return step?.options?.stopOnError ?? ctx.plan.options.stopOnError;
}

export function getStepTimeout(ctx: JobContext): number {
  const step = getCurrentStep(ctx);
  return step?.options?.timeoutMs ?? ctx.plan.options.commandTimeoutMs;
}

export function toKernelJobState(ctx: JobContext): KernelJobState {
  if (ctx.result) {
    if (ctx.result.ok) {
      return {
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
        result: {
          ok: true as const,
          raw: ctx.result.output,
          status: ctx.result.status,
          session: ctx.result.session,
        },
        error: ctx.error,
        errorCode: ctx.errorCode,
      };
    }
  }
  return {
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
    result: null,
    error: ctx.error,
    errorCode: ctx.errorCode,
  };
}