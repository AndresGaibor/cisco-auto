import { describe, expect, test } from "bun:test";
import { TopologyQueryService } from "./topology-query-service.js";

function createBridge() {
  const commands: Array<{ type: string; payload: unknown }> = [];

  return {
    commands,
    isReady: () => true,
    readState: () => null,
    sendCommandAndWait: async (type: string, payload: unknown) => {
      commands.push({ type, payload });

      if (type === "listDevices") {
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
  } as any;
}

describe("TopologyQueryService", () => {
  test("listDevices consulta el bridge aunque exista caché materializada", async () => {
    const bridge = createBridge();
    const service = new TopologyQueryService(bridge, createCache(), () => "id-1");

    const result = await service.listDevices();

    expect(bridge.commands[0]?.type).toBe("listDevices");
    expect(result.devices[0]?.name).toBe("LIVE");
    expect(result.connectionsByDevice.LIVE?.[0]?.remoteDevice).toBe("SW1");
  });
});
