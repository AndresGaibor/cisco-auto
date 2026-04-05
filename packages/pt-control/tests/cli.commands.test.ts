import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdirSync, rmSync } from "node:fs";
import { PTController } from "../src/controller/index.js";

// Basic smoke tests for controller instantiation

describe("CLI commands smoke", () => {
  let testDir: string;
  let controller: PTController;

  beforeEach(() => {
    testDir = join(tmpdir(), `pt-cli-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    controller = new PTController({ devDir: testDir });
  });

  afterEach(() => {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  it("can instantiate controller with custom devDir", () => {
    expect(controller).toBeDefined();
    expect(controller.getBridge()).toBeDefined();
  });

  it("readState returns null when no state.json exists", () => {
    const state = controller.readState();
    expect(state).toBeNull();
  });
});

it("getHeartbeatHealth and bridge status via controller (Phase 5)", async () => {
  // create a heartbeat file in the devDir that the controller will use
  const hbPath = join(testDir, 'heartbeat.json');
  const now = Date.now();
  const { writeFileSync } = require('node:fs');
  writeFileSync(hbPath, JSON.stringify({ timestamp: now }), 'utf-8');

  await controller.start();
  try {
    const hb = controller.getHeartbeat();
    expect(hb).not.toBeNull();
    const hbHealth = controller.getHeartbeatHealth();
    expect(hbHealth.state).toBe('ok');
    const bridgeStatus = controller.getBridgeStatus();
    expect(typeof bridgeStatus.ready).toBe('boolean');
    const ctx = controller.getSystemContext();
    expect(typeof ctx.bridgeReady).toBe('boolean');
    expect(typeof ctx.deviceCount).toBe('number');
  } finally {
    await controller.stop();
  }
});
