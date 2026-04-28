import { describe, expect, test, vi } from "bun:test";
import { loadLiveDeviceListFromController } from "../application/device-list.js";

function makeController(overrides: Record<string, unknown> = {}) {
  return {
    listDevices: vi.fn(),
    getCachedSnapshot: vi.fn(() => null),
    readState: vi.fn(() => null),
    getBridgeStatus: vi.fn(() => ({ ready: true })),
    snapshot: vi.fn(),
    start: vi.fn(async () => {}),
    stop: vi.fn(async () => {}),
    ...overrides,
  };
}

describe("loadLiveDeviceListFromController deep mode", () => {
  test("no llama snapshot cuando deep está desactivado", async () => {
    const controller = makeController({
      listDevices: vi.fn(async () => [
        {
          name: "R1",
          model: "2911",
          type: "router",
          power: true,
          ports: [{ name: "Gig0/0" }],
        },
      ]),
      snapshot: vi.fn(async () => {
        throw new Error("snapshot no debería llamarse");
      }),
    });

    const result = await loadLiveDeviceListFromController(controller as never, undefined, 15000, {
      refreshCache: false,
      deep: false,
    });

    expect(result.count).toBe(1);
    expect(controller.snapshot).not.toHaveBeenCalled();
  });

  test("llama snapshot y enriquece mac cuando deep está activado", async () => {
    const controller = makeController({
      listDevices: vi.fn(async () => [
        {
          name: "R1",
          model: "2911",
          type: "router",
          power: true,
          ports: [{ name: "Gig0/0" }],
        },
      ]),
      snapshot: vi.fn(async () => ({
        devices: {
          R1: {
            name: "R1",
            model: "2911",
            type: "router",
            power: true,
            ports: [{ name: "Gig0/0", macAddress: "00AA.BBCC.DDEE" }],
          },
        },
        links: {},
      })),
    });

    const result = await loadLiveDeviceListFromController(controller as never, undefined, 15000, {
      refreshCache: false,
      deep: true,
    });

    expect(controller.snapshot).toHaveBeenCalledTimes(1);
    expect(result.devices[0]?.ports?.[0]?.macAddress).toBe("00AA.BBCC.DDEE");
  });

  test("usa cache local y no snapshot vivo cuando listDevices falla sin deep", async () => {
    const controller = makeController({
      listDevices: vi.fn(async () => {
        throw new Error("bridge roto");
      }),
      getCachedSnapshot: vi.fn(() => ({
        devices: {
          R1: {
            name: "R1",
            model: "2911",
            type: "router",
            power: true,
            ports: [{ name: "Gig0/0" }],
          },
        },
        links: {},
      })),
      snapshot: vi.fn(async () => {
        throw new Error("snapshot no debería llamarse");
      }),
    });

    const result = await loadLiveDeviceListFromController(controller as never, undefined, 15000, {
      refreshCache: false,
      deep: false,
    });

    expect(result.count).toBe(1);
    expect(controller.snapshot).not.toHaveBeenCalled();
  });

  test("reintenta cuando el primer listDevices viene vacio", async () => {
    const controller = makeController({
      listDevices: vi.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            name: "R1",
            model: "2911",
            type: "router",
            power: true,
            ports: [{ name: "Gig0/0" }],
          },
        ]),
      snapshot: vi.fn(async () => {
        throw new Error("snapshot no debería llamarse");
      }),
    });

    const result = await loadLiveDeviceListFromController(controller as never, undefined, 15000, {
      refreshCache: false,
      deep: false,
    });

    expect(controller.listDevices).toHaveBeenCalledTimes(2);
    expect(result.count).toBe(1);
    expect(controller.snapshot).not.toHaveBeenCalled();
  });

  test("ignora cache vacia si listDevices falla", async () => {
    const controller = makeController({
      listDevices: vi.fn(async () => {
        throw new Error("bridge roto");
      }),
      getCachedSnapshot: vi.fn(() => ({ devices: {}, links: {} })),
      readState: vi.fn(() => ({ devices: {}, links: {} })),
      snapshot: vi.fn(async () => {
        throw new Error("snapshot no debería llamarse");
      }),
    });

    await expect(
      loadLiveDeviceListFromController(controller as never, undefined, 15000, {
        refreshCache: false,
        deep: false,
      }),
    ).rejects.toThrow("Packet Tracer no respondió");

    expect(controller.snapshot).not.toHaveBeenCalled();
    expect(controller.listDevices).toHaveBeenCalledTimes(2);
  });
});
