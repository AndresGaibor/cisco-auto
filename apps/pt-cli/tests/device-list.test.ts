import { describe, expect, test, vi } from "bun:test";
import { createDefaultPTController } from "@cisco-auto/pt-control/controller";
import {
  buildDeviceListFromSnapshot,
  loadLiveDeviceList,
  isEmptyTopologySnapshot,
  loadLiveDeviceListFromController,
} from "../src/application/device-list.js";
import type { TopologySnapshot } from "@cisco-auto/pt-control/contracts";
import { selectPortsForDisplay } from "../src/commands/device/list.js";

vi.mock("@cisco-auto/pt-control/controller", () => ({
  createDefaultPTController: vi.fn(),
}));

describe("device list helpers", () => {
  test("detecta correctamente un snapshot vacío", () => {
    const emptySnapshot: TopologySnapshot = {
      version: "1.0",
      timestamp: Date.now(),
      devices: {},
      links: {},
      metadata: { deviceCount: 0, linkCount: 0 },
    };

    expect(isEmptyTopologySnapshot(emptySnapshot)).toBe(true);
  });

  test("construye dispositivos y enlaces desde un snapshot poblado", () => {
    const snapshot: TopologySnapshot = {
      version: "1.0",
      timestamp: Date.now(),
      devices: {
        R1: {
          name: "R1",
          model: "2911",
          type: "router",
          power: true,
          ports: [{ name: "Gig0/0", ipAddress: "10.0.0.1", subnetMask: "255.255.255.0" }],
        },
        S1: {
          name: "S1",
          model: "2960",
          type: "switch",
          power: true,
          ports: [],
        },
      },
      links: {
        link1: {
          id: "link1",
          device1: "R1",
          port1: "Gig0/0",
          device2: "S1",
          port2: "Fa0/1",
          cableType: "straight",
        },
      },
      metadata: { deviceCount: 2, linkCount: 1 },
    };

    const result = buildDeviceListFromSnapshot(snapshot);

    expect(result.count).toBe(2);
    expect(result.devices.map((device) => device.name)).toEqual(["R1", "S1"]);
    expect(result.connectionsByDevice.R1?.[0]?.remoteDevice).toBe("S1");
  });

  test("devuelve vacío si live falla y no hay estado", async () => {
    const controller = {
      listDevices: vi.fn().mockRejectedValue(new Error("no respondió a tiempo")),
      getBridgeStatus: () => ({ ready: false, warnings: [] }),
      getCachedSnapshot: () => null,
      readState: () => null,
    };

    const result = await loadLiveDeviceListFromController(controller as never, undefined, 10);

    expect(result.count).toBe(0);
    expect(result.devices).toEqual([]);
  });

  test("usa el resultado vivo aunque el bridge no esté listo", async () => {
    const listDevices = vi.fn().mockResolvedValue({
      devices: [
        {
          name: "R1",
          model: "2911",
          type: "router",
          power: true,
          ports: [],
        },
      ],
      connectionsByDevice: {},
      unresolvedLinks: [],
      count: 1,
    });

    const controller = {
      listDevices,
      getBridgeStatus: () => ({ ready: false, warnings: [] }),
      getCachedSnapshot: () => null,
      readState: () => null,
    };

    const result = await loadLiveDeviceListFromController(controller as never, undefined, 10);

    expect(listDevices).toHaveBeenCalledTimes(1);
    expect(result.count).toBe(1);
    expect(result.devices[0]?.name).toBe("R1");
  });

  test("enriquece macAddress desde el snapshot cacheado", async () => {
    const listDevices = vi.fn().mockResolvedValue({
      devices: [
        {
          name: "PC1",
          model: "PC-PT",
          type: "pc",
          power: true,
          ports: [{ name: "FastEthernet0" }],
        },
      ],
      connectionsByDevice: {},
      unresolvedLinks: [],
      count: 1,
    });

    const getCachedSnapshot = vi.fn().mockReturnValue({
      version: "1.0",
      timestamp: 789,
      devices: {
        PC1: {
          name: "PC1",
          model: "PC-PT",
          type: "pc",
          power: true,
          ports: [
            {
              name: "FastEthernet0",
              macAddress: "0060.7087.3535",
            },
          ],
        },
      },
      links: {},
      metadata: { deviceCount: 1, linkCount: 0 },
    });

    const controller = {
      listDevices,
      getBridgeStatus: () => ({ ready: true, warnings: [] }),
      getCachedSnapshot,
      readState: () => null,
    };

    const result = await loadLiveDeviceListFromController(controller as never, undefined, 10);

    expect(result.devices[0]?.ports?.[0]?.macAddress).toBe("0060.7087.3535");
  });

  test("conserva mac del runtime en el resultado mapeado", async () => {
    const listDevices = vi.fn().mockResolvedValue({
      devices: [
        {
          name: "PC1",
          model: "PC-PT",
          type: "pc",
          power: true,
          mac: "0060.7087.3535",
          ports: [{ name: "FastEthernet0", mac: "0060.7087.3535" }],
        },
      ],
      connectionsByDevice: {},
      unresolvedLinks: [],
      count: 1,
    });

    const controller = {
      listDevices,
      getBridgeStatus: () => ({ ready: true, warnings: [] }),
      getCachedSnapshot: () => null,
      readState: () => null,
    };

    const result = await loadLiveDeviceListFromController(controller as never, undefined, 10);

    expect(result.devices[0]?.mac).toBe("0060.7087.3535");
    expect(result.devices[0]?.ports?.[0]?.macAddress).toBe("0060.7087.3535");
  });

  test("usa el resultado vivo aunque la cola esté llena", async () => {
    const listDevices = vi.fn().mockResolvedValue({
      devices: [
        {
          name: "R2",
          model: "2911",
          type: "router",
          power: true,
          ports: [],
        },
      ],
      connectionsByDevice: {},
      unresolvedLinks: [],
      count: 1,
    });

    const controller = {
      listDevices,
      getBridgeStatus: () => ({ ready: false, queuedCount: 100, warnings: [] }),
      getCachedSnapshot: () => null,
      readState: () => null,
    };

    const result = await loadLiveDeviceListFromController(controller as never, undefined, 10);

    expect(listDevices).toHaveBeenCalledTimes(1);
    expect(result.count).toBe(1);
    expect(result.devices[0]?.name).toBe("R2");
  });

  test("loadLiveDeviceList arranca y detiene el controller", async () => {
    const start = vi.fn();
    const stop = vi.fn().mockResolvedValue(undefined);
    const listDevices = vi.fn().mockResolvedValue({
      devices: [],
      connectionsByDevice: {},
      unresolvedLinks: [],
      count: 0,
    });

    (
      createDefaultPTController as unknown as { mockReturnValue: (value: unknown) => void }
    ).mockReturnValue({
      start,
      stop,
      getBridgeStatus: () => ({ ready: true, warnings: [] }),
      getCachedSnapshot: () => null,
      listDevices,
    } as never);

    await loadLiveDeviceList();

    expect(start).toHaveBeenCalledTimes(1);
    expect(stop).toHaveBeenCalledTimes(1);
    expect(listDevices).toHaveBeenCalledTimes(1);
  });

  test("loadLiveDeviceList usa la caché si el bridge no está listo", async () => {
    const start = vi.fn();
    const stop = vi.fn().mockResolvedValue(undefined);
    const listDevices = vi.fn().mockRejectedValue(new Error("no respondió a tiempo"));
    const getCachedSnapshot = vi.fn().mockReturnValue({
      version: "1.0",
      timestamp: 123,
      devices: {
        R1: {
          name: "R1",
          model: "2911",
          type: "router",
          power: true,
          ports: [],
        },
      },
      links: {},
      metadata: { deviceCount: 1, linkCount: 0 },
    });

    (
      createDefaultPTController as unknown as { mockReturnValue: (value: unknown) => void }
    ).mockReturnValue({
      start,
      stop,
      getBridgeStatus: () => ({
        ready: false,
        warnings: ["Bridge no está listo"],
      }),
      getCachedSnapshot,
      listDevices,
    } as never);

    const result = await loadLiveDeviceList();

    expect(listDevices).toHaveBeenCalledTimes(1);
    expect(result.count).toBe(1);
    expect(result.devices[0]?.name).toBe("R1");
    expect(start).toHaveBeenCalledTimes(1);
    expect(stop).toHaveBeenCalledTimes(1);
  });

  test("loadLiveDeviceList usa state.json si la caché no está materializada", async () => {
    const start = vi.fn();
    const stop = vi.fn().mockResolvedValue(undefined);
    const listDevices = vi.fn().mockRejectedValue(new Error("no respondió a tiempo"));
    const readState = vi.fn().mockReturnValue({
      version: "1.0",
      timestamp: 456,
      devices: {
        S1: {
          name: "S1",
          model: "2960",
          type: "switch",
          power: true,
          ports: [],
        },
      },
      links: {},
      metadata: { deviceCount: 1, linkCount: 0 },
    });

    (
      createDefaultPTController as unknown as { mockReturnValue: (value: unknown) => void }
    ).mockReturnValue({
      start,
      stop,
      getBridgeStatus: () => ({ ready: false, warnings: [] }),
      getCachedSnapshot: () => null,
      readState,
      listDevices,
    } as never);

    const result = await loadLiveDeviceList();

    expect(listDevices).toHaveBeenCalledTimes(1);
    expect(readState).toHaveBeenCalledTimes(1);
    expect(result.count).toBe(1);
    expect(result.devices[0]?.name).toBe("S1");
  });

  test("loadLiveDeviceList devuelve vacío si no hay caché ni state", async () => {
    const start = vi.fn();
    const stop = vi.fn().mockResolvedValue(undefined);

    (
      createDefaultPTController as unknown as { mockReturnValue: (value: unknown) => void }
    ).mockReturnValue({
      start,
      stop,
      getBridgeStatus: () => ({ ready: false, warnings: [] }),
      getCachedSnapshot: () => null,
      readState: () => null,
    } as never);

    const result = await loadLiveDeviceList();

    expect(result.count).toBe(0);
    expect(result.devices).toEqual([]);
  });

  test("mapControllerResult: ambiguous links van a unresolvedLinks, no a connectionsByDevice", async () => {
    const listDevices = vi.fn().mockResolvedValue({
      devices: [
        {
          name: "R1",
          model: "2911",
          type: "router",
          power: true,
          ports: [{ name: "Gig0/0" }],
        },
        {
          name: "R2",
          model: "2911",
          type: "router",
          power: true,
          ports: [{ name: "Gig0/0" }],
        },
        {
          name: "R3",
          model: "2911",
          type: "router",
          power: true,
          ports: [{ name: "Gig0/0" }],
        },
      ],
      connectionsByDevice: {
        R1: [
          {
            localPort: "Gig0/0",
            remoteDevice: "R2",
            remotePort: "Gig0/0",
            confidence: "ambiguous",
            evidence: {
              localCandidates: ["R1"],
              remoteCandidates: ["R2", "R3"],
            },
          },
        ],
        R2: [
          {
            localPort: "Gig0/0",
            remoteDevice: "R1",
            remotePort: "Gig0/0",
            confidence: "ambiguous",
            evidence: {
              localCandidates: ["R2"],
              remoteCandidates: ["R1", "R3"],
            },
          },
        ],
        R3: [
          {
            localPort: "Gig0/0",
            remoteDevice: "R1",
            remotePort: "Gig0/0",
            confidence: "ambiguous",
            evidence: {
              localCandidates: ["R3"],
              remoteCandidates: ["R1", "R2"],
            },
          },
        ],
      },
      unresolvedLinks: [],
      count: 3,
    });

    const controller = {
      listDevices,
      getBridgeStatus: () => ({ ready: true, warnings: [] }),
      getCachedSnapshot: () => null,
      readState: () => null,
    };

    const result = await loadLiveDeviceListFromController(controller as never, undefined, 10);

    expect(result.connectionsByDevice.R1).toBeUndefined();
    expect(result.connectionsByDevice.R2).toBeUndefined();
    expect(result.connectionsByDevice.R3).toBeUndefined();

    expect(result.unresolvedLinks).toHaveLength(3);
    expect(
      result.unresolvedLinks.find((u) => u.port1Name === "Gig0/0" && u.port2Name === "Gig0/0"),
    ).toBeDefined();
    for (const ul of result.unresolvedLinks) {
      expect(ul.confidence).toBe("ambiguous");
      expect(ul.evidence).toBeDefined();
    }
  });

  test("mapControllerResult: exact/registry links van a connectionsByDevice y tienen connection en puerto", async () => {
    const listDevices = vi.fn().mockResolvedValue({
      devices: [
        {
          name: "R1",
          model: "2911",
          type: "router",
          power: true,
          ports: [{ name: "Gig0/0" }],
        },
        {
          name: "S1",
          model: "2960",
          type: "switch",
          power: true,
          ports: [{ name: "Fa0/1" }],
        },
      ],
      connectionsByDevice: {
        R1: [
          {
            localPort: "Gig0/0",
            remoteDevice: "S1",
            remotePort: "Fa0/1",
            confidence: "exact",
            evidence: { source: "pt" },
          },
        ],
        S1: [
          {
            localPort: "Fa0/1",
            remoteDevice: "R1",
            remotePort: "Gig0/0",
            confidence: "exact",
            evidence: { source: "pt" },
          },
        ],
      },
      unresolvedLinks: [],
      count: 2,
    });

    const controller = {
      listDevices,
      getBridgeStatus: () => ({ ready: true, warnings: [] }),
      getCachedSnapshot: () => null,
      readState: () => null,
    };

    const result = await loadLiveDeviceListFromController(controller as never, undefined, 10);

    expect(result.connectionsByDevice.R1).toHaveLength(1);
    expect(result.connectionsByDevice.R1?.[0]?.remoteDevice).toBe("S1");
    expect(result.connectionsByDevice.R1?.[0]?.confidence).toBe("exact");

    expect(result.connectionsByDevice.S1).toHaveLength(1);
    expect(result.connectionsByDevice.S1?.[0]?.remoteDevice).toBe("R1");
    expect(result.connectionsByDevice.S1?.[0]?.confidence).toBe("exact");

    expect(result.unresolvedLinks).toHaveLength(0);

    const r1Port = result.devices.find((d) => d.name === "R1")?.ports?.[0];
    expect(r1Port?.connection?.remoteDevice).toBe("S1");
    expect(r1Port?.connection?.remotePort).toBe("Fa0/1");
    expect(r1Port?.connection?.confidence).toBe("exact");
  });

  test("mapControllerResult: puerto con link ambiguous NO tiene connection", async () => {
    const listDevices = vi.fn().mockResolvedValue({
      devices: [
        {
          name: "R1",
          model: "2911",
          type: "router",
          power: true,
          ports: [{ name: "Gig0/0" }],
        },
        {
          name: "R2",
          model: "2911",
          type: "router",
          power: true,
          ports: [{ name: "Gig0/0" }],
        },
      ],
      connectionsByDevice: {
        R1: [
          {
            localPort: "Gig0/0",
            remoteDevice: "R2",
            remotePort: "Gig0/0",
            confidence: "unknown",
            evidence: {
              localCandidates: [],
              remoteCandidates: [],
            },
          },
        ],
        R2: [
          {
            localPort: "Gig0/0",
            remoteDevice: "R1",
            remotePort: "Gig0/0",
            confidence: "unknown",
            evidence: {
              localCandidates: [],
              remoteCandidates: [],
            },
          },
        ],
      },
      unresolvedLinks: [],
      count: 2,
    });

    const controller = {
      listDevices,
      getBridgeStatus: () => ({ ready: true, warnings: [] }),
      getCachedSnapshot: () => null,
      readState: () => null,
    };

    const result = await loadLiveDeviceListFromController(controller as never, undefined, 10);

    expect(result.connectionsByDevice.R1).toBeUndefined();
    expect(result.connectionsByDevice.R2).toBeUndefined();

    expect(result.unresolvedLinks).toHaveLength(2);

    const r1Port = result.devices.find((d) => d.name === "R1")?.ports?.[0];
    expect(r1Port?.connection).toBeUndefined();
  });

  test("buildDeviceListFromSnapshot: puertos tienen connection con confidence registry", () => {
    const snapshot: TopologySnapshot = {
      version: "1.0",
      timestamp: Date.now(),
      devices: {
        R1: {
          name: "R1",
          model: "2911",
          type: "router",
          power: true,
          ports: [{ name: "Gig0/0" }],
        },
        S1: {
          name: "S1",
          model: "2960",
          type: "switch",
          power: true,
          ports: [{ name: "Fa0/1" }],
        },
      },
      links: {
        link1: {
          id: "link1",
          device1: "R1",
          port1: "Gig0/0",
          device2: "S1",
          port2: "Fa0/1",
          cableType: "straight",
        },
      },
      metadata: { deviceCount: 2, linkCount: 1 },
    };

    const result = buildDeviceListFromSnapshot(snapshot);

    expect(result.count).toBe(2);
    expect(result.unresolvedLinks).toHaveLength(0);
    expect(result.connectionsByDevice.R1).toHaveLength(1);
    expect(result.connectionsByDevice.R1?.[0]?.confidence).toBe("registry");

    const r1Port = result.devices.find((d) => d.name === "R1")?.ports?.[0];
    expect(r1Port?.connection?.remoteDevice).toBe("S1");
    expect(r1Port?.connection?.remotePort).toBe("Fa0/1");
    expect(r1Port?.connection?.confidence).toBe("registry");
  });

  test("buildDeviceListFromSnapshot: unresolvedLinks queda vacío para snapshot", () => {
    const snapshot: TopologySnapshot = {
      version: "1.0",
      timestamp: Date.now(),
      devices: {
        R1: {
          name: "R1",
          model: "2911",
          type: "router",
          power: true,
          ports: [],
        },
      },
      links: {
        link1: {
          id: "link1",
          device1: "R1",
          port1: "Gig0/0",
          device2: "S1",
          port2: "Fa0/1",
          cableType: "straight",
        },
      },
      metadata: { deviceCount: 1, linkCount: 1 },
    };

    const result = buildDeviceListFromSnapshot(snapshot);

    expect(result.unresolvedLinks).toHaveLength(0);
    expect(result.connectionsByDevice.R1).toHaveLength(1);
  });
});
