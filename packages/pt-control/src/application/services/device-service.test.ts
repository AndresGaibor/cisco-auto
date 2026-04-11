import { describe, expect, test } from "bun:test";
import { DeviceService } from "./device-service.js";

function createBridge() {
  const commands: Array<{ type: string; payload: unknown }> = [];
  return {
    commands,
    sendCommandAndWait: async (type: string, payload: unknown) => {
      commands.push({ type, payload });
      if (type === "inspect") return { ok: true, value: { name: "R1", model: "2911", type: "router", power: true, ports: [] } };
      if (type === "hardwareInfo") return { ok: true, value: { ok: true } };
      if (type === "commandLog") return { ok: true, value: [] };
      if (type === "inspectDhcpServer") return { ok: true, value: { ok: true, device: "R1", pools: [], poolCount: 0, excludedAddressCount: 0 } };
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
    expect(bridge.commands[0]?.type).toBe("inspect");
  });

  test("hardwareInfo y inspectDhcpServer delegan", async () => {
    const bridge = createBridge();
    const service = new DeviceService(bridge, createCache(), () => "id-1");

    const info = await service.hardwareInfo("R1");
    const dhcp = await service.inspectDhcpServer("R1");

    expect(info).toEqual({ ok: true });
    expect(dhcp.device).toBe("R1");
  });
});
