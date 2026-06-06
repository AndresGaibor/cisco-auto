/**
 * Tests para las versiones async (non-blocking) de los métodos críticos
 * del file-bridge. Cubre:
 *   - EventLogWriter.appendAsync
 *   - AppendOnlyQueueIndex.appendAsync / getAllAsync / removeAsync / compactAsync / resetAsync
 *   - CommandProcessor.pickNextCommandAsync
 *
 * Cada test valida paridad semántica con la versión sync.
 */

import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import {
  mkdirSync,
  rmSync,
  readFileSync,
  writeFileSync,
  existsSync,
  mkdtempSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { BridgePathLayout } from "./shared/path-layout";
import { EventLogWriter } from "./event-log-writer";
import { AppendOnlyQueueIndex } from "./shared/append-only-queue-index";
import { FileBridgeMetrics } from "./file-bridge-metrics";
import { CommandProcessor } from "./v2/command-processor";
import { SequenceStore } from "./shared/sequence-store";
import type { BridgeEvent } from "./shared/protocol";

function makeTestRoot(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

let TEST_ROOT: string;

function commandEnvelope(seq: number, type: string, payload: Record<string, unknown> = {}) {
  return {
    protocolVersion: 2 as const,
    id: `cmd_${String(seq).padStart(12, "0")}`,
    seq,
    createdAt: Date.now(),
    type,
    payload: { type, ...payload },
    attempt: 1,
  };
}

describe("EventLogWriter.appendAsync", () => {
  let paths: BridgePathLayout;
  let writer: EventLogWriter;

  beforeEach(() => {
    TEST_ROOT = makeTestRoot("file-bridge-async-elw-");
    mkdirSync(TEST_ROOT, { recursive: true });
    paths = new BridgePathLayout(TEST_ROOT);
    writer = new EventLogWriter(paths, { rotateAtBytes: 1024 * 1024 });
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  test("appendea evento con appendAsync y queda en disco", async () => {
    const event: BridgeEvent = {
      type: "command-sent",
      ts: Date.now(),
      seq: 1,
      data: { id: "cmd-1" },
    };

    await writer.appendAsync(event);

    const content = readFileSync(paths.currentEventsFile(), "utf8");
    const lines = content.trim().split("\n");
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0]!)).toMatchObject(event);
  });

  test("appendAsync produce el mismo resultado que append sync", async () => {
    const events: BridgeEvent[] = [
      { type: "command-sent", ts: 1000, seq: 1, data: {} },
      { type: "command-ack", ts: 1100, seq: 2, data: {} },
    ];

    // Sync reference
    const syncPath = paths.currentEventsFile();
    const syncWriter = new EventLogWriter(paths, { rotateAtBytes: 1024 * 1024 });
    events.forEach((e) => syncWriter.append(e));
    const syncContent = readFileSync(syncPath, "utf8");

    // Reset
    rmSync(syncPath, { force: true });
    writeFileSync(syncPath, "", "utf8");

    // Async test
    for (const e of events) {
      await writer.appendAsync(e);
    }
    const asyncContent = readFileSync(syncPath, "utf8");

    expect(asyncContent).toBe(syncContent);
  });
});

describe("AppendOnlyQueueIndex async methods", () => {
  let indexPath: string;

  beforeEach(() => {
    TEST_ROOT = makeTestRoot("file-bridge-async-qi-");
    mkdirSync(TEST_ROOT, { recursive: true });
    indexPath = join(TEST_ROOT, "_queue.ndjson");
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  test("appendAsync escribe entries y getAllAsync las lee", async () => {
    const idx = new AppendOnlyQueueIndex({ indexPath });
    await idx.appendAsync("a.json");
    await idx.appendAsync("b.json");
    await idx.appendAsync("c.json");

    const all = await idx.getAllAsync();

    expect(all).toEqual(["a.json", "b.json", "c.json"]);
  });

  test("removeAsync elimina entries del archivo y cache", async () => {
    const idx = new AppendOnlyQueueIndex({ indexPath });
    await idx.appendAsync("a.json");
    await idx.appendAsync("b.json");
    await idx.appendAsync("c.json");

    await idx.removeAsync(["b.json"]);

    const all = await idx.getAllAsync();
    expect(all).toEqual(["a.json", "c.json"]);
    expect(idx.has("b.json")).toBe(false);
  });

  test("compactAsync deduplica y limpia inválidos", async () => {
    writeFileSync(
      indexPath,
      '"a.json"\n"b.json"\n"a.json"\ninvalid\n"c.json"\n',
      "utf8",
    );
    const idx = new AppendOnlyQueueIndex({ indexPath });
    idx.invalidateCache();
    await idx.compactAsync();

    const all = await idx.getAllAsync();
    expect(all.sort()).toEqual(["a.json", "b.json", "c.json"]);
  });

  test("resetAsync limpia el índice", async () => {
    const idx = new AppendOnlyQueueIndex({ indexPath });
    await idx.appendAsync("a.json");
    await idx.appendAsync("b.json");

    await idx.resetAsync();

    const all = await idx.getAllAsync();
    expect(all).toEqual([]);
  });
});

describe("CommandProcessor.pickNextCommandAsync", () => {
  let paths: BridgePathLayout;
  let seq: SequenceStore;
  let writer: EventLogWriter;
  let processor: CommandProcessor;
  let metrics: FileBridgeMetrics;

  beforeEach(() => {
    TEST_ROOT = makeTestRoot("file-bridge-async-cp-");
    mkdirSync(TEST_ROOT, { recursive: true });
    paths = new BridgePathLayout(TEST_ROOT);
    seq = new SequenceStore(TEST_ROOT);
    writer = new EventLogWriter(paths, { rotateAtBytes: 1024 * 1024 });
    metrics = new FileBridgeMetrics();
    processor = new CommandProcessor(paths, writer, seq, 100, metrics);
    mkdirSync(paths.commandsDir(), { recursive: true });
    mkdirSync(paths.resultsDir(), { recursive: true });
    mkdirSync(paths.inFlightDir(), { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  test("pickNextCommandAsync retorna null si la cola está vacía", async () => {
    const picked = await processor.pickNextCommandAsync();
    expect(picked).toBeNull();
  });

  test("pickNextCommandAsync procesa el primer comando FIFO y mueve a in-flight", async () => {
    const env = commandEnvelope(1, "showVersion");
    writeFileSync(
      paths.commandFilePath(env.seq, env.type),
      JSON.stringify(env),
      "utf8",
    );

    const picked = await processor.pickNextCommandAsync<typeof env.payload>();

    expect(picked).not.toBeNull();
    expect(picked!.id).toBe(env.id);
    expect(picked!.seq).toBe(1);
    expect(existsSync(paths.commandFilePath(env.seq, env.type))).toBe(false);
    expect(existsSync(paths.inFlightFilePath(env.seq, env.type))).toBe(true);
  });

  test("pickNextCommandAsync actualiza métricas de lectura y claim", async () => {
    const env = commandEnvelope(1, "showVersion");
    writeFileSync(
      paths.commandFilePath(env.seq, env.type),
      JSON.stringify(env),
      "utf8",
    );

    const picked = await processor.pickNextCommandAsync<typeof env.payload>();

    expect(picked?.id).toBe(env.id);

    const snapshot = metrics.getSnapshot();
    expect(snapshot.readdirCalls).toBe(1);
    expect(snapshot.claimAttempts).toBe(1);
    expect(snapshot.claimSuccesses).toBe(1);
    expect(snapshot.jsonParses).toBe(1);
  });

  test("pickNextCommandAsync y pickNextCommand producen el mismo envelope", async () => {
    const env = commandEnvelope(1, "showVersion");
    writeFileSync(
      paths.commandFilePath(env.seq, env.type),
      JSON.stringify(env),
      "utf8",
    );

    // Sync
    const syncPicked = processor.pickNextCommand<typeof env.payload>();

    // Reset
    rmSync(paths.inFlightFilePath(env.seq, env.type), { force: true });
    writeFileSync(
      paths.commandFilePath(env.seq, env.type),
      JSON.stringify(env),
      "utf8",
    );

    // Async
    const asyncPicked = await processor.pickNextCommandAsync<typeof env.payload>();

    expect(asyncPicked?.id).toBe(syncPicked?.id);
    expect(asyncPicked?.seq).toBe(syncPicked?.seq);
    expect(asyncPicked?.type).toBe(syncPicked?.type);
  });
});
