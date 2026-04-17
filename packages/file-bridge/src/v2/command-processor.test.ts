import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync, readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { BridgePathLayout } from "../shared/path-layout";
import { EventLogWriter } from "../event-log-writer.js";
import { SequenceStore } from "../shared/sequence-store.js";
import { BackpressureManager, BackpressureError } from "../backpressure-manager.js";
import { CommandProcessor } from "./command-processor.js";
import { CrashRecovery } from "./crash-recovery.js";

const TEST_ROOT = "/tmp/command-processor-test-" + Math.random().toString(36).slice(2);

function commandEnvelope(seq: number, type: string, payload: Record<string, unknown> = {}) {
  return {
    protocolVersion: 2,
    id: `cmd_${String(seq).padStart(12, "0")}`,
    seq,
    createdAt: Date.now(),
    type,
    payload: { type, ...payload },
    attempt: 1,
  };
}

describe("CommandProcessor + CrashRecovery contract", () => {
  let paths: BridgePathLayout;
  let seq: SequenceStore;
  let writer: EventLogWriter;
  let processor: CommandProcessor;
  let backpressure: BackpressureManager;

  beforeEach(() => {
    mkdirSync(TEST_ROOT, { recursive: true });
    paths = new BridgePathLayout(TEST_ROOT);
    seq = new SequenceStore(TEST_ROOT);
    writer = new EventLogWriter(paths, { rotateAtBytes: 1024 * 1024 });
    processor = new CommandProcessor(paths, writer, seq);
    backpressure = new BackpressureManager(paths, {
      maxPending: 2,
      checkIntervalMs: 5,
      maxWaitMs: 50,
    });

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

  test("preserves result identity across restart and recovery", () => {
    writeFileSync(
      join(paths.commandsDir(), "000000000001-configIos.json"),
      JSON.stringify(commandEnvelope(1, "configIos", { device: "R1" }), null, 2),
    );
    writeFileSync(
      join(paths.commandsDir(), "000000000002-configIos.json"),
      JSON.stringify(commandEnvelope(2, "configIos", { device: "R2" }), null, 2),
    );

    expect(() => backpressure.checkCapacity()).toThrow(BackpressureError);

    const first = processor.pickNextCommand();
    expect(first?.id).toBe("cmd_000000000001");
    expect(first?.payload).toMatchObject({ type: "configIos", device: "R1" });

    processor.publishResult(first!, {
      startedAt: Date.now(),
      status: "completed",
      ok: true,
      value: { device: "R1", ok: true },
    });

    const firstResultPath = paths.resultFilePath(first!.id);
    expect(existsSync(firstResultPath)).toBe(true);
    expect(JSON.parse(readFileSync(firstResultPath, "utf8")).id).toBe(first!.id);
    expect(() => backpressure.checkCapacity()).not.toThrow();

    const second = processor.pickNextCommand();
    expect(second?.id).toBe("cmd_000000000002");
    expect(second?.attempt).toBe(1);

    const recovery = new CrashRecovery(paths, seq, writer);
    recovery.recover();

    const restartedProcessor = new CommandProcessor(paths, writer, seq);
    const recovered = restartedProcessor.pickNextCommand();

    expect(recovered?.id).toBe("cmd_000000000002");
    expect(recovered?.attempt).toBe(2);
  });

  test("ignora _queue.json y procesa el siguiente comando válido", () => {
    const deadBefore = existsSync(paths.deadLetterDir())
      ? readdirSync(paths.deadLetterDir()).length
      : 0;
    writeFileSync(
      join(paths.commandsDir(), "_queue.json"),
      JSON.stringify(["000000000001-listDevices.json"], null, 2),
    );
    writeFileSync(
      join(paths.commandsDir(), "000000000001-listDevices.json"),
      JSON.stringify(commandEnvelope(1, "listDevices"), null, 2),
    );

    const picked = processor.pickNextCommand();

    expect(picked?.id).toBe("cmd_000000000001");
    const deadAfter = existsSync(paths.deadLetterDir())
      ? readdirSync(paths.deadLetterDir()).length
      : 0;
    expect(deadAfter).toBe(deadBefore);
    expect(existsSync(join(paths.commandsDir(), "_queue.json"))).toBe(true);
  });
});
