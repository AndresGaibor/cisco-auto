/**
 * Tests for backpressure mechanism.
 * Verifies queue limits and wait-for-capacity behavior.
 */
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { BridgePathLayout } from "../src/shared/path-layout.js";
import { BackpressureManager, BackpressureError } from "../src/backpressure-manager.js";

describe("BackpressureManager", () => {
  let tempDir: string;
  let paths: BridgePathLayout;
  let manager: BackpressureManager;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "backpressure-test-"));
    paths = new BridgePathLayout(tempDir);
    manager = new BackpressureManager(paths, { maxPending: 10 });

    // Create directories
    mkdirSync(paths.commandsDir(), { recursive: true });
    mkdirSync(paths.inFlightDir(), { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("allows sending when queue is empty", () => {
    expect(() => manager.checkCapacity()).not.toThrow();
  });

  test("throws BackpressureError when queue is full", () => {
    // Fill the queue
    for (let i = 0; i < 10; i++) {
      writeFileSync(
        join(paths.commandsDir(), `${i}-test.json`),
        JSON.stringify({ id: `cmd_${i}` })
      );
    }

    expect(() => manager.checkCapacity()).toThrow(BackpressureError);
  });

  test("BackpressureError contains useful information", () => {
    // Fill the queue
    for (let i = 0; i < 10; i++) {
      writeFileSync(
        join(paths.commandsDir(), `${i}-test.json`),
        JSON.stringify({ id: `cmd_${i}` })
      );
    }

    try {
      manager.checkCapacity();
      expect(true).toBe(false); // Should not reach here
    } catch (err) {
      expect(err).toBeInstanceOf(BackpressureError);
      if (err instanceof BackpressureError) {
        expect(err.pendingCount).toBe(10);
        expect(err.maxPending).toBe(10);
        expect(err.message).toContain("queue full");
      }
    }
  });

  test("counts both commands and in-flight files", () => {
    // Add 5 in commands, 3 in-flight
    for (let i = 0; i < 5; i++) {
      writeFileSync(
        join(paths.commandsDir(), `${i}-test.json`),
        JSON.stringify({ id: `cmd_${i}` })
      );
    }
    for (let i = 0; i < 3; i++) {
      writeFileSync(
        join(paths.inFlightDir(), `${i}-test.json`),
        JSON.stringify({ id: `cmd_${i}` })
      );
    }

    expect(manager.getPendingCount()).toBe(8);
  });

  test("waitForCapacity returns immediately when capacity available", async () => {
    const start = Date.now();
    await manager.waitForCapacity(1000);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(200); // Should be nearly instant
  });

  test("waitForCapacity waits and succeeds when capacity becomes available", async () => {
    // Fill queue
    for (let i = 0; i < 10; i++) {
      writeFileSync(
        join(paths.commandsDir(), `${i}-test.json`),
        JSON.stringify({ id: `cmd_${i}` })
      );
    }

    // Free up space after 200ms
    setTimeout(() => {
      rmSync(join(paths.commandsDir(), "0-test.json"));
    }, 200);

    const start = Date.now();
    await manager.waitForCapacity(1000);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThan(100);
    expect(elapsed).toBeLessThan(500);
  });

  test("waitForCapacity throws after timeout", async () => {
    // Fill queue and never free space
    for (let i = 0; i < 10; i++) {
      writeFileSync(
        join(paths.commandsDir(), `${i}-test.json`),
        JSON.stringify({ id: `cmd_${i}` })
      );
    }

    await expect(manager.waitForCapacity(300)).rejects.toThrow(
      BackpressureError
    );
  });

  test("getStats returns accurate information", () => {
    // Add 7 commands
    for (let i = 0; i < 7; i++) {
      writeFileSync(
        join(paths.commandsDir(), `${i}-test.json`),
        JSON.stringify({ id: `cmd_${i}` })
      );
    }

    const stats = manager.getStats();
    expect(stats.maxPending).toBe(10);
    expect(stats.currentPending).toBe(7);
    expect(stats.availableCapacity).toBe(3);
    expect(stats.utilizationPercent).toBe(70);
  });

  test("getAvailableCapacity is correct", () => {
    for (let i = 0; i < 3; i++) {
      writeFileSync(
        join(paths.commandsDir(), `${i}-test.json`),
        JSON.stringify({ id: `cmd_${i}` })
      );
    }

    expect(manager.getAvailableCapacity()).toBe(7);
  });
});
