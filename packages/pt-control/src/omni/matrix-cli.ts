// ============================================================================
// Matrix CLI - Interface de linea de comandos para Support Matrix
// ============================================================================

import type { CapabilitySupportStatus, SupportMatrixEntry } from "./capability-types.js";
import {
  querySupportMatrix,
  querySupportMatrixByFilter,
  getMatrixForSuite,
  getFlakyCapabilities,
  getSupportedCapabilities,
} from "./support-matrix.js";
import { listSuites } from "./capability-suites.js";

export interface MatrixRunOptions {
  domain?: "device" | "terminal" | "link" | "all";
  suite?: string;
  format?: "json" | "md" | "table";
  status?: CapabilitySupportStatus;
}

export interface MatrixResult {
  timestamp: number;
  suiteId?: string;
  domain?: string;
  entries: SupportMatrixEntry[];
  summary: {
    total: number;
    supported: number;
    partial: number;
    flaky: number;
    unsupported: number;
    broken: number;
    dangerous: number;
  };
}

export async function runMatrix(options: MatrixRunOptions): Promise<MatrixResult> {
  let entries: SupportMatrixEntry[] = [];

  if (options.suite) {
    const matrix = await getMatrixForSuite([options.suite]);
    entries = Object.values(matrix);
  } else if (options.domain) {
    entries = await querySupportMatrixByFilter({
      domain: options.domain === "all" ? undefined : options.domain,
      status: options.status,
    });
  } else {
    entries = await querySupportMatrixByFilter({ status: options.status });
  }

  const summary = {
    total: entries.length,
    supported: entries.filter((e) => e.status === "supported").length,
    partial: entries.filter((e) => e.status === "partial").length,
    flaky: entries.filter((e) => e.status === "flaky").length,
    unsupported: entries.filter((e) => e.status === "unsupported").length,
    broken: entries.filter((e) => e.status === "broken").length,
    dangerous: entries.filter((e) => e.status === "dangerous").length,
  };

  return {
    timestamp: Date.now(),
    suiteId: options.suite,
    domain: options.domain,
    entries,
    summary,
  };
}

export function printMatrixReport(result: MatrixResult, format: string = "table"): void {
  if (format === "json") {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (format === "md") {
    printMatrixMarkdown(result);
    return;
  }

  printMatrixTable(result);
}

function printMatrixTable(result: MatrixResult): void {
  console.log("\n=== SUPPORT MATRIX ===");
  console.log(`Generated: ${new Date(result.timestamp).toISOString()}`);
  if (result.suiteId) console.log(`Suite: ${result.suiteId}`);
  if (result.domain) console.log(`Domain: ${result.domain}`);

  console.log("\n--- Summary ---");
  console.log(`Total:      ${result.summary.total}`);
  console.log(`Supported:  ${result.summary.supported}`);
  console.log(`Partial:    ${result.summary.partial}`);
  console.log(`Flaky:      ${result.summary.flaky}`);
  console.log(`Unsupported:${result.summary.unsupported}`);
  console.log(`Broken:     ${result.summary.broken}`);
  console.log(`Dangerous:  ${result.summary.dangerous}`);

  if (result.entries.length === 0) {
    console.log("\nNo capability data available.");
    return;
  }

  console.log("\n--- Capabilities ---");
  console.table(
    result.entries.map((e) => ({
      Capability: e.capabilityId,
      Status: e.status,
      Runs: `${e.successRuns}/${e.totalRuns}`,
      Confidence: `${(e.averageConfidence * 100).toFixed(0)}%`,
      AvgDuration: `${e.averageDurationMs.toFixed(0)}ms`,
      LastRun: new Date(e.lastRun).toLocaleDateString(),
    }))
  );
}

function printMatrixMarkdown(result: MatrixResult): void {
  console.log("\n## Support Matrix\n");

  if (result.suiteId) console.log(`**Suite:** ${result.suiteId}`);
  if (result.domain) console.log(`**Domain:** ${result.domain}`);
  console.log(`**Generated:** ${new Date(result.timestamp).toISOString()}\n`);

  console.log("### Summary\n");
  console.log("| Status | Count |");
  console.log("|--------|-------|");
  console.log(`| Supported | ${result.summary.supported} |`);
  console.log(`| Partial | ${result.summary.partial} |`);
  console.log(`| Flaky | ${result.summary.flaky} |`);
  console.log(`| Unsupported | ${result.summary.unsupported} |`);
  console.log(`| Broken | ${result.summary.broken} |`);
  console.log(`| Dangerous | ${result.summary.dangerous} |`);

  if (result.entries.length > 0) {
    console.log("\n### Capabilities\n");
    console.log("| Capability | Status | Runs | Confidence | Avg Duration |");
    console.log("|------------|--------|------|------------|--------------|");
    for (const e of result.entries) {
      console.log(
        `| ${e.capabilityId} | ${e.status} | ${e.successRuns}/${e.totalRuns} | ${(e.averageConfidence * 100).toFixed(0)}% | ${e.averageDurationMs.toFixed(0)}ms |`
      );
    }
  }
}

export async function getMatrixDiff(
  baseline: MatrixResult,
  current: MatrixResult
): Promise<{
  added: SupportMatrixEntry[];
  removed: SupportMatrixEntry[];
  changed: { capabilityId: string; from: CapabilitySupportStatus; to: CapabilitySupportStatus }[];
}> {
  const baselineIds = new Set(baseline.entries.map((e) => e.capabilityId));
  const currentIds = new Set(current.entries.map((e) => e.capabilityId));

  const added = current.entries.filter((e) => !baselineIds.has(e.capabilityId));
  const removed = baseline.entries.filter((e) => !currentIds.has(e.capabilityId));

  const changed: { capabilityId: string; from: CapabilitySupportStatus; to: CapabilitySupportStatus }[] = [];

  for (const currentEntry of current.entries) {
    const baselineEntry = baseline.entries.find((e) => e.capabilityId === currentEntry.capabilityId);
    if (baselineEntry && baselineEntry.status !== currentEntry.status) {
      changed.push({
        capabilityId: currentEntry.capabilityId,
        from: baselineEntry.status,
        to: currentEntry.status,
      });
    }
  }

  return { added, removed, changed };
}

export function compareMatrices(baseline: MatrixResult, current: MatrixResult): {
  summary: {
    totalDelta: number;
    supportedDelta: number;
    partialDelta: number;
    flakyDelta: number;
    unsupportedDelta: number;
    brokenDelta: number;
    dangerousDelta: number;
  };
  diff: {
    added: SupportMatrixEntry[];
    removed: SupportMatrixEntry[];
    changed: { capabilityId: string; from: CapabilitySupportStatus; to: CapabilitySupportStatus }[];
  };
} {
  const diff = {
    added: current.entries.filter(
      (e) => !baseline.entries.some((b) => b.capabilityId === e.capabilityId)
    ),
    removed: baseline.entries.filter(
      (b) => !current.entries.some((c) => c.capabilityId === b.capabilityId)
    ),
    changed: current.entries
      .filter((c) => {
        const b = baseline.entries.find((x) => x.capabilityId === c.capabilityId);
        return b && b.status !== c.status;
      })
      .map((c) => {
        const b = baseline.entries.find((x) => x.capabilityId === c.capabilityId)!;
        return {
          capabilityId: c.capabilityId,
          from: b.status,
          to: c.status,
        };
      }),
  };

  return {
    summary: {
      totalDelta: current.summary.total - baseline.summary.total,
      supportedDelta: current.summary.supported - baseline.summary.supported,
      partialDelta: current.summary.partial - baseline.summary.partial,
      flakyDelta: current.summary.flaky - baseline.summary.flaky,
      unsupportedDelta: current.summary.unsupported - baseline.summary.unsupported,
      brokenDelta: current.summary.broken - baseline.summary.broken,
      dangerousDelta: current.summary.dangerous - baseline.summary.dangerous,
    },
    diff,
  };
}
