// ============================================================================
// Support Matrix - Consolida soporte de capabilities
// ============================================================================

import type { CapabilitySupportStatus, CapabilityRunResult, SupportMatrixEntry, EnvironmentFingerprint } from "./capability-types.js";
import { queryRuns, readRunResult } from "./evidence-ledger.js";

const SUPPORT_CACHE_FILE = process.env.OMNI_SUPPORT_CACHE ?? "/tmp/omni-support-cache.json";

export async function querySupportMatrix(capabilityId: string): Promise<SupportMatrixEntry | null> {
  const runs = await queryRuns({ capabilityId });

  if (runs.length === 0) {
    return null;
  }

  return aggregateRuns(capabilityId, runs);
}

export async function querySupportMatrixByFilter(options: {
  status?: CapabilitySupportStatus;
  domain?: string;
}): Promise<SupportMatrixEntry[]> {
  const allRuns = await queryRuns({});
  const byCapability: Record<string, { runId: string; timestamp: number; ok: boolean; supportStatus: string; durationMs: number }[]> = {};

  for (const run of allRuns) {
    const capId = run.capabilityId;
    if (!byCapability[capId]) {
      byCapability[capId] = [];
    }
    const existing = byCapability[capId];
    if (existing) {
      existing.push(run);
    }
  }

  const results: SupportMatrixEntry[] = [];

  for (const [capId, capRuns] of Object.entries(byCapability)) {
    const entry = await aggregateRuns(capId, capRuns);

    if (options.status && entry.status !== options.status) {
      continue;
    }

    results.push(entry);
  }

  return results;
}

function classifyCapability(
  runs: { runId: string; timestamp: number; ok: boolean; supportStatus: string; durationMs: number }[],
  fullResults: Map<string, CapabilityRunResult>
): CapabilitySupportStatus {
  if (runs.length === 0) {
    return "unsupported";
  }

  const hasFailures = runs.some((r) => !r.ok);
  const successCount = runs.filter((r) => r.ok).length;
  const avgConfidence = successCount / runs.length;

  const CRITICAL_WARNINGS = ["timeout", "crash", "segmentation fault", "panic", "fatal"];

  let hasCriticalWarnings = false;
  let inconsistentCleanup = false;
  const cleanupStatuses = new Set<string>();

  for (const run of runs) {
    const full = fullResults.get(run.runId);
    if (full) {
      if (full.warnings && full.warnings.length > 0) {
        for (const w of full.warnings) {
          const lower = w.toLowerCase();
          if (CRITICAL_WARNINGS.some((cw) => lower.includes(cw))) {
            hasCriticalWarnings = true;
          }
        }
      }
      if (full.cleanupStatus) {
        cleanupStatuses.add(full.cleanupStatus);
        if (full.cleanupStatus === "failed" || full.cleanupStatus === "partial") {
          inconsistentCleanup = true;
        }
      }
    }
  }

  if (runs.length === 1) {
    const singleRun = runs[0]!;
    if (!singleRun.ok) return "unsupported";
    if (hasCriticalWarnings || inconsistentCleanup) return "experimental";
    return "experimental";
  }

  if (runs.length === 2) {
    if (avgConfidence >= 0.9 && !hasCriticalWarnings && !inconsistentCleanup) {
      return "experimental";
    }
    if (hasFailures) return "flaky";
    return "experimental";
  }

  if (runs.length >= 3) {
    if (avgConfidence >= 0.8 && !hasCriticalWarnings && !inconsistentCleanup) {
      return "supported";
    }
    if (hasFailures && avgConfidence >= 0.5) {
      return "flaky";
    }
    if (!hasFailures && (hasCriticalWarnings || inconsistentCleanup)) {
      return "partial";
    }
    if (avgConfidence < 0.5) {
      return "flaky";
    }
    return "partial";
  }

  return "unsupported";
}

async function aggregateRuns(
  capabilityId: string,
  runs: { runId: string; timestamp: number; ok: boolean; supportStatus: string; durationMs: number }[]
): Promise<SupportMatrixEntry> {
  const fullResults = new Map<string, CapabilityRunResult>();
  await Promise.all(
    runs.map(async (r) => {
      const full = await readRunResult(r.runId);
      if (full) fullResults.set(r.runId, full);
    })
  );

  const successRuns = runs.filter((r) => r.ok).length;
  const failedRuns = runs.filter((r) => !r.ok).length;
  const avgConfidence = runs.length > 0 ? successRuns / runs.length : 0;

  const status = classifyCapability(runs, fullResults);

  const durations = runs.map((r) => r.durationMs);
  const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

  const timestamps = runs.map((r) => r.timestamp);

  const firstRunId = runs[0]?.runId ?? "";
  const fullLast = firstRunId ? fullResults.get(firstRunId) : undefined;
  const lastEnv = fullLast?.environment ?? {
    hostPlatform: process.platform,
    nodeVersion: process.version.replace(/^v/, ""),
    executionMode: process.env.NODE_ENV ?? "production",
    timestamp: Date.now(),
  };

  return {
    capabilityId,
    status,
    totalRuns: runs.length,
    successRuns,
    failedRuns,
    flakyRuns: status === "flaky" ? failedRuns : 0,
    averageConfidence: avgConfidence,
    minConfidence: avgConfidence - 0.2,
    maxConfidence: avgConfidence + 0.1,
    averageDurationMs: avgDuration,
    lastRun: Math.max(...timestamps),
    firstRun: Math.min(...timestamps),
    lastEnvironment: lastEnv as EnvironmentFingerprint,
  };
}

export async function getMatrixForSuite(suiteIds: string[]): Promise<Record<string, SupportMatrixEntry>> {
  const results: Record<string, SupportMatrixEntry> = {};

  for (const suiteId of suiteIds) {
    const suite = await import("./capability-suites.js");
    const suiteData = suite.getSuite(suiteId);
    if (!suiteData) continue;

    for (const capId of suiteData.capabilityIds) {
      const entry = await querySupportMatrix(capId);
      if (entry) {
        results[capId] = entry;
      }
    }
  }

  return results;
}

export async function getFlakyCapabilities(): Promise<string[]> {
  const all = await querySupportMatrixByFilter({ status: "flaky" });
  return all.map((e) => e.capabilityId);
}

export async function getSupportedCapabilities(): Promise<string[]> {
  const all = await querySupportMatrixByFilter({ status: "supported" });
  return all.map((e) => e.capabilityId);
}