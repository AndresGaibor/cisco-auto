// ============================================================================
// Validation Engine - Core
// ============================================================================

import type { Diagnostic } from "./diagnostic";
import type { ValidationContext } from "./validation-context";
import type { Rule } from "./rule";
import { ruleApplies } from "./rule";
import type { ValidationPolicy } from "./policies";

export interface ValidationResult {
  diagnostics: Diagnostic[];
  blocked: boolean;
  metadata?: {
    durationMs: number;
    rulesExecuted: number;
    cacheHit?: boolean;
  };
}

export class ValidationEngine {
  private cache: Map<string, { diagnostics: Diagnostic[]; timestamp: number }> | null = null;
  private readonly CACHE_TTL_MS = 5000;
  private readonly MAX_CACHE_SIZE = 100;

  constructor(
    private readonly rules: Rule[],
    private readonly policy: ValidationPolicy,
  ) {}

  run<TInput>(ctx: ValidationContext<TInput>): ValidationResult {
    const startTime = performance.now();
    const cacheKey = this.getCacheKey(ctx);

    // Check cache first
    if (this.cache) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
        return {
          diagnostics: cached.diagnostics,
          blocked: this.policy.shouldBlock(cached.diagnostics),
          metadata: {
            durationMs: 0,
            rulesExecuted: 0,
            cacheHit: true,
          },
        };
      }
    }

    const diagnostics: Diagnostic[] = [];
    let rulesExecuted = 0;

    for (const rule of this.rules) {
      if (!ruleApplies(rule, ctx.mutation.kind)) continue;
      rulesExecuted++;

      try {
        const ruleDiagnostics = rule.validate(ctx) || [];
        if (Array.isArray(ruleDiagnostics)) {
          diagnostics.push(...ruleDiagnostics);
        }
      } catch (error) {
        // Capture rule execution errors as diagnostics
        diagnostics.push({
          severity: "warning",
          code: "RULE_ERROR",
          message: `Rule "${rule.id}" threw an error: ${error instanceof Error ? error.message : String(error)}`,
          blocking: false,
          metadata: { ruleId: rule.id },
        });
      }
    }

    const durationMs = performance.now() - startTime;

    // Cache the result
    if (!this.cache) {
      this.cache = new Map();
    }

    // Evict old entries if cache is full
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(cacheKey, { diagnostics, timestamp: Date.now() });

    return {
      diagnostics,
      blocked: this.policy.shouldBlock(diagnostics),
      metadata: {
        durationMs,
        rulesExecuted,
        cacheHit: false,
      },
    };
  }

  preflight<TInput>(ctx: Omit<ValidationContext<TInput>, "phase">): ValidationResult {
    return this.run({ ...ctx, phase: "preflight" });
  }

  postflight<TInput>(ctx: Omit<ValidationContext<TInput>, "phase">): ValidationResult {
    return this.run({ ...ctx, phase: "postflight" });
  }

  addRule(rule: Rule): void {
    this.rules.push(rule);
    this.invalidateCache();
  }

  removeRule(ruleId: string): void {
    const index = this.rules.findIndex((r) => r.id === ruleId);
    if (index !== -1) {
      this.rules.splice(index, 1);
      this.invalidateCache();
    }
  }

  /**
   * Invalidate validation cache (call when topology changes or rules modified)
   */
  invalidateCache(): void {
    this.cache = null;
  }

  private getCacheKey<TInput>(ctx: ValidationContext<TInput>): string {
    return `${ctx.phase}:${ctx.mutation.kind}:${ctx.mutation.targetDevice}:${ctx.mutation.targetInterface || ""}:${JSON.stringify(ctx.mutation.input || {})}`;
  }
}
