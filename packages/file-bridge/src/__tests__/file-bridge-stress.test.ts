/**
 * Stress test: high-throughput scenario with concurrent reads and writes.
 * Valida que el FileBridge no degrade con N operaciones concurrentes.
 */
import { describe, expect, test } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdirSync, rmSync } from "node:fs";
import { ReaddirCache } from "../shared/readdir-cache.js";
import { AppendOnlyQueueIndex } from "../shared/append-only-queue-index.js";
import { FileBridgeMetrics } from "../file-bridge-metrics.js";

describe("FileBridge stress tests", () => {
  test("ReaddirCache sostiene 10k reads concurrentes sin leak", () => {
    const dir = join(tmpdir(), `bridge-stress-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    mkdirSync(dir, { recursive: true });

    for (let i = 0; i < 100; i++) {
      const { writeFileSync } = require("node:fs") as typeof import("node:fs");
      writeFileSync(join(dir, `file_${i}.json`), "{}");
    }

    const cache = new ReaddirCache({ ttlMs: 1000, extension: ".json" });

    const start = Date.now();
    for (let i = 0; i < 10_000; i++) {
      cache.list(dir);
    }
    const elapsed = Date.now() - start;

    const stats = cache.getStats();
    expect(stats.totalHits).toBe(9999);
    expect(stats.totalMisses).toBe(1);
    expect(stats.hitRate).toBeGreaterThan(0.99);
    expect(elapsed).toBeLessThan(200);

    rmSync(dir, { recursive: true, force: true });
  });

  test("AppendOnlyQueueIndex sostiene 5k appends concurrentes", () => {
    const dir = join(tmpdir(), `bridge-queue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    mkdirSync(dir, { recursive: true });
    const indexPath = join(dir, "_queue.ndjson");

    const idx = new AppendOnlyQueueIndex({ indexPath });
    const start = Date.now();
    for (let i = 0; i < 5_000; i++) {
      idx.append(`cmd_${i}.json`);
    }
    const elapsed = Date.now() - start;

    const all = idx.getAll();
    expect(all).toHaveLength(5_000);
    expect(elapsed).toBeLessThan(2_000);

    rmSync(dir, { recursive: true, force: true });
  });

  test("FileBridgeMetrics registra 50k operaciones sin degradación", () => {
    const metrics = new FileBridgeMetrics();
    const start = Date.now();
    for (let i = 0; i < 50_000; i++) {
      metrics.recordAtomicWrite(Math.random() * 5, true);
      metrics.recordReaddir(Math.random(), i % 4 === 0);
      metrics.recordClaim(Math.random() * 2, true);
      metrics.recordJsonParse(Math.random() * 0.5, true);
    }
    const elapsed = Date.now() - start;

    const snap = metrics.getSnapshot();
    expect(snap.atomicWrites).toBe(50_000);
    expect(snap.readdirCalls).toBe(50_000);
    expect(snap.claimAttempts).toBe(50_000);
    expect(elapsed).toBeLessThan(2_000);
  });

  test("ReaddirCache prune libera memoria correctamente", async () => {
    const cache = new ReaddirCache({ ttlMs: 20 });
    for (let i = 0; i < 100; i++) {
      cache.list(`/tmp/dir-${i}`);
    }
    expect(cache.getStats().entries).toBe(100);

    await new Promise((r) => setTimeout(r, 50));
    const pruned = cache.prune();
    expect(pruned).toBe(100);
    expect(cache.getStats().entries).toBe(0);
  });

  test("AppendOnlyQueueIndex compact preserva solo entries válidas", () => {
    const { writeFileSync } = require("node:fs") as typeof import("node:fs");
    const dir = join(tmpdir(), `bridge-compact-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    mkdirSync(dir, { recursive: true });
    const indexPath = join(dir, "_queue.ndjson");

    writeFileSync(join(dir, "a.json"), '{"cmd":"a"}');
    writeFileSync(join(dir, "b.json"), '{"cmd":"b"}');
    writeFileSync(join(dir, "c.json"), '{"cmd":"c"}');

    const idx = new AppendOnlyQueueIndex({ indexPath });
    idx.append("a.json");
    idx.append("b.json");
    idx.append("a.json");
    idx.append("c.json");
    idx.append("b.json");

    idx.invalidateCache();
    idx.compact();

    const all = idx.getAll().sort();
    expect(all).toEqual(["a.json", "b.json", "c.json"]);

    rmSync(dir, { recursive: true, force: true });
  });
});
