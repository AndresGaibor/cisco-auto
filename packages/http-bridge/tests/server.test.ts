import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { HttpBridge } from "../src/index.js";
import { FileBridgeV2 } from "@cisco-auto/file-bridge";
import { join } from "node:path";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";

describe("HttpBridge", () => {
  let testDir: string;
  let bridge: FileBridgeV2;
  let httpBridge: HttpBridge;

  beforeEach(async () => {
    testDir = join(
      tmpdir(),
      `http-bridge-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    bridge = new FileBridgeV2({ root: testDir });
    bridge.start();
    httpBridge = new HttpBridge({ bridge, port: 0, apiKey: "test-key" });
    httpBridge.start();
  });

  afterEach(async () => {
    httpBridge?.stop();
    await bridge.stop();
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("returns healthy on /health", async () => {
    const res = await fetch(`http://localhost:${httpBridge.port}/health`);
    console.log("health response status:", res.status);
    const json = await res.json() as { status: string; version: string; uptime?: number };
    console.log("health response body:", JSON.stringify(json));
    expect(json.status).toBe("healthy");
    expect(json.version).toBe("0.1.0");
  });

  it("rejects unauthorized requests", async () => {
    const res = await fetch(`http://localhost:${httpBridge.port}/api/v1/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "addDevice", payload: { name: "R1" } }),
    });
    expect(res.status).toBe(401);
  });

  it("queues command via POST /api/v1/command", async () => {
    const res = await fetch(`http://localhost:${httpBridge.port}/api/v1/command`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": "test-key",
      },
      body: JSON.stringify({ type: "addDevice", payload: { name: "R1" } }),
    });
    expect(res.status).toBe(202);
    const json = await res.json() as { id: string; status: string };
    expect(json.id).toMatch(/^cmd_\d+$/);
    expect(json.status).toBe("queued");
  });
});
