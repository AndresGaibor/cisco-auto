// packages/pt-runtime/src/pt/kernel/job-state-machine.ts
// IOS Job state machine extracted from runtime-assembly

import type { DeferredJobPlan, DeferredStep, KernelJobState, JobStatePhase } from "../../domain";

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

export interface JobContext {
  job: DeferredJobPlan;
  session: {
    mode: string;
    prompt: string;
    paging: boolean;
    awaitingConfirm: boolean;
  };
}

export function createJobState(plan: DeferredJobPlan): KernelJobState {
  return {
    id: plan.id,
    device: plan.device,
    plan,
    currentStep: 0,
    state: "pending",
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
  };
}

export function advanceJob(state: KernelJobState, event: string): KernelJobState {
  const newState = { ...state, updatedAt: Date.now() };
  
  switch (event) {
    case "start":
      newState.state = "waiting-ensure-mode";
      break;
    case "command-started":
      newState.state = "waiting-command";
      newState.waitingForCommandEnd = true;
      break;
    case "command-ended":
      newState.waitingForCommandEnd = false;
      break;
    case "mode-changed":
      break;
    case "output-written":
      break;
  }
  
  return newState;
}

export function getCurrentStep(state: KernelJobState): DeferredStep | null {
  if (state.currentStep >= state.plan.plan.length) {
    return null;
  }
  return state.plan.plan[state.currentStep];
}

export function stepComplete(state: KernelJobState): KernelJobState {
  const newState = { ...state, updatedAt: Date.now() };
  newState.currentStep++;
  
  if (newState.currentStep >= newState.plan.plan.length) {
    newState.state = "completed";
    newState.finished = true;
  }
  
  return newState;
}

export function stepError(state: KernelJobState, error: string, code?: string): KernelJobState {
  return {
    ...state,
    state: "error",
    finished: true,
    error,
    errorCode: code || null,
    updatedAt: Date.now(),
  };
}

export function isJobFinished(state: KernelJobState): boolean {
  return state.finished || state.state === "completed" || state.state === "error";
}

export function getJobOutput(state: KernelJobState): string {
  return state.outputBuffer;
}