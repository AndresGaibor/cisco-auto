import { describe, expect, test } from "bun:test";
import { TopologyQueryService } from "./topology-query-service.js";

function createBridge() {
  const commands: Array<{ type: string; payload: unknown }> = [];

  return {
    commands,
    isReady: () => true,
    readState: () => null,
    runPrimitive: async (type: string, payload: unknown) => {
      commands.push({ type, payload });

      if (type === "topology.list") {
        return {
          ok: true,
          value: {
            devices: [{ name: "LIVE", model: "2911", type: "router", power: true, ports: [] }],
            connectionsByDevice: {
              LIVE: [
                {
                  localPort: "FastEthernet0/0",
                  remoteDevice: "SW1",
                  remotePort: "FastEthernet0/1",
                  confidence: "exact",
                },
              ],
            },
            unresolvedLinks: [],
            count: 1,
          },
        };
      }

      return { ok: true, value: null };
    },
  } as any;
}

function createCache() {
  return {
    isMaterialized: () => true,
    getDevices: () => [
      { name: "CACHED", model: "2960-24TT", type: "switch", power: true, ports: [] },
    ],
    getLinks: () => [],
    getSnapshot: () => ({ version: "1", timestamp: 1, devices: {}, links: {} }),
    applySnapshot: () => {},
  } as any;
}

describe("TopologyQueryService", () => {
  test("listDevices consulta el bridge aunque exista caché materializada", async () => {
    const primitivePort = createBridge();
    const service = new TopologyQueryService(createCache(), primitivePort, () => "id-1");

    const result = await service.listDevices();

    expect(primitivePort.commands[0]?.type).toBe("topology.list");
    expect(result.devices[0]?.name).toBe("LIVE");
    expect(result.connectionsByDevice.LIVE?.[0]?.remoteDevice).toBe("SW1");
  });

  test("listDevices conserva el tipo multilayer-switch para PT tipo 16", async () => {
    const primitivePort = createBridge();
    const service = new TopologyQueryService(createCache(), primitivePort, () => "id-2");

    primitivePort.runPrimitive = (async (type: string) => {
      if (type === "topology.list") {
        return {
          ok: true,
          value: {
            devices: [{ name: "SW Core", model: "3650-24PS", type: 16, power: true, ports: [] }],
            connectionsByDevice: {},
            unresolvedLinks: [],
            count: 1,
          },
        };
      }

      return { ok: true, value: null };
    }) as any;

    const result = await service.listDevices();

    expect(result.devices[0]?.type).toBe("switch_layer3");
  });
});
