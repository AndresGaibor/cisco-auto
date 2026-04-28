// ============================================================================
// Runtime Contracts - TypeScript interfaces for main/runtime separation
// ============================================================================
//
// These contracts define the boundary between main.js (kernel) and runtime.js (logic).
// Main knows nothing about business logic; runtime knows nothing about lifecycle.
// ============================================================================

// ============================================================================
// Tipos PT compartidos
// ============================================================================

import type { PTNetwork, PTDevice, PTCommandLine, PTPort, PTLogicalWorkspace, PTFileManager } from "../pt-api/pt-api-registry.js";

export type {
  PTNetwork,
  PTDevice,
  PTCommandLine,
  PTPort,
  PTIpc,
  PTLogicalWorkspace,
  PTFileManager,
  PTGlobalScope,
  PTTerminalEventName,
} from "../pt-api/pt-api-registry.js";

// ============================================================================
// Step Types - Minimal instruction set for IOS engine in main
// ============================================================================

/** Minimal step types that main's IOS engine can execute */
export type DeferredStepType =
  | "ensure-mode"
  | "command"
  | "confirm"
  | "expect-prompt"
  | "save-config"
  | "delay"
  | "close-session"
  | "release-session"
  | "logout-session";

/** A single step in a deferred job plan */
export interface DeferredStep {
  type: DeferredStepType;
  value?: string;
  options?: {
    stopOnError?: boolean;
    timeoutMs?: number;
    expectedPrompt?: string;
    continueOnPrompt?: boolean;
  };
}

// ============================================================================
// Job Plan - Declarative plan created by runtime, executed by main
// ============================================================================

/** Options for deferred job execution */
export interface DeferredJobOptions {
  stopOnError: boolean;
  commandTimeoutMs: number;
  stallTimeoutMs: number;
}

/** A complete deferred job plan */
export interface DeferredJobPlan {
  id: string;
  kind: "ios-session";
  version: number;
  device: string;
  plan: DeferredStep[];
  options: DeferredJobOptions;
  payload: Record<string, unknown>;
}

// ============================================================================
// Runtime API - Primitives injected by main into runtime
// ============================================================================

/** Session state observed by runtime */
export interface SessionStateSnapshot {
  mode: string;
  prompt: string;
  paging: boolean;
  awaitingConfirm: boolean;
}

/** Device reference for runtime — extends PTDevice to include all device methods */
export interface DeviceRef extends PTDevice {
  hasTerminal: boolean;
  getTerminal(): PTCommandLine | null;
  getNetwork(): PTNetwork;
}

/** The API object that main injects into runtime */
export interface RuntimeApi {
  /** Compatibilidad legacy para handlers estables */
  getLW(): PTLogicalWorkspace;
  getNet(): PTNetwork;
  getFM(): PTFileManager;
  DEV_DIR: string;
  getCommandLine(deviceName: string): PTCommandLine | null;
  listDeviceNames(): string[];

  /** Get device by name */
  getDeviceByName(name: string): DeviceRef | null;

  /** List all available devices */
  listDevices(): string[];

  /** Get current session state for a device */
  querySessionState(deviceName: string): SessionStateSnapshot | null;

  /** Get workspace reference */
  getWorkspace(): unknown;

  /** Current timestamp */
  now(): number;

  /** Safe JSON clone for payloads */
  safeJsonClone<T>(data: T): T;

  /** Normalize port names */
  normalizePortName(name: string): string;

  /** Debug print */
  dprint(msg: string): void;

  /** IPC reference */
  ipc: any;

  /** Privileged access to _ScriptModule (bypasses IPC security) */
  privileged: any;

  /** Create a deferred job and start execution */
  createJob(plan: DeferredJobPlan): string;

  /** Get state of a job by ticket */
  getJobState(ticket: string): KernelJobState | null;

  /** Get list of active jobs */
  getActiveJobs(): Array<{ id: string; device: string; finished: boolean; state: string }>;

  /** Get original payload for a job by ticket */
  jobPayload(ticket: string): Record<string, unknown> | null;
}

// ============================================================================
// Runtime Results - What runtime can return to main
// ============================================================================

/** Error result from runtime */
export interface RuntimeErrorResult {
  ok: false;
  error: string;
  code?: string;
  raw?: string;
  source?: "terminal" | "synthetic" | "unknown";
  session?: SessionStateSnapshot;
}

/** Success result from runtime */
export interface RuntimeSuccessResult {
  ok: true;
  raw?: string;
  status?: number;
  source?: "terminal" | "synthetic";
  parsed?: Record<string, unknown>;
  parseError?: string;
  session?: SessionStateSnapshot;
}

/** Result that indicates deferred work */
export interface RuntimeDeferredResult {
  ok: true;
  deferred: true;
  ticket: string;
  job: DeferredJobPlan;
}

/** Combined runtime result type */
export type RuntimeResult = RuntimeErrorResult | RuntimeSuccessResult | RuntimeDeferredResult;

// ============================================================================
// Kernel Job State - State maintained by main for active jobs
// ============================================================================

/** State of a step within a job */
export interface JobStepResult {
  stepIndex: number;
  stepType: DeferredStepType;
  command: string;
  raw: string;
  status: number | null;
  error?: string;
  completedAt: number;
}

/** Complete job state maintained by main */
export interface KernelJobState {
  id: string;
  device: string;
  plan: DeferredJobPlan;
  currentStep: number;
  state: JobStatePhase;
  outputBuffer: string;
  startedAt: number;
  updatedAt: number;
  stepResults: JobStepResult[];
  lastMode: string;
  lastPrompt: string;
  paged: boolean;
  waitingForCommandEnd: boolean;
  finished: boolean;
  result: RuntimeErrorResult | RuntimeSuccessResult | null;
  error: string | null;
  errorCode: string | null;
  totalSteps?: number;
  outputTail?: string;
  output?: string;
  done?: boolean;
}

/** Job state phases */
export type JobStatePhase =
  | "pending"
  | "waiting-ensure-mode"
  | "waiting-command"
  | "waiting-confirm"
  | "waiting-prompt"
  | "waiting-save"
  | "waiting-delay"
  | "completed"
  | "error";

// ============================================================================
// Device Session State - State maintained by main per device
// ============================================================================

/** Terminal session state per device */
export interface DeviceSessionState {
  device: string;
  term: PTCommandLine | null;
  listenersAttached: boolean;
  busyJobId: string | null;
  lastPrompt: string;
  lastMode: string;
  lastOutputAt: number;
  healthy: boolean;
}

// ============================================================================
// Command Envelope - Structure for command queue files
// ============================================================================

/** Command payload from queue */
export interface CommandEnvelope {
  id: string;
  seq: number;
  type?: string;
  payload: Record<string, unknown>;
  createdAt: number;
  attempt?: number;
  expiresAt?: number;
  checksum?: string;
  protocolVersion?: number;
}

// ============================================================================
// Result Envelope - Structure for result files
// ============================================================================

/** Result written to results/ directory */
export interface ResultEnvelope {
  protocolVersion: number;
  id: string;
  seq: number;
  type?: string;
  startedAt: number;
  completedAt: number;
  status: "completed" | "failed" | "pending";
  ok: boolean;
  value?: RuntimeResult;
  jobId?: string;
  device?: string;
  phase?: string;
  stepIndex?: number;
  outputTail?: string;
  ptStatus?: number;
  errorCode?: string;
  error?: {
    code: string;
    message: string;
    phase: "queue" | "execution" | "validation";
    stack?: string;
  };
}

// ============================================================================
// Runtime Function Signature
// ============================================================================

/** The main runtime function signature */
export type RuntimeFunction = (payload: Record<string, unknown>, api: RuntimeApi) => RuntimeResult;

// ============================================================================
// Special Payload Types for System Operations
// ============================================================================

/** Payload to poll deferred jobs */
export interface PollDeferredPayload {
  type: "__pollDeferred";
  ticket: string;
}

/** Payload to check if there are pending deferred jobs */
export interface HasPendingDeferredPayload {
  type: "__hasPendingDeferred";
}

/** Check if runtime is loaded */
export interface PingRuntimePayload {
  type: "__ping";
}
