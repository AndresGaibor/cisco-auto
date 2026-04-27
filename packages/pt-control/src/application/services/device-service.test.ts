import { describe, expect, test } from "bun:test";
import { DeviceService } from "./device-service.js";

function createBridge() {
  const commands: Array<{ type: string; payload: unknown }> = [];
  let snapshotCount = 0;
  return {
    commands,
    runPrimitive: async (type: string, payload: unknown) => {
      commands.push({ type, payload });
      if (type === "topology.snapshot") {
        snapshotCount += 1;
        return {
          ok: true,
          value: {
            devices: {
              R1: {
                name: "R1",
                model: "2911",
                type: "router",
                power: true,
                ports: snapshotCount === 1
                  ? [{ name: "GigabitEthernet0/0" }, { name: "GigabitEthernet0/1" }]
                  : [{ name: "GigabitEthernet0/0" }, { name: "GigabitEthernet0/1" }, { name: "FastEthernet0/1/0" }],
              },
            },
            links: {},
          },
        };
      }
      if (type === "device.inspect") {
        return { ok: true, value: { name: "R1", model: "2911", type: "router", power: true, ports: [] } };
      }
      if (type === "snapshot.hardware") return { ok: true, value: { ok: true } };
      if (type === "commandLog") return { ok: true, value: [] };
      if (type === "dhcp.inspect") return { ok: true, value: { ok: true, device: "R1", pools: [], poolCount: 0, excludedAddressCount: 0 } };
      if (type === "module.slots") {
        return {
          ok: true,
          value: {
            device: "R1",
            slots: [
              { index: 0, type: 1, occupied: false, compatibleModules: ["NM-2W"] },
              { index: 1, type: 2, occupied: false, compatibleModules: ["WIC-2T", "HWIC-4ESW", "HWIC-2T"] },
            ],
            slotCount: 2,
          },
        };
      }
      if (type === "module.add") return { ok: true, value: { device: "R1", slot: 1, module: "WIC-2T", wasPoweredOff: false } };
      return { ok: true, value: null };
    },
  } as any;
}

function createCache() {
  return {
    getDevice: () => undefined,
  } as any;
}

describe("DeviceService", () => {
  test("inspect usa el bridge cuando no hay caché", async () => {
    const bridge = createBridge();
    const service = new DeviceService(bridge, createCache(), () => "id-1");

    const device = await service.inspect("R1");

    expect(device.name).toBe("R1");
    expect(bridge.commands[0]?.type).toBe("topology.snapshot");
  });

  test("hardwareInfo y inspectDhcpServer delegan", async () => {
    const bridge = createBridge();
    const service = new DeviceService(bridge, createCache(), () => "id-1");

    const info = await service.hardwareInfo("R1");
    const dhcp = await service.inspectDhcpServer("R1");

    expect(info).toEqual({ ok: true });
    expect(dhcp.device).toBe("R1");
  });

  test("inspectModuleSlots delega a la primitiva module.slots", async () => {
    const bridge = createBridge();
    const service = new DeviceService(bridge, createCache(), () => "id-1");

    const result = await service.inspectModuleSlots("R1");

    expect(bridge.commands[0]?.type).toBe("module.slots");
    expect(result.ok).toBe(true);
  });

  test("addModule devuelve resultado estructurado con device, module y slot", async () => {
    const bridge = createBridge();
    const service = new DeviceService(bridge, createCache(), () => "id-1");

    const result = await service.addModule("R1", 1, "WIC-2T");

    expect(bridge.commands.some((item: any) => item.type === "module.add")).toBe(true);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.device).toBe("R1");
      expect(result.value.module).toBe("WIC-2T");
      expect(result.value.slot).toBe(1);
    }
  });

  test("addModule incluye puertos antes y despues", async () => {
    const bridge = createBridge();
    const service = new DeviceService(bridge, createCache(), () => "id-1");

    const result = await service.addModule("R1", "auto", "WIC-2T");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.beforePorts.map((port) => port.name)).toEqual([
        "GigabitEthernet0/0",
        "GigabitEthernet0/1",
      ]);
      expect(result.value.afterPorts.map((port) => port.name)).toContain("FastEthernet0/1/0");
      expect(result.value.addedPorts.map((port) => port.name)).toEqual(["FastEthernet0/1/0"]);
    }
  });

  test("addModule con slot auto descubre slot compatible", async () => {
    const bridge = createBridge();
    const service = new DeviceService(bridge, createCache(), () => "id-1");

    const result = await service.addModule("R1", "auto", "WIC-2T");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.slot).toBe(1);
    }
  });

  test("removeModule devuelve puertos removidos", async () => {
    const bridge = createBridge();
    const service = new DeviceService(bridge, createCache(), () => "id-1");

    const result = await service.removeModule("R1", 1);

    expect(bridge.commands.some((item: any) => item.type === "module.remove")).toBe(true);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect((result.value as any).removedPorts).toBeDefined();
    }
  });
});
