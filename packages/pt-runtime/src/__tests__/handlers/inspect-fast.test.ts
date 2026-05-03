import { describe, expect, test, vi } from "bun:test";
import { handleInspectDeviceFast } from "../../handlers/inspect.js";
import type { HandlerDeps } from "../../utils/helpers";

function createDeps(net: any): HandlerDeps {
  return {
    ipc: {} as never,
    privileged: null,
    global: null,
    getLW: () => ({} as never),
    getNet: () => net,
    getFM: () => ({}) as never,
    dprint: () => {},
    DEV_DIR: "/tmp",
    getDeviceByName: () => null,
    getCommandLine: () => null,
    listDeviceNames: () => [],
    now: () => 0,
  } as HandlerDeps;
}

describe("handleInspectDeviceFast", () => {
  test("devuelve una inspección mínima sin puertos ni abrir CLI por defecto", () => {
    const getCommandLine = vi.fn(() => ({}));

    const net = {
      getDevice: () => ({
        getName: () => "SW1",
        getModel: () => "3650-24PS",
        getType: () => 1,
        getPower: () => true,
        getCommandLine,
      }),
    };

    const result = handleInspectDeviceFast(
      { type: "inspectDeviceFast", device: "SW1" },
      createDeps(net),
    );

    expect(result.ok).toBe(true);
    expect((result as any).device.name).toBe("SW1");
    expect((result as any).device.model).toBe("3650-24PS");
    expect((result as any).device.type).toBe(1);
    expect((result as any).device.power).toBe(true);
    expect((result as any).device.hasCommandLine).toBeUndefined();
    expect((result as any).ports).toBeUndefined();
    expect(getCommandLine).not.toHaveBeenCalled();
  });

  test("solo consulta getCommandLine cuando includeCommandLine=true", () => {
    const getCommandLine = vi.fn(() => ({}));

    const net = {
      getDevice: () => ({
        getName: () => "SW1",
        getModel: () => "3650-24PS",
        getType: () => 1,
        getPower: () => true,
        getCommandLine,
      }),
    };

    const result = handleInspectDeviceFast(
      { type: "inspectDeviceFast", device: "SW1", includeCommandLine: true },
      createDeps(net),
    );

    expect(result.ok).toBe(true);
    expect((result as any).device.hasCommandLine).toBe(true);
    expect(getCommandLine).toHaveBeenCalledTimes(1);
  });
});
