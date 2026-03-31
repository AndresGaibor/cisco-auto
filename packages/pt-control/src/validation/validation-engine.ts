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

interface CacheEntry {
  diagnostics: Diagnostic[];
  timestamp: number;
  ttlMs: number;
  targetDevice?: string;
}

export class ValidationEngine {
  private cache: Map<string, CacheEntry> | null = null;
  private readonly DEFAULT_CACHE_TTL_MS = 5000;
  private readonly MAX_CACHE_SIZE = 100;

  constructor(
    private readonly rules: Rule[],
    private readonly policy: ValidationPolicy,
  ) {}

  run<TInput>(ctx: ValidationContext<TInput>): ValidationResult {
    const startTime = performance.now();
    const cacheKey = this.getCacheKey(ctx);
    const ttlMs = this.getCacheTtl(ctx.mutation.kind);
    const now = Date.now();

    if (this.cache) {
      const cached = this.cache.get(cacheKey);
      if (cached && now - cached.timestamp < cached.ttlMs) {
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

    if (!this.cache) {
      this.cache = new Map();
    }

    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(cacheKey, {
      diagnostics,
      timestamp: now,
      ttlMs,
      targetDevice: ctx.mutation.targetDevice,
    });

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
   * Invalidate the entire cache (call when topology changes globally)
   */
  invalidateCache(): void {
    this.cache = null;
  }

  /**
   * Invalidate cache entries for a specific device
   */
  invalidateCacheFor(deviceName: string): void {
    if (!deviceName || !this.cache) return;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.targetDevice === deviceName) {
        this.cache.delete(key);
      }
    }
    if (this.cache.size === 0) {
      this.cache = null;
    }
  }

  private getCacheKey<TInput>(ctx: ValidationContext<TInput>): string {
    return `${ctx.phase}:${ctx.mutation.kind}:${ctx.mutation.targetDevice}:${ctx.mutation.targetInterface || ""}:${JSON.stringify(ctx.mutation.input || {})}`;
  }

  private getCacheTtl(kind: ValidationContext["mutation"]["kind"]): number {
    switch (kind) {
      case "assignHostIp":
      case "configureAccessPort":
      case "configureTrunkPort":
      case "configureSvi":
      case "configureSubinterface":
      case "configureNat":
      case "vlan-exists":
        return 1000;
      case "configureStaticRoute":
      case "configureDhcpRelay":
      case "nat-overlap":
      case "acl-match-order":
        return 2000;
      case "saveConfig":
        return 750;
      case "gateway-reachability":
        return 1500;
      default:
        return this.DEFAULT_CACHE_TTL_MS;
    }
  }
}
