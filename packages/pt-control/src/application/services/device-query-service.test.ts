import { describe, expect, test } from "bun:test";
import { DeviceQueryService } from "./device-query-service.js";

function createPrimitivePort() {
  const calls: Array<{ type: string; payload: unknown }> = [];

  return {
    calls,
    runPrimitive: async (type: string, payload: unknown) => {
      calls.push({ type, payload });

      if (type === "device.inspect.fast") {
        return {
          ok: true,
          value: {
            device: {
              name: "SW Core",
              model: "3650-24PS",
              type: "switch_layer3",
              power: true,
              hasCommandLine: true,
            },
          },
        };
      }

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

  test("inspectFast usa la primitive rápida sin snapshot", async () => {
    const primitivePort = createPrimitivePort();
    const service = new DeviceQueryService(primitivePort, createCache(), () => "id-2");

    const device = await service.inspectFast("SW Core");

    expect(primitivePort.calls[0]?.type).toBe("device.inspect.fast");
    expect(primitivePort.calls.some((call: { type: string }) => call.type === "topology.snapshot")).toBe(false);
    expect(device.name).toBe("SW Core");
  });

  test("inspectFast no cae a snapshot cuando la primitive rápida no encuentra el dispositivo", async () => {
    const primitivePort = {
      calls: [] as Array<{ type: string; payload: unknown }>,
      runPrimitive: async (type: string, payload: unknown) => {
        primitivePort.calls.push({ type, payload });

        if (type === "device.inspect.fast") {
          return { ok: true, value: null };
        }

        if (type === "topology.snapshot") {
          return { ok: true, value: { devices: {}, links: {} } };
        }

        return { ok: true, value: null };
      },
    } as any;
    const service = new DeviceQueryService(primitivePort, createCache(), () => "id-3");

    const device = await service.inspectFast("Missing Device");

    expect(device).toBeNull();
    expect(primitivePort.calls[0]?.type).toBe("device.inspect.fast");
    expect(primitivePort.calls.some((call: { type: string }) => call.type === "topology.snapshot")).toBe(false);
  });
});
