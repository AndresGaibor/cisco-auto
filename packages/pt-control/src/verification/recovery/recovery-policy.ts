import type { ExecutionOutcome, FailurePolicy } from "../real-run-types.js";

export interface FailureContext {
  stepId: string;
  scenarioId?: string;
  error: string;
  recoverable: boolean;
  isDependencyFailure: boolean;
  isEnvironmentFailure: boolean;
}

export function classifyFailureSeverity(ctx: FailureContext): "recoverable" | "precondition" | "dependency" | "environment" | "catastrophic" {
  if (ctx.isEnvironmentFailure) return "environment";
  if (ctx.isDependencyFailure) return "dependency";
  if (ctx.recoverable) return "recoverable";
  return "precondition";
}

export function shouldContinueAfterStepFailure(
  outcome: ExecutionOutcome,
  policy: FailurePolicy,
  ctx: FailureContext
): boolean {
  if (policy === "abort-run") return false;
  if (policy === "abort-scenario") return false;
  if (policy === "continue") return true;
  if (policy === "recover-and-continue" && ctx.recoverable) return true;
  if (policy === "skip-dependent" && ctx.isDependencyFailure) return true;
  return false;
}

export function shouldSkipDueToDependency(
  dependedOnId: string,
  failedStepId: string,
  policy: FailurePolicy
): boolean {
  if (policy === "skip-dependent") return true;
  return false;
}

export function shouldRetryStep(
  outcome: ExecutionOutcome,
  maxAttempts: number,
  currentAttempt: number
): boolean {
  if (outcome === "failed" && currentAttempt < maxAttempts) return true;
  return false;
}

export function shouldAttemptRecovery(
  ctx: FailureContext,
  maxAttempts: number,
  currentAttempts: number
): boolean {
  if (!ctx.recoverable) return false;
  if (currentAttempts >= maxAttempts) return false;
  return true;
}