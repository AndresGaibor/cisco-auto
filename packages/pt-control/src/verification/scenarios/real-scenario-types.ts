import type { ExecutionOutcome } from "../real-run-types.js";

export interface ScenarioContext {
  controller: unknown;
  runId: string;
  runStore: unknown;
}

export interface ScenarioStepResult {
  outcome: ExecutionOutcome;
  evidence: Record<string, unknown>;
  warnings: string[];
  error?: string;
}

export type SetupFn = (ctx: ScenarioContext) => Promise<void>;
export type ExecuteFn = (ctx: ScenarioContext) => Promise<ScenarioStepResult>;
export type VerifyFn = (ctx: ScenarioContext) => Promise<ScenarioStepResult>;
export type CleanupFn = (ctx: ScenarioContext) => Promise<void>;

export interface RealScenarioDefinition {
  id: string;
  title: string;
  tags: string[];
  profile: string[];
  dependsOn: string[];

  timeoutMs?: number;
  setupTimeoutMs?: number;
  executeTimeoutMs?: number;
  verifyTimeoutMs?: number;
  cleanupTimeoutMs?: number;

  /**
   * clear-topology: cleanup destructivo, útil para escenarios que crean laboratorios.
   * preserve-topology: no limpia topología; útil para tests contra labs existentes.
   */
  cleanupMode?: "clear-topology" | "preserve-topology";

  setup: SetupFn;
  execute: ExecuteFn;
  verify: VerifyFn;
  cleanup: CleanupFn;
}