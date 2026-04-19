// ============================================================================
// Regression Compare - Compara resultados de regression
// ============================================================================

import type {
  RegressionResult,
  RegressionComparison,
  CapabilitySupportStatus,
} from "./capability-types.js";
import { queryRuns } from "./evidence-ledger.js";

const BASELINE_LABELS: Record<string, string> = {};

export function setBaseline(label: string, runId: string): void {
  BASELINE_LABELS[label] = runId;
}

export function getBaseline(label: string): string | undefined {
  return BASELINE_LABELS[label];
}

export async function compareToBaseline(
  capabilityId: string,
  currentLabel: string,
  baselineLabel: string
): Promise<RegressionComparison | null> {
  const baselineRunId = BASELINE_LABELS[baselineLabel];
  if (!baselineRunId) {
    return null;
  }

  const baselineRuns = await queryRuns({
    capabilityId,
    from: 0,
    to: Date.now(),
  });

  const baselineRun = baselineRuns.find((r) => r.runId === baselineRunId);
  const currentRuns = await queryRuns({ capabilityId });
  const currentRun = currentRuns[currentRuns.length - 1];

  if (!baselineRun || !currentRun) {
    return {
      capabilityId,
      baselineRunId,
      currentRunId: "none",
      baselineStatus: baselineRun?.supportStatus as CapabilitySupportStatus ?? "unsupported",
      currentStatus: "unsupported",
      statusChanged: false,
      baselineConfidence: 0,
      currentConfidence: 0,
      confidenceDelta: 0,
      baselineRuns: 0,
      currentRuns: 0,
      result: "insufficient-data",
    };
  }

  const baselineOk = baselineRun.ok;
  const currentOk = currentRun.ok;

  const baselineConfidence = baselineOk ? 1 : 0;
  const currentConfidence = currentOk ? 1 : 0;

  let result: RegressionResult = "unchanged";

  if (baselineOk && !currentOk) {
    result = "regressed";
  } else if (!baselineOk && currentOk) {
    result = "improved";
  } else if (!baselineOk && !currentOk) {
    // Both failed, check changes in support status
    if (baselineRun.supportStatus !== currentRun.supportStatus) {
      result = "regressed";
    }
  } else if (baselineOk && currentOk) {
    // Both passed, check confidence
    if (currentConfidence > baselineConfidence) {
      result = "improved";
    } else if (currentConfidence < baselineConfidence) {
      result = "regressed";
    }
  }

  return {
    capabilityId,
    baselineRunId,
    currentRunId: currentRun.runId,
    baselineStatus: baselineRun.supportStatus as CapabilitySupportStatus,
    currentStatus: currentRun.supportStatus as CapabilitySupportStatus,
    statusChanged: baselineRun.supportStatus !== currentRun.supportStatus,
    baselineConfidence,
    currentConfidence,
    confidenceDelta: currentConfidence - baselineConfidence,
    baselineRuns: 1,
    currentRuns: currentRuns.length,
    result,
  };
}

export async function compareFull(
  capabilityIds: string[],
  currentLabel: string,
  baselineLabel: string
): Promise<RegressionComparison[]> {
  const results: RegressionComparison[] = [];

  for (const capId of capabilityIds) {
    const comp = await compareToBaseline(capId, currentLabel, baselineLabel);
    if (comp) {
      results.push(comp);
    }
  }

  return results;
}

export async function getRegressionSummary(
  comparisons: RegressionComparison[]
): Promise<{
  unchanged: number;
  improved: number;
  regressed: number;
  newlySupported: number;
  newlyBroken: number;
  insufficientData: number;
}> {
  let unchanged = 0;
  let improved = 0;
  let regressed = 0;
  let newlySupported = 0;
  let newlyBroken = 0;
  let insufficientData = 0;

  for (const comp of comparisons) {
    switch (comp.result) {
      case "unchanged":
        unchanged++;
        break;
      case "improved":
        improved++;
        break;
      case "regressed":
        regressed++;
        break;
      case "newly-supported":
        newlySupported++;
        break;
      case "newly-broken":
        newlyBroken++;
        break;
      case "insufficient-data":
        insufficientData++;
        break;
    }
  }

  return {
    unchanged,
    improved,
    regressed,
    newlySupported,
    newlyBroken,
    insufficientData,
  };
}