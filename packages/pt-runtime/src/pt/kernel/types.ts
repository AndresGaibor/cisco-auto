// packages/pt-runtime/src/pt/kernel/types.ts
// Types for kernel boot implementation

import type {
  RuntimeResult,
  DeferredJobPlan,
  RuntimeApi,
  SessionStateSnapshot,
  CommandEnvelope,
  ResultEnvelope,
  DeviceRef,
} from "../../domain";

export type { RuntimeResult, DeferredJobPlan, CommandEnvelope, ResultEnvelope };

export interface KernelConfig {
  devDir: string;
  commandsDir: string;
  inFlightDir: string;
  resultsDir: string;
  deadLetterDir: string;
  logsDir: string;
  commandsTraceDir: string;
  pollIntervalMs: number;
  deferredPollIntervalMs: number;
  heartbeatIntervalMs: number;
}

export interface Lease {
  ownerId: string;
  expiresAt: number;
  ttlMs: number;
  updatedAt: number;
}

export interface Heartbeat {
  ts: number;
  running: boolean;
  activeCommand: string | null;
  queued: number;
}

export type { RuntimeApi, SessionStateSnapshot, DeviceRef };