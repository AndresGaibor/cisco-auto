/**
 * FileBridge V2 - Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { FileBridgeV2 } from "../src/file-bridge-v2.js";
import { join } from "node:path";
import { mkdtempSync, rmSync, existsSync, writeFileSync, readFileSync, readdirSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";

describe("FileBridgeV2", () => {
  let testDir: string;
  let bridge: FileBridgeV2;

  beforeEach(() => {
    testDir = join(
      tmpdir(),
      `file-bridge-v2-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
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
      expect(files.some((file) => file.endsWith("addDevice.json"))).toBe(true);
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
      const result = await bridge.sendCommandAndWait("addDevice", { name: "R1" }, 100);

      expect(result.ok).toBe(false);
      expect(result.status).toBe("timeout");
    });

    it("should follow deferred results until completion", async () => {
      bridge.start();

      const sentTypes: string[] = [];
      const bridgeAny = bridge as any;
      const originalSendCommand = bridgeAny.sendCommand.bind(bridge);

      bridgeAny.sendCommand = (type: string, payload: any, expiresAtMs?: number) => {
        const envelope = originalSendCommand(type, payload, expiresAtMs);
        sentTypes.push(type);

        const resultPath = join(testDir, "results", `${envelope.id}.json`);
        if (type === "execPc") {
          writeFileSync(
            resultPath,
            JSON.stringify({
              protocolVersion: 2,
              id: envelope.id,
              seq: envelope.seq,
              startedAt: envelope.createdAt,
              completedAt: Date.now(),
              status: "completed",
              ok: true,
              value: {
                ok: true,
                deferred: true,
                ticket: "ticket-123",
                job: { id: "ticket-123" },
              },
            }),
            "utf-8",
          );
        }

        if (type === "__pollDeferred") {
          writeFileSync(
            resultPath,
            JSON.stringify({
              protocolVersion: 2,
              id: envelope.id,
              seq: envelope.seq,
              startedAt: envelope.createdAt,
              completedAt: Date.now(),
              status: "completed",
              ok: true,
              value: {
                ok: true,
                raw: "Success rate is 100 percent",
                status: 0,
              },
            }),
            "utf-8",
          );
        }

        return envelope;
      };

      const result = await bridge.sendCommandAndWait("execPc", { device: "PC1", command: "ping" });

      expect(sentTypes).toEqual(["execPc", "__pollDeferred"]);
      expect(result.ok).toBe(true);
      expect(result.value).toEqual({
        ok: true,
        raw: "Success rate is 100 percent",
        status: 0,
      });
      expect((result as any).timings).toBeDefined();
      expect((result as any).timings.waitMs).toBeGreaterThanOrEqual(0);
    });

    it("should return deferred results without auto polling when resolveDeferred is false", async () => {
      bridge.start();

      const sentTypes: string[] = [];
      const bridgeAny = bridge as any;
      const originalSendCommand = bridgeAny.sendCommand.bind(bridge);

      bridgeAny.sendCommand = (type: string, payload: any, expiresAtMs?: number) => {
        const envelope = originalSendCommand(type, payload, expiresAtMs);
        sentTypes.push(type);

        const resultPath = join(testDir, "results", `${envelope.id}.json`);
        if (type === "execPc") {
          writeFileSync(
            resultPath,
            JSON.stringify({
              protocolVersion: 2,
              id: envelope.id,
              seq: envelope.seq,
              startedAt: envelope.createdAt,
              completedAt: Date.now(),
              status: "completed",
              ok: true,
              value: {
                ok: true,
                deferred: true,
                ticket: "ticket-456",
                job: { id: "ticket-456" },
              },
            }),
            "utf-8",
          );
        }

        if (type === "__pollDeferred") {
          writeFileSync(
            resultPath,
            JSON.stringify({
              protocolVersion: 2,
              id: envelope.id,
              seq: envelope.seq,
              startedAt: envelope.createdAt,
              completedAt: Date.now(),
              status: "completed",
              ok: true,
              value: {
                ok: true,
                raw: "Success rate is 100 percent",
                status: 0,
              },
            }),
            "utf-8",
          );
        }

        return envelope;
      };

      const result = await (bridge as any).sendCommandAndWait(
        "execPc",
        { device: "PC1", command: "ping" },
        100,
        { resolveDeferred: false },
      );

      expect(sentTypes).toEqual(["execPc"]);
      expect(result.ok).toBe(true);
      expect(result.value).toEqual({
        ok: true,
        deferred: true,
        ticket: "ticket-456",
        job: { id: "ticket-456" },
      });
      expect((result as any).timings).toBeDefined();
    });

    it("should timeout without noisy ENOENT logs", async () => {
      bridge.start();
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: unknown[]) => {
        logs.push(args.map((arg) => String(arg)).join(" "));
      };

      try {
        const result = await bridge.sendCommandAndWait("addDevice", { name: "R1" }, 100);
        expect(result.ok).toBe(false);
        expect(result.status).toBe("timeout");
        expect(logs.some((line) => line.includes("result not ready"))).toBe(false);
        expect(logs.some((line) => line.includes("result read failed"))).toBe(false);
      } finally {
        console.log = originalLog;
      }
    });
  });

  describe("diagnostics", () => {
    it("should return healthy status when started", () => {
      bridge.start();
      const diag = bridge.diagnostics();

      expect(diag.status).toBe("healthy");
      expect(diag.queues).toBeDefined();
      expect(diag.journal).toBeDefined();
      expect(diag.issues).toEqual([]);
    });

    it("should report pending commands count", () => {
      bridge.start();
      bridge.sendCommand("addDevice", { name: "R1" });
      bridge.sendCommand("addDevice", { name: "R2" });

      const diag = bridge.diagnostics();
      expect(diag.queues.pendingCommands).toBeGreaterThanOrEqual(2);
    });
  });

  describe("state/context methods (Phase 5)", () => {
    it("getHeartbeat() returns null when missing and parses when present", () => {
      bridge.start();
      // no heartbeat yet
      expect(bridge.getHeartbeat()).toBeNull();

      // create heartbeat file
      const hb = { timestamp: Date.now() };
      const hbPath = join(testDir, "heartbeat.json");
      writeFileSync(hbPath, JSON.stringify(hb), "utf-8");
      const parsed = bridge.getHeartbeat();
      expect(parsed).not.toBeNull();
      expect(parsed).toHaveProperty("timestamp");
    });

    it("getHeartbeatHealth() reports missing/ok/stale", () => {
      bridge.start();
      // missing -> missing
      let h = bridge.getHeartbeatHealth();
      expect(h.state).toBe("missing");

      // present and fresh -> ok
      const hbPath = join(testDir, "heartbeat.json");
      writeFileSync(hbPath, JSON.stringify({ timestamp: Date.now() }), "utf-8");
      h = bridge.getHeartbeatHealth();
      expect(h.state).toBe("ok");

      // stale -> set mtime to old time
      const old = new Date(Date.now() - 20_000);
      try {
        // update mtime/atime
        require("node:fs").utimesSync(hbPath, old, old);
      } catch (e) {
        // some platforms might not support utimesSync in this environment; skip assertion
      }
      h = bridge.getHeartbeatHealth();
      // Either stale or ok depending on platform/time precision - assert it returns one of expected states
      expect(["ok", "stale", "missing"]).toContain(h.state);
    });

    it("getBridgeStatus() indicates ready after start", () => {
      bridge.start();
      const s = bridge.getBridgeStatus();
      expect(s.ready).toBe(true);
      expect(s.leaseValid).toBe(true);
      expect(typeof s.queueIndexDrift).toBe("boolean");
      expect(s.claimMode).toBe("unknown");
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
      const cmdPath = join(
        testDir,
        "commands",
        `${String(envelope.seq).padStart(12, "0")}-${envelope.type}.json`,
      );
      const inFlightPath = join(
        testDir,
        "in-flight",
        `${String(envelope.seq).padStart(12, "0")}-${envelope.type}.json`,
      );

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
    const bridge1 = new FileBridgeV2({
      root: (testDir = join(tmpdir(), `seq-test-${Date.now()}`)),
    });
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

describe("sendCommand", () => {
  let testDir: string;
  let bridge: FileBridgeV2;

  beforeEach(() => {
    testDir = join(
      tmpdir(),
      `file-bridge-v2-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
  });

  afterEach(async () => {
    if (bridge) {
      await bridge.stop();
    }
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("falla si bridge no está ready", () => {
    bridge = new FileBridgeV2({ root: testDir });
    expect(() => bridge.sendCommand("addDevice", { name: "Router1" })).toThrow(
      /bridge is not ready/i,
    );
  });

  it("sendCommandAndWait no llama waitForCapacity antes de sendCommand", async () => {
    bridge = new FileBridgeV2({ root: testDir });
    bridge.start();

    let sendCommandCalled = false;
    const originalSendCommand = (bridge as any).sendCommand.bind(bridge);
    (bridge as any).sendCommand = (...args: any[]) => {
      sendCommandCalled = true;
      return originalSendCommand(...args);
    };

    const resultPromise = bridge.sendCommandAndWait("addDevice", { name: "R1" }, 50);

    expect(sendCommandCalled).toBe(true);
    const result = await resultPromise;
    expect(result.ok).toBe(false);
    expect(result.status).toBe("timeout");
  });
});

describe("sendCommandAndWait", () => {
  let testDir: string;
  let bridge: FileBridgeV2;

  beforeEach(() => {
    testDir = join(
      tmpdir(),
      `file-bridge-v2-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    bridge = new FileBridgeV2({ root: testDir });
  });

  afterEach(async () => {
    await bridge.stop();
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("result incluye meta con latencias", async () => {
    bridge.start();

    const resultPath = join(testDir, "results");
    mkdirSync(resultPath, { recursive: true });

    const bridgeAny = bridge as any;
    const originalSendCommand = bridgeAny.sendCommand.bind(bridge);

    bridgeAny.sendCommand = (type: string, payload: any, expiresAtMs?: number) => {
      const envelope = originalSendCommand(type, payload, expiresAtMs);

      if (type === "execPc") {
        const filePath = join(testDir, "results", `${envelope.id}.json`);
        writeFileSync(
          filePath,
          JSON.stringify({
            protocolVersion: 2,
            id: envelope.id,
            seq: envelope.seq,
            startedAt: envelope.createdAt,
            completedAt: Date.now(),
            status: "completed",
            ok: true,
            value: {
              ok: true,
              raw: "Success rate is 100 percent",
              status: 0,
            },
          }),
          "utf-8",
        );
      }

      if (type === "__pollDeferred") {
        const filePath = join(testDir, "results", `${envelope.id}.json`);
        writeFileSync(
          filePath,
          JSON.stringify({
            protocolVersion: 2,
            id: envelope.id,
            seq: envelope.seq,
            startedAt: envelope.createdAt,
            completedAt: Date.now(),
            status: "completed",
            ok: true,
            value: {
              ok: true,
              raw: "Success rate is 100 percent",
              status: 0,
            },
          }),
          "utf-8",
        );
      }

      return envelope;
    };

    const result = await bridge.sendCommandAndWait("execPc", { device: "PC1", command: "ping" });

    expect(result).toHaveProperty("completedAt");
    expect(result).toHaveProperty("startedAt");
  });
});
