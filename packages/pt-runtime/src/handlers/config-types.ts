/**
 * Config Handler Types - Type definitions for configuration operations
 * Includes payload types, result types, and related interfaces
 */

import type { HandlerResult } from "../utils/helpers";

// ============================================================================
// Payload Types
// ============================================================================

export interface ConfigHostPayload {
  type: "configHost";
  device: string;
  ip?: string;
  mask?: string;
  gateway?: string;
  dns?: string;
  dhcp?: boolean;
}

export interface ConfigIosPayload {
  type: "configIos";
  device: string;
  commands: string[];
  save?: boolean;
  stopOnError?: boolean;
  ensurePrivileged?: boolean;
  dismissInitialDialog?: boolean;
  commandTimeoutMs?: number;
  stallTimeoutMs?: number;
}

export interface ExecIosPayload {
  type: "execIos";
  device: string;
  command: string;
  parse?: boolean;
  ensurePrivileged?: boolean;
  dismissInitialDialog?: boolean;
  commandTimeoutMs?: number;
  stallTimeoutMs?: number;
}

// ============================================================================
// Result Types
// ============================================================================

export interface ExecIosSuccessResult extends HandlerResult {
  ok: boolean;
  raw: string;
  status?: number;
  parsed?: Record<string, unknown>;
  parseError?: string;
  classification?: string;
  session?: { mode: string; paging?: boolean; awaitingConfirm?: boolean };
  source?: "terminal" | "synthetic" | "hybrid";
}

export interface ExecIosErrorResult extends HandlerResult {
  ok: false;
  raw: "";
  error: string;
}

export type ExecIosResult = ExecIosSuccessResult | ExecIosErrorResult;
