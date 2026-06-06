import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { BridgePathLayout } from "../shared/path-layout.js";
import { SequenceStore } from "../shared/sequence-store.js";
import { BridgeDiagnostics } from "./diagnostics.js";

function makeTestRoot(prefix: string): string {
  return join(tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
}

describe("BridgeDiagnostics + queue index NDJSON", () => {
  let TEST_ROOT: string;
  let paths: BridgePathLayout;

  beforeEach(() => {
    TEST_ROOT = makeTestRoot("file-bridge-diagnostics-queue-index");
    mkdirSync(TEST_ROOT, { recursive: true });
    paths = new BridgePathLayout(TEST_ROOT);
    mkdirSync(paths.commandsDir(), { recursive: true });
  });

  afterEach(() => {
    try {
      rmSync(TEST_ROOT, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  test("lee queue.ndjson para calcular drift y entradas", () => {
    writeFileSync(
      join(paths.commandsDir(), "000000000001-listDevices.json"),
      JSON.stringify({ id: "cmd_000000000001", seq: 1, type: "listDevices" }),
      "utf8",
    );
    writeFileSync(
      join(paths.commandsDir(), "_queue.ndjson"),
      JSON.stringify("000000000001-listDevices.json") + "\n",
      "utf8",
    );

    const diagnostics = new BridgeDiagnostics(
      paths,
      new SequenceStore(TEST_ROOT),
      () => "owner-1",
      () => ({ ownerId: "owner-1", startedAt: Date.now(), expiresAt: Date.now() + 60_000 }) as any,
    );

    const health = diagnostics.collectHealth();

    expect(health.queues.queueIndexEntries).toBe(1);
    expect(health.queues.queueIndexDrift).toBe(false);
    expect(health.queues.queueIndexMissingEntries).toBe(0);
    expect(health.queues.queueIndexExtraEntries).toBe(0);
  });
});
