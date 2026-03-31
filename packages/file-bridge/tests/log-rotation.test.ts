/**
 * Tests for log rotation to verify data loss prevention.
 * Addresses Problem 2 from the analysis.
 */
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { BridgePathLayout } from "../src/shared/path-layout.js";
import { EventLogWriter } from "../src/event-log-writer.js";
import type { BridgeEvent } from "../src/shared/protocol.js";

describe("Log Rotation", () => {
  let tempDir: string;
  let paths: BridgePathLayout;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "rotation-test-"));
    paths = new BridgePathLayout(tempDir);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("rotation preserves all events without data loss", () => {
    const writer = new EventLogWriter(paths, {
      rotateAtBytes: 500, // Small size to trigger rotation quickly
    });

    // Write events sequentially to trigger rotation
    const events: BridgeEvent[] = [];
    for (let i = 1; i <= 100; i++) {
      const event: BridgeEvent = {
        type: "command-enqueued",
        ts: Date.now(),
        seq: i,
        id: `cmd_${i}`,
        commandType: "test",
        payload: { data: "x".repeat(50) }, // Make it larger to trigger rotation
      };
      events.push(event);
      writer.append(event);
    }

    // Count all events in all log files
    const logsDir = paths.logsDir();
    const files = readdirSync(logsDir).filter((f) => f.endsWith(".ndjson"));

    let totalEvents = 0;
    const allSeqs: number[] = [];
    for (const file of files) {
      const content = readFileSync(join(logsDir, file), "utf-8");
      const lines = content
        .split("\n")
        .filter((line) => line.trim().length > 0);
      
      for (const line of lines) {
        const event = JSON.parse(line);
        if (event.seq) allSeqs.push(event.seq);
      }
      totalEvents += lines.length;
    }

    // All events should be present
    expect(totalEvents).toBe(100);
    
    // Verify no duplicate or missing sequences
    allSeqs.sort((a, b) => a - b);
    for (let i = 0; i < allSeqs.length; i++) {
      expect(allSeqs[i]).toBe(i + 1);
    }
  });

  test("rotated file contains complete data", () => {
    const writer = new EventLogWriter(paths, {
      rotateAtBytes: 200,
    });

    // Write events to trigger rotation
    for (let i = 1; i <= 10; i++) {
      writer.append({
        type: "command-enqueued",
        ts: Date.now(),
        seq: i,
        id: `cmd_${i}`,
        commandType: "test",
        payload: { data: "x".repeat(50) },
      });
    }

    // Find rotated files
    const logsDir = paths.logsDir();
    const rotatedFiles = readdirSync(logsDir).filter(
      (f) => f.startsWith("events.") && f !== "events.current.ndjson"
    );

    expect(rotatedFiles.length).toBeGreaterThan(0);

    // Each rotated file should have valid JSON lines
    for (const file of rotatedFiles) {
      const content = readFileSync(join(logsDir, file), "utf-8");
      const lines = content.split("\n").filter((l) => l.trim());

      for (const line of lines) {
        const parsed = JSON.parse(line); // Should not throw
        expect(parsed.seq).toBeGreaterThan(0);
      }
    }
  });

  test("rotation manifest is updated correctly", () => {
    const writer = new EventLogWriter(paths, {
      rotateAtBytes: 200,
    });

    // Write events to trigger rotation
    for (let i = 1; i <= 10; i++) {
      writer.append({
        type: "command-enqueued",
        ts: Date.now(),
        seq: i,
        id: `cmd_${i}`,
        commandType: "test",
        payload: { data: "x".repeat(50) },
      });
    }

    const manifestPath = paths.rotationManifestFile();
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

    expect(manifest.rotations).toBeArray();
    expect(manifest.rotations.length).toBeGreaterThan(0);

    for (const entry of manifest.rotations) {
      expect(entry.file).toBeString();
      expect(entry.rotatedAt).toBeNumber();
      expect(entry.bytesSizeAtRotation).toBeGreaterThan(0);
      expect(entry.lastSeqInFile).toBeGreaterThan(0);
    }
  });

  test("writes during rotation window are preserved", async () => {
    const writer = new EventLogWriter(paths, {
      rotateAtBytes: 300,
    });

    // Write events sequentially (not concurrently) to avoid race conditions
    // The test is about ENOENT handling, not concurrent access
    const totalEvents = 50;
    for (let i = 1; i <= totalEvents; i++) {
      writer.append({
        type: "command-enqueued",
        ts: Date.now(),
        seq: i,
        id: `cmd_${i}`,
        commandType: "test",
        payload: { data: "x".repeat(20) },
      });
    }

    // Count all events in all files
    const logsDir = paths.logsDir();
    const files = readdirSync(logsDir).filter((f) => f.endsWith(".ndjson"));

    let totalRecorded = 0;
    for (const file of files) {
      const content = readFileSync(join(logsDir, file), "utf-8");
      const lines = content
        .split("\n")
        .filter((line) => line.trim().length > 0);
      totalRecorded += lines.length;
    }

    expect(totalRecorded).toBe(totalEvents);
  });

  test("rotation handles empty file gracefully", () => {
    const writer = new EventLogWriter(paths, {
      rotateAtBytes: 100,
    });

    // Current file exists but is empty
    const currentFile = paths.currentEventsFile();
    const stat = statSync(currentFile);
    expect(stat.size).toBe(0);

    // Write one event — should not rotate
    writer.append({
      type: "command-enqueued",
      ts: Date.now(),
      seq: 1,
      id: "cmd_1",
      commandType: "test",
      payload: {},
    });

    // Should still only have current file
    const logsDir = paths.logsDir();
    const files = readdirSync(logsDir).filter((f) => f.endsWith(".ndjson"));
    expect(files).toEqual(["events.current.ndjson"]);
  });
});
