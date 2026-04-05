/**
 * Lease Manager Tests - Fase 8
 * Tests lease-aware bridge startup and recovery gates
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { readFileSync, unlinkSync, existsSync, mkdirSync } from "node:fs";
import { LeaseManager } from "../src/v2/lease-manager";
import { randomUUID } from "node:crypto";

const TEMP_DIR = "/tmp/cisco-auto-lease-tests";

beforeEach(() => {
  if (!existsSync(TEMP_DIR)) mkdirSync(TEMP_DIR, { recursive: true });
});

afterEach(() => {
  // Cleanup
  try {
    const files = require("fs").readdirSync(TEMP_DIR);
    for (const file of files) {
      unlinkSync(join(TEMP_DIR, file));
    }
  } catch (e) {}
});

describe("LeaseManager - Fase 8", () => {
  it("Test 1: Should acquire lease on first start", () => {
    const leaseFile = join(TEMP_DIR, "lease-1.json");
    const manager = new LeaseManager(leaseFile, 5000);

    const acquired = manager.acquireLease();
    expect(acquired).toBe(true);
    expect(existsSync(leaseFile)).toBe(true);

    const content = readFileSync(leaseFile, "utf8");
    const lease = JSON.parse(content);
    expect(lease.ownerId).toBeDefined();
    expect(lease.ttlMs).toBe(5000);
  });

  it("Test 2: Should have valid lease after acquisition", () => {
    const leaseFile = join(TEMP_DIR, "lease-2.json");
    const manager = new LeaseManager(leaseFile, 5000);

    manager.acquireLease();
    expect(manager.hasValidLease()).toBe(true);
    expect(manager.isLeaseValid()).toBe(true);
  });

  it("Test 3: Should renew lease without releasing", () => {
    const leaseFile = join(TEMP_DIR, "lease-3.json");
    const manager = new LeaseManager(leaseFile, 5000);

    manager.acquireLease();
    const firstLease = JSON.parse(readFileSync(leaseFile, "utf8"));

    // Wait a bit
    const originalUpdatedAt = firstLease.updatedAt;
    
    // Renew
    manager.renewLease();
    const renewedLease = JSON.parse(readFileSync(leaseFile, "utf8"));

    expect(renewedLease.ownerId).toBe(firstLease.ownerId);
    expect(renewedLease.updatedAt).toBeGreaterThanOrEqual(originalUpdatedAt);
  });

  it("Test 4: Should reject lease if held by another instance", () => {
    const leaseFile = join(TEMP_DIR, "lease-4.json");
    const manager1 = new LeaseManager(leaseFile, 5000);
    const manager2 = new LeaseManager(leaseFile, 5000);

    const acquired1 = manager1.acquireLease();
    expect(acquired1).toBe(true);

    const acquired2 = manager2.acquireLease();
    expect(acquired2).toBe(false);
  });

  it("Test 5: Should release lease properly", () => {
    const leaseFile = join(TEMP_DIR, "lease-5.json");
    const manager = new LeaseManager(leaseFile, 5000);

    manager.acquireLease();
    expect(manager.hasValidLease()).toBe(true);

    manager.releaseLease();
    expect(existsSync(leaseFile)).toBe(false);
    expect(manager.hasValidLease()).toBe(false);
  });

  it("Test 6: Should detect stale lease by TTL expiration", () => {
    const leaseFile = join(TEMP_DIR, "lease-6.json");
    const manager = new LeaseManager(leaseFile, 1); // 1ms TTL

    manager.acquireLease();
    expect(manager.hasValidLease()).toBe(true);

    // Wait for TTL to expire
    const wait = new Promise(resolve => setTimeout(resolve, 50));
    return wait.then(() => {
      expect(manager.hasValidLease()).toBe(false);
    });
  });

  it("Test 7: Should allow other instance to acquire after lease expiration", () => {
    const leaseFile = join(TEMP_DIR, "lease-7.json");
    const manager1 = new LeaseManager(leaseFile, 1); // 1ms TTL
    const manager2 = new LeaseManager(leaseFile, 5000);

    manager1.acquireLease();
    const ownerId1 = manager1.getOwnerId();

    // Wait for lease to expire
    const wait = new Promise(resolve => setTimeout(resolve, 50));
    return wait.then(() => {
      const acquired2 = manager2.acquireLease();
      expect(acquired2).toBe(true);

      const currentLease = JSON.parse(readFileSync(leaseFile, "utf8"));
      expect(currentLease.ownerId).not.toBe(ownerId1);
    });
  });
});
