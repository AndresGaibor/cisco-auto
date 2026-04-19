import { describe, it, expect, vi, beforeEach } from "vitest";
import { OmniscienceService } from "../../../../src/application/services/omniscience-service.js";
import type { FileBridgePort } from "../../../../src/ports/file-bridge.port.js";

describe("OmniscienceService", () => {
  let mockBridge: any;
  let service: OmniscienceService;

  beforeEach(() => {
    mockBridge = {
      sendCommandAndWait: vi.fn(),
      dispatch: vi.fn(),
      on: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      readState: vi.fn(),
      loadRuntime: vi.fn(),
      loadRuntimeFromFile: vi.fn(),
    };
    service = new OmniscienceService(mockBridge as unknown as FileBridgePort);
  });

  describe("sendPing", () => {
    it("should return false when the real ping output times out", async () => {
      mockBridge.sendCommandAndWait.mockImplementation(async (cmd: string) => {
        if (cmd === "execPc") {
          return {
            ok: true,
            value: {
              raw: "Pinging 192.168.1.60 with 32 bytes of data:\n\nRequest timed out.\nRequest timed out.\nRequest timed out.\nRequest timed out.\n\nPing statistics for 192.168.1.60:\n    Packets: Sent = 4, Received = 0, Lost = 4 (100% loss),",
            },
          };
        }
        return { ok: false, error: { message: "unexpected" } };
      });

      await expect(service.sendPing("PC1", "192.168.1.60")).resolves.toBe(false);
      expect(mockBridge.sendCommandAndWait).toHaveBeenCalledWith("execPc", {
        device: "PC1",
        command: "ping 192.168.1.60",
      });
    });

    it("should return true when the real ping output succeeds", async () => {
      mockBridge.sendCommandAndWait.mockImplementation(async (cmd: string) => {
        if (cmd === "execPc") {
          return {
            ok: true,
            value: {
              raw: "Pinging 192.168.1.20 with 32 bytes of data:\n\nReply from 192.168.1.20: bytes=32 time<1ms TTL=255\nReply from 192.168.1.20: bytes=32 time<1ms TTL=255\nReply from 192.168.1.20: bytes=32 time<1ms TTL=255\nReply from 192.168.1.20: bytes=32 time<1ms TTL=255\n\nPing statistics for 192.168.1.20:\n    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),",
            },
          };
        }
        return { ok: false, error: { message: "unexpected" } };
      });

      await expect(service.sendPing("PC1", "192.168.1.20")).resolves.toBe(true);
    });
  });
});
