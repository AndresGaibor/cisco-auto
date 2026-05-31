export type CommandPerformanceCategory =
  | "bridge_wait"
  | "queue_latency"
  | "execution_latency"
  | "sequential_batch"
  | "adaptive_batch"
  | "poll_sleep"
  | "parse"
  | "device_resolution"
  | "planner_or_submit"
  | "retry_or_recovery"
  | "pager_fallback"
  | "unknown";

export interface CommandPerformanceSummary {
  durationMs?: number;
  slow: boolean;
  thresholdMs: number;
  dominantTiming?: string | null;
  dominantTimingMs?: number;
  category: CommandPerformanceCategory;
  executionStrategy?: string;
  slowestSubcommand?: {
    index: number;
    command: string;
    durationMs: number;
  };
}

export interface StructuredCommandWarning {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
  actionable?: boolean;
}

export const DEFAULT_CMD_SLOW_THRESHOLD_MS = 8_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberValue(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return undefined;
  }

  return Math.round(value);
}

function flattenNumericTimings(
  value: unknown,
  output: Array<{ path: string; key: string; value: number }>,
  prefix = "",
): void {
  if (!isRecord(value)) return;

  for (const [key, raw] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const numeric = numberValue(raw);

    if (numeric !== undefined) {
      output.push({ path, key, value: numeric });
      continue;
    }

    if (isRecord(raw)) {
      flattenNumericTimings(raw, output, path);
    }
  }
}

function isTotalOrControlTiming(key: string): boolean {
  return (
    /TotalMs$/i.test(key) ||
    /TimeoutMs$/i.test(key) ||
    /IntervalMs$/i.test(key) ||
    /Count$/i.test(key) ||
    /RecommendedCount$/i.test(key) ||
    /CompletedAtMs$/i.test(key) ||
    /AgeMs$/i.test(key)
  );
}

function isAggregateWrapperTiming(path: string, key: string): boolean {
  return (
    key === "executeIosCommandMs" ||
    key === "terminalCommandServiceTotalMs" ||
    key === "adapterTotalMs" ||
    key === "terminalPlanRunMs" ||
    path === "terminalCommandService.runtimeTerminalRunPlanMs"
  );
}

function timingPriority(item: { path: string; key: string; value: number }): number {
  if (/runtimeTerminalRetryRunPlanMs$/i.test(item.key)) return 95;
  if (/buildIosPlanNoPagerMs$/i.test(item.key)) return 90;
  if (/BridgeWaitMs$/i.test(item.key)) return 80;
  if (/QueueLatencyMs$/i.test(item.key)) return 70;
  if (/ExecLatencyMs$/i.test(item.key)) return 60;
  if (/PollSleepMs$|InitialDelaySleepMs$|LastSleepMs$/i.test(item.key)) return 50;
  if (/resolveDeviceKind|inspectDevice/i.test(item.key)) return 40;
  if (/Parse/i.test(item.key)) return 30;
  if (/build.*Plan|validatePlan|normalizePlan|SubmitMs$/i.test(item.key)) return 20;
  return 0;
}

export function classifyTimingKey(key: string): CommandPerformanceCategory {
  if (/runtimeTerminalRetryRunPlanMs$/i.test(key)) return "retry_or_recovery";
  if (/buildIosPlanNoPagerMs$/i.test(key)) return "pager_fallback";
  if (/BridgeWaitMs$/i.test(key)) return "bridge_wait";
  if (/QueueLatencyMs$/i.test(key)) return "queue_latency";
  if (/ExecLatencyMs$/i.test(key)) return "execution_latency";
  if (/PollSleepMs$|InitialDelaySleepMs$|LastSleepMs$/i.test(key)) return "poll_sleep";
  if (/Parse/i.test(key)) return "parse";
  if (/resolveDeviceKind|inspectDevice/i.test(key)) return "device_resolution";
  if (/build.*Plan|validatePlan|normalizePlan|SubmitMs$/i.test(key)) return "planner_or_submit";
  return "unknown";
}

function extractTimings(entry: unknown): Record<string, unknown> | null {
  if (!isRecord(entry)) return null;
  const result = entry.result;

  if (!isRecord(result)) return null;
  const evidence = result.evidence;

  if (!isRecord(evidence)) return null;
  const timings = evidence.timings;

  return isRecord(timings) ? timings : null;
}

function extractBridgeWaitMs(timings: Record<string, unknown> | null): number | undefined {
  if (!timings) return undefined;

  const terminalCommandService = isRecord(timings.terminalCommandService)
    ? timings.terminalCommandService
    : null;

  return (
    numberValue(terminalCommandService?.terminalPlanSubmitBridgeWaitMs) ??
    numberValue(terminalCommandService?.terminalPlanPollBridgeWaitMs) ??
    numberValue(terminalCommandService?.terminalPlanSubmitExecLatencyMs)
  );
}


function extractSlowestSubcommand(entry: unknown): CommandPerformanceSummary["slowestSubcommand"] {
  if (!isRecord(entry) || !isRecord(entry.result)) return undefined;

  const subResults = entry.result.subResults;
  if (!Array.isArray(subResults)) return undefined;

  let slowest: CommandPerformanceSummary["slowestSubcommand"] = undefined;

  for (const raw of subResults) {
    if (!isRecord(raw)) continue;

    const index = numberValue(raw.index);
    const command = typeof raw.command === "string" ? raw.command : "";
    const durationMs = numberValue(raw.durationMs);

    if (index === undefined || !command || durationMs === undefined) {
      continue;
    }

    if (!slowest || durationMs > slowest.durationMs) {
      slowest = { index, command, durationMs };
    }
  }

  return slowest;
}

function extractDurationMs(timings: Record<string, unknown> | null): number | undefined {
  if (!timings) return undefined;

  const terminalCommandService = isRecord(timings.terminalCommandService)
    ? timings.terminalCommandService
    : null;

  return (
    numberValue(terminalCommandService?.terminalCommandServiceTotalMs) ??
    numberValue(timings.adapterTotalMs) ??
    numberValue(timings.terminalPlanRunMs)
  );
}


function extractOptimizedBatchDurationMs(
  result: Record<string, unknown>,
  timings: Record<string, unknown> | null,
): { durationMs?: number; dominantTiming?: string | null; dominantTimingMs?: number } {
  if (
    result.executionStrategy !== "optimized-runtime-multistep" &&
    result.executionStrategy !== "optimized-runtime-partial-plus-sequential"
  ) {
    return {};
  }

  const terminalCommandService = timings && isRecord(timings.terminalCommandService)
    ? timings.terminalCommandService
    : null;

  const candidates = [
    {
      path: "terminalCommandService.terminalCommandServiceTotalMs",
      value: numberValue(terminalCommandService?.terminalCommandServiceTotalMs),
    },
    {
      path: "terminalCommandService.executeIosCommandBatchOptimizedMs",
      value: numberValue(terminalCommandService?.executeIosCommandBatchOptimizedMs),
    },
    {
      path: "terminalCommandService.runtimeTerminalBatchOptimizedRunPlanMs",
      value: numberValue(terminalCommandService?.runtimeTerminalBatchOptimizedRunPlanMs),
    },
    {
      path: "terminalPlanRunMs",
      value: numberValue(timings?.terminalPlanRunMs),
    },
    {
      path: "adapterTotalMs",
      value: numberValue(timings?.adapterTotalMs),
    },
  ].filter((item): item is { path: string; value: number } => item.value !== undefined);

  const duration = candidates[0];

  if (!duration) {
    return {};
  }

  const dominant =
    candidates.find((item) => item.path.endsWith("runtimeTerminalBatchOptimizedRunPlanMs")) ??
    candidates.find((item) => item.path.endsWith("executeIosCommandBatchOptimizedMs")) ??
    duration;

  return {
    durationMs: duration.value,
    dominantTiming: dominant.path,
    dominantTimingMs: dominant.value,
  };
}

function buildBatchPartialFailureWarning(entry: unknown): StructuredCommandWarning | null {
  if (!isRecord(entry) || !isRecord(entry.result)) return null;

  const result = entry.result;

  if (result.executionStrategy !== "optimized-runtime-partial-plus-sequential") {
    return null;
  }

  const failedSubcommandCount = typeof result.failedSubcommandCount === "number"
    ? result.failedSubcommandCount
    : 0;

  if (failedSubcommandCount <= 0) {
    return null;
  }

  const subResults = Array.isArray(result.subResults) ? result.subResults : [];
  const failed = subResults
    .filter((item: any) => item?.ok === false)
    .map((item: any) => ({
      index: typeof item?.index === "number" ? item.index : -1,
      command: typeof item?.command === "string" ? item.command : "",
    }))
    .filter((item) => item.command.length > 0);

  const nextIndex = typeof result.optimizedRuntimeBatchNextCommandIndex === "number"
    ? result.optimizedRuntimeBatchNextCommandIndex
    : undefined;

  const matchedCount = typeof result.optimizedRuntimeBatchMatchedCommandCount === "number"
    ? result.optimizedRuntimeBatchMatchedCommandCount
    : undefined;

  const commandCount = typeof result.commandCount === "number"
    ? result.commandCount
    : Array.isArray(result.commands)
      ? result.commands.length
      : undefined;

  const failedSummary = failed.length
    ? failed.map((item) => `${item.index}: ${item.command}`).join("; ")
    : `${failedSubcommandCount} failed subcommand(s)`;

  return {
    code: "CMD_BATCH_PARTIAL_FAILURE",
    severity: "warning",
    message: [
      "Partial optimized batch resumed sequentially",
      nextIndex !== undefined ? `from command ${nextIndex}` : "after optimized partial coverage",
      matchedCount !== undefined && commandCount !== undefined ? `after ${matchedCount}/${commandCount} optimized commands` : null,
      `. Failed subcommand(s): ${failedSummary}.`,
      " Later subResults may still be valid when continueOnError=true.",
    ].filter(Boolean).join(" "),
    actionable: true,
  };
}


function extractSequentialBatchInfo(entry: unknown, timings: Record<string, unknown> | null): {
  durationMs?: number;
  failedSubcommandCount?: number;
  dominantTiming?: string | null;
  dominantTimingMs?: number;
  category: CommandPerformanceCategory;
  slowestSubcommand?: { index: number; command: string; durationMs: number };
  executionStrategy?: string;
  slowestCommand?: string;
  slowestMs?: number;
  recoveredIndexes?: number[];
} | null {
  if (!isRecord(entry) || !isRecord(entry.result)) return null;

  const result = entry.result;
  if (
    result.executionStrategy !== "sequential-subcommands" &&
    result.executionStrategy !== "optimized-runtime-multistep" &&
    result.executionStrategy !== "optimized-runtime-partial-plus-sequential" &&
    result.executionStrategy !== "adaptive-optimized-chunks" &&
    result.executionStrategy !== "adaptive-optimized-chunks-plus-sequential-recovery"
  ) return null;

  const subResults = Array.isArray(result.subResults)
    ? result.subResults
    : isRecord(result.result) && Array.isArray(result.result.subResults)
      ? result.result.subResults
      : [];
  const slowest = subResults
    .map((item: any, index: number) => ({
      index: typeof item?.index === "number" ? item.index : index,
      command: typeof item?.command === "string" ? item.command : "",
      durationMs: typeof item?.durationMs === "number" ? item.durationMs : undefined,
    }))
    .filter((item) => typeof item.durationMs === "number")
    .sort((a, b) => (b.durationMs ?? 0) - (a.durationMs ?? 0))[0];

  const failedSubcommandCount = typeof result.failedSubcommandCount === "number"
    ? result.failedSubcommandCount
    : Array.isArray(subResults)
      ? subResults.filter((item: any) => item?.ok === false).length
      : 0;

  const totalDurationFromSubcommands = Array.isArray(subResults)
    ? subResults.reduce((sum: number, item: any) => sum + (typeof item?.durationMs === "number" ? item.durationMs : 0), 0)
    : undefined;

  const adaptiveChunks = Array.isArray(result.adaptiveBatchChunks) ? result.adaptiveBatchChunks : [];
  const recoveryIndexes = Array.isArray(result.adaptiveBatchRecoveryIndexes)
    ? result.adaptiveBatchRecoveryIndexes.filter((index: any) => Number.isInteger(index))
    : [];
  const adaptiveDurationFromChunks = adaptiveChunks.length > 0
    ? adaptiveChunks.reduce((sum: number, item: any) => sum + (typeof item?.durationMs === "number" ? item.durationMs : 0), 0)
    : undefined;

  const optimizedDuration = extractOptimizedBatchDurationMs(result, timings);
  const isPartialHybrid = result.executionStrategy === "optimized-runtime-partial-plus-sequential";
  const isAdaptive = result.executionStrategy === "adaptive-optimized-chunks";
  const isAdaptiveRecovery = result.executionStrategy === "adaptive-optimized-chunks-plus-sequential-recovery";
  const totalDuration =
    (isAdaptive || isAdaptiveRecovery) && adaptiveDurationFromChunks !== undefined && adaptiveDurationFromChunks > 0
      ? adaptiveDurationFromChunks
      :
    isPartialHybrid && optimizedDuration.durationMs !== undefined
      ? Math.max(
          optimizedDuration.durationMs,
          totalDurationFromSubcommands && totalDurationFromSubcommands > 0 ? totalDurationFromSubcommands : 0,
        )
      : totalDurationFromSubcommands && totalDurationFromSubcommands > 0
      ? totalDurationFromSubcommands
      : optimizedDuration.durationMs;
  const dominantTiming = isPartialHybrid && optimizedDuration.dominantTiming
    ? optimizedDuration.dominantTiming
    : (isAdaptive || isAdaptiveRecovery) && adaptiveDurationFromChunks !== undefined
      ? isAdaptiveRecovery && recoveryIndexes.length > 0
        ? `result.adaptiveBatchRecoveryIndexes[${recoveryIndexes.join(",")}]`
        : "result.adaptiveBatchChunks.durationMs"
    : slowest
      ? `result.subResults[${slowest.index}].durationMs`
      : optimizedDuration.dominantTiming ?? null;
  const dominantTimingMs = isPartialHybrid && optimizedDuration.dominantTimingMs !== undefined
    ? optimizedDuration.dominantTimingMs
    : (isAdaptive || isAdaptiveRecovery) && adaptiveDurationFromChunks !== undefined
      ? adaptiveDurationFromChunks
    : slowest?.durationMs ?? optimizedDuration.dominantTimingMs;

  return {
    durationMs: totalDuration,
    failedSubcommandCount,
    dominantTiming,
    dominantTimingMs,
    category: (isAdaptive || isAdaptiveRecovery) ? "adaptive_batch" : "sequential_batch",
    executionStrategy: typeof result.executionStrategy === "string" ? result.executionStrategy : undefined,
    ...(slowest ? {
      slowestSubcommand: {
        index: Number(slowest.index),
        command: String(slowest.command),
        durationMs: Number(slowest.durationMs),
      },
    } : {}),
    slowestCommand: slowest?.command,
    slowestMs: slowest?.durationMs,
  };
}

function isSuccessfulJob(entry: unknown): boolean {
  return isRecord(entry) && isRecord(entry.result) && entry.result.ok === true;
}

export function analyzeCommandPerformance(
  entry: unknown,
  thresholdMs = DEFAULT_CMD_SLOW_THRESHOLD_MS,
): CommandPerformanceSummary {
  const timings = extractTimings(entry);
  const batchInfo = extractSequentialBatchInfo(entry, timings);
  const durationMs = batchInfo?.durationMs ?? extractDurationMs(timings);
  const flattened: Array<{ path: string; key: string; value: number }> = [];

  flattenNumericTimings(timings, flattened);

  const candidates = flattened
    .filter((item) => !isTotalOrControlTiming(item.key))
    .filter((item) => !isAggregateWrapperTiming(item.path, item.key))
    .filter((item) => timingPriority(item) > 0);

  const dominant = candidates
    .sort((a, b) => {
      const priorityDiff = timingPriority(b) - timingPriority(a);
      if (priorityDiff !== 0) return priorityDiff;
      return b.value - a.value;
    })[0];

  const normalizedThreshold = Math.max(0, Math.round(thresholdMs));
  const slow =
    isSuccessfulJob(entry) &&
    durationMs !== undefined &&
    durationMs > normalizedThreshold;

  return {
    durationMs,
    slow,
    thresholdMs: normalizedThreshold,
    dominantTiming: batchInfo?.dominantTiming ?? dominant?.path ?? null,
    dominantTimingMs: batchInfo?.dominantTimingMs ?? dominant?.value,
    category: batchInfo?.category ?? (dominant ? classifyTimingKey(dominant.key) : "unknown"),
    ...(batchInfo?.executionStrategy ? { executionStrategy: batchInfo.executionStrategy } : {}),
    ...(batchInfo?.slowestSubcommand ? { slowestSubcommand: batchInfo.slowestSubcommand } : {}),
  };
}

export function buildSlowSuccessWarning(
  performance: CommandPerformanceSummary,
): StructuredCommandWarning | null {
  if (!performance.slow) return null;

  const durationText = performance.durationMs ?? "unknown";
  const dominantText = performance.dominantTiming ?? "unknown";

  const isBatch = performance.category === "sequential_batch";
  const batchLabel = performance.executionStrategy === "optimized-runtime-multistep"
    ? "Optimized batch"
    : performance.executionStrategy === "optimized-runtime-partial-plus-sequential"
      ? "Partial optimized batch"
    : "Batch";

  return {
    code: "CMD_SLOW_SUCCESS",
    severity: "info",
    message: performance.slowestSubcommand
      ? `${batchLabel} succeeded but took ${durationText}ms, above threshold ${performance.thresholdMs}ms. Slowest subcommand: ${performance.slowestSubcommand.command}, ${performance.slowestSubcommand.durationMs}ms.`
      : isBatch
        ? `${batchLabel} succeeded but took ${durationText}ms, above threshold ${performance.thresholdMs}ms. Dominant timing: ${dominantText}.`
        : `Command succeeded but took ${durationText}ms, above threshold ${performance.thresholdMs}ms. Dominant timing: ${dominantText}.`,
    actionable: false,
  };
}

export function buildBridgeTimeoutWarning(entry: unknown): StructuredCommandWarning | null {
  if (!isRecord(entry) || !isRecord(entry.result)) return null;

  const result = entry.result;
  const errorCode = isRecord(result.error) && typeof result.error.code === "string"
    ? result.error.code
    : null;

  if (errorCode !== "IOS_EXEC_FAILED") {
    return null;
  }

  const timings = extractTimings(entry);
  const bridgeWaitMs = extractBridgeWaitMs(timings);
  const output = typeof result.output === "string" ? result.output.trim() : "";

  if ((bridgeWaitMs ?? 0) < 20_000 && output.length > 0) {
    return null;
  }

  return {
    code: "PT_TERMINAL_BRIDGE_TIMEOUT",
    severity: "warning",
    message: "Terminal command timed out waiting for Packet Tracer bridge. If this happened during concurrent jobs, retry with terminalConcurrency=1.",
    actionable: true,
  };
}

export function enrichCmdRunJobResultWithPerformance<T extends Record<string, any>>(
  entry: T,
  thresholdMs = DEFAULT_CMD_SLOW_THRESHOLD_MS,
): T & {
  performance: CommandPerformanceSummary;
  warnings?: StructuredCommandWarning[];
} {
  const performance = analyzeCommandPerformance(entry, thresholdMs);
  const bridgeTimeoutWarning = buildBridgeTimeoutWarning(entry);
  const partialFailureWarning = buildBatchPartialFailureWarning(entry);
  const warning = buildSlowSuccessWarning(performance);
  const existingWarnings = Array.isArray(entry.warnings) ? entry.warnings : [];

  return {
    ...entry,
    performance,
    ...(bridgeTimeoutWarning || partialFailureWarning || warning
      ? { warnings: [...existingWarnings, ...(bridgeTimeoutWarning ? [bridgeTimeoutWarning] : []), ...(partialFailureWarning ? [partialFailureWarning] : []), ...(warning ? [warning] : [])] }
      : {}),
  };
}
