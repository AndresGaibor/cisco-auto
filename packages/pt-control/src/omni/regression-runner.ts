// ============================================================================
// Regression Runner - Ejecutor de regression testing
// ============================================================================

import type { CapabilityRunResult } from "./capability-types.js";
import { getSuiteCapabilities } from "./capability-suites.js";
import { runCapabilityWithTimeout } from "./capability-runner.js";
import { saveRunResult } from "./evidence-ledger.js";

export interface RegressionRunOptions {
  suiteId: string;
  label?: string;
  baseline?: boolean;
  input?: Record<string, unknown>;
}

export interface RegressionRunResult {
  label: string;
  suiteId: string;
  timestamp: number;
  capabilityIds: string[];
  results: CapabilityRunResult[];
  total: number;
  passed: number;
  failed: number;
}

export async function runRegression(options: RegressionRunOptions): Promise<RegressionRunResult> {
  const capabilityIds = getSuiteCapabilities(options.suiteId);
  const results: CapabilityRunResult[] = [];
  let passed = 0;
  let failed = 0;

  for (const capId of capabilityIds) {
    const result = await runCapabilityWithTimeout(capId, options.input ?? {}, 30000);
    results.push(result);

    await saveRunResult(result);

    if (result.ok) {
      passed++;
    } else {
      failed++;
    }
  }

  return {
    label: options.label ?? "current",
    suiteId: options.suiteId,
    timestamp: Date.now(),
    capabilityIds,
    results,
    total: capabilityIds.length,
    passed,
    failed,
  };
}

export async function runRegressionSmoke(options?: {
  label?: string;
  baseline?: boolean;
}): Promise<RegressionRunResult> {
  return runRegression({
    suiteId: "regression-smoke",
    label: options?.label ?? "current",
    baseline: options?.baseline ?? false,
  });
}