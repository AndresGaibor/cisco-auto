import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { FileBridgeV2 } from "../../../file-bridge/src/file-bridge-v2.js";
import type { FileBridgePort } from "../../src/application/ports/file-bridge.port.js";
import { TopologyCache } from "../../src/infrastructure/pt/topology-cache.js";
import { createVirtualTopology } from "../../src/vdom/index.js";
import type { TopologySnapshot } from "../../src/contracts/index.js";

function loadFixture(name: string): unknown {
  const path = join(__dirname, name);
  const content = readFileSync(path, "utf-8");
  if (name.endsWith(".ndjson")) {
    return content;
  }
  return JSON.parse(content);
}

function createMockBridge(state: unknown): FileBridgePort {
  return {
    start() {},
    stop() { return Promise.resolve(); },
    sendCommandAndWait: async () => { throw new Error("not implemented"); },
    readState: () => state as TopologySnapshot,
    on() { return () => {}; },
    onAll() { return () => {}; },
    loadRuntime() { return Promise.resolve(); },
    loadRuntimeFromFile() { return Promise.resolve(); },
    isReady() { return true; },
  } as unknown as FileBridgePort;
}

describe("Bridge Fixtures - State.json parsing", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `bridge-fixture-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  describe("FileBridgeV2.readState", () => {
    it("readState retorna null cuando state.json no existe", () => {
      const bridge = new FileBridgeV2({ root: testDir });
      bridge.start();
      const state = bridge.readState<TopologySnapshot>();
      expect(state).toBeNull();
      bridge.stop();
    });

    it("readState parsea state.json vacío correctamente", () => {
      const emptyState = loadFixture("state.empty.json") as TopologySnapshot;
      writeFileSync(join(testDir, "state.json"), JSON.stringify(emptyState), "utf-8");

      const bridge = new FileBridgeV2({ root: testDir });
      bridge.start();
      const state = bridge.readState<TopologySnapshot>();
      bridge.stop();

      expect(state).not.toBeNull();
      expect(state!.devices).toEqual({});
      expect(state!.links).toEqual({});
      expect(state!.metadata?.deviceCount).toBe(0);
    });

    it("readState parsea state.json poblado correctamente", () => {
      const populatedState = loadFixture("state.populated.json") as TopologySnapshot;
      writeFileSync(join(testDir, "state.json"), JSON.stringify(populatedState), "utf-8");

      const bridge = new FileBridgeV2({ root: testDir });
      bridge.start();
      const state = bridge.readState<TopologySnapshot>();
      bridge.stop();

      expect(state).not.toBeNull();
      expect(Object.keys(state!.devices)).toHaveLength(3);
      expect(Object.keys(state!.links)).toHaveLength(2);
      expect(state!.devices["Router1"]).toBeDefined();
      expect(state!.devices["Router1"]!.model).toBe("2911");
      expect(state!.devices["Router1"]!.type).toBe("router");
      expect(state!.links["link-001"]).toBeDefined();
      expect(state!.links["link-001"]!.device1).toBe("Router1");
    });

    it("readState retorna null cuando state.json tiene JSON inválido", () => {
      writeFileSync(join(testDir, "state.json"), "{ invalid json }", "utf-8");

      const bridge = new FileBridgeV2({ root: testDir });
      bridge.start();
      const state = bridge.readState<TopologySnapshot>();
      bridge.stop();

      expect(state).toBeNull();
    });
  });
});

describe("Bridge Fixtures - Event log parsing", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `event-fixture-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
    mkdirSync(join(testDir, "logs"), { recursive: true });
  });

  afterEach(() => {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  it("parsea events.sample.ndjson correctamente", () => {
    const eventsContent = loadFixture("events.sample.ndjson");
    const events = (eventsContent as string).split("\n").filter(Boolean).map((line) => JSON.parse(line));

    expect(events).toHaveLength(7);
    expect(events[0].type).toBe("init");
    expect(events[1].type).toBe("device-added");
    expect(events[1].name).toBe("Router1");
    expect(events[4].type).toBe("link-created");
    expect(events[4].device1).toBe("Router1");
    expect(events[6].type).toBe("snapshot");
    expect(events[6].devices).toBe(3);
  });

  it("VirtualTopology aplica eventos de fixture correctamente", () => {
    const topology = createVirtualTopology();
    const events = (loadFixture("events.sample.ndjson") as string)
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));

    for (const event of events) {
      topology.applyEvent(event);
    }

    const deviceNames = topology.getDeviceNames();
    expect(deviceNames).toContain("Router1");
    expect(deviceNames).toContain("Switch1");
    expect(deviceNames).toContain("PC1");

    const links = topology.getLinks();
    expect(links).toHaveLength(2);
  });

  it("TopologyCache no aplica snapshot vacía sin estar materializado", () => {
    const emptyState = loadFixture("state.empty.json") as TopologySnapshot;
    const mockBridge = createMockBridge(emptyState);
    const cache = new TopologyCache(mockBridge);

    cache.start();
    const snapshot = cache.getSnapshot();
    cache.stop();

    expect(snapshot.devices).toEqual({});
    expect(snapshot.links).toEqual({});
  });

  it("TopologyCache aplica state poblado correctamente", () => {
    const populatedState = loadFixture("state.populated.json") as TopologySnapshot;
    const mockBridge = createMockBridge(populatedState);
    const cache = new TopologyCache(mockBridge);

    cache.start();
    const snapshot = cache.getSnapshot();
    cache.stop();

    expect(Object.keys(snapshot.devices)).toHaveLength(3);
    expect(Object.keys(snapshot.links)).toHaveLength(2);
    expect(cache.getDevice("Router1")).toBeDefined();
    expect(cache.getDevice("Router1")!.model).toBe("2911");
    expect(cache.getLinks()).toHaveLength(2);
  });

  it("TopologyCache.findLinkBetween funciona con fixtures", () => {
    const populatedState = loadFixture("state.populated.json") as TopologySnapshot;
    const mockBridge = createMockBridge(populatedState);
    const cache = new TopologyCache(mockBridge);

    cache.start();
    const link = cache.findLinkBetween("Router1", "Switch1");
    cache.stop();

    expect(link).toBeDefined();
    expect(link!.device1).toBe("Router1");
    expect(link!.device2).toBe("Switch1");
  });

  it("TopologyCache.getConnectedDevices funciona con fixtures", () => {
    const populatedState = loadFixture("state.populated.json") as TopologySnapshot;
    const mockBridge = createMockBridge(populatedState);
    const cache = new TopologyCache(mockBridge);

    cache.start();
    const connected = cache.getConnectedDevices("Switch1");
    cache.stop();

    expect(connected).toContain("Router1");
    expect(connected).toContain("PC1");
  });
});
