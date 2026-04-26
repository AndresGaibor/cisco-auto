import { test, expect, describe, beforeEach, afterEach, vi } from "bun:test";
import { detectDeviceType, type DeviceType } from "../adapters/runtime-terminal/device-type-detector.js";
import type { FileBridgePort } from "../../application/ports/file-bridge.port.js";

function createMockBridge(overrides: Partial<FileBridgePort> = {}): FileBridgePort {
  return {
    sendCommandAndWait: vi.fn().mockResolvedValue({ ok: false, value: null }),
    getStateSnapshot: vi.fn(),
    readState: vi.fn(),
    ...overrides,
  } as unknown as FileBridgePort;
}

describe("detectDeviceType", () => {
  describe("primary strategy: listDevices from PT", () => {
    test("returns host for PC device", async () => {
      const bridge = createMockBridge({
        sendCommandAndWait: vi.fn().mockResolvedValue({
          ok: true,
          value: {
            devices: [
              { name: "PC1", model: "PC1", type: "pc" },
            ],
          },
        }),
      });

      const result = await detectDeviceType(bridge, "PC1");
      expect(result).toBe("host");
    });

    test("returns host for Server device", async () => {
      const bridge = createMockBridge({
        sendCommandAndWait: vi.fn().mockResolvedValue({
          ok: true,
          value: {
            devices: [
              { name: "Server1", model: "Server", type: "server" },
            ],
          },
        }),
      });

      const result = await detectDeviceType(bridge, "Server1");
      expect(result).toBe("host");
    });

    test("returns ios for Router device", async () => {
      const bridge = createMockBridge({
        sendCommandAndWait: vi.fn().mockResolvedValue({
          ok: true,
          value: {
            devices: [
              { name: "R1", model: "2911", type: "router" },
            ],
          },
        }),
      });

      const result = await detectDeviceType(bridge, "R1");
      expect(result).toBe("ios");
    });

    test("returns ios for Switch device", async () => {
      const bridge = createMockBridge({
        sendCommandAndWait: vi.fn().mockResolvedValue({
          ok: true,
          value: {
            devices: [
              { name: "S1", model: "2960", type: "switch" },
            ],
          },
        }),
      });

      const result = await detectDeviceType(bridge, "S1");
      expect(result).toBe("ios");
    });

    test("returns ios for multilayerSwitch device", async () => {
      const bridge = createMockBridge({
        sendCommandAndWait: vi.fn().mockResolvedValue({
          ok: true,
          value: {
            devices: [
              { name: "MLS1", model: "3560", type: "switch_layer3" },
            ],
          },
        }),
      });

      const result = await detectDeviceType(bridge, "MLS1");
      expect(result).toBe("ios");
    });

    test("falls back when device not found in listDevices", async () => {
      const bridge = createMockBridge({
        sendCommandAndWait: vi.fn().mockResolvedValue({
          ok: true,
          value: { devices: [{ name: "OtherDevice", model: "PC1", type: "pc" }] },
        }),
      });

      // Should fall through to heuristic by name — PC2 contains "pc" so heuristic says host
      const result = await detectDeviceType(bridge, "PC2");
      expect(result).toBe("host");
    });

    test("falls back when listDevices fails", async () => {
      const bridge = createMockBridge({
        sendCommandAndWait: vi.fn().mockRejectedValue(new Error("connection failed")),
      });

      const result = await detectDeviceType(bridge, "R1");
      // Falls back to snapshot
      expect(result).toBe("unknown");
    });
  });

  describe("fallback strategy: state snapshot", () => {
    test("returns host from snapshot devices", async () => {
      const bridge = createMockBridge({
        sendCommandAndWait: vi.fn().mockResolvedValue({ ok: false }),
        getStateSnapshot: vi.fn().mockReturnValue({
          devices: { PC1: { name: "PC1", model: "Laptop", type: "pc" } },
        }),
      });

      const result = await detectDeviceType(bridge, "PC1");
      expect(result).toBe("host");
    });

    test("returns ios from snapshot devices", async () => {
      const bridge = createMockBridge({
        sendCommandAndWait: vi.fn().mockResolvedValue({ ok: false }),
        readState: vi.fn().mockReturnValue({
          devices: { R1: { name: "R1", model: "2911", type: "router" } },
        }),
      });

      const result = await detectDeviceType(bridge, "R1");
      expect(result).toBe("ios");
    });

    test("prefers getStateSnapshot over readState", async () => {
      const getSnapshotSpy = vi.fn().mockReturnValue({
        devices: { PC1: { name: "PC1", model: "PC", type: "pc" } },
      });
      const readStateSpy = vi.fn().mockReturnValue({
        devices: { PC1: { name: "PC1", model: "Router", type: "router" } },
      });

      const bridge = createMockBridge({
        sendCommandAndWait: vi.fn().mockResolvedValue({ ok: false }),
        getStateSnapshot: getSnapshotSpy,
        readState: readStateSpy,
      });

      const result = await detectDeviceType(bridge, "PC1");
      expect(result).toBe("host");
      expect(getSnapshotSpy).toHaveBeenCalled();
      // readState should NOT be called if getStateSnapshot returned data
    });
  });

  describe("heuristic strategy: device name", () => {
    test("returns host for device name containing pc", async () => {
      const bridge = createMockBridge({
        sendCommandAndWait: vi.fn().mockResolvedValue({ ok: false }),
      });

      const result = await detectDeviceType(bridge, "PC3");
      expect(result).toBe("host");
    });

    test("returns host for device name containing server", async () => {
      const bridge = createMockBridge({
        sendCommandAndWait: vi.fn().mockResolvedValue({ ok: false }),
      });

      const result = await detectDeviceType(bridge, "Server1");
      expect(result).toBe("host");
    });

    test("returns unknown for unrecognized device names", async () => {
      const bridge = createMockBridge({
        sendCommandAndWait: vi.fn().mockResolvedValue({ ok: false }),
      });

      const result = await detectDeviceType(bridge, "R1");
      expect(result).toBe("unknown");
    });

    test("is case insensitive for name heuristic", async () => {
      const bridge = createMockBridge({
        sendCommandAndWait: vi.fn().mockResolvedValue({ ok: false }),
      });

      expect(await detectDeviceType(bridge, "pc1")).toBe("host");
      expect(await detectDeviceType(bridge, "SERVER2")).toBe("host");
    });
  });
});
