/**
 * FileBridgeMetrics - Métricas atómicas de rendimiento del bridge.
 *
 * Rastrea contadores y observaciones para identificar cuellos de botella:
 * - fsync time (atomic write hot path)
 * - readdir time
 * - rename time (claim operation)
 * - JSON parse time
 * - Cache hit rate (readdir cache)
 *
 * Thread-safe para single-threaded Node.js (sin locks).
 * Usar `reset()` para limpiar entre escenarios de benchmark.
 */

export interface FileBridgeMetricsSnapshot {
  timestamp: number;

  // Atomic writes
  atomicWrites: number;
  atomicWriteFailures: number;
  totalAtomicWriteMs: number;
  averageAtomicWriteMs: number;
  maxAtomicWriteMs: number;

  // Readdir
  readdirCalls: number;
  readdirCacheHits: number;
  readdirCacheMisses: number;
  readdirCacheHitRate: number;
  totalReaddirMs: number;
  averageReaddirMs: number;

  // Claim (rename commands/ → in-flight/)
  claimAttempts: number;
  claimSuccesses: number;
  claimFailures: number;
  claimSuccessRate: number;
  totalClaimMs: number;
  averageClaimMs: number;

  // JSON parsing
  jsonParses: number;
  jsonParseFailures: number;
  totalJsonParseMs: number;
  averageJsonParseMs: number;

  // Results
  resultsPublished: number;
  resultsFailed: number;
  totalResultPublishMs: number;
  averageResultPublishMs: number;

  // Queue operations
  queueAppends: number;
  queueCompactations: number;
  totalQueueAppendMs: number;
  averageQueueAppendMs: number;

  // pickNextCommand (optimistic locking by mtime)
  pickNextCommandCalls: number;
  pickNextCommandSkippedByMtime: number;
  pickNextCommandByCacheHit: number;

  // Errors
  errors: number;
  warnings: number;
}

export class FileBridgeMetrics {
  private atomicWrites = 0;
  private atomicWriteFailures = 0;
  private totalAtomicWriteMs = 0;
  private maxAtomicWriteMs = 0;

  private readdirCalls = 0;
  private readdirCacheHits = 0;
  private readdirCacheMisses = 0;
  private totalReaddirMs = 0;

  private claimAttempts = 0;
  private claimSuccesses = 0;
  private claimFailures = 0;
  private totalClaimMs = 0;

  private jsonParses = 0;
  private jsonParseFailures = 0;
  private totalJsonParseMs = 0;

  private resultsPublished = 0;
  private resultsFailed = 0;
  private totalResultPublishMs = 0;

  private queueAppends = 0;
  private queueCompactations = 0;
  private totalQueueAppendMs = 0;

  private pickNextCommandCalls = 0;
  private pickNextCommandSkippedByMtime = 0;
  private pickNextCommandByCacheHit = 0;

  private errors = 0;
  private warnings = 0;

  // ───── Atomic writes ─────

  recordAtomicWrite(durationMs: number, success: boolean): void {
    this.atomicWrites++;
    if (!success) this.atomicWriteFailures++;
    this.totalAtomicWriteMs += durationMs;
    if (durationMs > this.maxAtomicWriteMs) this.maxAtomicWriteMs = durationMs;
  }

  // ───── Readdir ─────

  recordReaddir(durationMs: number, cacheHit: boolean): void {
    this.readdirCalls++;
    if (cacheHit) this.readdirCacheHits++;
    else this.readdirCacheMisses++;
    this.totalReaddirMs += durationMs;
  }

  // ───── Claims ─────

  recordClaim(durationMs: number, success: boolean): void {
    this.claimAttempts++;
    if (success) this.claimSuccesses++;
    else this.claimFailures++;
    this.totalClaimMs += durationMs;
  }

  // ───── JSON parses ─────

  recordJsonParse(durationMs: number, success: boolean): void {
    this.jsonParses++;
    if (!success) this.jsonParseFailures++;
    this.totalJsonParseMs += durationMs;
  }

  // ───── Results ─────

  recordResultPublish(durationMs: number, success: boolean): void {
    if (success) this.resultsPublished++;
    else this.resultsFailed++;
    this.totalResultPublishMs += durationMs;
  }

  // ───── Queue ─────

  recordQueueAppend(durationMs: number): void {
    this.queueAppends++;
    this.totalQueueAppendMs += durationMs;
  }

  recordQueueCompaction(): void {
    this.queueCompactations++;
  }

  // ───── pickNextCommand (optimistic locking by mtime) ─────

  recordPickNextCommandCall(): void {
    this.pickNextCommandCalls++;
  }

  recordPickNextSkippedByMtime(): void {
    this.pickNextCommandSkippedByMtime++;
  }

  recordPickNextByCacheHit(): void {
    this.pickNextCommandByCacheHit++;
  }

  // ───── Errors/Warnings ─────

  recordError(): void {
    this.errors++;
  }

  recordWarning(): void {
    this.warnings++;
  }

  // ───── Snapshot ─────

  getSnapshot(): FileBridgeMetricsSnapshot {
    const safeAverage = (numerator: number, denominator: number): number => {
      return denominator > 0 ? Math.round((numerator / denominator) * 100) / 100 : 0;
    };

    const readdirTotal = this.readdirCacheHits + this.readdirCacheMisses;

    return {
      timestamp: Date.now(),

      atomicWrites: this.atomicWrites,
      atomicWriteFailures: this.atomicWriteFailures,
      totalAtomicWriteMs: Math.round(this.totalAtomicWriteMs * 100) / 100,
      averageAtomicWriteMs: safeAverage(this.totalAtomicWriteMs, this.atomicWrites),
      maxAtomicWriteMs: Math.round(this.maxAtomicWriteMs * 100) / 100,

      readdirCalls: this.readdirCalls,
      readdirCacheHits: this.readdirCacheHits,
      readdirCacheMisses: this.readdirCacheMisses,
      readdirCacheHitRate: safeAverage(this.readdirCacheHits, readdirTotal),
      totalReaddirMs: Math.round(this.totalReaddirMs * 100) / 100,
      averageReaddirMs: safeAverage(this.totalReaddirMs, this.readdirCalls),

      claimAttempts: this.claimAttempts,
      claimSuccesses: this.claimSuccesses,
      claimFailures: this.claimFailures,
      claimSuccessRate: safeAverage(this.claimSuccesses, this.claimAttempts),
      totalClaimMs: Math.round(this.totalClaimMs * 100) / 100,
      averageClaimMs: safeAverage(this.totalClaimMs, this.claimAttempts),

      jsonParses: this.jsonParses,
      jsonParseFailures: this.jsonParseFailures,
      totalJsonParseMs: Math.round(this.totalJsonParseMs * 100) / 100,
      averageJsonParseMs: safeAverage(this.totalJsonParseMs, this.jsonParses),

      resultsPublished: this.resultsPublished,
      resultsFailed: this.resultsFailed,
      totalResultPublishMs: Math.round(this.totalResultPublishMs * 100) / 100,
      averageResultPublishMs: safeAverage(this.totalResultPublishMs, this.resultsPublished + this.resultsFailed),

      queueAppends: this.queueAppends,
      queueCompactations: this.queueCompactations,
      totalQueueAppendMs: Math.round(this.totalQueueAppendMs * 100) / 100,
      averageQueueAppendMs: safeAverage(this.totalQueueAppendMs, this.queueAppends),

      pickNextCommandCalls: this.pickNextCommandCalls,
      pickNextCommandSkippedByMtime: this.pickNextCommandSkippedByMtime,
      pickNextCommandByCacheHit: this.pickNextCommandByCacheHit,

      errors: this.errors,
      warnings: this.warnings,
    };
  }

  reset(): void {
    this.atomicWrites = 0;
    this.atomicWriteFailures = 0;
    this.totalAtomicWriteMs = 0;
    this.maxAtomicWriteMs = 0;

    this.readdirCalls = 0;
    this.readdirCacheHits = 0;
    this.readdirCacheMisses = 0;
    this.totalReaddirMs = 0;

    this.claimAttempts = 0;
    this.claimSuccesses = 0;
    this.claimFailures = 0;
    this.totalClaimMs = 0;

    this.jsonParses = 0;
    this.jsonParseFailures = 0;
    this.totalJsonParseMs = 0;

    this.resultsPublished = 0;
    this.resultsFailed = 0;
    this.totalResultPublishMs = 0;

    this.queueAppends = 0;
    this.queueCompactations = 0;
    this.totalQueueAppendMs = 0;

    this.pickNextCommandCalls = 0;
    this.pickNextCommandSkippedByMtime = 0;
    this.pickNextCommandByCacheHit = 0;

    this.errors = 0;
    this.warnings = 0;
  }

  toPrometheusFormat(): string {
    const snap = this.getSnapshot();
    const lines = [
      `# HELP bridge_fs_write_duration_ms Average filesystem write duration in ms`,
      `# TYPE bridge_fs_write_duration_ms gauge`,
      `bridge_fs_write_duration_ms ${snap.averageAtomicWriteMs.toFixed(2)}`,
      `# HELP bridge_readdir_cache_hit_rate Read directory cache hit rate`,
      `# TYPE bridge_readdir_cache_hit_rate gauge`,
      `bridge_readdir_cache_hit_rate ${(snap.readdirCacheHitRate * 100).toFixed(2)}`,
      `# HELP bridge_claim_duration_ms Average command claim duration in ms`,
      `# TYPE bridge_claim_duration_ms gauge`,
      `bridge_claim_duration_ms ${snap.averageClaimMs.toFixed(2)}`,
    ];
    return lines.join("\n");
  }
}

export function formatMetricsForHumans(snap: FileBridgeMetricsSnapshot): string {
  const lines = [
    `FileBridge Metrics @ ${new Date(snap.timestamp).toISOString()}`,
    ``,
    `Atomic writes:    ${snap.atomicWrites} (${snap.atomicWriteFailures} failed) | avg=${snap.averageAtomicWriteMs}ms, max=${snap.maxAtomicWriteMs}ms`,
    `Readdir:          ${snap.readdirCalls} calls (${snap.readdirCacheHitRate * 100}% cache hit) | avg=${snap.averageReaddirMs}ms`,
    `Claim (rename):   ${snap.claimAttempts} attempts (${snap.claimSuccessRate * 100}% success) | avg=${snap.averageClaimMs}ms`,
    `JSON parse:       ${snap.jsonParses} (${snap.jsonParseFailures} failed) | avg=${snap.averageJsonParseMs}ms`,
    `Result publish:   ${snap.resultsPublished} ok / ${snap.resultsFailed} failed | avg=${snap.averageResultPublishMs}ms`,
    `Queue appends:    ${snap.queueAppends} (${snap.queueCompactations} compactions) | avg=${snap.averageQueueAppendMs}ms`,
    `pickNextCommand:  ${snap.pickNextCommandCalls} calls (${snap.pickNextCommandSkippedByMtime} skipped-by-mtime, ${snap.pickNextCommandByCacheHit} cache-hit)`,
    `Errors/Warnings:  ${snap.errors}/${snap.warnings}`,
  ];
  return lines.join("\n");
}
