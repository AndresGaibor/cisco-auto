// ============================================================================
// Regression CLI - Interface de linea de comandos para Regression Testing
// ============================================================================

import type {
  CapabilityRunResult,
  RegressionComparison,
  CapabilitySupportStatus,
} from "./capability-types.js";
import { runRegression } from "./regression-runner.js";
import {
  setBaseline,
  getBaseline,
  compareFull,
  getRegressionSummary,
} from "./regression-compare.js";

export interface RegressionCliOptions {
  suite: string;
  baseline?: boolean;
  compare?: boolean;
  label?: string;
}

export interface RegressionReport {
  label: string;
  timestamp: number;
  suiteId: string;
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  results: CapabilityRunResult[];
}

export interface RegressionComparisonResult {
  baselineLabel: string;
  currentLabel: string;
  comparisons: RegressionComparison[];
  summary: {
    unchanged: number;
    improved: number;
    regressed: number;
    newlySupported: number;
    newlyBroken: number;
    insufficientData: number;
  };
}

export async function runRegressionCommand(
  options: RegressionCliOptions
): Promise<RegressionReport> {
  const result = await runRegression({
    suiteId: options.suite,
    label: options.label ?? "current",
    baseline: options.baseline,
  });

  if (options.baseline) {
    setBaseline(options.label ?? "baseline", result.results[0]?.runId ?? "");
  }

  return {
    label: result.label,
    timestamp: result.timestamp,
    suiteId: result.suiteId,
    total: result.total,
    passed: result.passed,
    failed: result.failed,
    durationMs: result.results.reduce((acc, r) => acc + r.durationMs, 0),
    results: result.results,
  };
}

export async function runRegressionWithComparison(
  options: RegressionCliOptions
): Promise<RegressionComparisonResult> {
  const currentRun = await runRegressionCommand(options);

  const baselineLabel = options.label ? `${options.label}-baseline` : "baseline";
  const baselineRunId = getBaseline(baselineLabel);

  if (!baselineRunId) {
    console.warn(`No baseline found for label: ${baselineLabel}`);
    return {
      baselineLabel,
      currentLabel: options.label ?? "current",
      comparisons: [],
      summary: {
        unchanged: 0,
        improved: 0,
        regressed: 0,
        newlySupported: 0,
        newlyBroken: 0,
        insufficientData: 0,
      },
    };
  }

  const capabilityIds = currentRun.results.map((r) => r.capabilityId);
  const comparisons = await compareFull(capabilityIds, options.label ?? "current", baselineLabel);
  const summary = await getRegressionSummary(comparisons);

  return {
    baselineLabel,
    currentLabel: options.label ?? "current",
    comparisons,
    summary,
  };
}

export function compareRegressionRuns(
  baseline: RegressionReport,
  current: RegressionReport
): {
  summary: {
    totalDelta: number;
    passedDelta: number;
    failedDelta: number;
  };
  regressions: CapabilityRunResult[];
  improvements: CapabilityRunResult[];
} {
  const regressions: CapabilityRunResult[] = [];
  const improvements: CapabilityRunResult[] = [];

  for (const currentResult of current.results) {
    const baselineResult = baseline.results.find(
      (r: CapabilityRunResult) => r.capabilityId === currentResult.capabilityId
    );

    if (!baselineResult) continue;

    if (!baselineResult.ok && currentResult.ok) {
      improvements.push(currentResult);
    } else if (baselineResult.ok && !currentResult.ok) {
      regressions.push(currentResult);
    }
  }

  return {
    summary: {
      totalDelta: current.total - baseline.total,
      passedDelta: current.passed - baseline.passed,
      failedDelta: current.failed - baseline.failed,
    },
    regressions,
    improvements,
  };
}

export function printRegressionReport(result: RegressionReport, format: "json" | "md" | "table" = "table"): void {
  if (format === "json") {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (format === "md") {
    printRegressionMarkdown(result);
    return;
  }

  printRegressionTable(result);
}

function printRegressionTable(result: RegressionReport): void {
  console.log("\n=== REGRESSION RESULTS ===");
  console.log(`Suite:      ${result.suiteId}`);
  console.log(`Label:      ${result.label}`);
  console.log(`Timestamp:  ${new Date(result.timestamp).toISOString()}`);
  console.log(`Duration:   ${result.durationMs}ms`);

  console.log("\n--- Summary ---");
  console.log(`Total:   ${result.total}`);
  console.log(`Passed:  ${result.passed}`);
  console.log(`Failed:  ${result.failed}`);

  if (result.results.length === 0) {
    console.log("\nNo results available.");
    return;
  }

  console.log("\n--- Results ---");
  console.table(
    result.results.map((r: CapabilityRunResult) => ({
      Capability: r.capabilityId,
      Status: r.ok ? "PASS" : "FAIL",
      Duration: `${r.durationMs}ms`,
      Confidence: `${(r.confidence * 100).toFixed(0)}%`,
      Support: r.supportStatus,
      Warnings: r.warnings.length,
      Error: r.error?.substring(0, 50) ?? "",
    }))
  );
}

function printRegressionMarkdown(result: RegressionReport): void {
  console.log("\n## Regression Results\n");
  console.log(`**Suite:** ${result.suiteId}`);
  console.log(`**Label:** ${result.label}`);
  console.log(`**Timestamp:** ${new Date(result.timestamp).toISOString()}`);
  console.log(`**Duration:** ${result.durationMs}ms\n`);

  console.log("### Summary\n");
  console.log("| Metric | Value |");
  console.log("|--------|-------|");
  console.log(`| Total | ${result.total} |`);
  console.log(`| Passed | ${result.passed} |`);
  console.log(`| Failed | ${result.failed} |`);

  if (result.results.length > 0) {
    console.log("\n### Capabilities\n");
    console.log("| Capability | Status | Duration | Confidence | Support |");
    console.log("|------------|--------|----------|------------|---------|");
    for (const r of result.results) {
      console.log(
        `| ${r.capabilityId} | ${r.ok ? "PASS" : "FAIL"} | ${r.durationMs}ms | ${(r.confidence * 100).toFixed(0)}% | ${r.supportStatus} |`
      );
    }
  }
}

export function printComparisonReport(result: RegressionComparisonResult, format: "json" | "md" | "table" = "table"): void {
  if (format === "json") {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (format === "md") {
    printComparisonMarkdown(result);
    return;
  }

  printComparisonTable(result);
}

function printComparisonTable(result: RegressionComparisonResult): void {
  console.log("\n=== REGRESSION COMPARISON ===");
  console.log(`Baseline:   ${result.baselineLabel}`);
  console.log(`Current:    ${result.currentLabel}`);

  console.log("\n--- Summary ---");
  console.log(`Unchanged:      ${result.summary.unchanged}`);
  console.log(`Improved:       ${result.summary.improved}`);
  console.log(`Regressed:     ${result.summary.regressed}`);
  console.log(`Newly Supported: ${result.summary.newlySupported}`);
  console.log(`Newly Broken:  ${result.summary.newlyBroken}`);
  console.log(`Insufficient:  ${result.summary.insufficientData}`);

  if (result.comparisons.length === 0) {
    console.log("\nNo comparisons available.");
    return;
  }

  console.log("\n--- Comparisons ---");
  console.table(
    result.comparisons.map((c: RegressionComparison) => ({
      Capability: c.capabilityId,
      Baseline: c.baselineStatus,
      Current: c.currentStatus,
      Result: c.result,
      Confidence: `${(c.confidenceDelta >= 0 ? "+" : "")}${(c.confidenceDelta * 100).toFixed(0)}%`,
    }))
  );
}

function printComparisonMarkdown(result: RegressionComparisonResult): void {
  console.log("\n## Regression Comparison\n");
  console.log(`**Baseline:** ${result.baselineLabel}`);
  console.log(`**Current:** ${result.currentLabel}\n`);

  console.log("### Summary\n");
  console.log("| Result | Count |");
  console.log("|--------|-------|");
  console.log(`| Unchanged | ${result.summary.unchanged} |`);
  console.log(`| Improved | ${result.summary.improved} |`);
  console.log(`| Regressed | ${result.summary.regressed} |`);
  console.log(`| Newly Supported | ${result.summary.newlySupported} |`);
  console.log(`| Newly Broken | ${result.summary.newlyBroken} |`);
  console.log(`| Insufficient Data | ${result.summary.insufficientData} |`);

  if (result.comparisons.length > 0) {
    console.log("\n### Comparisons\n");
    console.log("| Capability | Baseline | Current | Result | Confidence Δ |");
    console.log("|------------|----------|---------|--------|--------------|");
    for (const c of result.comparisons) {
      console.log(
        `| ${c.capabilityId} | ${c.baselineStatus} | ${c.currentStatus} | ${c.result} | ${(c.confidenceDelta >= 0 ? "+" : "")}${(c.confidenceDelta * 100).toFixed(0)}% |`
      );
    }
  }
}
