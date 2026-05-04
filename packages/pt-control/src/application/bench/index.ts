/**
 * Bench module - Benchmark service for CLI observability.
 */

export type {
  BenchmarkRunResult,
  BenchmarkCommandResult,
  BenchmarkTimings,
  BenchmarkReport,
  BenchmarkSummary,
} from "../bench-types.js";

export { runBenchmark, parseCommandString, summarizeBenchmarkResults } from "./benchmark-service.js";