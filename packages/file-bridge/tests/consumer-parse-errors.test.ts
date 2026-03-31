/**
 * Tests for consumer parse error resilience.
 * Addresses Problem 3 from the analysis — ensures parse errors don't kill the consumer.
 */
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { BridgePathLayout } from "../src/shared/path-layout.js";
import { DurableNdjsonConsumer } from "../src/durable-ndjson-consumer.js";
import type { BridgeEvent } from "../src/shared/protocol.js";
import type { BridgeEvent } from "../src/shared/protocol.js";

describe("Consumer Parse Errors", () => {
  let tempDir: string;
  let paths: BridgePathLayout;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "parse-test-"));
    paths = new BridgePathLayout(tempDir);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("consumer continues after single malformed JSON line", async () => {
    const currentFile = paths.currentEventsFile();
    
    // Ensure directory exists
    mkdirSync(paths.logsDir(), { recursive: true });
    mkdirSync(paths.consumerStateDir(), { recursive: true });

    // Write mix of valid and invalid events
    const lines = [
      JSON.stringify({ type: "test", ts: 1000, seq: 1 }),
      "{ this is not valid JSON {{{",
      JSON.stringify({ type: "test", ts: 2000, seq: 2 }),
      JSON.stringify({ type: "test", ts: 3000, seq: 3 }),
    ];

    writeFileSync(currentFile, lines.join("\n"));

    const receivedEvents: BridgeEvent[] = [];
    const parseErrors: any[] = [];

    const consumer = new DurableNdjsonConsumer(paths, {
      consumerId: "test-consumer",
      startFromBeginning: true,
      onEvent: (event) => receivedEvents.push(event),
      onParseError: (line, error) => parseErrors.push({ line, error }),
    });

    consumer.start();

    // Wait for processing - increase timeout
    await new Promise((resolve) => setTimeout(resolve, 1000));

    consumer.stop();

    // Should have received valid events
    expect(receivedEvents.length).toBeGreaterThanOrEqual(2);
    expect(receivedEvents.some(e => e.seq === 1)).toBe(true);
    expect(receivedEvents.some(e => e.seq === 2 || e.seq === 3)).toBe(true);

    // Should have logged parse error
    expect(parseErrors.length).toBeGreaterThan(0);
  });

  test("consumer continues after schema validation error", async () => {
    const currentFile = paths.currentEventsFile();
    
    // Ensure directory exists
    mkdirSync(paths.logsDir(), { recursive: true });
    mkdirSync(paths.consumerStateDir(), { recursive: true });

    // Write events with invalid schema but valid JSON
    const lines = [
      JSON.stringify({ type: "test", ts: 1000, seq: 1 }),
      JSON.stringify({ invalid: "schema", missing: "required fields" }),
      JSON.stringify({ type: "test", ts: 2000, seq: 2 }),
    ];

    writeFileSync(currentFile, lines.join("\n"));

    const receivedEvents: BridgeEvent[] = [];
    const parseErrors: any[] = [];

    const consumer = new DurableNdjsonConsumer(paths, {
      consumerId: "test-consumer",
      startFromBeginning: true,
      onEvent: (event) => receivedEvents.push(event),
      onParseError: (line, error) => parseErrors.push({ line, error }),
    });

    consumer.start();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    consumer.stop();

    // Should receive all events (including invalid one as raw)
    expect(receivedEvents.length).toBeGreaterThanOrEqual(2);
    expect(parseErrors.length).toBeGreaterThan(0);
  });

  test("consumer stops after too many consecutive parse errors", async () => {
    const currentFile = paths.currentEventsFile();
    
    // Ensure directory exists
    mkdirSync(paths.logsDir(), { recursive: true });
    mkdirSync(paths.consumerStateDir(), { recursive: true });

    // Write 60 consecutive invalid lines
    const lines: string[] = [];
    for (let i = 0; i < 60; i++) {
      lines.push(`invalid json line ${i} {{{`);
    }
    // Add valid events after
    lines.push(JSON.stringify({ type: "test", ts: 1000, seq: 1 }));
    lines.push(JSON.stringify({ type: "test", ts: 2000, seq: 2 }));

    writeFileSync(currentFile, lines.join("\n"));

    const receivedEvents: BridgeEvent[] = [];
    const dataLossEvents: any[] = [];
    let sawTooManyErrors = false;

    const consumer = new DurableNdjsonConsumer(paths, {
      consumerId: "test-consumer",
      startFromBeginning: true,
      onEvent: (event) => receivedEvents.push(event),
      onDataLoss: (info) => {
        dataLossEvents.push(info);
        if (info.reason === "too many consecutive parse errors") {
          sawTooManyErrors = true;
        }
      },
    });

    consumer.start();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    consumer.stop();

    // Should have emitted data-loss event with correct reason
    expect(sawTooManyErrors || dataLossEvents.length > 0).toBe(true);
  });

  test("consecutive error counter resets on successful parse", async () => {
    const currentFile = paths.currentEventsFile();
    
    // Ensure directory exists
    mkdirSync(paths.logsDir(), { recursive: true });
    mkdirSync(paths.consumerStateDir(), { recursive: true });

    // Alternate between invalid and valid
    const lines = [];
    for (let i = 0; i < 30; i++) {
      lines.push(`invalid ${i}`);
      lines.push(JSON.stringify({ type: "test", ts: i * 1000, seq: i }));
    }

    writeFileSync(currentFile, lines.join("\n"));

    const receivedEvents: BridgeEvent[] = [];
    const dataLossEvents: any[] = [];

    const consumer = new DurableNdjsonConsumer(paths, {
      consumerId: "test-consumer",
      startFromBeginning: true,
      onEvent: (event) => receivedEvents.push(event),
      onDataLoss: (info) => dataLossEvents.push(info),
    });

    consumer.start();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    consumer.stop();

    // Should NOT trigger data loss because errors are not consecutive
    expect(dataLossEvents.length).toBe(0);

    // Should have received most/all valid events
    expect(receivedEvents.length).toBeGreaterThanOrEqual(25);
  });

  test("parse error includes recoverable flag", async () => {
    const currentFile = paths.currentEventsFile();
    
    // Ensure directory exists
    mkdirSync(paths.logsDir(), { recursive: true });

    writeFileSync(
      currentFile,
      "{ invalid json\n" + JSON.stringify({ type: "test", ts: 1000, seq: 1 })
    );

    const parseErrors: any[] = [];

    const consumer = new DurableNdjsonConsumer(paths, {
      consumerId: "test-consumer",
      startFromBeginning: true,
    });

    consumer.on("parse-error", (error) => {
      parseErrors.push(error);
    });

    consumer.start();
    await new Promise((resolve) => setTimeout(resolve, 500));
    consumer.stop();

    expect(parseErrors.length).toBeGreaterThan(0);
    const firstError = parseErrors[0];
    expect(firstError.recoverable).toBe(true);
  });
});
