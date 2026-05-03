import { test, expect, afterEach, beforeEach } from "bun:test";
import { rmSync, mkdirSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DurableNdjsonConsumer } from "../../src/durable-ndjson-consumer.js";
import { BridgePathLayout } from "../../src/shared/path-layout.js";

let TEST_DIR: string;
let layout: BridgePathLayout;

beforeEach(() => {
  TEST_DIR = mkdtempSync(join(tmpdir(), "bridge-consumer-resilience-"));
  mkdirSync(join(TEST_DIR, "logs"), { recursive: true });
  mkdirSync(join(TEST_DIR, "consumer-state"), { recursive: true });
  layout = new BridgePathLayout(TEST_DIR);
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

test("handles file truncation by resetting offset", () => {
  const eventsFile = layout.currentEventsFile();
  writeFileSync(
    eventsFile,
    '{"seq":1,"ts":1000,"type":"a"}\n{"seq":2,"ts":2000,"type":"b"}\n',
    "utf8",
  );

  const events: unknown[] = [];
  const consumer = new DurableNdjsonConsumer(layout, {
    consumerId: "test",
    startFromBeginning: false,
    onEvent: (e) => events.push(e),
  });

  consumer.start();
  consumer.poll();

  // PT truncates and rewrites
  writeFileSync(eventsFile, '{"seq":10,"ts":5000,"type":"restarted"}\n', "utf8");

  consumer.poll();

  expect(events).toHaveLength(1);
  expect(events[0]).toMatchObject({ seq: 10, type: "restarted" });

  consumer.stop();
});
