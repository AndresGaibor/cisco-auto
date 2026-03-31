import { test, expect, afterEach, beforeEach } from "bun:test";
import { rmSync, mkdirSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { DurableNdjsonConsumer } from "../../src/durable-ndjson-consumer.js";
import { BridgePathLayout } from "../../src/shared/path-layout.js";

const TEST_DIR = "/tmp/bridge-consumer-checkpoint";
let layout: BridgePathLayout;

beforeEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
  mkdirSync(join(TEST_DIR, "logs"), { recursive: true });
  mkdirSync(join(TEST_DIR, "consumer-state"), { recursive: true });
  layout = new BridgePathLayout(TEST_DIR);
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

test("persists byteOffset across restarts", () => {
  const eventsFile = layout.currentEventsFile();
  appendFileSync(
    eventsFile,
    '{"seq":1,"ts":1000,"type":"a"}\n{"seq":2,"ts":2000,"type":"b"}\n',
    "utf8",
  );

  // First consumer run: reads first event
  {
    const events: unknown[] = [];
    const consumer = new DurableNdjsonConsumer(layout, {
      consumerId: "test",
      startFromBeginning: true,
      onEvent: (e) => events.push(e),
    });
    consumer.start();
    consumer.poll();
    consumer.stop();
    expect(events).toHaveLength(2);
  }

  // Second consumer run: should resume from checkpoint
  {
    const events: unknown[] = [];
    appendFileSync(
      eventsFile,
      '{"seq":3,"ts":3000,"type":"c"}\n',
      "utf8",
    );

    const consumer = new DurableNdjsonConsumer(layout, {
      consumerId: "test",
      startFromBeginning: false,
      onEvent: (e) => events.push(e),
    });
    consumer.start();
    consumer.poll();
    consumer.stop();

    // Should only get the new event, not re-read seq 1 and 2
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ seq: 3, type: "c" });
  }
});
