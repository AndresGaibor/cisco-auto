import { test, expect, afterEach, beforeEach } from "bun:test";
import { rmSync, mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { DurableNdjsonConsumer } from "../../../../src/infrastructure/pt/durable-ndjson-consumer.ts";
import { BridgePathLayout } from "../../../../src/infrastructure/pt/shared/path-layout.ts";

const TEST_DIR = "/tmp/bridge-consumer-reading";
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

test("starts from end of file by default", () => {
  const eventsFile = layout.currentEventsFile();
  writeFileSync(
    eventsFile,
    '{"seq":1,"ts":1000,"type":"init"}\n{"seq":2,"ts":2000,"type":"log"}\n',
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
  consumer.stop();

  // Should not include existing events since startFromBeginning=false
  expect(events).toHaveLength(0);
});

test("startFromBeginning reads entire file", () => {
  const eventsFile = layout.currentEventsFile();
  writeFileSync(
    eventsFile,
    '{"type":"init","ts":1000,"seq":1}\n{"type":"log","ts":2000,"seq":2}\n',
    "utf8",
  );

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
  expect(events[0]).toMatchObject({ type: "init" });
  expect(events[1]).toMatchObject({ type: "log" });
});

test("handles partial lines with leftover buffer", () => {
  const eventsFile = layout.currentEventsFile();
  // First chunk ends mid-line
  writeFileSync(eventsFile, '{"seq":1,"ts":1000,"type":"a"}\n{"seq":2,"ts', "utf8");

  const events: unknown[] = [];
  const consumer = new DurableNdjsonConsumer(layout, {
    consumerId: "test",
    startFromBeginning: true,
    onEvent: (e) => events.push(e),
  });

  consumer.start();
  consumer.poll();

  expect(events).toHaveLength(1);

  // Now complete the line
  appendFileSync(eventsFile, '":3000,"type":"b"}\n', "utf8");
  consumer.poll();

  expect(events).toHaveLength(2);
  consumer.stop();
});
