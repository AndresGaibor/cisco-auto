// packages/pt-runtime/src/pt/kernel/execution-engine-types.ts
// Tipos e interfaces para el Execution Engine de Deferred Jobs IOS

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
  debug: string[];
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
  nativeBaselineOutput: string;
  nativeBaselineStep: number;
}

export interface ActiveJob {
  id: string;
  device: string;
  context: JobContext;
  pendingCommand: Promise<TerminalResult> | null;
  pendingCommandReject: ((reason: unknown) => void) | null;
}

export interface ExecutionEngine {
  startJob(plan: DeferredJobPlan): ActiveJob;
  advanceJob(jobId: string): void;
  reapStaleJobs(): void;
  getJob(jobId: string): ActiveJob | null;
  getJobState(jobId: string): JobContext | null;
  getActiveJobs(): ActiveJob[];
  isJobFinished(jobId: string): boolean;
}

export type { DeferredJobPlan, DeferredStep, DeferredStepType, KernelJobState };
export type { TerminalEngine, TerminalResult };
