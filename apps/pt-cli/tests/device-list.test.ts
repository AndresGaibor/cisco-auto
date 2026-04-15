import { describe, expect, test, vi } from "bun:test";
import { createDefaultPTController } from "@cisco-auto/pt-control";
import {
  buildDeviceListFromSnapshot,
  loadLiveDeviceList,
  isEmptyTopologySnapshot,
  loadLiveDeviceListFromController,
} from "../src/application/device-list.js";
import type { TopologySnapshot } from "@cisco-auto/pt-control";

vi.mock("@cisco-auto/pt-control", () => ({
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
          ports: [
            { name: "Gig0/0", ipAddress: "10.0.0.1", subnetMask: "255.255.255.0" },
          ],
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
    expect(result.deviceLinks.R1).toEqual(["S1:Fa0/1"]);
    expect(result.deviceLinks.S1).toEqual(["R1:Gig0/0"]);
  });

  test("falla rápido si el bridge no queda listo", async () => {
    const controller = {
      getBridge: () => ({
        sendCommandAndWait: async () => new Promise(() => {}),
      }),
    };

    await expect(
      loadLiveDeviceListFromController(controller as never, undefined, 10),
    ).rejects.toThrow(/Bridge no respondió a tiempo/);
  });

  test("loadLiveDeviceList arranca y detiene el controller", async () => {
    const start = vi.fn();
    const stop = vi.fn().mockResolvedValue(undefined);
    const sendCommandAndWait = vi.fn().mockResolvedValue({ value: [] });

    (createDefaultPTController as unknown as { mockReturnValue: (value: unknown) => void }).mockReturnValue({
      start,
      stop,
      getBridge: () => ({ sendCommandAndWait }),
    } as never);

    await loadLiveDeviceList();

    expect(start).toHaveBeenCalledTimes(1);
    expect(stop).toHaveBeenCalledTimes(1);
    expect(sendCommandAndWait).toHaveBeenCalledWith(
      "listDevices",
      expect.objectContaining({ filter: undefined }),
      15000,
    );
  });
});
