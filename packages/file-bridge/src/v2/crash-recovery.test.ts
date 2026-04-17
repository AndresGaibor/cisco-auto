import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { BridgePathLayout } from "../shared/path-layout.js";
import { SequenceStore } from "../shared/sequence-store.js";
import { EventLogWriter } from "../event-log-writer.js";
import { CrashRecovery } from "./crash-recovery.js";

const TEST_ROOT = "/tmp/crash-recovery-test-" + Math.random().toString(36).slice(2);

function commandEnvelope(seq: number, type: string) {
  return {
    protocolVersion: 2,
    id: `cmd_${String(seq).padStart(12, "0")}`,
    seq,
    createdAt: Date.now(),
    type,
    payload: { type },
    attempt: 1,
  };
}

describe("CrashRecovery", () => {
  let paths: BridgePathLayout;
  let seq: SequenceStore;
  let writer: EventLogWriter;
  let recovery: CrashRecovery;

  beforeEach(() => {
    mkdirSync(TEST_ROOT, { recursive: true });
    paths = new BridgePathLayout(TEST_ROOT);
    seq = new SequenceStore(TEST_ROOT);
    writer = new EventLogWriter(paths, { rotateAtBytes: 1024 * 1024 });
    recovery = new CrashRecovery(paths, seq, writer);

    mkdirSync(paths.commandsDir(), { recursive: true });
    mkdirSync(paths.resultsDir(), { recursive: true });
    mkdirSync(paths.inFlightDir(), { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  test("no mueve _queue.json a dead-letter", () => {
    writeFileSync(
      join(paths.commandsDir(), "_queue.json"),
      JSON.stringify(["000000000001-listDevices.json"], null, 2),
    );
    writeFileSync(
      join(paths.commandsDir(), "000000000001-listDevices.json"),
      JSON.stringify(commandEnvelope(1, "listDevices"), null, 2),
    );

    recovery.recover();

    const deadLetterFiles = existsSync(paths.deadLetterDir())
      ? readdirSync(paths.deadLetterDir())
      : [];
    expect(deadLetterFiles.length).toBe(0);
    expect(existsSync(join(paths.commandsDir(), "_queue.json"))).toBe(true);
    expect(existsSync(join(paths.commandsDir(), "000000000001-listDevices.json"))).toBe(true);
  });
});
