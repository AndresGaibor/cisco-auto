import { describe, expect, test } from "bun:test";
import { TopologyService } from "./topology-service.js";

function createBridge() {
  const commands: Array<{ type: string; payload: unknown }> = [];
  return {
    commands,
    runPrimitive: async (type: string, payload: unknown) => {
      commands.push({ type, payload });
      if (type === "topology.snapshot") return { ok: true, value: { version: "1", timestamp: 1, devices: {}, links: {} } };
      if (type === "device.add") return { ok: true, value: { name: "R1", model: "2911", type: "router", power: true, x: 100, y: 100, ports: [] } };
      if (type === "device.move") return { ok: true, value: { ok: true, name: "R1", x: 10, y: 20 } };
      if (type === "link.add") return { ok: true, value: { id: "L1", device1: "R1", port1: "Gi0/0", device2: "S1", port2: "Fa0/1", cableType: "straight" } };
      return { ok: true, value: null };
    },
  } as any;
}

function createCache() {
  return {
    materialized: true,
    getDevice: () => undefined,
    getDevices: () => [],
    getLinks: () => [],
    getDeviceNames: () => [],
    getConnectedDevices: () => [],
    findLinkBetween: () => undefined,
    isMaterialized: () => true,
    getSnapshot: () => ({ version: "1", timestamp: 1, devices: {}, links: {} }),
    applySnapshot: () => {},
  } as any;
}

describe("TopologyService", () => {
  test("snapshot y addDevice funcionan", async () => {
    const bridge = createBridge();
    const service = new TopologyService(bridge, createCache(), () => "id-1");

    const snapshot = await service.snapshot();
    const device = await service.addDevice("R1", "2911");

    expect(snapshot?.version).toBe("1");
    expect(device.name).toBe("R1");
    expect(bridge.commands[0]?.type).toBe("topology.snapshot");
    expect(bridge.commands[1]?.type).toBe("device.add");
  });

  test("moveDevice y addLink delegan al bridge", async () => {
    const bridge = createBridge();
    const service = new TopologyService(bridge, createCache(), () => "id-1");

    const moved = await service.moveDevice("R1", 10, 20);
    const link = await service.addLink("R1", "Gi0/0", "S1", "Fa0/1");

    expect(moved.ok).toBe(true);
    expect(link.id).toBe("L1");
    expect(bridge.commands.map((c: any) => c.type)).toContain("device.move");
    expect(bridge.commands.map((c: any) => c.type)).toContain("link.add");
    expect(bridge.commands.find((c: any) => c.type === "link.add")?.payload).toEqual({
      type: "addLink",
      device1: "R1",
      port1: "Gi0/0",
      device2: "S1",
      port2: "Fa0/1",
      linkType: "auto",
      cableType: "auto",
      strictPorts: true,
      allowAutoFallback: false,
      replaceExisting: false,
    });
  });
});
