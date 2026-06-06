import { describe, expect, test } from "bun:test";
import { FileBridgeMetrics, formatMetricsForHumans } from "./file-bridge-metrics.js";

describe("FileBridgeMetrics", () => {
  test("inicializa con todos los contadores en cero", () => {
    const metrics = new FileBridgeMetrics();
    const snap = metrics.getSnapshot();

    expect(snap.atomicWrites).toBe(0);
    expect(snap.atomicWriteFailures).toBe(0);
    expect(snap.readdirCalls).toBe(0);
    expect(snap.claimAttempts).toBe(0);
    expect(snap.jsonParses).toBe(0);
    expect(snap.resultsPublished).toBe(0);
    expect(snap.queueAppends).toBe(0);
    expect(snap.errors).toBe(0);
  });

  test("registra atomic writes con tiempo", () => {
    const metrics = new FileBridgeMetrics();
    metrics.recordAtomicWrite(5, true);
    metrics.recordAtomicWrite(10, true);
    metrics.recordAtomicWrite(3, false);

    const snap = metrics.getSnapshot();
    expect(snap.atomicWrites).toBe(3);
    expect(snap.atomicWriteFailures).toBe(1);
    expect(snap.averageAtomicWriteMs).toBe(6);
    expect(snap.maxAtomicWriteMs).toBe(10);
  });

  test("calcula cache hit rate de readdir", () => {
    const metrics = new FileBridgeMetrics();
    metrics.recordReaddir(1, true);
    metrics.recordReaddir(1, true);
    metrics.recordReaddir(1, true);
    metrics.recordReaddir(5, false);

    const snap = metrics.getSnapshot();
    expect(snap.readdirCalls).toBe(4);
    expect(snap.readdirCacheHits).toBe(3);
    expect(snap.readdirCacheMisses).toBe(1);
    expect(snap.readdirCacheHitRate).toBe(0.75);
    expect(snap.averageReaddirMs).toBe(2);
  });

  test("registra claims (renames)", () => {
    const metrics = new FileBridgeMetrics();
    metrics.recordClaim(2, true);
    metrics.recordClaim(2, true);
    metrics.recordClaim(2, false);

    const snap = metrics.getSnapshot();
    expect(snap.claimAttempts).toBe(3);
    expect(snap.claimSuccesses).toBe(2);
    expect(snap.claimFailures).toBe(1);
    expect(snap.claimSuccessRate).toBeCloseTo(0.667, 2);
  });

  test("registra JSON parse con fallos", () => {
    const metrics = new FileBridgeMetrics();
    metrics.recordJsonParse(1, true);
    metrics.recordJsonParse(2, true);
    metrics.recordJsonParse(100, false);

    const snap = metrics.getSnapshot();
    expect(snap.jsonParses).toBe(3);
    expect(snap.jsonParseFailures).toBe(1);
    expect(snap.averageJsonParseMs).toBe(34.33);
  });

  test("registra queue appends y compactaciones", () => {
    const metrics = new FileBridgeMetrics();
    metrics.recordQueueAppend(0.5);
    metrics.recordQueueAppend(0.5);
    metrics.recordQueueCompaction();

    const snap = metrics.getSnapshot();
    expect(snap.queueAppends).toBe(2);
    expect(snap.queueCompactations).toBe(1);
    expect(snap.averageQueueAppendMs).toBe(0.5);
  });

  test("registra errores y warnings", () => {
    const metrics = new FileBridgeMetrics();
    metrics.recordError();
    metrics.recordError();
    metrics.recordWarning();

    const snap = metrics.getSnapshot();
    expect(snap.errors).toBe(2);
    expect(snap.warnings).toBe(1);
  });

  test("getSnapshot es inmutable (cada llamada retorna un nuevo objeto)", () => {
    const metrics = new FileBridgeMetrics();
    metrics.recordError();

    const snap1 = metrics.getSnapshot();
    const snap2 = metrics.getSnapshot();
    expect(snap1).not.toBe(snap2);
    expect(snap1.errors).toBe(1);
    expect(snap2.errors).toBe(1);
  });

  test("reset limpia todos los contadores", () => {
    const metrics = new FileBridgeMetrics();
    metrics.recordError();
    metrics.recordAtomicWrite(10, true);
    metrics.recordClaim(5, true);
    metrics.recordQueueAppend(1);

    metrics.reset();
    const snap = metrics.getSnapshot();
    expect(snap.errors).toBe(0);
    expect(snap.atomicWrites).toBe(0);
    expect(snap.claimAttempts).toBe(0);
    expect(snap.queueAppends).toBe(0);
  });

  test("promedios retornan 0 cuando no hay samples", () => {
    const metrics = new FileBridgeMetrics();
    const snap = metrics.getSnapshot();
    expect(snap.averageAtomicWriteMs).toBe(0);
    expect(snap.averageReaddirMs).toBe(0);
    expect(snap.averageClaimMs).toBe(0);
    expect(snap.averageJsonParseMs).toBe(0);
    expect(snap.readdirCacheHitRate).toBe(0);
  });

  test("formatMetricsForHumans produce salida legible", () => {
    const metrics = new FileBridgeMetrics();
    metrics.recordAtomicWrite(5, true);
    metrics.recordReaddir(2, true);
    metrics.recordClaim(1, true);
    metrics.recordJsonParse(0.5, true);
    metrics.recordResultPublish(3, true);
    metrics.recordError();

    const output = formatMetricsForHumans(metrics.getSnapshot());
    expect(output).toContain("FileBridge Metrics");
    expect(output).toContain("Atomic writes:");
    expect(output).toContain("Readdir:");
    expect(output).toContain("Claim (rename):");
    expect(output).toContain("JSON parse:");
  });
});
