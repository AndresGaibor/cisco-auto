/**
 * Benchmark service - Runs commands multiple times and collects timing statistics.
 */

import type { BenchmarkRunResult, BenchmarkCommandResult, BenchmarkTimings } from "../bench-types.js";
import type { PTController } from "../../controller/index.js";
import type { BridgeResultTimings } from "@cisco-auto/types";

export interface RunBenchmarkOptions {
  device: string;
  commands: string[];
  runs: number;
  controller: PTController;
}

interface ExecIosResult {
  raw: string;
  parsed?: unknown;
}

export async function runBenchmark(options: RunBenchmarkOptions): Promise<BenchmarkCommandResult[]> {
  const { device, commands, runs, controller } = options;
  const results: BenchmarkCommandResult[] = [];

  for (const command of commands) {
    const runResults: BenchmarkRunResult[] = [];

    for (let i = 0; i < runs; i++) {
      const start = Date.now();
      let ok = false;
      let status = 0;
      let outputPreview = "";
      let errorMsg: string | undefined;

      try {
        const execResult = await controller.execIos<ExecIosResult>(device, command, false, 30_000) as ExecIosResult;
        const end = Date.now();
        const raw = execResult?.raw ?? "";
        ok = raw.trim().length > 0;
        outputPreview = raw.slice(0, 100);
        status = ok ? 0 : 1;
        runResults.push({
          command,
          runIndex: i,
          ok,
          durationMs: end - start,
          status,
          outputPreview,
        });
      } catch (e) {
        const end = Date.now();
        errorMsg = e instanceof Error ? e.message : String(e);
        runResults.push({
          command,
          runIndex: i,
          ok: false,
          durationMs: end - start,
          status: 1,
          outputPreview: "",
          error: errorMsg,
        });
      }
    }

    const durations = runResults.map((r) => r.durationMs).sort((a, b) => a - b);
    const medianMs = durations[Math.floor(durations.length / 2)] ?? 0;
    const p95Index = Math.min(Math.floor(durations.length * 0.95), durations.length - 1);
    const p95Ms = durations[p95Index] ?? 0;

    const commandTimings = buildCommandTimings(runResults);

    results.push({
      command,
      runs: runResults.length,
      medianMs,
      p95Ms,
      minMs: durations[0] ?? 0,
      maxMs: durations[durations.length - 1] ?? 0,
      okCount: runResults.filter((r) => r.ok).length,
      errorCount: runResults.filter((r) => !r.ok).length,
      timings: commandTimings,
    });
  }

  return results;
}

function buildCommandTimings(runResults: BenchmarkRunResult[]): BenchmarkTimings {
  const timings: BenchmarkTimings = {
    inspectDeviceFastMs: {},
    terminalPlanSubmitMs: {},
    terminalPlanPollBridgeMs: {},
    terminalPlanPollQueueLatencyMs: {},
    waitMs: {},
    queueLatencyMs: {},
    execLatencyMs: {},
  };

  return timings;
}

export function parseCommandString(commandsStr: string): string[] {
  return commandsStr
    .split(",")
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}

export function summarizeBenchmarkResults(results: BenchmarkCommandResult[]): {
  totalRuns: number;
  totalCommands: number;
  overallMedianMs: number;
  overallP95Ms: number;
  errors: number;
} {
  const totalRuns = results.reduce((acc, r) => acc + r.runs, 0);
  const totalCommands = results.length;
  const allDurations = results.flatMap((r) => [r.medianMs, r.p95Ms]);
  const overallMedianMs = allDurations.sort((a, b) => a - b)[Math.floor(allDurations.length / 2)] ?? 0;
  const overallP95Ms = allDurations.sort((a, b) => a - b)[Math.floor(allDurations.length * 0.95)] ?? 0;
  const errors = results.reduce((acc, r) => acc + r.errorCount, 0);

  return { totalRuns, totalCommands, overallMedianMs, overallP95Ms, errors };
}