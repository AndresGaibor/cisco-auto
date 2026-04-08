import { describe, expect, test } from "bun:test";
import { PTController } from "../src/controller/index.js";
import type { FileBridgePort } from "../src/application/ports/file-bridge.port.js";

function createBridge(freshSnapshot: unknown): FileBridgePort {
  return {
    start() {},
    stop: async () => {},
    sendCommandAndWait: async (type: string) => {
      if (type === "snapshot") {
        return { ok: true, value: freshSnapshot } as any;
      }
      return { ok: false, value: null } as any;
    },
    readState: () => null,
    getStateSnapshot: () => null,
    getHeartbeat: () => null,
    getHeartbeatHealth: () => ({ state: "missing" }),
    getBridgeStatus: () => ({ ready: true }),
    getContext: () => ({ bridgeReady: true, heartbeat: { state: "missing" } }),
    on: () => ({}) as any,
    onAll: () => () => {},
    loadRuntime: async () => {},
    loadRuntimeFromFile: async () => {},
    isReady: () => true,
  };
}

describe("PTController snapshot cache", () => {
  test("snapshot() pide a PT aunque el cache inicial esté vacío", async () => {
    const snapshot = {
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
      metadata: {
        deviceCount: 1,
        linkCount: 0,
      },
    };

    const controller = new PTController(createBridge(snapshot));

    const result = await controller.snapshot();

    expect(result.devices.R1).toBeDefined();
    expect(result.devices.R1!.model).toBe("2911");
  });

  test("getCachedSnapshot() no expone el cache vacío como snapshot materializada", () => {
    const controller = new PTController(createBridge({
      version: "1.0",
      timestamp: 123,
      devices: {},
      links: {},
      metadata: {
        deviceCount: 0,
        linkCount: 0,
      },
    }));

    expect(controller.getCachedSnapshot()).toBeNull();
  });
});
