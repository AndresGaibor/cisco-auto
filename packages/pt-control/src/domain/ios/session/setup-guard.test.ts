import { test, expect, describe, beforeEach, vi } from "bun:test";
import { IosSetupGuard } from "./setup-guard";
import type { FileBridgePort } from "../../ports/file-bridge.port.js";

describe("IosSetupGuard", () => {
  let mockBridge: FileBridgePort;
  let setupGuard: IosSetupGuard;
  let mockSendCommandAndWait: any;

  beforeEach(() => {
    mockSendCommandAndWait = vi.fn();
    mockBridge = {
      sendCommandAndWait: mockSendCommandAndWait,
    } as any;
    setupGuard = new IosSetupGuard(mockBridge);
  });

  describe("ensureReady", () => {
    test("si output es normal, no envía comandos", async () => {
      mockSendCommandAndWait.mockResolvedValue({
        ok: true,
        value: { raw: "Router#" },
      });

      const result = await setupGuard.ensureReady("R1", "router");

      expect(result.wasActive).toBe(false);
      expect(result.dismissed).toBe(false);
      expect(result.attempts).toBe(0);
    });

    test("si setup dialog está activo, envía 'no' y espera", async () => {
      mockSendCommandAndWait
        .mockResolvedValueOnce({
          ok: true,
          value: { raw: "Would you like to enter the initial configuration dialog? [yes/no]:" },
        })
        .mockResolvedValueOnce({
          ok: true,
          value: { raw: "Router#" },
        });

      const result = await setupGuard.ensureReady("R1", "router");

      expect(result.wasActive).toBe(true);
      expect(result.dismissed).toBe(true);
    });

    test("si es PC, no intenta dismiss", async () => {
      mockSendCommandAndWait.mockResolvedValue({
        ok: true,
        value: { raw: "PC>" },
      });

      const result = await setupGuard.ensureReady("PC1", "pc");

      expect(result.wasActive).toBe(false);
      expect(mockSendCommandAndWait).toHaveBeenCalledTimes(1);
    });
  });
});
