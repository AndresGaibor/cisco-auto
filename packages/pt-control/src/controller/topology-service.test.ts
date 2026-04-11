import { describe, expect, test } from "bun:test";
import { ControllerTopologyService } from "./topology-service.js";

describe("ControllerTopologyService", () => {
  test("delegates topology and host config calls", async () => {
    const topologyService = {
      addDevice: async () => ({ name: "R1" }),
      removeDevice: async () => undefined,
      renameDevice: async () => undefined,
      moveDevice: async () => ({ ok: true, name: "R1", x: 1, y: 2 }),
      listDevices: async () => [],
      addLink: async () => ({ id: "L1" }),
      removeLink: async () => undefined,
      clearTopology: async () => ({ removedDevices: 0, removedLinks: 0, remainingDevices: 0, remainingLinks: 0 }),
    } as any;

    const deviceService = {
      configHost: async () => undefined,
    } as any;

    const service = new ControllerTopologyService(topologyService, deviceService);

    await expect(service.addDevice("R1", "2911")).resolves.toEqual({ name: "R1" });
    await expect(service.moveDevice("R1", 1, 2)).resolves.toEqual({ ok: true, name: "R1", x: 1, y: 2 });
    await expect(service.configHost("R1", { ip: "10.0.0.1" })).resolves.toBeUndefined();
  });
});
