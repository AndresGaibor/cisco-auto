#!/usr/bin/env bun
/**
 * Contrato del estado persistido del contexto de la CLI (Fase 3)
 */

export type HeartbeatState = "ok" | "stale" | "missing" | "unknown";

export type SupervisorMode = "waiting-for-pt" | "active" | "shutting-down";

export interface ContextStatus {
  schemaVersion: "1.0";
  updatedAt: string; // ISO timestamp
  mode: SupervisorMode;
  gracePeriod: {
    active: boolean;
    startedAt: string;
    endsAt: string;
    remainingMs: number;
  };
  heartbeat: {
    state: HeartbeatState;
    ageMs?: number;
    lastSeenTs?: number;
  };
  bridge: {
    ready: boolean;
    leaseValid?: boolean;
    queuedCount?: number;
    inFlightCount?: number;
    warnings?: string[];
  };
  topology: {
    materialized: boolean;
    deviceCount: number;
    linkCount: number;
    health: "healthy" | "warming" | "stale" | "desynced" | "unknown";
  };
  warnings: string[];
  notes?: string[];
}
