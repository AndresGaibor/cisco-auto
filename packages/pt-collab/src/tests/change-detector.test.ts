import { describe, test, expect } from "bun:test";
import { diffSnapshots, diffToDeltas, snapshotFromTopology, type TopologySnapshot, type DiffResult } from "../detector/change-detector.js";

function emptySnapshot(ts?: number): TopologySnapshot {
  return { timestamp: ts ?? 1000, devices: {}, links: {}, deviceConfigs: {} };
}

describe("diffSnapshots", () => {

  test("retorna diff vacío si no hay cambios", () => {
    const before = emptySnapshot();
    const after = emptySnapshot();
    const diff = diffSnapshots(before, after);
    expect(diff.devicesAdded).toEqual([]);
    expect(diff.devicesRemoved).toEqual([]);
    expect(diff.devicesMoved).toEqual([]);
    expect(diff.linksAdded).toEqual([]);
    expect(diff.linksRemoved).toEqual([]);
    expect(diff.configsChanged).toEqual([]);
  });

  test("detecta dispositivo añadido", () => {
    const before = emptySnapshot();
    const after = emptySnapshot(1001);
    after.devices.R1 = { name: "R1", model: "2911", x: 0, y: 0 };
    const diff = diffSnapshots(before, after);
    expect(diff.devicesAdded).toHaveLength(1);
    expect(diff.devicesAdded[0]!.name).toBe("R1");
    expect(diff.devicesRemoved).toEqual([]);
  });

  test("detecta dispositivo removido", () => {
    const before = emptySnapshot();
    before.devices.R1 = { name: "R1", model: "2911", x: 0, y: 0 };
    const after = emptySnapshot(1001);
    const diff = diffSnapshots(before, after);
    expect(diff.devicesRemoved).toEqual(["R1"]);
  });

  test("detecta dispositivo movido", () => {
    const before = emptySnapshot();
    before.devices.SW1 = { name: "SW1", model: "2960", x: 100, y: 100 };
    const after = emptySnapshot(1001);
    after.devices.SW1 = { name: "SW1", model: "2960", x: 200, y: 300 };
    const diff = diffSnapshots(before, after);
    expect(diff.devicesMoved).toHaveLength(1);
    expect(diff.devicesMoved[0]!.name).toBe("SW1");
    expect(diff.devicesMoved[0]!.fromX).toBe(100);
    expect(diff.devicesMoved[0]!.toX).toBe(200);
    expect(diff.devicesMoved[0]!.toY).toBe(300);
  });

  test("detecta enlace añadido", () => {
    const before = emptySnapshot();
    const after = emptySnapshot(1001);
    after.links.l1 = { id: "l1", device1: "R1", port1: "G0/0", device2: "SW1", port2: "F0/1" };
    const diff = diffSnapshots(before, after);
    expect(diff.linksAdded).toHaveLength(1);
    expect(diff.linksAdded[0]!.id).toBe("l1");
  });

  test("detecta enlace removido", () => {
    const before = emptySnapshot();
    before.links.l1 = { id: "l1", device1: "R1", port1: "G0/0", device2: "SW1", port2: "F0/1" };
    const after = emptySnapshot(1001);
    const diff = diffSnapshots(before, after);
    expect(diff.linksRemoved).toEqual(["l1"]);
  });

  test("detecta cambio de config", () => {
    const before = emptySnapshot();
    before.devices.R1 = { name: "R1", model: "2911" };
    before.deviceConfigs.R1 = { runningConfig: "hostname R1\n" };
    const after = emptySnapshot(1001);
    after.devices.R1 = { name: "R1", model: "2911" };
    after.deviceConfigs.R1 = { runningConfig: "hostname R1\nip route 0.0.0.0 0.0.0.0 10.0.0.1\n" };
    const diff = diffSnapshots(before, after);
    expect(diff.configsChanged).toHaveLength(1);
    expect(diff.configsChanged[0]!.device).toBe("R1");
    expect(diff.configsChanged[0]!.section).toBe("runningConfig");
  });
});

describe("snapshotFromTopology", () => {
  test("convierte devices/links planos a TopologySnapshot", () => {
    const snap = snapshotFromTopology(
      { R1: { name: "R1", model: "2911", x: 10, y: 20 } },
      { l1: { id: "l1", device1: "R1", port1: "G0/0", device2: "SW1", port2: "F0/1" } },
    );
    expect(snap.devices.R1?.name).toBe("R1");
    expect(snap.links.l1?.id).toBe("l1");
    expect(snap.timestamp).toBeGreaterThan(0);
  });
});

describe("diffToDeltas", () => {
  test("convierte DiffResult a CollabDelta[]", () => {
    const diff: DiffResult = {
      devicesAdded: [{ name: "R1", model: "2911" }],
      devicesRemoved: [],
      devicesMoved: [],
      linksAdded: [],
      linksRemoved: [],
      configsChanged: [],
    };
    const deltas = diffToDeltas(diff, "room1", "peer1", 0, 1, {});
    expect(deltas).toHaveLength(1);
    expect(deltas[0]!.kind).toBe("topology.device.added");
    expect(deltas[0]!.roomId).toBe("room1");
    expect(deltas[0]!.peerId).toBe("peer1");
    expect(deltas[0]!.seq).toBe(0);
  });

  test("incluye links, moves, removals, config changes", () => {
    const diff: DiffResult = {
      devicesAdded: [],
      devicesRemoved: ["SW1"],
      devicesMoved: [{ name: "R1", fromX: 0, fromY: 0, toX: 100, toY: 200 }],
      linksAdded: [{ id: "l1", device1: "R1", port1: "G0/0", device2: "SW1", port2: "F0/1" }],
      linksRemoved: ["l2"],
      configsChanged: [{ device: "R1", section: "runningConfig" }],
    };
    const deltas = diffToDeltas(diff, "r1", "p1", 10, 5, { p1: 9 });
    const kinds = deltas.map((d) => d.kind);
    expect(kinds).toContain("topology.device.removed");
    expect(kinds).toContain("topology.device.moved");
    expect(kinds).toContain("topology.link.created");
    expect(kinds).toContain("topology.link.deleted");
    expect(kinds).toContain("device.cli.runningConfig.changed");
  });

  test("genera topology.device.moved cuando cambian x/y", () => {
    const before = snapshotFromTopology(
      { Router0: { name: "Router0", model: "ISR4321", x: 100, y: 200 } },
      {},
    );
    const after = snapshotFromTopology(
      { Router0: { name: "Router0", model: "ISR4321", x: 150, y: 220 } },
      {},
    );
    const diff = diffSnapshots(before, after);
    expect(diff.devicesMoved.some((m) => m.name === "Router0")).toBe(true);
    const move = diff.devicesMoved.find((m) => m.name === "Router0");
    expect(move?.fromX).toBe(100);
    expect(move?.fromY).toBe(200);
    expect(move?.toX).toBe(150);
    expect(move?.toY).toBe(220);
  });

  test("no genera movimiento si x/y no cambian", () => {
    const before = snapshotFromTopology(
      { Router0: { name: "Router0", model: "ISR4321", x: 100, y: 200 } },
      {},
    );
    const after = snapshotFromTopology(
      { Router0: { name: "Router0", model: "ISR4321", x: 100, y: 200 } },
      {},
    );
    const diff = diffSnapshots(before, after);
    expect(diff.devicesMoved).toHaveLength(0);
  });
});
