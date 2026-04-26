// Retry policy — define políticas de reintento para comandos fallidos
// NO ejecuta retries — esa responsabilidad es del adapter

import type { TerminalPlanPolicies } from "../../ports/runtime-terminal-port.js";

export interface RetryPolicyConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableStatuses: number[];
  retryableErrors: string[];
}

export interface RetryContext {
  attempt: number;
  lastStatus?: number;
  lastError?: string;
  totalElapsedMs: number;
}

export function createRetryPolicy(config?: Partial<RetryPolicyConfig>) {
  const defaults: RetryPolicyConfig = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    retryableStatuses: [1],
    retryableErrors: [
      "timeout",
      "connection refused",
      "no route to host",
      "translating",
    ],
  };

  const cfg = { ...defaults, ...config };

  function shouldRetry(context: RetryContext): boolean {
    if (context.attempt >= cfg.maxRetries) {
      return false;
    }

    if (context.lastStatus !== undefined) {
      if (!cfg.retryableStatuses.includes(context.lastStatus)) {
        return false;
      }
    }

    if (context.lastError) {
      const errorLower = context.lastError.toLowerCase();
      const isRetryable = cfg.retryableErrors.some((e) =>
        errorLower.includes(e.toLowerCase()),
      );
      if (!isRetryable) {
        return false;
      }
    }

    return true;
  }

  function computeDelay(context: RetryContext): number {
    const delay = Math.min(
      cfg.baseDelayMs * Math.pow(cfg.backoffMultiplier, context.attempt),
      cfg.maxDelayMs,
    );
    return delay;
  }

  function createInitialContext(): RetryContext {
    return {
      attempt: 0,
      totalElapsedMs: 0,
    };
  }

  function updateContext(
    ctx: RetryContext,
    status?: number,
    error?: string,
    elapsedMs?: number,
  ): RetryContext {
    return {
      attempt: ctx.attempt + 1,
      lastStatus: status,
      lastError: error,
      totalElapsedMs: ctx.totalElapsedMs + (elapsedMs ?? 0),
    };
  }

  function getPolicyForStep(step: {
    allowPager?: boolean;
    allowConfirm?: boolean;
    optional?: boolean;
  }): StepRetryPolicy {
    if (step.optional) {
      return {
        enabled: false,
        reason: "optional step",
      };
    }

    return {
      enabled: cfg.maxRetries > 0,
      maxRetries: cfg.maxRetries,
      reason: "default",
    };
  }

  return {
    shouldRetry,
    computeDelay,
    createInitialContext,
    updateContext,
    getPolicyForStep,
    config: cfg,
  };
}

export interface StepRetryPolicy {
  enabled: boolean;
  maxRetries?: number;
  reason: string;
}

export function mergePolicies(
  planPolicies?: TerminalPlanPolicies,
  stepPolicies?: { allowPager?: boolean; allowConfirm?: boolean; optional?: boolean },
): MergedPolicies {
  return {
    autoBreakWizard: planPolicies?.autoBreakWizard ?? true,
    autoAdvancePager: stepPolicies?.allowPager ?? planPolicies?.autoAdvancePager ?? true,
    maxPagerAdvances: planPolicies?.maxPagerAdvances ?? 50,
    maxConfirmations: planPolicies?.maxConfirmations ?? 3,
    abortOnPromptMismatch: planPolicies?.abortOnPromptMismatch ?? false,
    abortOnModeMismatch: planPolicies?.abortOnModeMismatch ?? true,
    allowPager: stepPolicies?.allowPager ?? true,
    allowConfirm: stepPolicies?.allowConfirm ?? false,
    optional: stepPolicies?.optional ?? false,
  };
}

export interface MergedPolicies {
  autoBreakWizard: boolean;
  autoAdvancePager: boolean;
  maxPagerAdvances: number;
  maxConfirmations: number;
  abortOnPromptMismatch: boolean;
  abortOnModeMismatch: boolean;
  allowPager: boolean;
  allowConfirm: boolean;
  optional: boolean;
}

export type RetryPolicy = ReturnType<typeof createRetryPolicy>;