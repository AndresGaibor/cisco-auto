// Stubs de tipos reubicados desde pt-runtime/src/runtime/contracts.ts
// pt-control no puede importar de pt-runtime, así que definimos los tipos aquí

export interface DeferredStep {
  type: string;
  value?: string;
  options?: {
    stopOnError?: boolean;
    timeoutMs?: number;
    expectedPrompt?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface DeferredJobOptions {
  stopOnError: boolean;
  commandTimeoutMs: number;
  stallTimeoutMs: number;
}

export interface DeferredJobPlan {
  id: string;
  kind: "ios-session";
  version: number;
  device: string;
  plan: DeferredStep[];
  options: DeferredJobOptions;
  payload: Record<string, unknown>;
}

export interface SessionStateSnapshot {
  mode: string;
  prompt: string;
  paging: boolean;
  awaitingConfirm: boolean;
}

export interface RuntimeErrorResult {
  ok: false;
  error: string;
  code?: string | undefined;
  raw?: string | undefined;
  source?: "unknown" | "terminal" | "synthetic" | undefined;
  session?: SessionStateSnapshot | undefined;
}

export interface RuntimeSuccessResult {
  ok: true;
  raw?: string | undefined;
  output?: string | undefined;
  status?: number | undefined;
  done?: boolean | undefined;
  source?: "terminal" | "synthetic" | undefined;
  parsed?: Record<string, unknown> | undefined;
  parseError?: string | undefined;
  session?: SessionStateSnapshot | undefined;
  stepResults?: JobStepResult[] | undefined;
  totalSteps?: number | undefined;
  currentStep?: number | undefined;
  inlineCompleted?: boolean;
  ticket?: string;
  jobId?: string;
  error?: string;
  errorCode?: string | undefined;
}

export interface RuntimeDeferredResult {
  ok: true;
  deferred: true;
  ticket: string;
  job: DeferredJobPlan;
}

export type RuntimeResult = RuntimeErrorResult | RuntimeSuccessResult | RuntimeDeferredResult;

export interface JobStepResult {
  stepIndex: number;
  stepType: string;
  command: string;
  raw: string;
  status: number | null;
  error?: string;
  completedAt: number;
}

export interface RuntimeApi {
  now?(): number;
  createJob?(plan: DeferredJobPlan): string;
  getJobState?(ticket: string): any;
  advanceJob?(ticket: string): void;
  getDeviceByName?(name: string): any;
  listDevices?(): string[];
  querySessionState?(deviceName: string): SessionStateSnapshot | null;
}