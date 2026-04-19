// ============================================================================
// Support Matrix - Consolida soporte de capabilities
// ============================================================================

import type { CapabilitySupportStatus, SupportMatrixEntry, EnvironmentFingerprint } from "./capability-types.js";
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
    const entry = aggregateRuns(capId, capRuns);

    if (options.status && entry.status !== options.status) {
      continue;
    }

    results.push(entry);
  }

  return results;
}

function aggregateRuns(
  capabilityId: string,
  runs: { runId: string; timestamp: number; ok: boolean; supportStatus: string; durationMs: number }[]
): SupportMatrixEntry {
  const successRuns = runs.filter((r) => r.ok).length;
  const failedRuns = runs.filter((r) => !r.ok).length;

  let totalConfidence = 0;
  for (const r of runs) {
    if (r.ok) totalConfidence += 1;
  }
  const avgConfidence = runs.length > 0 ? totalConfidence / runs.length : 0;

  let status: CapabilitySupportStatus = "unsupported";

  if (runs.length >= 3 && avgConfidence >= 0.8) {
    status = "supported";
  } else if (runs.length >= 1 && avgConfidence >= 0.5) {
    status = "partial";
  } else if (runs.length >= 3 && avgConfidence < 0.5) {
    status = "flaky";
  }

  const durations = runs.map((r) => r.durationMs);
  const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

  const timestamps = runs.map((r) => r.timestamp);

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
    lastEnvironment: {
      hostPlatform: process.platform,
      nodeVersion: process.version.replace(/^v/, ""),
      executionMode: process.env.NODE_ENV ?? "production",
      timestamp: Date.now(),
    } as EnvironmentFingerprint,
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