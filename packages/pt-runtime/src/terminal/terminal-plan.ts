// ============================================================================
// Terminal Plan - Plan terminal estructurado
// ============================================================================

import type { TerminalMode } from "./session-state";

export type TerminalPlanStepKind = "command" | "ensureMode" | "confirm" | "expectPrompt";

export interface TerminalPlanStep {
  kind: TerminalPlanStepKind;
  command?: string;
  expectMode?: TerminalMode;
  expectPromptPattern?: string;
  allowPager?: boolean;
  allowConfirm?: boolean;
  optional?: boolean;
  metadata?: Record<string, unknown>;
}

export interface TerminalPlanPolicies {
  autoBreakWizard: boolean;
  autoAdvancePager: boolean;
  maxPagerAdvances: number;
  maxConfirmations: number;
  abortOnPromptMismatch: boolean;
  abortOnModeMismatch: boolean;
}

export interface TerminalPlan {
  id: string;
  deviceName: string;
  targetMode: TerminalMode;
  steps: TerminalPlanStep[];
  timeouts: TerminalPlanTimeouts;
  policies: TerminalPlanPolicies;
  metadata?: Record<string, unknown>;
}

export interface TerminalPlanTimeouts {
  commandTimeoutMs: number;
  stallTimeoutMs: number;
}

export interface TerminalPlanStepResult {
  stepIndex: number;
  kind: TerminalPlanStepKind;
  command?: string;
  ok: boolean;
  output: string;
  status: number;
  durationMs: number;
  error?: string;
}

export interface TerminalPlanResult {
  ok: boolean;
  planId: string;
  deviceName: string;
  stepResults: TerminalPlanStepResult[];
  finalPrompt: string;
  finalMode: TerminalMode;
  warnings: string[];
  error?: string;
  confidence: number;
}

export function createTerminalPlan(
  deviceName: string,
  steps: TerminalPlanStep[],
  options?: Partial<{
    id: string;
    targetMode: TerminalMode;
    timeouts: TerminalPlanTimeouts;
    policies: TerminalPlanPolicies;
    metadata: Record<string, unknown>;
  }>
): TerminalPlan {
  return {
    id: options?.id ?? "plan_" + Date.now(),
    deviceName,
    targetMode: options?.targetMode ?? "privileged-exec",
    steps,
    timeouts: options?.timeouts ?? {
      commandTimeoutMs: 8000,
      stallTimeoutMs: 15000,
    },
    policies: options?.policies ?? {
      autoBreakWizard: true,
      autoAdvancePager: true,
      maxPagerAdvances: 50,
      maxConfirmations: 3,
      abortOnPromptMismatch: false,
      abortOnModeMismatch: true,
    },
    metadata: options?.metadata,
  };
}

export function createCommandStep(
  command: string,
  options?: Partial<{
    expectMode: TerminalMode;
    expectPromptPattern: string;
    allowPager: boolean;
    allowConfirm: boolean;
    optional: boolean;
  }>
): TerminalPlanStep {
  return {
    kind: "command",
    command,
    expectMode: options?.expectMode,
    expectPromptPattern: options?.expectPromptPattern,
    allowPager: options?.allowPager ?? true,
    allowConfirm: options?.allowConfirm ?? false,
    optional: options?.optional ?? false,
  };
}