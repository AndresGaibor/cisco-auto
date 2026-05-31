import { describe, test, expect } from "bun:test";
import { applyDelta, type PTControllerPort } from "../applier/delta-applier.js";
import type { CollabDelta } from "../protocol/messages.js";

class SpyController implements PTControllerPort {
  calls: Array<{ method: string; args: unknown[] }> = [];

  async addDevice(name: string, model: string, options?: { x?: number; y?: number }) {
    this.calls.push({ method: "addDevice", args: [name, model, options] });
    return { ok: true };
  }
  async removeDevice(name: string) {
    this.calls.push({ method: "removeDevice", args: [name] });
  }
  async renameDevice(oldName: string, newName: string) {
    this.calls.push({ method: "renameDevice", args: [oldName, newName] });
  }
  async moveDevice(name: string, x: number, y: number) {
    this.calls.push({ method: "moveDevice", args: [name, x, y] });
    return { ok: true, name, x, y };
  }
  async addLink(device1: string, port1: string, device2: string, port2: string, linkType?: string) {
    this.calls.push({ method: "addLink", args: [device1, port1, device2, port2, linkType] });
    return { id: "l1" };
  }
  async removeLink(device: string, port: string) {
    this.calls.push({ method: "removeLink", args: [device, port] });
  }
  async configIos(device: string, commands: string[], options?: { save?: boolean }) {
    this.calls.push({ method: "configIos", args: [device, commands, options] });
  }
}

function makeDelta(overrides: Partial<CollabDelta>): CollabDelta {
  return {
    id: "d1",
    roomId: "room1",
    peerId: "p1",
    seq: 1,
    lamport: 1,
    createdAt: new Date().toISOString(),
    baseVector: {},
    scope: "topology",
    kind: "topology.device.added",
    payload: { name: "R1", model: "2911" },
    ...overrides,
  } as CollabDelta;
}

describe("applyDelta", () => {
  test("topology.device.added", async () => {
    const ctrl = new SpyController();
    const delta = makeDelta({
      kind: "topology.device.added",
      payload: { name: "R1", model: "2911", x: 100, y: 200 },
    });
    const result = await applyDelta(delta, ctrl);
    expect(result.ok).toBe(true);
    expect(ctrl.calls[0]!.method).toBe("addDevice");
    expect(ctrl.calls[0]!.args).toEqual(["R1", "2911", { x: 100, y: 200 }]);
  });

  test("topology.device.removed", async () => {
    const ctrl = new SpyController();
    const delta = makeDelta({ kind: "topology.device.removed", payload: { name: "R1" } });
    await applyDelta(delta, ctrl);
    expect(ctrl.calls[0]!.method).toBe("removeDevice");
  });

  test("topology.device.moved", async () => {
    const ctrl = new SpyController();
    const delta = makeDelta({
      kind: "topology.device.moved",
      payload: { name: "R1", toX: 300, toY: 400 },
    });
    await applyDelta(delta, ctrl);
    expect(ctrl.calls[0]!.method).toBe("moveDevice");
    expect(ctrl.calls[0]!.args).toEqual(["R1", 300, 400]);
  });

  test("topology.device.renamed", async () => {
    const ctrl = new SpyController();
    const delta = makeDelta({
      kind: "topology.device.renamed",
      payload: { oldName: "R1", newName: "Router1" },
    });
    await applyDelta(delta, ctrl);
    expect(ctrl.calls[0]!.method).toBe("renameDevice");
  });

  test("topology.link.created", async () => {
    const ctrl = new SpyController();
    const delta = makeDelta({
      kind: "topology.link.created",
      payload: { device1: "R1", port1: "G0/0", device2: "SW1", port2: "F0/1" },
    });
    await applyDelta(delta, ctrl);
    expect(ctrl.calls[0]!.method).toBe("addLink");
  });

  test("device.cli.runningConfig.changed sin configLines es no-op", async () => {
    const ctrl = new SpyController();
    const delta = makeDelta({
      kind: "device.cli.runningConfig.changed",
      payload: { device: "R1", configLines: [] },
    });
    await applyDelta(delta, ctrl);
    expect(ctrl.calls).toHaveLength(0);
  });

  test("device.cli.runningConfig.changed con configLines aplica", async () => {
    const ctrl = new SpyController();
    const delta = makeDelta({
      kind: "device.cli.runningConfig.changed",
      payload: { device: "R1", configLines: ["ip route 0.0.0.0 0.0.0.0 10.0.0.1"] },
    });
    await applyDelta(delta, ctrl);
    expect(ctrl.calls[0]!.method).toBe("configIos");
  });

  test("device.cli.runningConfig.changed ejecuta cada comando sin ensureMode", async () => {
    const receivedPlans: any[] = [];
    const ctrl = new SpyController() as any;
    ctrl.runTerminalPlan = async (plan: any) => {
      receivedPlans.push(plan);
    };
    const delta = makeDelta({
      kind: "device.cli.runningConfig.changed",
      payload: { device: "R1", configLines: ["hostname R2", "ip routing"] },
    });
    await applyDelta(delta, ctrl);
    expect(receivedPlans).toHaveLength(2);
    expect(receivedPlans[0]!.steps).toHaveLength(1);
    expect(receivedPlans[0]!.steps[0]!).toMatchObject({ kind: "command", command: "hostname R2" });
    expect(receivedPlans[1]!.steps).toHaveLength(1);
    expect(receivedPlans[1]!.steps[0]!).toMatchObject({ kind: "command", command: "ip routing" });
  });

  test("delta desconocido es ok (no-op)", async () => {
    const ctrl = new SpyController();
    const delta = makeDelta({
      kind: "multiuser.peer.connected" as CollabDelta["kind"],
      payload: {},
    });
    const result = await applyDelta(delta, ctrl);
    expect(result.ok).toBe(true);
    expect(ctrl.calls).toHaveLength(0);
  });
});
