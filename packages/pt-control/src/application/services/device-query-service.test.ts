import { describe, expect, test } from "bun:test";
import { DeviceQueryService } from "./device-query-service.js";

function createPrimitivePort() {
  const calls: Array<{ type: string; payload: unknown }> = [];

  return {
    calls,
    runPrimitive: async (type: string, payload: unknown) => {
      calls.push({ type, payload });

      if (type === "topology.snapshot") {
        return {
          ok: true,
          value: {
            devices: {
              "SW Core": {
                name: "SW Core",
                model: "3650-24PS",
                type: "switch_layer3",
                power: true,
                ports: [],
              },
            },
            links: {},
          },
        };
      }

      return { ok: true, value: null };
    },
  } as any;
}

function createCache() {
  return {
    getDevice: () => undefined,
    getDevices: () => [],
  } as any;
}

describe("DeviceQueryService", () => {
  test("inspect usa snapshot cuando la cache no tiene el dispositivo", async () => {
    const primitivePort = createPrimitivePort();
    const service = new DeviceQueryService(primitivePort, createCache(), () => "id-1");

    const device = await service.inspect("SW Core");

    expect(primitivePort.calls[0]?.type).toBe("topology.snapshot");
    expect(device.name).toBe("SW Core");
    expect(device.model).toBe("3650-24PS");
  });
});
