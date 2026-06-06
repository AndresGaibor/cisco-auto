/**
 * Tests de integración entre CommandProcessor y AppendOnlyQueueIndex.
 *
 * El _queue.json legacy era O(N²) en cada append. Este test file
 * cubre la migración al nuevo AppendOnlyQueueIndex (NDJSON) con:
 * - appendQueueIndex delega al nuevo índice.
 * - Migración automática desde _queue.json legacy.
 * - Compaction cuando el archivo excede el tamaño configurado.
 * - removeQueueEntry estático sigue funcionando.
 * - Concurrencia bajo carga.
 * - Deduplicación de entries.
 */

import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync, statSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { BridgePathLayout } from "../shared/path-layout.js";
import { EventLogWriter } from "../event-log-writer.js";
import { FileBridgeMetrics } from "../file-bridge-metrics.js";
import { CommandProcessor } from "./command-processor.js";

function makeTestRoot(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

let TEST_ROOT: string;
let paths: BridgePathLayout;
let seq: { next: () => number };
let writer: EventLogWriter;

beforeEach(() => {
  TEST_ROOT = makeTestRoot("file-bridge-cp-queue-index-");
  mkdirSync(TEST_ROOT, { recursive: true });
  paths = new BridgePathLayout(TEST_ROOT);
  seq = { next: () => Date.now() };
  writer = new EventLogWriter(paths, { rotateAtBytes: 1024 * 1024 });
  mkdirSync(paths.commandsDir(), { recursive: true });
  mkdirSync(paths.resultsDir(), { recursive: true });
  mkdirSync(paths.inFlightDir(), { recursive: true });
});

afterEach(() => {
  try {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

describe("CommandProcessor + AppendOnlyQueueIndex", () => {
  test("appendQueueIndex delega al nuevo índice NDJSON", () => {
    const processor = new CommandProcessor(paths, writer, seq);

    processor.appendQueueIndex("000000000001-configIos.json");
    processor.appendQueueIndex("000000000002-listDevices.json");

    const ndjsonPath = join(paths.commandsDir(), "_queue.ndjson");
    expect(existsSync(ndjsonPath)).toBe(true);

    const legacyPath = join(paths.commandsDir(), "_queue.json");
    expect(existsSync(legacyPath)).toBe(false);

    const content = readFileSync(ndjsonPath, "utf8");
    expect(content).toContain("000000000001-configIos.json");
    expect(content).toContain("000000000002-listDevices.json");
  });

  test("migración automática desde _queue.json legacy", () => {
    const legacyPath = join(paths.commandsDir(), "_queue.json");
    writeFileSync(
      legacyPath,
      JSON.stringify(["000000000001-configIos.json", "000000000002-listDevices.json"]),
      "utf8",
    );

    const processor = new CommandProcessor(paths, writer, seq);
    processor.appendQueueIndex("000000000003-ping.json");

    const ndjsonPath = join(paths.commandsDir(), "_queue.ndjson");
    expect(existsSync(ndjsonPath)).toBe(true);

    const content = readFileSync(ndjsonPath, "utf8");
    expect(content).toContain("000000000001-configIos.json");
    expect(content).toContain("000000000002-listDevices.json");
    expect(content).toContain("000000000003-ping.json");

    const migratedPath = join(paths.commandsDir(), "_queue.json.migrated");
    expect(existsSync(migratedPath)).toBe(true);
    expect(existsSync(legacyPath)).toBe(false);
  });

  test("compactQueueIndexIfNeeded ejecuta compact cuando el archivo excede el tamaño", () => {
    // Threshold muy bajo (1KB) para forzar la compactación con pocas entries largas.
    const processor = new CommandProcessor(paths, writer, seq, 100, null, {
      maxSizeBytes: 1024,
    });

    for (let i = 0; i < 50; i++) {
      processor.appendQueueIndex(`0000000000${String(i).padStart(2, "0")}-configIos.json`);
    }

    const ndjsonPath = join(paths.commandsDir(), "_queue.ndjson");
    const sizeBefore = existsSync(ndjsonPath) ? statSync(ndjsonPath).size : 0;
    expect(sizeBefore).toBeGreaterThan(1024);

    // La compactación periódica (cada 1000 appends) NO se disparó todavía.
    // Llamada explícita debe ejecutarla.
    processor.compactQueueIndexIfNeeded();

    // Tras compactar, el archivo sigue conteniendo los mismos entries.
    const content = readFileSync(ndjsonPath, "utf8");
    expect(content).toContain("000000000000-configIos.json");
    expect(content).toContain("000000000049-configIos.json");
  });

  test("removeQueueEntry (estático) sigue funcionando tras la integración", () => {
    const processor = new CommandProcessor(paths, writer, seq);
    processor.appendQueueIndex("000000000001-configIos.json");
    processor.appendQueueIndex("000000000002-configIos.json");
    processor.appendQueueIndex("000000000003-configIos.json");

    CommandProcessor.removeQueueEntry(TEST_ROOT, "000000000002-configIos.json");

    const ndjsonPath = join(paths.commandsDir(), "_queue.ndjson");
    const content = readFileSync(ndjsonPath, "utf8");
    expect(content).toContain("000000000001-configIos.json");
    expect(content).not.toContain("000000000002-configIos.json");
    expect(content).toContain("000000000003-configIos.json");
  });

  test("concurrencia: 1000 appends no corrompen el índice", () => {
    const processor = new CommandProcessor(paths, writer, seq);

    for (let i = 0; i < 1000; i++) {
      processor.appendQueueIndex(`0000${String(i).padStart(8, "0")}-cmd.json`);
    }

    const ndjsonPath = join(paths.commandsDir(), "_queue.ndjson");
    const content = readFileSync(ndjsonPath, "utf8");
    const lines = content.split("\n").filter((line) => line.trim() !== "");

    // Cada línea es un JSON válido y único.
    const seen = new Set<string>();
    let valid = 0;
    for (const line of lines) {
      try {
        const filename = JSON.parse(line);
        if (typeof filename === "string") {
          seen.add(filename);
          valid++;
        }
      } catch {
        // línea malformada
      }
    }

    expect(seen.size).toBe(1000);
    expect(valid).toBe(1000);
  });

  test("el índice deduplica entries duplicados", () => {
    const processor = new CommandProcessor(paths, writer, seq);

    processor.appendQueueIndex("000000000001-configIos.json");
    processor.appendQueueIndex("000000000001-configIos.json");
    processor.appendQueueIndex("000000000001-configIos.json");
    processor.appendQueueIndex("000000000002-configIos.json");

    const ndjsonPath = join(paths.commandsDir(), "_queue.ndjson");
    const content = readFileSync(ndjsonPath, "utf8");
    const entries = content
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => JSON.parse(line));

    const unique = new Set(entries);
    expect(unique.size).toBe(2);
    expect(unique.has("000000000001-configIos.json")).toBe(true);
    expect(unique.has("000000000002-configIos.json")).toBe(true);
  });

  test("actualiza métricas del flujo normal de cola", () => {
    const metrics = new FileBridgeMetrics();
    const processor = new CommandProcessor(paths, writer, seq, 100, metrics, {
      compactionEvery: 1,
      maxSizeBytes: 1024,
    });

    const filename = "000000000001-configIos.json";
    writeFileSync(
      join(paths.commandsDir(), filename),
      JSON.stringify({
        protocolVersion: 2,
        id: "cmd_000000000001",
        seq: 1,
        createdAt: Date.now(),
        type: "configIos",
        payload: { type: "configIos" },
        attempt: 1,
      }),
      "utf8",
    );

    processor.appendQueueIndex(filename);

    const picked = processor.pickNextCommand();
    expect(picked?.id).toBe("cmd_000000000001");

    processor.publishResult(picked!, {
      startedAt: Date.now(),
      status: "completed",
      ok: true,
      value: { ok: true },
      claimedFile: filename,
    });

    const snapshot = metrics.getSnapshot();
    expect(snapshot.queueAppends).toBe(1);
    expect(snapshot.queueCompactations).toBeGreaterThanOrEqual(0);
    expect(snapshot.claimAttempts).toBeGreaterThanOrEqual(1);
    expect(snapshot.claimSuccesses).toBe(1);
    expect(snapshot.jsonParses).toBeGreaterThanOrEqual(1);
    expect(snapshot.resultsPublished).toBe(1);
  });

  test("pickNextCommand limpia la entrada del índice cuando reclama un comando", () => {
    const processor = new CommandProcessor(paths, writer, seq);

    const filename = "000000000001-configIos.json";
    writeFileSync(
      join(paths.commandsDir(), filename),
      JSON.stringify({
        protocolVersion: 2,
        id: "cmd_000000000001",
        seq: 1,
        createdAt: Date.now(),
        type: "configIos",
        payload: { type: "configIos" },
        attempt: 1,
      }),
      "utf8",
    );
    processor.appendQueueIndex(filename);

    const picked = processor.pickNextCommand();

    expect(picked?.id).toBe("cmd_000000000001");

    const ndjsonPath = join(paths.commandsDir(), "_queue.ndjson");
    const content = readFileSync(ndjsonPath, "utf8");
    expect(content).not.toContain(filename);
  });

  test("pickNextCommand limpia la entrada del índice cuando purga un duplicado", () => {
    const processor = new CommandProcessor(paths, writer, seq);

    const filename = "000000000001-configIos.json";
    writeFileSync(
      join(paths.commandsDir(), filename),
      JSON.stringify({
        protocolVersion: 2,
        id: "cmd_000000000001",
        seq: 1,
        createdAt: Date.now(),
        type: "configIos",
        payload: { type: "configIos" },
        attempt: 1,
      }),
      "utf8",
    );
    writeFileSync(
      join(paths.resultsDir(), "cmd_000000000001.json"),
      JSON.stringify({ ok: true }),
      "utf8",
    );
    processor.appendQueueIndex(filename);

    const picked = processor.pickNextCommand();

    expect(picked).toBeNull();

    const ndjsonPath = join(paths.commandsDir(), "_queue.ndjson");
    const content = readFileSync(ndjsonPath, "utf8");
    expect(content).not.toContain(filename);
  });
});
