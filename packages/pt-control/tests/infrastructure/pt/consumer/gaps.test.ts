import { test, expect, afterEach, beforeEach } from "bun:test";
import { rmSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DurableNdjsonConsumer } from "../../../../src/infrastructure/pt/durable-ndjson-consumer.ts";
import { BridgePathLayout } from "../../../../src/infrastructure/pt/shared/path-layout.ts";

const TEST_DIR = "/tmp/bridge-consumer-gaps";
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

test("emits gap event when sequence has a hole", () => {
  const eventsFile = layout.currentEventsFile();
  writeFileSync(
    eventsFile,
    '{"seq":1,"ts":1000,"type":"a"}\n{"seq":3,"ts":2000,"type":"b"}\n',
    "utf8",
  );

  const gaps: { expected: number; actual: number }[] = [];
  const consumer = new DurableNdjsonConsumer(layout, {
    consumerId: "test",
    startFromBeginning: true,
    onGap: (expected, actual) => gaps.push({ expected, actual }),
  });

  consumer.start();
  consumer.poll();
  consumer.stop();

  expect(gaps).toHaveLength(1);
  expect(gaps[0]).toEqual({ expected: 2, actual: 3 });
});
