/**
 * Tests for lease management.
 * Verifies single-instance enforcement and lease lifecycle.
 */
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { FileBridgeV2 } from "../src/file-bridge-v2.js";
import type { BridgeLease } from "../src/shared/protocol.js";

describe("Lease Management", () => {
  let tempDir: string;
  let bridge1: FileBridgeV2;
  let bridge2: FileBridgeV2;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "lease-test-"));
    // Pre-create directory structure
    mkdirSync(join(tempDir, "commands"), { recursive: true });
    mkdirSync(join(tempDir, "in-flight"), { recursive: true });
    mkdirSync(join(tempDir, "results"), { recursive: true });
    mkdirSync(join(tempDir, "logs"), { recursive: true });
  });

  afterEach(async () => {
    await bridge1?.stop();
    await bridge2?.stop();
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("first instance acquires lease successfully", async () => {
    bridge1 = new FileBridgeV2({ root: tempDir });
    
    await bridge1.start();
    
    const leasePath = join(tempDir, "bridge-lease.json");
    expect(existsSync(leasePath)).toBe(true);
  });

  test("second instance cannot take over active lease", async () => {
    bridge1 = new FileBridgeV2({ root: tempDir });
    await bridge1.start();

    const leasePath = join(tempDir, "bridge-lease.json");
    const originalOwnerId: string = JSON.parse(readFileSync(leasePath, "utf-8")).ownerId;

    // Second instance tries to start
    bridge2 = new FileBridgeV2({ root: tempDir });
    let bridge2CanStart = true;
    try {
      await bridge2.start();
    } catch {
      bridge2CanStart = false;
    }

    // Lease should still be held by first instance
    const currentLease = JSON.parse(readFileSync(leasePath, "utf-8"));
    expect(currentLease.ownerId).toBe(originalOwnerId);
  });

  test("lease contains correct metadata", async () => {
    bridge1 = new FileBridgeV2({ root: tempDir });
    await bridge1.start();

    const leasePath = join(tempDir, "bridge-lease.json");
    const lease: BridgeLease = JSON.parse(readFileSync(leasePath, "utf-8"));

    expect(lease.pid).toBe(process.pid);
    expect(lease.hostname).toBeTruthy();
    expect(lease.ownerId).toBeTruthy();
    expect(lease.startedAt).toBeNumber();
    expect(lease.expiresAt).toBeNumber();
    expect(lease.expiresAt).toBeGreaterThan(Date.now());
    expect(lease.ttlMs).toBeNumber();
  });

  test("lease is renewed periodically", async () => {
    bridge1 = new FileBridgeV2({ 
      root: tempDir,
      leaseIntervalMs: 100,
      leaseTtlMs: 500
    });
    await bridge1.start();

    const leasePath = join(tempDir, "bridge-lease.json");
    const initialLease: BridgeLease = JSON.parse(readFileSync(leasePath, "utf-8"));
    const initialExpires = initialLease.expiresAt;

    // Wait for renewal
    await new Promise((resolve) => setTimeout(resolve, 200));

    const renewedLease: BridgeLease = JSON.parse(readFileSync(leasePath, "utf-8"));
    
    expect(renewedLease.expiresAt).toBeGreaterThan(initialExpires);
    expect(renewedLease.updatedAt).toBeGreaterThan(initialLease.updatedAt);
  });

  test("lease is released on stop", async () => {
    bridge1 = new FileBridgeV2({ root: tempDir });
    await bridge1.start();

    const leasePath = join(tempDir, "bridge-lease.json");
    expect(existsSync(leasePath)).toBe(true);

    await bridge1.stop();
    
    expect(existsSync(leasePath)).toBe(false);
  });

  test("second instance can acquire lease after first releases", async () => {
    bridge1 = new FileBridgeV2({ root: tempDir });
    await bridge1.start();
    await bridge1.stop();

    bridge2 = new FileBridgeV2({ root: tempDir });
    await bridge2.start();
    
    const leasePath = join(tempDir, "bridge-lease.json");
    expect(existsSync(leasePath)).toBe(true);
  });

  test("expired lease can be taken over", async () => {
    // Create an expired lease manually
    const leasePath = join(tempDir, "bridge-lease.json");
    const expiredLease: BridgeLease = {
      ownerId: "expired-owner",
      pid: 99999, // Non-existent PID
      hostname: "old-host",
      startedAt: Date.now() - 10000,
      updatedAt: Date.now() - 10000,
      expiresAt: Date.now() - 5000, // Expired 5 seconds ago
      ttlMs: 5000,
      processTitle: "old-process",
      version: "2.0.0",
    };

    writeFileSync(leasePath, JSON.stringify(expiredLease));

    bridge1 = new FileBridgeV2({ root: tempDir });
    await bridge1.start();

    // Verify lease was taken over
    const newLease: BridgeLease = JSON.parse(readFileSync(leasePath, "utf-8"));
    expect(newLease.ownerId).not.toBe("expired-owner");
    expect(newLease.pid).toBe(process.pid);
  });

  test("corrupted lease file is overwritten", async () => {
    const leasePath = join(tempDir, "bridge-lease.json");
    writeFileSync(leasePath, "not valid JSON {{{");

    bridge1 = new FileBridgeV2({ root: tempDir });
    await bridge1.start();

    // Verify lease was recreated
    const lease: BridgeLease = JSON.parse(readFileSync(leasePath, "utf-8"));
    expect(lease.pid).toBe(process.pid);
  });

  test("lease renewal stops after bridge stops", async () => {
    bridge1 = new FileBridgeV2({ 
      root: tempDir,
      leaseIntervalMs: 100
    });
    await bridge1.start();

    const leasePath = join(tempDir, "bridge-lease.json");
    const leaseBeforeStop: BridgeLease = JSON.parse(readFileSync(leasePath, "utf-8"));

    await bridge1.stop();
    await new Promise((resolve) => setTimeout(resolve, 250));

    // Lease file should be gone, but if it somehow exists, updatedAt shouldn't change
    if (existsSync(leasePath)) {
      const leaseAfterStop: BridgeLease = JSON.parse(readFileSync(leasePath, "utf-8"));
      expect(leaseAfterStop.updatedAt).toBe(leaseBeforeStop.updatedAt);
    }
  });

  test("bridge reacquires stale lease when already running", async () => {
    bridge1 = new FileBridgeV2({ root: tempDir, leaseTtlMs: 500 });
    await bridge1.start();

    const leasePath = join(tempDir, "bridge-lease.json");
    const originalLease: BridgeLease = JSON.parse(readFileSync(leasePath, "utf-8"));

    const staleLease: BridgeLease = {
      ...originalLease,
      ownerId: "stale-owner",
      pid: 99999,
      startedAt: Date.now() - 10_000,
      updatedAt: Date.now() - 10_000,
      expiresAt: Date.now() - 5_000,
    };
    writeFileSync(leasePath, JSON.stringify(staleLease, null, 2));

    await bridge1.start();

    const recoveredLease: BridgeLease = JSON.parse(readFileSync(leasePath, "utf-8"));
    expect(recoveredLease.ownerId).toBe(originalLease.ownerId);
    expect(recoveredLease.pid).toBe(process.pid);
    expect(recoveredLease.expiresAt).toBeGreaterThan(Date.now());
  });

  test("multiple start calls use same lease", async () => {
    bridge1 = new FileBridgeV2({ root: tempDir });
    await bridge1.start();

    const leasePath = join(tempDir, "bridge-lease.json");
    const firstLease: BridgeLease = JSON.parse(readFileSync(leasePath, "utf-8"));

    // Second start should be idempotent
    await bridge1.start();

    const secondLease: BridgeLease = JSON.parse(readFileSync(leasePath, "utf-8"));
    expect(secondLease.ownerId).toBe(firstLease.ownerId);
  });
});
