import { describe, expect, test } from "bun:test";
import {
  FlakeClassifier,
  crearFlakeSeriesFromResults,
  type FlakeSeries,
  type FlakeClassification,
} from "./flake-classifier.js";

describe("FlakeClassifier", () => {
  const crearObservaciones = (results: Array<{ ok: boolean }>): FlakeSeries => {
    return crearFlakeSeriesFromResults("test-scenario", results.map((r) => ({
      ok: r.ok,
      durationMs: 1000,
    })));
  };

  test("clasifica como unknown si hay datos insuficientes", () => {
    const classifier = new FlakeClassifier();
    const series = crearObservaciones([
      { ok: true },
      { ok: true },
    ]);

    const result = classifier.classify(series);

    expect(result.classification).toBe("unknown");
    expect(result.confidence).toBeLessThan(1);
  });

  test("clasifica como stable con alta tasa de éxito", () => {
    const classifier = new FlakeClassifier();
    const series = crearObservaciones([
      { ok: true }, { ok: true }, { ok: true }, { ok: true }, { ok: true },
      { ok: true }, { ok: true }, { ok: true }, { ok: true }, { ok: true },
    ]);

    const result = classifier.classify(series);

    expect(result.classification).toBe("stable");
    expect(result.passRate).toBe(1);
  });

  test("clasifica como broken con baja tasa de éxito", () => {
    const classifier = new FlakeClassifier();
    const series = crearObservaciones([
      { ok: false }, { ok: false }, { ok: false }, { ok: false }, { ok: false },
      { ok: false }, { ok: false }, { ok: false }, { ok: false }, { ok: false },
    ]);

    const result = classifier.classify(series);

    expect(result.classification).toBe("broken");
    expect(result.passRate).toBe(0);
  });

  test("clasifica como flaky con tasa de éxito intermedia", () => {
    const classifier = new FlakeClassifier();
    const series = crearObservaciones([
      { ok: true }, { ok: true }, { ok: false }, { ok: true }, { ok: false },
      { ok: true }, { ok: true }, { ok: false }, { ok: true }, { ok: true },
    ]);

    const result = classifier.classify(series);

    expect(result.classification).toBe("flaky");
    expect(result.passRate).toBeGreaterThan(0.3);
    expect(result.passRate).toBeLessThan(0.95);
  });

  test("clasifica como recovering cuando tendencia es degradante", () => {
    const classifier = new FlakeClassifier();
    const observations = [
      { ok: true, durationMs: 1000 }, { ok: true, durationMs: 1000 }, { ok: true, durationMs: 1000 },
      { ok: true, durationMs: 1000 }, { ok: true, durationMs: 1000 },
      { ok: true, durationMs: 1000 }, { ok: false, durationMs: 1000 }, { ok: false, durationMs: 1000 },
      { ok: false, durationMs: 1000 }, { ok: false, durationMs: 1000 },
    ];
    const series = crearFlakeSeriesFromResults("test", observations);

    const result = classifier.classify(series);

    expect(result.recentTrend).toBe("degrading");
  });

  test("classifyBatch clasifica múltiples series", () => {
    const classifier = new FlakeClassifier();
    const series1 = crearObservaciones([
      { ok: true }, { ok: true }, { ok: true }, { ok: true }, { ok: true },
    ]);
    const series2 = crearObservaciones([
      { ok: false }, { ok: false }, { ok: false }, { ok: false }, { ok: false },
    ]);

    const results = classifier.classifyBatch([series1, series2]);

    expect(results.get("test-scenario")?.classification).toBeDefined();
  });

  test("getFlakySeries filtra solo series flaky o broken", () => {
    const classifier = new FlakeClassifier();
    const seriesStable = crearObservaciones([
      { ok: true }, { ok: true }, { ok: true }, { ok: true }, { ok: true },
      { ok: true }, { ok: true }, { ok: true }, { ok: true }, { ok: true },
    ]);
    const seriesBroken = crearObservaciones([
      { ok: false }, { ok: false }, { ok: false }, { ok: false }, { ok: false },
    ]);

    const flaky = classifier.getFlakySeries([seriesStable, seriesBroken]);

    expect(flaky).toHaveLength(1);
    expect(flaky[0]).toBe(seriesBroken);
  });

  test("getFlakeRanking ordena por severidad", () => {
    const classifier = new FlakeClassifier();
    const seriesBroken = crearFlakeSeriesFromResults("broken", [
      { ok: false, durationMs: 1000 }, { ok: false, durationMs: 1000 },
      { ok: false, durationMs: 1000 }, { ok: false, durationMs: 1000 },
      { ok: false, durationMs: 1000 },
    ]);
    const seriesFlaky = crearFlakeSeriesFromResults("flaky", [
      { ok: true, durationMs: 1000 }, { ok: false, durationMs: 1000 },
      { ok: true, durationMs: 1000 }, { ok: false, durationMs: 1000 },
      { ok: true, durationMs: 1000 },
    ]);

    const ranking = classifier.getFlakeRanking([seriesBroken, seriesFlaky]);

    expect(ranking).toHaveLength(2);
    expect(ranking[0]!.classification).toBe("broken");
    expect(ranking[1]!.classification).toBe("flaky");
  });
});

describe("crearFlakeSeriesFromResults", () => {
  test("crea serie desde resultados", () => {
    const results = [
      { ok: true, durationMs: 1000 },
      { ok: false, durationMs: 1100, error: "timeout" },
      { ok: true, durationMs: 950 },
    ];

    const series = crearFlakeSeriesFromResults("test-scenario", results);

    expect(series.id).toBe("test-scenario");
    expect(series.observations).toHaveLength(3);
    expect(series.observations[0]!.ok).toBe(true);
    expect(series.observations[1]!.ok).toBe(false);
    expect(series.observations[1]!.error).toBe("timeout");
    expect(series.firstSeen).toBeDefined();
    expect(series.lastSeen).toBeDefined();
  });

  test("calcula timestamps correctamente", () => {
    const now = Date.now();
    const results = [
      { ok: true, durationMs: 1000 },
      { ok: true, durationMs: 1000 },
    ];

    const series = crearFlakeSeriesFromResults("test", results);

    expect(series.firstSeen).toBeLessThanOrEqual(now);
    expect(series.lastSeen).toBeGreaterThanOrEqual(series.firstSeen);
  });
});
