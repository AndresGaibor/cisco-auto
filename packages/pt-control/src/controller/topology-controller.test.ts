import { describe, expect, test, vi } from "bun:test";
import { TopologyController } from "./topology-controller.js";

function createTopologyFacade() {
  return {
    addDevice: vi.fn(),
    removeDevice: vi.fn(),
    renameDevice: vi.fn(),
    moveDevice: vi.fn(),
    addLink: vi.fn(),
    removeLink: vi.fn(),
    clearTopology: vi.fn(),
    listDevices: vi.fn(),
  } as any;
}

describe("TopologyController.inspectDeviceFast", () => {
  test("usa inspectFast cuando existe", async () => {
    const inspectFast = vi.fn().mockResolvedValue({ name: "SW1", type: "switch" });
    const inspect = vi.fn();

    const controller = new TopologyController(
      createTopologyFacade(),
      {
        inspect,
        inspectFast,
        addModule: vi.fn(),
        removeModule: vi.fn(),
      } as any,
    );

    await expect(controller.inspectDeviceFast("SW1")).resolves.toMatchObject({
      name: "SW1",
      type: "switch",
    });

    expect(inspectFast).toHaveBeenCalledTimes(1);
    expect(inspectFast).toHaveBeenCalledWith("SW1");
    expect(inspect).not.toHaveBeenCalled();
  });

  test("falla rapido si no existe inspectFast y no cae a inspect", async () => {
    const inspect = vi.fn().mockResolvedValue({ name: "SW1", ports: [] });

    const controller = new TopologyController(
      createTopologyFacade(),
      {
        inspect,
        addModule: vi.fn(),
        removeModule: vi.fn(),
      } as any,
    );

    await expect(controller.inspectDeviceFast("SW1")).rejects.toMatchObject({
      code: "FAST_DEVICE_INSPECTION_UNAVAILABLE",
    });

    expect(inspect).not.toHaveBeenCalled();
  });
});
