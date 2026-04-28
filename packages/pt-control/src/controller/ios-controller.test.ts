import { describe, expect, test, vi } from "bun:test";
import { IosController } from "./ios-controller.js";

describe("IosController.inspectDeviceFast", () => {
  test("usa inspectFast cuando existe", async () => {
    const inspectFast = vi.fn().mockResolvedValue({ name: "R1" });
    const inspect = vi.fn();
    const controller = new IosController(
      {
        configIos: vi.fn(),
        execIos: vi.fn(),
        execInteractive: vi.fn(),
        execIosWithEvidence: vi.fn(),
        configIosWithResult: vi.fn(),
        show: vi.fn(),
        showParsed: vi.fn(),
        showIpInterfaceBrief: vi.fn(),
        showVlan: vi.fn(),
        showIpRoute: vi.fn(),
        showRunningConfig: vi.fn(),
        showMacAddressTable: vi.fn(),
        showCdpNeighbors: vi.fn(),
        getIosConfidence: vi.fn(),
        resolveCapabilities: vi.fn(),
      } as any,
      { inspect, inspectFast } as any,
    );

    await expect(controller.inspectDeviceFast("R1")).resolves.toMatchObject({ name: "R1" });
    expect(inspectFast).toHaveBeenCalledTimes(1);
    expect(inspect).not.toHaveBeenCalled();
  });

  test("falla rápido si no existe inspectFast", async () => {
    const inspect = vi.fn();
    const controller = new IosController(
      {
        configIos: vi.fn(),
        execIos: vi.fn(),
        execInteractive: vi.fn(),
        execIosWithEvidence: vi.fn(),
        configIosWithResult: vi.fn(),
        show: vi.fn(),
        showParsed: vi.fn(),
        showIpInterfaceBrief: vi.fn(),
        showVlan: vi.fn(),
        showIpRoute: vi.fn(),
        showRunningConfig: vi.fn(),
        showMacAddressTable: vi.fn(),
        showCdpNeighbors: vi.fn(),
        getIosConfidence: vi.fn(),
        resolveCapabilities: vi.fn(),
      } as any,
      { inspect } as any,
    );

    await expect(controller.inspectDeviceFast("R1")).rejects.toMatchObject({
      code: "FAST_DEVICE_INSPECTION_UNAVAILABLE",
    });
    expect(inspect).not.toHaveBeenCalled();
  });
});
