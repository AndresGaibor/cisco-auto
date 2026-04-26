import { describe, expect, test } from "bun:test";
import {
  TimingCollector,
  crearTimingSummary,
  formatDuration,
  generarTimingReport,
  type TimingSample,
} from "./timing-metrics.js";

describe("TimingCollector", () => {
  test("record agrega muestra al historial", () => {
    const collector = new TimingCollector();

    collector.record("operation1", 100, true);

    const metrics = collector.getMetrics("operation1");

    expect(metrics).not.toBeNull();
    expect(metrics!.sampleCount).toBe(1);
    expect(metrics!.avgMs).toBe(100);
  });

  test("record múltiples muestras calcula percentiles", () => {
    const collector = new TimingCollector();

    collector.record("op1", 100, true);
    collector.record("op1", 200, true);
    collector.record("op1", 150, true);
    collector.record("op1", 300, true);
    collector.record("op1", 250, true);

    const metrics = collector.getMetrics("op1");

    expect(metrics!.sampleCount).toBe(5);
    expect(metrics!.minMs).toBe(100);
    expect(metrics!.maxMs).toBe(300);
    expect(metrics!.avgMs).toBe(200);
    expect(metrics!.medianMs).toBe(200);
  });

  test("record respecula windowSize", () => {
    const collector = new TimingCollector({ windowSize: 3 });

    collector.record("op1", 100, true);
    collector.record("op1", 200, true);
    collector.record("op1", 300, true);
    collector.record("op1", 400, true);

    const metrics = collector.getMetrics("op1");

    expect(metrics!.sampleCount).toBe(3);
  });

  test("getMetrics retorna null para operación inexistente", () => {
    const collector = new TimingCollector();

    const metrics = collector.getMetrics("nonexistent");

    expect(metrics).toBeNull();
  });

  test("getRegisteredOperations lista operaciones", () => {
    const collector = new TimingCollector();

    collector.record("op1", 100, true);
    collector.record("op2", 200, true);

    const ops = collector.getRegisteredOperations();

    expect(ops).toContain("op1");
    expect(ops).toContain("op2");
  });

  test("clear elimina historial", () => {
    const collector = new TimingCollector();

    collector.record("op1", 100, true);
    collector.record("op1", 200, true);
    collector.clear("op1");

    expect(collector.getMetrics("op1")).toBeNull();
  });

  test("clear sin argumento limpia todo", () => {
    const collector = new TimingCollector();

    collector.record("op1", 100, true);
    collector.record("op2", 200, true);
    collector.clear();

    expect(collector.getMetrics("op1")).toBeNull();
    expect(collector.getMetrics("op2")).toBeNull();
  });

  test("compareWithBaseline detecta regresión", () => {
    const collector = new TimingCollector();

    const baselineSamples: TimingSample[] = [
      { operationId: "op1", timestamp: 1000, durationMs: 100, ok: true },
      { operationId: "op1", timestamp: 2000, durationMs: 100, ok: true },
      { operationId: "op1", timestamp: 3000, durationMs: 100, ok: true },
    ];

    collector.record("op1", 100, true);
    collector.record("op1", 100, true);
    collector.record("op1", 100, true);
    collector.record("op1", 500, true);
    collector.record("op1", 500, true);

    const comparison = collector.compareWithBaseline("op1", baselineSamples);

    expect(comparison).not.toBeNull();
    expect(comparison!.isRegression).toBe(true);
    expect(comparison!.deltaAvgMs).toBeGreaterThan(0);
  });

  test("isSlowerThan detecta cuando es más lento", () => {
    const collector = new TimingCollector();

    const baselineSamples: TimingSample[] = [
      { operationId: "op1", timestamp: 1000, durationMs: 100, ok: true },
      { operationId: "op1", timestamp: 2000, durationMs: 100, ok: true },
    ];

    collector.record("op1", 500, true);
    collector.record("op1", 500, true);

    expect(collector.isSlowerThan("op1", baselineSamples, 0.2)).toBe(true);
  });

  test("isSlowerThan retorna false si no hay regresión", () => {
    const collector = new TimingCollector();

    const baselineSamples: TimingSample[] = [
      { operationId: "op1", timestamp: 1000, durationMs: 100, ok: true },
      { operationId: "op1", timestamp: 2000, durationMs: 100, ok: true },
    ];

    collector.record("op1", 105, true);
    collector.record("op1", 95, true);

    expect(collector.isSlowerThan("op1", baselineSamples, 0.2)).toBe(false);
  });

  test("getHistory retorna copia del historial", () => {
    const collector = new TimingCollector();

    collector.record("op1", 100, true);
    collector.record("op1", 200, true);

    const history = collector.getHistory("op1");
    history.push({ operationId: "op1", timestamp: 999, durationMs: 999, ok: false });

    const metrics = collector.getMetrics("op1");

    expect(metrics!.sampleCount).toBe(2);
  });
});

describe("formatDuration", () => {
  test("formatea microsegundos", () => {
    expect(formatDuration(0.5)).toBe("500µs");
  });

  test("formatea milisegundos", () => {
    expect(formatDuration(500)).toBe("500.0ms");
  });

  test("formatea segundos", () => {
    expect(formatDuration(2500)).toBe("2.50s");
  });

  test("formatea minutos", () => {
    expect(formatDuration(120000)).toBe("2.00m");
  });
});

describe("crearTimingSummary", () => {
  test("crea resumen vacío", () => {
    const summary = crearTimingSummary([]);

    expect(summary.totalOperations).toBe(0);
    expect(summary.regressions).toBe(0);
    expect(summary.improvements).toBe(0);
    expect(summary.stable).toBe(0);
  });

  test("calcula estadísticas correctamente", () => {
    const comparisons = [
      {
        operationId: "op1",
        current: { operationId: "op1", sampleCount: 5, minMs: 100, maxMs: 500, avgMs: 300, medianMs: 300, p95Ms: 450, p99Ms: 500, stdDevMs: 100, cv: 0.33, outliers: 0 },
        baseline: { operationId: "op1", sampleCount: 5, minMs: 100, maxMs: 500, avgMs: 100, medianMs: 100, p95Ms: 200, p99Ms: 200, stdDevMs: 10, cv: 0.1, outliers: 0 },
        deltaAvgMs: 200,
        deltaP95Ms: 250,
        isRegression: true,
        regressionPercentage: 200,
      },
      {
        operationId: "op2",
        current: { operationId: "op2", sampleCount: 5, minMs: 50, maxMs: 100, avgMs: 75, medianMs: 75, p95Ms: 90, p99Ms: 100, stdDevMs: 5, cv: 0.07, outliers: 0 },
        baseline: { operationId: "op2", sampleCount: 5, minMs: 50, maxMs: 100, avgMs: 100, medianMs: 100, p95Ms: 100, p99Ms: 100, stdDevMs: 5, cv: 0.05, outliers: 0 },
        deltaAvgMs: -25,
        deltaP95Ms: -10,
        isRegression: false,
        regressionPercentage: -25,
      },
    ];

    const summary = crearTimingSummary(comparisons);

    expect(summary.totalOperations).toBe(2);
    expect(summary.regressions).toBe(1);
    expect(summary.improvements).toBe(1);
    expect(summary.avgRegressionPercentage).toBe(200);
  });
});

describe("generarTimingReport", () => {
  test("genera reporte vacío", () => {
    const report = generarTimingReport(new Map());

    expect(report).toContain("REPORTE DE TIMING");
    expect(report).toContain("=".repeat(70));
  });

  test("genera reporte con operaciones", () => {
    const metrics = new Map<string, import("./timing-metrics.js").TimingMetrics>();
    metrics.set("op1", {
      operationId: "op1",
      sampleCount: 10,
      minMs: 100,
      maxMs: 500,
      avgMs: 250,
      medianMs: 240,
      p95Ms: 450,
      p99Ms: 490,
      stdDevMs: 80,
      cv: 0.32,
      outliers: 1,
    });

    const report = generarTimingReport(metrics);

    expect(report).toContain("op1");
    expect(report).toContain("10");
    expect(report).toContain("250");
  });
});
