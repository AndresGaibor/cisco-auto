/**
 * Benchmark types for CLI observability.
 */

export interface BenchmarkRunResult {
  command: string;
  runIndex: number;
  ok: boolean;
  durationMs: number;
  status: number;
  outputPreview: string;
  error?: string;
}

export interface BenchmarkCommandResult {
  command: string;
  runs: number;
  medianMs: number;
  p95Ms: number;
  minMs: number;
  maxMs: number;
  okCount: number;
  errorCount: number;
  timings: BenchmarkTimings;
}

export interface BenchmarkTimings {
  inspectDeviceFastMs: Record<string, number>;
  terminalPlanSubmitMs: Record<string, number>;
  terminalPlanPollBridgeMs: Record<string, number>;
  terminalPlanPollQueueLatencyMs: Record<string, number>;
  waitMs: Record<string, number>;
  queueLatencyMs: Record<string, number>;
  execLatencyMs: Record<string, number>;
}

export interface BenchmarkReport {
  schemaVersion: "1.0";
  action: "bench.cmd";
  device: string;
  commands: BenchmarkCommandResult[];
  summary: BenchmarkSummary;
}

export interface BenchmarkSummary {
  totalRuns: number;
  totalCommands: number;
  overallMedianMs: number;
  overallP95Ms: number;
  errors: number;
}

export interface BridgeStats {
  schemaVersion: "1.0";
  ptDevDir: string;
  commands: QueueStats;
  inFlight: QueueStats;
  deadLetter: QueueStats;
  lastModified?: string;
}

export interface QueueStats {
  count: number;
  oldest?: string;
  newest?: string;
}

export interface BridgeCleanResult {
  schemaVersion: "1.0";
  action: "bridge.clean";
  dryRun: boolean;
  removed: string[];
  errors: string[];
}

export interface RuntimeTraceEntry {
  id: string;
  type: string;
  completedAt: number;
  ok?: boolean;
  ts?: number;
  status?: string;
  commandType?: string;
}

export interface RuntimeTraceReport {
  schemaVersion: "1.0";
  action: "runtime.trace";
  entries: RuntimeTraceEntry[];
  count: number;
}