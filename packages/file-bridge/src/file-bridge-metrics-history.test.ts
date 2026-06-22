/**
 * Tests para FileBridgeMetricsHistory - persistencia NDJSON rotada
 * y consultas históricas de métricas del FileBridge.
 *
 * Convenciones:
 * - Cada test usa un directorio temporal único (mkdtempSync)
 * - Se limpia con rmSync en afterEach
 * - Los tests son single-threaded (asumiendo Node.js)
 */
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, readFileSync, statSync, readdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileBridgeMetrics } from "./file-bridge-metrics.js";
import {
  FileBridgeMetricsHistory,
  getSnapshotAndPersist,
} from "./file-bridge-metrics-history.js";
import type { FileBridgeMetricsSnapshot } from "./file-bridge-metrics.js";

function makeTestRoot(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

function makeSnapshot(timestamp: number, atomicWrites: number): FileBridgeMetricsSnapshot {
  return {
    timestamp,
    atomicWrites,
    atomicWriteFailures: 0,
    totalAtomicWriteMs: atomicWrites * 5,
    averageAtomicWriteMs: atomicWrites > 0 ? 5 : 0,
    maxAtomicWriteMs: 5,
    readdirCalls: 0,
    readdirCacheHits: 0,
    readdirCacheMisses: 0,
    readdirCacheHitRate: 0,
    totalReaddirMs: 0,
    averageReaddirMs: 0,
    claimAttempts: 0,
    claimSuccesses: 0,
    claimFailures: 0,
    claimSuccessRate: 0,
    totalClaimMs: 0,
    averageClaimMs: 0,
    jsonParses: 0,
    jsonParseFailures: 0,
    totalJsonParseMs: 0,
    averageJsonParseMs: 0,
    resultsPublished: 0,
    resultsFailed: 0,
    totalResultPublishMs: 0,
    averageResultPublishMs: 0,
    queueAppends: 0,
    queueCompactations: 0,
    totalQueueAppendMs: 0,
    averageQueueAppendMs: 0,
    errors: 0,
    warnings: 0,
    pickNextCommandCalls: 0,
    pickNextCommandSkippedByMtime: 0,
    pickNextCommandByCacheHit: 0,
  };
}

describe("FileBridgeMetricsHistory", () => {
  let root: string;
  let history: FileBridgeMetricsHistory;

  beforeEach(() => {
    root = makeTestRoot("file-bridge-metrics-history-");
    history = new FileBridgeMetricsHistory(root);
  });

  afterEach(() => {
    try {
      rmSync(root, { recursive: true, force: true });
    } catch {}
  });

  describe("record + getRecent", () => {
    test("persiste snapshots como líneas NDJSON y getRecent los retorna en orden", () => {
      history.record(makeSnapshot(1000, 1));
      history.record(makeSnapshot(2000, 2));
      history.record(makeSnapshot(3000, 3));

      const recent = history.getRecent(10);
      expect(recent).toHaveLength(3);
      expect(recent[0]?.atomicWrites).toBe(1);
      expect(recent[1]?.atomicWrites).toBe(2);
      expect(recent[2]?.atomicWrites).toBe(3);

      // Verificar formato NDJSON (una línea por snapshot)
      const content = readFileSync(history.getCurrentFile(), "utf8");
      const lines = content.trim().split("\n");
      expect(lines).toHaveLength(3);
      for (const line of lines) {
        expect(() => JSON.parse(line)).not.toThrow();
      }
    });

    test("getRecent respeta el límite retornando los últimos N", () => {
      for (let i = 0; i < 5; i++) {
        history.record(makeSnapshot(1000 + i, i));
      }

      const lastTwo = history.getRecent(2);
      expect(lastTwo).toHaveLength(2);
      expect(lastTwo[0]?.atomicWrites).toBe(3);
      expect(lastTwo[1]?.atomicWrites).toBe(4);
    });

    test("getRecent con limit=0 retorna lista vacía", () => {
      history.record(makeSnapshot(1000, 1));
      expect(history.getRecent(0)).toEqual([]);
    });
  });

  describe("getSince", () => {
    test("retorna solo snapshots con timestamp >= al indicado", () => {
      history.record(makeSnapshot(1000, 1));
      history.record(makeSnapshot(2000, 2));
      history.record(makeSnapshot(3000, 3));

      const since = history.getSince(2000);
      expect(since).toHaveLength(2);
      expect(since[0]?.timestamp).toBe(2000);
      expect(since[1]?.timestamp).toBe(3000);
    });

    test("getSince con timestamp futuro retorna lista vacía", () => {
      history.record(makeSnapshot(1000, 1));
      expect(history.getSince(5000)).toEqual([]);
    });
  });

  describe("pruneOlderThan", () => {
    test("elimina snapshots con timestamp anterior al cutoff y conserva los recientes", () => {
      const now = Date.now();
      history.record(makeSnapshot(now - 10000, 1));
      history.record(makeSnapshot(now - 5000, 2));
      history.record(makeSnapshot(now - 1000, 3));
      history.record(makeSnapshot(now, 4));

      const removed = history.pruneOlderThan(3000);
      expect(removed).toBe(2);

      const remaining = history.getRecent(10);
      expect(remaining).toHaveLength(2);
      expect(remaining[0]?.atomicWrites).toBe(3);
      expect(remaining[1]?.atomicWrites).toBe(4);
    });

    test("pruneOlderThan retorna 0 si no hay nada que podar", () => {
      history.record(makeSnapshot(Date.now(), 1));
      const removed = history.pruneOlderThan(60_000);
      expect(removed).toBe(0);
    });
  });

  describe("rotateIfNeeded", () => {
    test("rota el archivo cuando excede maxBytes", () => {
      const smallHistory = new FileBridgeMetricsHistory(root, { maxBytes: 200 });

      // Escribir suficientes snapshots para superar los 200 bytes
      for (let i = 0; i < 10; i++) {
        smallHistory.record(makeSnapshot(1000 + i, i));
      }

      smallHistory.rotateIfNeeded(200);

      // Debe haber al menos un archivo rotado
      const files = readdirSync(smallHistory.getHistoryDir());
      const rotatedFiles = files.filter((f) => f.match(/^metrics\.\d+-\d+\.ndjson$/));
      expect(rotatedFiles.length).toBeGreaterThanOrEqual(1);

      // El archivo actual debe existir y estar vacío o recién creado
      expect(existsSync(smallHistory.getCurrentFile())).toBe(true);
      const currentSize = statSync(smallHistory.getCurrentFile()).size;
      expect(currentSize).toBeLessThan(200);
    });

    test("no rota el archivo si está por debajo del umbral", () => {
      const smallHistory = new FileBridgeMetricsHistory(root, { maxBytes: 1024 * 1024 });
      smallHistory.record(makeSnapshot(1000, 1));

      smallHistory.rotateIfNeeded(1024 * 1024);

      const files = readdirSync(smallHistory.getHistoryDir());
      const rotatedFiles = files.filter((f) => f.match(/^metrics\.\d+-\d+\.ndjson$/));
      expect(rotatedFiles).toHaveLength(0);
    });
  });

  describe("auto snapshot", () => {
    test("captura snapshots automáticamente cada intervalMs", async () => {
      const metrics = new FileBridgeMetrics();
      metrics.recordAtomicWrite(7, true);

      history.startAutoSnapshot(metrics, 30);
      await new Promise((resolve) => setTimeout(resolve, 120));
      history.stopAutoSnapshot();

      const recent = history.getRecent(50);
      expect(recent.length).toBeGreaterThanOrEqual(2);
      // Cada snapshot capturado debe tener el contador incrementado en 7
      for (const snap of recent) {
        expect(snap.atomicWrites).toBe(1);
        expect(snap.averageAtomicWriteMs).toBe(7);
      }
    });

    test("startAutoSnapshot reemplaza un timer previo sin duplicar capturas", async () => {
      const metrics = new FileBridgeMetrics();

      history.startAutoSnapshot(metrics, 30);
      history.startAutoSnapshot(metrics, 30); // debe reiniciar el timer
      await new Promise((resolve) => setTimeout(resolve, 80));
      history.stopAutoSnapshot();

      // El conteo debe ser razonable (no duplicado por timers concurrentes)
      const recent = history.getRecent(100);
      expect(recent.length).toBeLessThan(10);
      expect(recent.length).toBeGreaterThan(0);
    });

    test("stopAutoSnapshot detiene las capturas", async () => {
      const metrics = new FileBridgeMetrics();
      history.startAutoSnapshot(metrics, 30);
      await new Promise((resolve) => setTimeout(resolve, 80));
      history.stopAutoSnapshot();

      const baseline = history.getRecent(100).length;
      await new Promise((resolve) => setTimeout(resolve, 100));
      const afterStop = history.getRecent(100).length;
      expect(afterStop).toBe(baseline);
    });
  });

  describe("concurrencia", () => {
    test("múltiples records en paralelo preservan todas las entradas", () => {
      const N = 100;
      const promises: Promise<void>[] = [];
      for (let i = 0; i < N; i++) {
        promises.push(
          Promise.resolve().then(() => history.record(makeSnapshot(1000 + i, i))),
        );
      }
      // Esperar a que todas las promesas se resuelvan
      return Promise.all(promises).then(() => {
        const recent = history.getRecent(N + 10);
        expect(recent).toHaveLength(N);
        // Cada atomicWrites de 0..N-1 debe estar presente exactamente una vez
        const seen = new Set<number>();
        for (const snap of recent) {
          seen.add(snap.atomicWrites);
        }
        expect(seen.size).toBe(N);
      });
    });
  });

  describe("persistencia tras crash", () => {
    test("una nueva instancia leyendo del mismo directorio recupera los snapshots previos", () => {
      history.record(makeSnapshot(1000, 1));
      history.record(makeSnapshot(2000, 2));
      history.record(makeSnapshot(3000, 3));

      // Simular crash: descartar la instancia y crear una nueva
      history.stopAutoSnapshot();
      const recovered = new FileBridgeMetricsHistory(root);

      const recent = recovered.getRecent(10);
      expect(recent).toHaveLength(3);
      expect(recent[0]?.atomicWrites).toBe(1);
      expect(recent[1]?.atomicWrites).toBe(2);
      expect(recent[2]?.atomicWrites).toBe(3);

      // Verificar que getSince también funciona en la instancia recuperada
      const since = recovered.getSince(2000);
      expect(since).toHaveLength(2);
    });

    test("las nuevas escrituras se concatenan a las existentes tras recuperar", () => {
      history.record(makeSnapshot(1000, 1));
      history.stopAutoSnapshot();

      const recovered = new FileBridgeMetricsHistory(root);
      recovered.record(makeSnapshot(2000, 2));

      const all = recovered.getRecent(10);
      expect(all).toHaveLength(2);
      expect(all[0]?.atomicWrites).toBe(1);
      expect(all[1]?.atomicWrites).toBe(2);
    });
  });

  describe("getSnapshotAndPersist helper", () => {
    test("toma un snapshot de FileBridgeMetrics y lo persiste en history", () => {
      const metrics = new FileBridgeMetrics();
      metrics.recordAtomicWrite(8, true);
      metrics.recordReaddir(2, true);

      const snap = getSnapshotAndPersist(metrics, history);
      expect(snap.atomicWrites).toBe(1);
      expect(snap.readdirCalls).toBe(1);

      const recent = history.getRecent(1);
      expect(recent).toHaveLength(1);
      expect(recent[0]?.atomicWrites).toBe(1);
      expect(recent[0]?.readdirCalls).toBe(1);
    });
  });

  describe("constructor con historyDir personalizado", () => {
    test("acepta un historyDir explícito que se respeta", () => {
      const customDir = join(root, "custom-history");
      const custom = new FileBridgeMetricsHistory(root, { historyDir: customDir });
      custom.record(makeSnapshot(1000, 1));

      expect(existsSync(customDir)).toBe(true);
      expect(existsSync(join(customDir, "metrics.ndjson"))).toBe(true);
      const recent = custom.getRecent(10);
      expect(recent).toHaveLength(1);
    });
  });
});
