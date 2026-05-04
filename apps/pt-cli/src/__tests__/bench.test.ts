import { describe, expect, test } from "bun:test";
import { parseCommandString, summarizeBenchmarkResults } from "@cisco-auto/pt-control/application/bench";
import type { BenchmarkCommandResult } from "@cisco-auto/pt-control/application/bench";

describe("parseCommandString", () => {
  test("parsea comandos separados por coma", () => {
    const result = parseCommandString("show version,show ip interface brief,show running-config");
    expect(result).toEqual(["show version", "show ip interface brief", "show running-config"]);
  });

  test("trim whitespace de cada comando", () => {
    const result = parseCommandString("show version , show ip int brief ");
    expect(result).toEqual(["show version", "show ip int brief"]);
  });

  test("filtra strings vacíos", () => {
    const result = parseCommandString("show version,,show running-config");
    expect(result).toEqual(["show version", "show running-config"]);
  });

  test("maneja un solo comando sin coma", () => {
    const result = parseCommandString("show version");
    expect(result).toEqual(["show version"]);
  });

  test("retorna array vacío para string vacío", () => {
    const result = parseCommandString("");
    expect(result).toEqual([]);
  });

  test("retorna array vacío para solo espacios y comas", () => {
    const result = parseCommandString("   ,  ,   ");
    expect(result).toEqual([]);
  });
});

describe("summarizeBenchmarkResults", () => {
  test("calcula totales correctamente", () => {
    const results: BenchmarkCommandResult[] = [
      {
        command: "show version",
        runs: 3,
        medianMs: 1000,
        p95Ms: 1200,
        minMs: 900,
        maxMs: 1300,
        okCount: 3,
        errorCount: 0,
        timings: { inspectDeviceFastMs: {}, terminalPlanSubmitMs: {}, terminalPlanPollBridgeMs: {}, terminalPlanPollQueueLatencyMs: {}, waitMs: {}, queueLatencyMs: {}, execLatencyMs: {} },
      },
      {
        command: "show interfaces",
        runs: 3,
        medianMs: 2000,
        p95Ms: 2500,
        minMs: 1800,
        maxMs: 2800,
        okCount: 3,
        errorCount: 0,
        timings: { inspectDeviceFastMs: {}, terminalPlanSubmitMs: {}, terminalPlanPollBridgeMs: {}, terminalPlanPollQueueLatencyMs: {}, waitMs: {}, queueLatencyMs: {}, execLatencyMs: {} },
      },
    ];

    const summary = summarizeBenchmarkResults(results);

    expect(summary.totalRuns).toBe(6);
    expect(summary.totalCommands).toBe(2);
    expect(summary.errors).toBe(0);
  });

  test("conta errores correctamente", () => {
    const results: BenchmarkCommandResult[] = [
      {
        command: "show version",
        runs: 3,
        medianMs: 1000,
        p95Ms: 1200,
        minMs: 900,
        maxMs: 1300,
        okCount: 2,
        errorCount: 1,
        timings: { inspectDeviceFastMs: {}, terminalPlanSubmitMs: {}, terminalPlanPollBridgeMs: {}, terminalPlanPollQueueLatencyMs: {}, waitMs: {}, queueLatencyMs: {}, execLatencyMs: {} },
      },
    ];

    const summary = summarizeBenchmarkResults(results);

    expect(summary.totalRuns).toBe(3);
    expect(summary.errors).toBe(1);
  });
});

describe("benchmark JSON output stability", () => {
  test("el JSON del benchmark report tiene schemaVersion", () => {
    const results: BenchmarkCommandResult[] = [
      {
        command: "show version",
        runs: 3,
        medianMs: 1000,
        p95Ms: 1200,
        minMs: 900,
        maxMs: 1300,
        okCount: 3,
        errorCount: 0,
        timings: { inspectDeviceFastMs: {}, terminalPlanSubmitMs: {}, terminalPlanPollBridgeMs: {}, terminalPlanPollQueueLatencyMs: {}, waitMs: {}, queueLatencyMs: {}, execLatencyMs: {} },
      },
    ];

    const summary = summarizeBenchmarkResults(results);
    const report = {
      schemaVersion: "1.0" as const,
      action: "bench.cmd" as const,
      device: "SW-SRV-DIST",
      commands: results.map((r) => ({
        command: r.command,
        runs: r.runs,
        medianMs: r.medianMs,
        p95Ms: r.p95Ms,
        minMs: r.minMs,
        maxMs: r.maxMs,
        okCount: r.okCount,
        errorCount: r.errorCount,
        timings: r.timings,
      })),
      summary: {
        totalRuns: summary.totalRuns,
        totalCommands: summary.totalCommands,
        overallMedianMs: summary.overallMedianMs,
        overallP95Ms: summary.overallP95Ms,
        errors: summary.errors,
      },
    };

    expect(report.schemaVersion).toBe("1.0");
    expect(report.action).toBe("bench.cmd");
    expect(() => JSON.stringify(report)).not.toThrow();
  });

  test("el JSON del report es parseable y estable", () => {
    const results: BenchmarkCommandResult[] = [
      {
        command: "show version",
        runs: 3,
        medianMs: 1000,
        p95Ms: 1200,
        minMs: 900,
        maxMs: 1300,
        okCount: 3,
        errorCount: 0,
        timings: { inspectDeviceFastMs: {}, terminalPlanSubmitMs: {}, terminalPlanPollBridgeMs: {}, terminalPlanPollQueueLatencyMs: {}, waitMs: {}, queueLatencyMs: {}, execLatencyMs: {} },
      },
    ];

    const summary = summarizeBenchmarkResults(results);
    const report = {
      schemaVersion: "1.0" as const,
      action: "bench.cmd" as const,
      device: "SW-SRV-DIST",
      commands: results.map((r) => ({
        command: r.command,
        runs: r.runs,
        medianMs: r.medianMs,
        p95Ms: r.p95Ms,
        minMs: r.minMs,
        maxMs: r.maxMs,
        okCount: r.okCount,
        errorCount: r.errorCount,
        timings: r.timings,
      })),
      summary: {
        totalRuns: summary.totalRuns,
        totalCommands: summary.totalCommands,
        overallMedianMs: summary.overallMedianMs,
        overallP95Ms: summary.overallP95Ms,
        errors: summary.errors,
      },
    };

    const json = JSON.stringify(report);
    const parsed = JSON.parse(json);

    expect(parsed.schemaVersion).toBe("1.0");
    expect(parsed.action).toBe("bench.cmd");
    expect(parsed.device).toBe("SW-SRV-DIST");
    expect(parsed.commands).toHaveLength(1);
    expect(parsed.commands[0].command).toBe("show version");
    expect(parsed.summary.totalRuns).toBe(3);
  });
});