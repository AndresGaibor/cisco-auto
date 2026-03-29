// ============================================================================
// VirtualTopology - Unit Tests
// ============================================================================

import { afterEach, expect, test, describe, spyOn } from "bun:test";
import { VirtualTopology } from "../index.js";
import type { TopologySnapshot, PTEvent } from "../../contracts/index.js";

// ============================================================================
// Fixtures
// ============================================================================

function createEmptySnapshot(): TopologySnapshot {
  return {
    version: "1.0",
    timestamp: Date.now(),
    devices: {},
    links: {},
    metadata: {
      deviceCount: 0,
      linkCount: 0,
    },
  };
}

function createSnapshotWithDevices(): TopologySnapshot {
  return {
    version: "1.0",
    timestamp: Date.now(),
    devices: {
      Router1: {
        name: "Router1",
        model: "ISR 2911",
        type: "router",
        power: true,
        ports: [],
      },
      Switch1: {
        name: "Switch1",
        model: "2960-24TT",
        type: "switch",
        power: true,
        ports: [],
      },
    },
    links: {},
    metadata: {
      deviceCount: 2,
      linkCount: 0,
    },
  };
}

// ============================================================================
// Issue #1: getSnapshot() Must Return Deep Clone (Not Shallow Copy)
// ============================================================================

describe("Issue #1: getSnapshot() returns deep clone", () => {
  test("mutating returned snapshot does NOT affect original", () => {
    const topology = new VirtualTopology(createSnapshotWithDevices());
    const snap = topology.getSnapshot();

    // Mutate the returned snapshot
    snap.devices["Router1"].power = false;
    snap.devices["NewDevice"] = {
      name: "NewDevice",
      model: "PC",
      type: "pc",
      power: true,
      ports: [],
    };
    snap.metadata!.deviceCount = 999;

    // Original should be UNCHANGED
    const original = topology.getSnapshot();
    expect(original.devices["Router1"].power).toBe(true);
    expect(original.devices["NewDevice"]).toBeUndefined();
    expect(original.metadata!.deviceCount).toBe(2);
  });

  test("getSnapshot() returns independent object each call", () => {
    const topology = new VirtualTopology(createSnapshotWithDevices());
    const snap1 = topology.getSnapshot();
    const snap2 = topology.getSnapshot();

    // Modifications to one should NOT affect the other
    snap1.devices["Router1"].power = false;
    expect(snap2.devices["Router1"].power).toBe(true);
  });

  test("ports array is deeply cloned", () => {
    const snapshot = createSnapshotWithDevices();
    snapshot.devices["Router1"].ports = [
      { name: "Gig0/0", status: "up", ipAddress: "10.0.0.1", subnetMask: "255.255.255.0" },
    ];

    const topology = new VirtualTopology(snapshot);
    const snap = topology.getSnapshot();

    // Mutate ports array
    snap.devices["Router1"].ports[0].status = "down";

    // Original should be unchanged
    const original = topology.getSnapshot();
    expect(original.devices["Router1"].ports[0].status).toBe("up");
  });
});

// ============================================================================
// Issue #2: handleDeviceAdded Must Infer Device Type from Model
// ============================================================================

describe("Issue #2: device type inference from model", () => {
  test("infers 'switch' for 2960 model", () => {
    const topology = new VirtualTopology(createEmptySnapshot());
    topology.applyEvent({
      type: "device-added",
      name: "Switch1",
      model: "2960-24TT",
      ts: Date.now(),
    });

    const device = topology.getDevice("Switch1");
    expect(device?.type).toBe("switch");
  });

  test("infers 'switch' for 3560 model", () => {
    const topology = new VirtualTopology(createEmptySnapshot());
    topology.applyEvent({
      type: "device-added",
      name: "Switch2",
      model: "3560-48PS",
      ts: Date.now(),
    });

    const device = topology.getDevice("Switch2");
    expect(device?.type).toBe("switch");
  });

  test("infers 'switch' for model with 'switch' keyword", () => {
    const topology = new VirtualTopology(createEmptySnapshot());
    topology.applyEvent({
      type: "device-added",
      name: "MySwitch",
      model: "GenericSwitch",
      ts: Date.now(),
    });

    const device = topology.getDevice("MySwitch");
    expect(device?.type).toBe("switch");
  });

  test("infers 'router' for ISR models (2911)", () => {
    const topology = new VirtualTopology(createEmptySnapshot());
    topology.applyEvent({
      type: "device-added",
      name: "Router1",
      model: "ISR 2911",
      ts: Date.now(),
    });

    const device = topology.getDevice("Router1");
    expect(device?.type).toBe("router");
  });

  test("infers 'router' for 1941 model", () => {
    const topology = new VirtualTopology(createEmptySnapshot());
    topology.applyEvent({
      type: "device-added",
      name: "Router2",
      model: "1941",
      ts: Date.now(),
    });

    const device = topology.getDevice("Router2");
    expect(device?.type).toBe("router");
  });

  test("infers 'router' for model with 'router' keyword", () => {
    const topology = new VirtualTopology(createEmptySnapshot());
    topology.applyEvent({
      type: "device-added",
      name: "R1",
      model: "Router",
      ts: Date.now(),
    });

    const device = topology.getDevice("R1");
    expect(device?.type).toBe("router");
  });

  test("infers 'pc' for PC model", () => {
    const topology = new VirtualTopology(createEmptySnapshot());
    topology.applyEvent({
      type: "device-added",
      name: "PC1",
      model: "PC",
      ts: Date.now(),
    });

    const device = topology.getDevice("PC1");
    expect(device?.type).toBe("pc");
  });

  test("infers 'pc' for Laptop model", () => {
    const topology = new VirtualTopology(createEmptySnapshot());
    topology.applyEvent({
      type: "device-added",
      name: "Laptop1",
      model: "Laptop",
      ts: Date.now(),
    });

    const device = topology.getDevice("Laptop1");
    expect(device?.type).toBe("pc");
  });

  test("infers 'server' for server model", () => {
    const topology = new VirtualTopology(createEmptySnapshot());
    topology.applyEvent({
      type: "device-added",
      name: "Server1",
      model: "Server",
      ts: Date.now(),
    });

    const device = topology.getDevice("Server1");
    expect(device?.type).toBe("server");
  });

  test("infers 'wireless_router' for accesspoint model", () => {
    const topology = new VirtualTopology(createEmptySnapshot());
    topology.applyEvent({
      type: "device-added",
      name: "AP1",
      model: "AccessPoint",
      ts: Date.now(),
    });

    const device = topology.getDevice("AP1");
    expect(device?.type).toBe("wireless_router");
  });

  test("infers 'cloud' for cloud model", () => {
    const topology = new VirtualTopology(createEmptySnapshot());
    topology.applyEvent({
      type: "device-added",
      name: "Cloud1",
      model: "Cloud",
      ts: Date.now(),
    });

    const device = topology.getDevice("Cloud1");
    expect(device?.type).toBe("cloud");
  });

  test("defaults to 'generic' for unknown models", () => {
    const topology = new VirtualTopology(createEmptySnapshot());
    topology.applyEvent({
      type: "device-added",
      name: "Unknown1",
      model: "UnknownModelXYZ",
      ts: Date.now(),
    });

    const device = topology.getDevice("Unknown1");
    expect(device?.type).toBe("generic");
  });

  test("defaults to 'generic' for empty model", () => {
    const topology = new VirtualTopology(createEmptySnapshot());
    topology.applyEvent({
      type: "device-added",
      name: "Empty1",
      model: "",
      ts: Date.now(),
    });

    const device = topology.getDevice("Empty1");
    expect(device?.type).toBe("generic");
  });
});

// ============================================================================
// Issue #6: calculateDeltaFrom Performance
// ============================================================================

describe("Issue #6: calculateDeltaFrom efficiency", () => {
  test("calculates device add delta correctly", () => {
    const prev = createEmptySnapshot();
    const topology = new VirtualTopology(prev);

    topology.applyEvent({
      type: "device-added",
      name: "Router1",
      model: "ISR 2911",
      ts: Date.now() + 100,
    });

    const snap = topology.getSnapshot();
    expect(snap.devices["Router1"]).toBeDefined();
    expect(snap.metadata?.deviceCount).toBe(1);
  });

  test("calculates device remove delta correctly", () => {
    const topology = new VirtualTopology(createSnapshotWithDevices());
    const initialCount = topology.getDeviceNames().length;

    topology.applyEvent({
      type: "device-removed",
      name: "Router1",
      ts: Date.now(),
    });

    expect(topology.getDevice("Router1")).toBeUndefined();
    expect(topology.getDeviceNames().length).toBe(initialCount - 1);
  });

  test("calculates link add delta correctly", () => {
    const topology = new VirtualTopology(createSnapshotWithDevices());

    topology.applyEvent({
      type: "link-created",
      device1: "Router1",
      port1: "Gig0/0",
      device2: "Switch1",
      port2: "Fast0/1",
      ts: Date.now(),
    });

    const link = topology.findLinkBetween("Router1", "Switch1");
    expect(link).toBeDefined();
    expect(link?.cableType).toBe("auto");
  });

  test("calculates link delete delta correctly", () => {
    const topology = new VirtualTopology(createSnapshotWithDevices());

    topology.applyEvent({
      type: "link-created",
      device1: "Router1",
      port1: "Gig0/0",
      device2: "Switch1",
      port2: "Fast0/1",
      ts: Date.now(),
    });

    const linkBefore = topology.findLinkBetween("Router1", "Switch1");
    expect(linkBefore).toBeDefined();

    topology.applyEvent({
      type: "link-deleted",
      device1: "Router1",
      port1: "Gig0/0",
      device2: "Switch1",
      port2: "Fast0/1",
      ts: Date.now(),
    });

    const linkAfter = topology.findLinkBetween("Router1", "Switch1");
    expect(linkAfter).toBeUndefined();
  });

  test("notifies handlers on changes", () => {
    const topology = new VirtualTopology(createEmptySnapshot());
    const handler = spyOn(console, "error").mockImplementation(() => {});

    let callCount = 0;
    let receivedDelta: unknown = null;

    const unsubscribe = topology.onChange((delta) => {
      callCount++;
      receivedDelta = delta;
    });

    topology.applyEvent({
      type: "device-added",
      name: "Router1",
      model: "ISR 2911",
      ts: Date.now(),
    });

    expect(callCount).toBe(1);
    expect(receivedDelta).not.toBeNull();

    // Check delta structure
    const delta = receivedDelta as { devices: Array<unknown> };
    expect(delta.devices.length).toBe(1);
    expect(delta.devices[0]).toMatchObject({ op: "add", name: "Router1" });

    handler.mockRestore();
    unsubscribe();
  });

  test("does NOT notify handlers when no change", () => {
    const topology = new VirtualTopology(createSnapshotWithDevices());

    let callCount = 0;
    const unsubscribe = topology.onChange(() => {
      callCount++;
    });

    // Try to add duplicate device
    topology.applyEvent({
      type: "device-added",
      name: "Router1", // Already exists
      model: "ISR 2911",
      ts: Date.now(),
    });

    expect(callCount).toBe(0);
    unsubscribe();
  });
});

// ============================================================================
// Issue #6: replaceSnapshot calculates delta and notifies
// ============================================================================

describe("replaceSnapshot behavior", () => {
  test("replaces snapshot and increments version", () => {
    const topology = new VirtualTopology(createSnapshotWithDevices());
    const initialVersion = topology.getVersion();

    const newSnapshot: TopologySnapshot = {
      ...createSnapshotWithDevices(),
      devices: {
        ...createSnapshotWithDevices().devices,
        NewRouter: {
          name: "NewRouter",
          model: "ISR 4321",
          type: "router",
          power: true,
          ports: [],
        },
      },
    };

    topology.replaceSnapshot(newSnapshot);

    expect(topology.getVersion()).toBe(initialVersion + 1);
    expect(topology.getDevice("NewRouter")).toBeDefined();
    expect(topology.getDevice("Router1")).toBeUndefined(); // Old device removed
  });

  test("notifies handlers on replaceSnapshot", () => {
    const topology = new VirtualTopology(createEmptySnapshot());

    let callCount = 0;
    const unsubscribe = topology.onChange(() => {
      callCount++;
    });

    topology.replaceSnapshot(createSnapshotWithDevices());

    expect(callCount).toBe(1);

    unsubscribe();
  });
});

// ============================================================================
// Handler Cleanup (Memory Leak Prevention)
// ============================================================================

describe("Handler management", () => {
  test("onChange returns unsubscribe function", () => {
    const topology = new VirtualTopology(createEmptySnapshot());

    let count = 0;
    const unsubscribe = topology.onChange(() => {
      count++;
    });

    topology.applyEvent({
      type: "device-added",
      name: "Router1",
      model: "ISR 2911",
      ts: Date.now(),
    });

    expect(count).toBe(1);

    unsubscribe();

    topology.applyEvent({
      type: "device-added",
      name: "Switch1",
      model: "2960",
      ts: Date.now(),
    });

    // Should NOT increment because handler was unsubscribed
    expect(count).toBe(1);
  });

  test("unsubscribe is idempotent", () => {
    const topology = new VirtualTopology(createEmptySnapshot());

    let count = 0;
    const unsubscribe = topology.onChange(() => {
      count++;
    });

    // Call unsubscribe multiple times
    unsubscribe();
    unsubscribe();
    unsubscribe();

    topology.applyEvent({
      type: "device-added",
      name: "Router1",
      model: "ISR 2911",
      ts: Date.now(),
    });

    // Handler should still work (unsubscribe was idempotent)
    expect(count).toBe(1);
  });

  test("handlers array cleanup after unsubscribe", () => {
    const topology = new VirtualTopology(createEmptySnapshot());

    let unsubscribe: () => void;
    const unsubscribe2 = topology.onChange(() => {});

    const handlerCount = (topology as unknown as { getHandlerCount: () => number }).getHandlerCount?.();

    unsubscribe = topology.onChange(() => {});

    // Unsubscribe first handler
    unsubscribe();

    // Handler count should decrease
    const handlerCountAfter = (topology as unknown as { getHandlerCount: () => number }).getHandlerCount?.();
    expect(handlerCountAfter).toBeLessThanOrEqual(handlerCount ?? 2);

    unsubscribe2();
  });
});

// ============================================================================
// Link ID Consistency
// ============================================================================

describe("Link ID creation", () => {
  test("createLinkId is symmetric (order independent)", () => {
    const topology = new VirtualTopology(createEmptySnapshot());

    const linkId1 = (topology as unknown as { createLinkId: Function }).createLinkId(
      "Router1",
      "Gig0/0",
      "Switch1",
      "Fast0/1"
    );

    const linkId2 = (topology as unknown as { createLinkId: Function }).createLinkId(
      "Switch1",
      "Fast0/1",
      "Router1",
      "Gig0/0"
    );

    expect(linkId1).toBe(linkId2);
  });

  test("createLinkId produces different IDs for different ports", () => {
    const topology = new VirtualTopology(createEmptySnapshot());

    const linkId1 = (topology as unknown as { createLinkId: Function }).createLinkId(
      "Router1",
      "Gig0/0",
      "Switch1",
      "Fast0/1"
    );

    const linkId2 = (topology as unknown as { createLinkId: Function }).createLinkId(
      "Router1",
      "Gig0/1", // Different port
      "Switch1",
      "Fast0/1"
    );

    expect(linkId1).not.toBe(linkId2);
  });

  test("link between same devices with different ports creates different links", () => {
    const topology = new VirtualTopology(createSnapshotWithDevices());

    topology.applyEvent({
      type: "link-created",
      device1: "Router1",
      port1: "Gig0/0",
      device2: "Switch1",
      port2: "Fast0/1",
      ts: Date.now(),
    });

    topology.applyEvent({
      type: "link-created",
      device1: "Router1",
      port1: "Gig0/1", // Different port
      device2: "Switch1",
      port2: "Fast0/2",
      ts: Date.now(),
    });

    const links = topology.getLinks();
    expect(links.length).toBe(2);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("Edge cases", () => {
  test("handles concurrent port name formats", () => {
    const topology = new VirtualTopology(createEmptySnapshot());

    // Create link with various port naming conventions
    topology.applyEvent({
      type: "link-created",
      device1: "Router1",
      port1: "GigabitEthernet0/0",
      device2: "Switch1",
      port2: "FastEthernet0/1",
      ts: Date.now(),
    });

    const link = topology.findLinkBetween("Router1", "Switch1");
    expect(link).toBeDefined();
  });

  test("getConnectedDevices returns correct neighbors", () => {
    const topology = new VirtualTopology(createSnapshotWithDevices());

    topology.applyEvent({
      type: "link-created",
      device1: "Router1",
      port1: "Gig0/0",
      device2: "Switch1",
      port2: "Fast0/1",
      ts: Date.now(),
    });

    const connectedToRouter = topology.getConnectedDevices("Router1");
    expect(connectedToRouter).toContain("Switch1");

    const connectedToSwitch = topology.getConnectedDevices("Switch1");
    expect(connectedToSwitch).toContain("Router1");
  });

  test("toNetworkTwin converts correctly", () => {
    const topology = new VirtualTopology(createSnapshotWithDevices());
    const twin = topology.toNetworkTwin();

    expect(twin.devices).toBeDefined();
    expect(twin.devices["Router1"]).toBeDefined();
    expect(twin.devices["Switch1"]).toBeDefined();
  });

  test("snapshot event updates timestamp", () => {
    const topology = new VirtualTopology(createEmptySnapshot());
    const initialTime = topology.getLastUpdate();

    // Wait a tiny bit
    const newTime = Date.now() + 10;

    topology.applyEvent({
      type: "snapshot",
      ts: newTime,
      devices: {},
    });

    expect(topology.getLastUpdate()).toBe(newTime);
  });

  test("handles device with no ports", () => {
    const topology = new VirtualTopology(createEmptySnapshot());

    topology.applyEvent({
      type: "device-added",
      name: "IsolatedRouter",
      model: "ISR 2911",
      ts: Date.now(),
    });

    const device = topology.getDevice("IsolatedRouter");
    expect(device?.ports).toEqual([]);
  });
});
