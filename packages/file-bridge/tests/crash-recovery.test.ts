/**
 * Tests for crash recovery mechanism.
 * Verifies requeuing and cleanup of orphaned commands.
 */
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { FileBridgeV2 } from "../src/file-bridge-v2.js";
import type { BridgeCommandEnvelope, BridgeResultEnvelope } from "../src/shared/protocol.js";

describe("Crash Recovery", () => {
  let tempDir: string;
  let bridge: FileBridgeV2;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "crash-test-"));
    // Create directory structure
    mkdirSync(join(tempDir, "in-flight"), { recursive: true });
    mkdirSync(join(tempDir, "commands"), { recursive: true });
    mkdirSync(join(tempDir, "results"), { recursive: true });
    mkdirSync(join(tempDir, "dead-letter"), { recursive: true });
    mkdirSync(join(tempDir, "logs"), { recursive: true });
  });

  afterEach(async () => {
    await bridge?.stop();
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("orphaned command with result is cleaned up on start", async () => {
    const inFlightDir = join(tempDir, "in-flight");
    const resultsDir = join(tempDir, "results");

    // Command in in-flight
    writeFileSync(join(inFlightDir, "000000000001-test.json"), JSON.stringify({
      protocolVersion: 2,
      id: "cmd_000000000001",
      seq: 1,
      type: "test",
      payload: { data: "test" },
      createdAt: Date.now(),
      attempt: 1
    } as BridgeCommandEnvelope));

    // Result already exists
    writeFileSync(join(resultsDir, "cmd_000000000001.json"), JSON.stringify({
      protocolVersion: 2,
      id: "cmd_000000000001",
      seq: 1,
      completedAt: Date.now(),
      status: "completed",
      ok: true,
      value: { result: "done" }
    } as BridgeResultEnvelope));

    bridge = new FileBridgeV2({ root: tempDir });
    await bridge.start();
    await new Promise((resolve) => setTimeout(resolve, 100));

    // In-flight should be cleaned
    const inFlight = readdirSync(inFlightDir).filter(f => f.endsWith(".json"));
    expect(inFlight.length).toBe(0);

    // Result should still exist
    expect(existsSync(join(resultsDir, "cmd_000000000001.json"))).toBe(true);
  });

  test("command exceeding max attempts is marked as failed", async () => {
    const inFlightDir = join(tempDir, "in-flight");
    const resultsDir = join(tempDir, "results");

    // Command with max attempts already
    writeFileSync(join(inFlightDir, "000000000001-test.json"), JSON.stringify({
      protocolVersion: 2,
      id: "cmd_000000000001",
      seq: 1,
      type: "test",
      payload: { data: "test" },
      createdAt: Date.now(),
      attempt: 3, // Max attempts
      expiresAt: Date.now() + 120000
    } as BridgeCommandEnvelope));

    bridge = new FileBridgeV2({ root: tempDir });
    await bridge.start();
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should create a failed result
    expect(existsSync(join(resultsDir, "cmd_000000000001.json"))).toBe(true);
    
    const result: BridgeResultEnvelope = JSON.parse(
      readFileSync(join(resultsDir, "cmd_000000000001.json"), "utf-8")
    );
    
    expect(result.ok).toBe(false);
  });

  test("requeued command has incremented attempt counter", async () => {
    const inFlightDir = join(tempDir, "in-flight");
    const commandsDir = join(tempDir, "commands");

    writeFileSync(join(inFlightDir, "000000000001-test.json"), JSON.stringify({
      protocolVersion: 2,
      id: "cmd_000000000001",
      seq: 1,
      type: "test",
      payload: { data: "test" },
      createdAt: Date.now(),
      attempt: 1,
      expiresAt: Date.now() + 120000
    } as BridgeCommandEnvelope));

    bridge = new FileBridgeV2({ root: tempDir });
    await bridge.start();
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Check requeued command
    const commands = readdirSync(commandsDir).filter(f => f.endsWith(".json"));
    expect(commands.length).toBe(1);

    const requeued: BridgeCommandEnvelope = JSON.parse(
      readFileSync(join(commandsDir, commands[0]!), "utf-8")
    );

    expect(requeued.attempt).toBe(2);
  });

  test("multiple orphaned commands are recovered", async () => {
    const inFlightDir = join(tempDir, "in-flight");

    // Create 5 orphaned commands
    for (let i = 1; i <= 5; i++) {
      writeFileSync(
        join(inFlightDir, `00000000000${i}-test.json`),
        JSON.stringify({
          protocolVersion: 2,
          id: `cmd_00000000000${i}`,
          seq: i,
          type: "test",
          payload: { index: i },
          createdAt: Date.now(),
          attempt: 1,
          expiresAt: Date.now() + 120000
        } as BridgeCommandEnvelope)
      );
    }

    bridge = new FileBridgeV2({ root: tempDir });
    await bridge.start();
    await new Promise((resolve) => setTimeout(resolve, 200));

    // All should be requeued
    const commandsDir = join(tempDir, "commands");
    const commands = readdirSync(commandsDir).filter(f => f.endsWith(".json"));
    expect(commands.length).toBe(5);

    // In-flight should be empty
    const inFlight = readdirSync(inFlightDir).filter(f => f.endsWith(".json"));
    expect(inFlight.length).toBe(0);
  });

  test("recovery runs on bridge start", async () => {
    const inFlightDir = join(tempDir, "in-flight");
    const commandsDir = join(tempDir, "commands");

    writeFileSync(join(inFlightDir, "000000000001-test.json"), JSON.stringify({
      protocolVersion: 2,
      id: "cmd_000000000001",
      seq: 1,
      type: "test",
      payload: { data: "test" },
      createdAt: Date.now(),
      attempt: 1,
      expiresAt: Date.now() + 120000
    } as BridgeCommandEnvelope));

    bridge = new FileBridgeV2({ root: tempDir });
    
    // Before start, file is in in-flight
    expect(readdirSync(inFlightDir).filter(f => f.endsWith(".json")).length).toBe(1);

    await bridge.start();
    await new Promise((resolve) => setTimeout(resolve, 100));

    // After start, file should be in commands (requeued)
    expect(readdirSync(commandsDir).filter(f => f.endsWith(".json")).length).toBeGreaterThan(0);
  });
});
