/**
 * File Bridge V2 - Fase 8 Lease-Aware Integration Tests
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdirSync, existsSync } from "node:fs";
import { FileBridgeV2 } from "../src/file-bridge-v2";

const TEMP_DIR = "/tmp/cisco-auto-bridge-fase8-tests";
const TEST_DEV_DIR = join(TEMP_DIR, "dev");

beforeEach(() => {
  if (!existsSync(TEMP_DIR)) mkdirSync(TEMP_DIR, { recursive: true });
  if (!existsSync(TEST_DEV_DIR)) mkdirSync(TEST_DEV_DIR, { recursive: true });
});

afterEach(async () => {
  try {
    const cmd = require("child_process");
    cmd.execSync(`rm -rf ${TEST_DEV_DIR}/*`);
  } catch (e) {}
});

describe("FileBridgeV2 - Fase 8 Lease-Aware", () => {
  it("Test 1: Should not process commands without valid lease", async () => {
    const bridge = new FileBridgeV2({
      root: TEST_DEV_DIR,
      leaseTtlMs: 500, // Short TTL for testing
      leaseIntervalMs: 100,
    });

    let leaseDeniedemitted = false;
    bridge.on("lease-denied", () => {
      leaseDeniedemitted = true;
    });

    // Try to start with a bridge instance that will lose lease immediately
    // Create two bridges to force lease contention
    const bridge2 = new FileBridgeV2({
      root: TEST_DEV_DIR,
      leaseTtlMs: 500,
      leaseIntervalMs: 100,
    });

    bridge.start();
    // Give it a moment to acquire
    await new Promise(resolve => setTimeout(resolve, 100));

    bridge2.start();
    // bridge2 should emit lease-denied
    await new Promise(resolve => setTimeout(resolve, 100));

    // At least one should have failed to get lease
    const ready1 = bridge.isReady();
    const ready2 = bridge2.isReady();

    expect(ready1 || ready2).toBe(true);
    expect(ready1 && ready2).toBe(false); // Only one should be ready

    await bridge.stop();
    await bridge2.stop();
  });

  it("Test 2: Should report ready only with valid lease", async () => {
    const bridge = new FileBridgeV2({
      root: TEST_DEV_DIR,
      leaseTtlMs: 5000,
      leaseIntervalMs: 1000,
    });

    expect(bridge.isReady()).toBe(false);

    bridge.start();
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(bridge.isReady()).toBe(true);

    await bridge.stop();

    expect(bridge.isReady()).toBe(false);
  });

  it("Test 3: Should cleanup on stop", async () => {
    const bridge = new FileBridgeV2({
      root: TEST_DEV_DIR,
      leaseTtlMs: 5000,
      leaseIntervalMs: 1000,
    });

    bridge.start();
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(bridge.isReady()).toBe(true);

    await bridge.stop();

    expect(bridge.isReady()).toBe(false);
  });

  it("Test 4: Should emit startup-failed event if lease denied", async () => {
    const bridge1 = new FileBridgeV2({
      root: TEST_DEV_DIR,
      leaseTtlMs: 5000,
      leaseIntervalMs: 100,
    });

    const bridge2 = new FileBridgeV2({
      root: TEST_DEV_DIR,
      leaseTtlMs: 5000,
      leaseIntervalMs: 100,
    });

    bridge1.start();
    await new Promise(resolve => setTimeout(resolve, 50));

    let failureEmitted = false;
    bridge2.on("lease-denied", () => {
      failureEmitted = true;
    });

    bridge2.start();
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(failureEmitted).toBe(true);
    expect(bridge2.isReady()).toBe(false);

    await bridge1.stop();
    await bridge2.stop();
  });

  it("Test 5: Should maintain lease during operation", async () => {
    const bridge = new FileBridgeV2({
      root: TEST_DEV_DIR,
      leaseTtlMs: 500,
      leaseIntervalMs: 100,
    });

    bridge.start();
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(bridge.isReady()).toBe(true);

    // Wait for lease renewal cycles
    await new Promise(resolve => setTimeout(resolve, 600));

    // Should still be ready despite short TTL because renewal happens
    expect(bridge.isReady()).toBe(true);

    await bridge.stop();
  });

  it("Test 6: Should get bridge status including lease", async () => {
    const bridge = new FileBridgeV2({
      root: TEST_DEV_DIR,
      leaseTtlMs: 5000,
      leaseIntervalMs: 1000,
    });

    bridge.start();
    await new Promise(resolve => setTimeout(resolve, 100));

    const status = bridge.getBridgeStatus();

    expect(status).toBeDefined();
    expect(status.ready).toBe(true);
    expect(status.leaseValid).toBe(true);

    await bridge.stop();
  });

  it("Test 7: Should support maxPendingCommands with backpressure", async () => {
    const bridge = new FileBridgeV2({
      root: TEST_DEV_DIR,
      leaseTtlMs: 5000,
      leaseIntervalMs: 1000,
      maxPendingCommands: 10,
      enableBackpressure: true,
    });

    bridge.start();
    await new Promise(resolve => setTimeout(resolve, 100));

    const stats = bridge.getBackpressureStats();

    expect(stats).toBeDefined();
    expect(stats.maxPending).toBe(10);
    expect(stats.currentPending).toBeGreaterThanOrEqual(0);

    await bridge.stop();
  });
});
