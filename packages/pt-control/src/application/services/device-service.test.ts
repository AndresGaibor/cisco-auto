import { describe, expect, test } from "bun:test";
import { DeviceService } from "./device-service.js";

function createBridge() {
  const commands: Array<{ type: string; payload: unknown }> = [];
  return {
    commands,
    runPrimitive: async (type: string, payload: unknown) => {
      commands.push({ type, payload });
      if (type === "topology.snapshot") {
        return {
          ok: true,
          value: {
            devices: {
              R1: { name: "R1", model: "2911", type: "router", power: true, ports: [] },
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
      if (type === "module.slots") return { ok: true, value: { slots: [], slotCount: 0 } };
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

  test("addModule con slot auto descubre slot compatible", async () => {
    const bridge = createBridge();
    const service = new DeviceService(bridge, createCache(), () => "id-1");

    const result = await service.addModule("R1", "auto", "WIC-2T");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.slot).toBeGreaterThanOrEqual(0);
    }
  });
});
