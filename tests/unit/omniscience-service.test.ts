import { describe, it, expect, vi, beforeEach } from "vitest";
import { OmniscienceService } from "../../packages/pt-control/src/application/services/omniscience-service.ts";
import type { FileBridgePort } from "../../packages/pt-control/src/ports/file-bridge.port.ts";

describe("OmniscienceService", () => {
  let mockOmniPort: any;
  let mockTerminalPort: any;
  let service: OmniscienceService;

  beforeEach(() => {
    mockOmniPort = {
      runOmniCapability: vi.fn(),
      describeCapability: vi.fn(),
      cleanupCapability: vi.fn(),
    };
    mockTerminalPort = {
      runTerminalPlan: vi.fn(),
      ensureSession: vi.fn(),
      pollTerminalJob: vi.fn(),
    };
    service = new OmniscienceService(mockOmniPort, mockTerminalPort);
  });

  describe("sendPing", () => {
    it("should return success: false when the ping output indicates 100% loss", async () => {
      mockTerminalPort.runTerminalPlan.mockResolvedValue({
        ok: true,
        output: "Pinging 192.168.1.60 with 32 bytes of data:\n\nRequest timed out.\nRequest timed out.\nRequest timed out.\nRequest timed out.\n\nPing statistics for 192.168.1.60:\n    Packets: Sent = 4, Received = 0, Lost = 4 (100% loss),",
        status: 0,
      });

      const result = await service.sendPing("PC1", "192.168.1.60");
      expect(result.success).toBe(false);
      expect(result.stats?.lossPercent).toBe(100);
      expect(mockTerminalPort.runTerminalPlan).toHaveBeenCalled();
    });

    it("should return success: true when the ping output succeeds", async () => {
      mockTerminalPort.runTerminalPlan.mockResolvedValue({
        ok: true,
        output: "Pinging 192.168.1.20 with 32 bytes of data:\n\nReply from 192.168.1.20: bytes=32 time<1ms TTL=255\nReply from 192.168.1.20: bytes=32 time<1ms TTL=255\nReply from 192.168.1.20: bytes=32 time<1ms TTL=255\nReply from 192.168.1.20: bytes=32 time<1ms TTL=255\n\nPing statistics for 192.168.1.20:\n    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),",
        status: 0,
      });

      const result = await service.sendPing("PC1", "192.168.1.20");
      expect(result.success).toBe(true);
      expect(result.stats?.lossPercent).toBe(0);
    });
  });
});
