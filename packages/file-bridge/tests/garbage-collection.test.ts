/**
 * Tests for garbage collection.
 * Verifies cleanup of old results and rotated logs.
 */
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { FileBridgeV2 } from "../src/file-bridge-v2.js";
import type { BridgeResultEnvelope } from "../src/shared/protocol.js";

describe("Garbage Collection", () => {
  let tempDir: string;
  let bridge: FileBridgeV2;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "gc-test-"));
    // Create directory structure
    mkdirSync(join(tempDir, "results"), { recursive: true });
    mkdirSync(join(tempDir, "logs"), { recursive: true });
    mkdirSync(join(tempDir, "in-flight"), { recursive: true });
    mkdirSync(join(tempDir, "commands"), { recursive: true });
  });

  afterEach(async () => {
    await bridge?.stop();
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("gc report includes statistics", () => {
    bridge = new FileBridgeV2({ root: tempDir });
    
    const report = bridge.gc();

    expect(report).toHaveProperty("deletedResults");
    expect(report).toHaveProperty("deletedLogs");
    expect(report).toHaveProperty("errors");
  });

  test("gc handles empty directories gracefully", () => {
    bridge = new FileBridgeV2({ root: tempDir });

    // Should not throw
    const report = bridge.gc();

    expect(report).toBeTruthy();
    expect(report.deletedResults).toBe(0);
    expect(report.deletedLogs).toBe(0);
  });

  test("gc does not delete in-flight commands", () => {
    const inFlightDir = join(tempDir, "in-flight");

    // Create old in-flight command (should NOT be deleted by gc)
    writeFileSync(
      join(inFlightDir, "000000000001-test.json"),
      JSON.stringify({
        protocolVersion: 2,
        id: "cmd_001",
        seq: 1,
        type: "test",
        payload: { data: "test" },
        createdAt: Date.now() - 24 * 60 * 60 * 1000,
        attempt: 1
      })
    );

    bridge = new FileBridgeV2({ root: tempDir });

    const beforeGc = readdirSync(inFlightDir).filter(f => f.endsWith(".json"));
    expect(beforeGc.length).toBe(1);

    bridge.gc();

    const afterGc = readdirSync(inFlightDir).filter(f => f.endsWith(".json"));
    // In-flight should NOT be touched by GC
    expect(afterGc.length).toBe(beforeGc.length);
  });

  test("gc does not delete pending commands", () => {
    const commandsDir = join(tempDir, "commands");

    // Create old pending command (should NOT be deleted)
    writeFileSync(
      join(commandsDir, "000000000001-test.json"),
      JSON.stringify({
        protocolVersion: 2,
        id: "cmd_001",
        seq: 1,
        type: "test",
        payload: { data: "test" },
        createdAt: Date.now() - 24 * 60 * 60 * 1000,
        attempt: 1
      })
    );

    bridge = new FileBridgeV2({ root: tempDir });

    const beforeGc = readdirSync(commandsDir).filter(f => f.endsWith(".json"));
    expect(beforeGc.length).toBe(1);

    bridge.gc();

    const afterGc = readdirSync(commandsDir).filter(f => f.endsWith(".json"));
    // Pending commands should NOT be touched by GC
    expect(afterGc.length).toBe(beforeGc.length);
  });

  test("gc can be called multiple times safely", () => {
    const resultsDir = join(tempDir, "results");

    // Create some dummy result
    writeFileSync(
      join(resultsDir, "cmd_test.json"),
      JSON.stringify({
        protocolVersion: 2,
        id: "cmd_test",
        seq: 1,
        completedAt: Date.now(),
        status: "success",
        ok: true
      })
    );

    bridge = new FileBridgeV2({ root: tempDir });

    // Multiple GC calls should be safe
    const report1 = bridge.gc();
    const report2 = bridge.gc();
    const report3 = bridge.gc();

    expect(report1).toBeTruthy();
    expect(report2).toBeTruthy();
    expect(report3).toBeTruthy();
  });

  test("gc never deletes current event log", () => {
    const logsDir = join(tempDir, "logs");

    // Create current log file
    const currentLog = join(logsDir, "events.current.ndjson");
    writeFileSync(currentLog, "event 1\nevent 2\n");

    bridge = new FileBridgeV2({ root: tempDir });

    bridge.gc();

    // Current event log should always be kept
    expect(existsSync(currentLog)).toBe(true);
  });
});
