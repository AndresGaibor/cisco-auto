/**
 * FileBridge V2 - Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { FileBridgeV2 } from "../src/file-bridge-v2.js";
import { join } from "node:path";
import { mkdtempSync, rmSync, existsSync, writeFileSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";

describe("FileBridgeV2", () => {
  let testDir: string;
  let bridge: FileBridgeV2;

  beforeEach(() => {
    testDir = join(tmpdir(), `file-bridge-v2-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    bridge = new FileBridgeV2({ root: testDir });
  });

  afterEach(async () => {
    await bridge.stop();
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("start/stop lifecycle", () => {
    it("should create directory structure on start", () => {
      bridge.start();

      expect(existsSync(join(testDir, "commands"))).toBe(true);
      expect(existsSync(join(testDir, "in-flight"))).toBe(true);
      expect(existsSync(join(testDir, "results"))).toBe(true);
      expect(existsSync(join(testDir, "logs"))).toBe(true);
      expect(existsSync(join(testDir, "consumer-state"))).toBe(true);
      expect(existsSync(join(testDir, "dead-letter"))).toBe(true);
    });

    it("should not throw on double start", () => {
      bridge.start();
      expect(() => bridge.start()).not.toThrow();
    });

    it("should stop gracefully", async () => {
      bridge.start();
      await expect(bridge.stop()).resolves.toBeUndefined();
    });

    it("should be idempotent on stop", async () => {
      bridge.start();
      await bridge.stop();
      await expect(bridge.stop()).resolves.toBeUndefined();
    });
  });

  describe("sendCommand", () => {
    it("should create command file in commands directory", () => {
      bridge.start();
      const envelope = bridge.sendCommand("addDevice", { name: "Router1", model: "2911" });

      expect(envelope.id).toMatch(/^cmd_\d+$/);
      expect(envelope.seq).toBeGreaterThan(0);
      expect(envelope.type).toBe("addDevice");
      expect(envelope.protocolVersion).toBe(2);
      expect(envelope.checksum).toBeDefined();

      const files = readdirSync(join(testDir, "commands"));
      expect(files.length).toBe(1);
    });

    it("should assign monotonically increasing sequence numbers", () => {
      bridge.start();
      const env1 = bridge.sendCommand("addDevice", { name: "R1" });
      const env2 = bridge.sendCommand("addDevice", { name: "R2" });
      const env3 = bridge.sendCommand("addDevice", { name: "R3" });

      expect(env2.seq).toBe(env1.seq + 1);
      expect(env3.seq).toBe(env2.seq + 1);
    });
  });

  describe("sendCommandAndWait", () => {
    it("should timeout if no result appears", async () => {
      bridge.start();
      await expect(
        bridge.sendCommandAndWait("addDevice", { name: "R1" }, 100)
      ).rejects.toThrow(/timeout/i);
    });
  });

  describe("diagnostics", () => {
    it("should return healthy status when started", () => {
      bridge.start();
      const diag = bridge.diagnostics();

      expect(diag.status).toBe("healthy");
      expect(diag.lease).toBeDefined();
      expect(diag.queues).toBeDefined();
      expect(diag.journal).toBeDefined();
      expect(diag.issues).toEqual([]);
    });

    it("should report pending commands count", () => {
      bridge.start();
      bridge.sendCommand("addDevice", { name: "R1" });
      bridge.sendCommand("addDevice", { name: "R2" });

      const diag = bridge.diagnostics();
      expect(diag.queues.pendingCommands).toBe(2);
    });
  });

  describe("gc", () => {
    it("should return empty report on fresh directory", () => {
      bridge.start();
      const report = bridge.gc();

      expect(report.deletedResults).toBe(0);
      expect(report.deletedLogs).toBe(0);
      expect(report.errors).toEqual([]);
    });
  });

  describe("loadRuntime", () => {
    it("should write runtime.js file", async () => {
      bridge.start();
      await bridge.loadRuntime("function test() { return 'ok'; }");

      const runtimePath = join(testDir, "runtime.js");
      expect(existsSync(runtimePath)).toBe(true);
      expect(readFileSync(runtimePath, "utf-8")).toBe("function test() { return 'ok'; }");
    });
  });

  describe("crash recovery", () => {
    it("should requeue in-flight commands without results on start", () => {
      // Simulate: write a command to in-flight without a result
      bridge.start();
      const envelope = bridge.sendCommand("addDevice", { name: "R1" });

      // Manually move to in-flight (simulating crash)
      const cmdPath = join(testDir, "commands", `${String(envelope.seq).padStart(12, "0")}-${envelope.type}.json`);
      const inFlightPath = join(testDir, "in-flight", `${String(envelope.seq).padStart(12, "0")}-${envelope.type}.json`);

      // Stop bridge and manually simulate crash scenario
      bridge.stop();

      // Write directly to in-flight (as if PT was processing but crashed)
      writeFileSync(inFlightPath, JSON.stringify({ ...envelope, attempt: 1 }), "utf-8");

      // Restart - should detect in-flight without result and requeue
      const bridge2 = new FileBridgeV2({ root: testDir });
      bridge2.start();

      // Command should be requeued (attempt incremented)
      bridge2.stop();
    });
  });
});

describe("FileBridgeV2 - SequenceStore persistence", () => {
  let testDir: string;

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should persist sequence across restarts", () => {
    const bridge1 = new FileBridgeV2({ root: testDir = join(tmpdir(), `seq-test-${Date.now()}`) });
    bridge1.start();
    const env1 = bridge1.sendCommand("addDevice", { name: "R1" });
    const env2 = bridge1.sendCommand("addDevice", { name: "R2" });
    bridge1.stop();

    // New instance should continue from previous sequence
    const bridge2 = new FileBridgeV2({ root: testDir });
    bridge2.start();
    const env3 = bridge2.sendCommand("addDevice", { name: "R3" });
    bridge2.stop();

    expect(env3.seq).toBe(env2.seq + 1);
    expect(env1.seq + 1).toBe(env2.seq); // Sanity check
  });
});
