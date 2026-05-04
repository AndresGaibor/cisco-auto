import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { E2eRunner } from "../../application/e2e/e2e-runner.js";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const testDir = join(import.meta.dir, "__test-tmp__");

function createMockPaths() {
  return {
    ptDevDir: testDir,
    logsDir: join(testDir, "logs"),
    historyDir: join(testDir, "history"),
    resultsDir: join(testDir, "results"),
  };
}

function setupTestDir() {
  mkdirSync(testDir, { recursive: true });
  mkdirSync(join(testDir, "logs"), { recursive: true });
  mkdirSync(join(testDir, "history"), { recursive: true });
  mkdirSync(join(testDir, "results"), { recursive: true });
  writeFileSync(join(testDir, "main.js"), "// main.js");
  writeFileSync(join(testDir, "runtime.js"), "// runtime.js");
}

function createMockController(opts?: {
  hb?: unknown;
  hbHealth?: { state: string; ageMs?: number };
  sysCtx?: {
    bridgeReady?: boolean;
    topologyMaterialized?: boolean;
    deviceCount?: number;
    linkCount?: number;
    heartbeat?: { state: string; ageMs?: number; lastSeenTs?: number };
    warnings?: string[];
    bridge?: { ready: boolean; queuedCount?: number; inFlightCount?: number; warnings?: string[] };
    notes?: string[];
  };
  devices?: { name: string; model: string; type: string; power: boolean; ports: never[] }[];
  listDevicesFn?: () => Promise<{ name: string; model: string; type: string; power: boolean; ports: never[] }[]>;
  execRaw?: string;
  execError?: string;
}) {
  const o = opts ?? {};
  const sysCtx = {
    bridgeReady: true,
    topologyMaterialized: true,
    deviceCount: 1,
    linkCount: 0,
    heartbeat: { state: "ok" as const },
    warnings: [] as string[],
    bridge: { ready: true },
    notes: [] as string[],
    ...o.sysCtx,
  };

  const listDevicesFn = o.listDevicesFn ?? (async () => o.devices ?? []);

  return {
    getHeartbeat: () => o.hb ?? null,
    getHeartbeatHealth: () => o.hbHealth ?? { state: "ok" as const },
    getSystemContext: () => sysCtx,
    listDevices: listDevicesFn,
    execIos: async (_d: string, _c: string) => {
      if (o.execError) throw new Error(o.execError);
      return { raw: o.execRaw ?? "Cisco IOS Software" };
    },
    stop: async () => {},
  };
}

describe("E2eRunner smoke suite", () => {
  beforeAll(() => {
    setupTestDir();
  });

  afterAll(() => {
    try { rmSync(testDir, { recursive: true, force: true }); } catch {}
  });

  test("runs all three cases in sequence", async () => {
    const ctrl = createMockController({
      devices: [
        { name: "R1", model: "2911", type: "router", power: true, ports: [] },
        { name: "SW1", model: "2960-24TT", type: "switch", power: true, ports: [] },
      ],
    });

    const runner = new E2eRunner({
      controller: ctrl as any,
      paths: createMockPaths(),
    });

    const result = await runner.runSmoke();

    expect(result.suite).toBe("smoke");
    expect(result.cases.map((c) => c.name)).toEqual(["doctor", "device-list", "show-version"]);
    expect(result.status).toMatch(/^(pass|degraded|fail)$/);
  });

  test("doctor case fails when critical checks present", async () => {
    rmSync(join(testDir, "main.js"), { force: true });
    rmSync(join(testDir, "runtime.js"), { force: true });

    const ctrl = createMockController({
      hb: null,
      hbHealth: { state: "missing" },
      sysCtx: {
        bridgeReady: false,
        topologyMaterialized: false,
        bridge: { ready: false },
      },
    });

    const runner = new E2eRunner({
      controller: ctrl as any,
      paths: createMockPaths(),
    });

    const result = await runner.runSmoke();

    expect(result.status).toBe("fail");
    const doc = result.cases.find((c) => c.name === "doctor");
    expect(doc?.ok).toBe(false);

    writeFileSync(join(testDir, "main.js"), "// main.js");
    writeFileSync(join(testDir, "runtime.js"), "// runtime.js");
  });

  test("device-list fails when PT not responding", async () => {
    const ctrl = createMockController({
      listDevicesFn: async () => { throw new Error("PT not responding"); },
    });

    const runner = new E2eRunner({
      controller: ctrl as any,
      paths: createMockPaths(),
    });

    const result = await runner.runSmoke();

    const dl = result.cases.find((c) => c.name === "device-list");
    expect(dl?.ok).toBe(false);
    expect(dl?.severity).toBe("fail");
  });

  test("show-version degrades when no devices", async () => {
    const ctrl = createMockController({ devices: [] });

    const runner = new E2eRunner({
      controller: ctrl as any,
      paths: createMockPaths(),
    });

    const result = await runner.runSmoke();

    const sv = result.cases.find((c) => c.name === "show-version");
    expect(sv?.severity).toBe("degraded");
    expect(sv?.error).toContain("No se encontraron dispositivos");
  });

  test("show-version captures output on success", async () => {
    const ctrl = createMockController({
      devices: [{ name: "R1", model: "2911", type: "router", power: true, ports: [] }],
      execRaw: "Cisco IOS Software, Version 15.2",
    });

    const runner = new E2eRunner({
      controller: ctrl as any,
      paths: createMockPaths(),
    });

    const result = await runner.runSmoke();

    const sv = result.cases.find((c) => c.name === "show-version");
    expect(sv?.ok).toBe(true);
    expect(sv?.severity).toBe("pass");
    expect(sv?.output).toContain("Cisco IOS");
  });

  test("continues to device-list when doctor has warnings only", async () => {
    const ctrl = createMockController({
      sysCtx: {
        bridgeReady: true,
        topologyMaterialized: false,
        heartbeat: { state: "stale" },
        warnings: ["Topology not materialized"],
        bridge: { ready: true },
      },
      devices: [{ name: "R1", model: "2911", type: "router", power: true, ports: [] }],
    });

    const runner = new E2eRunner({
      controller: ctrl as any,
      paths: createMockPaths(),
    });

    const result = await runner.runSmoke();

    expect(result.cases.find((c) => c.name === "device-list")?.ok).toBe(true);
  });

  test("timing fields are populated", async () => {
    const ctrl = createMockController({
      devices: [{ name: "R1", model: "2911", type: "router", power: true, ports: [] }],
    });

    const runner = new E2eRunner({
      controller: ctrl as any,
      paths: createMockPaths(),
    });

    const result = await runner.runSmoke();

    expect(result.startedAt).toBeGreaterThan(0);
    expect(result.finishedAt).toBeGreaterThanOrEqual(result.startedAt);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  test("doctor case severity is degraded when non-critical failures", async () => {
    const ctrl = createMockController({
      sysCtx: {
        bridgeReady: true,
        topologyMaterialized: false,
        warnings: ["Topology not materialized"],
        bridge: { ready: true },
      },
    });

    const runner = new E2eRunner({
      controller: ctrl as any,
      paths: createMockPaths(),
    });

    const result = await runner.runSmoke();

    const doc = result.cases.find((c) => c.name === "doctor");
    expect(doc?.severity).toBe("degraded");
  });

  test("uses first router when devices exist", async () => {
    const ctrl = createMockController({
      devices: [
        { name: "PC1", model: "PC", type: "pc", power: true, ports: [] },
        { name: "R1", model: "2911", type: "router", power: true, ports: [] },
        { name: "SW1", model: "2960-24TT", type: "switch", power: true, ports: [] },
      ],
      execRaw: "Router IOS 15.2",
    });

    const runner = new E2eRunner({
      controller: ctrl as any,
      paths: createMockPaths(),
    });

    const result = await runner.runSmoke();

    const sv = result.cases.find((c) => c.name === "show-version");
    expect(sv?.ok).toBe(true);
  });
});