import { describe, expect, test, vi } from "bun:test";
import { createLegacyControllerComposition } from "./legacy-controller-composition.js";

describe("legacy-controller-composition", () => {
  test("retorna bridge listo", () => {
    const bridge = {
      sendCommandAndWait: vi.fn(),
      getBridgeStatus: () => ({ ready: true }),
    };

    const legacy = createLegacyControllerComposition(bridge as any);

    expect(legacy.legacyBridge).toBe(bridge);
    expect(legacy.runtimeController.getBridgeStatus()).toEqual({ ready: true });
  });

  test("iosController.showIpInterfaceBrief delega a execInteractive", async () => {
    const sendCommandAndWait = vi.fn().mockResolvedValue({
      value: {
        parsed: { entries: [] },
      },
    });

    const legacy = createLegacyControllerComposition({ sendCommandAndWait } as any);

    await legacy.iosController.showIpInterfaceBrief("R1");

    expect(sendCommandAndWait).toHaveBeenCalledWith("execInteractive", {
      device: "R1",
      command: "show ip interface brief",
    });
  });

  test("topologyController.listDevices devuelve fallback compatible", async () => {
    const legacy = createLegacyControllerComposition({ sendCommandAndWait: vi.fn() } as any);

    await expect(legacy.topologyController.listDevices()).resolves.toEqual([
      expect.objectContaining({
        name: "R1",
        model: "2911",
        type: "router",
      }),
    ]);
  });
});
