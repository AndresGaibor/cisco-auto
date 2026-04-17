import { expect, test, describe } from "bun:test";
import { handleAddModule, handleRemoveModule } from "../../handlers/module";
import type { HandlerDeps } from "../../utils/helpers";

function createDeps(device: any): HandlerDeps {
  return {
    ipc: {} as never,
    getLW: () => ({} as never),
    getNet: () => ({ getDevice: () => device } as never),
    getFM: () => ({} as never),
    dprint: () => {},
    DEV_DIR: "/tmp",
    getDeviceByName: () => device,
    getCommandLine: () => null,
    listDeviceNames: () => ["R1"],
    now: () => 0,
  } as HandlerDeps;
}

describe("Module handlers", () => {
  test("handleAddModule returns error for non-existent device", () => {
    const deps = createDeps(null);
    const result = handleAddModule({ type: "addModule", device: "NONEXISTENT", slot: "0", module: "HWIC-4T" }, deps);
    expect(result.ok).toBe(false);
    expect((result as any).code).toBe("DEVICE_NOT_FOUND");
  });

  test("handleAddModule uses fallback addModule when no getRootModule", () => {
    const device = {
      getName: () => "R1",
      getModel: () => "2911",
      getPower: () => true,
      setPower: () => {},
      skipBoot: () => {},
      addModule: (slot: string, mod: string) => mod === "HWIC-4T",
      getRootModule: null,
    };

    const result = handleAddModule({ type: "addModule", device: "R1", slot: "0", module: "HWIC-4T" }, createDeps(device));
    expect(result.ok).toBe(true);
    expect((result as any).device).toBe("R1");
    expect((result as any).module).toBe("HWIC-4T");
  });

  test("handleRemoveModule returns error for non-existent device", () => {
    const deps = createDeps(null);
    const result = handleRemoveModule({ type: "removeModule", device: "NONEXISTENT", slot: "0" }, deps);
    expect(result.ok).toBe(false);
    expect((result as any).code).toBe("DEVICE_NOT_FOUND");
  });

  test("handleRemoveModule returns error when device lacks removeModule", () => {
    const device = {
      getName: () => "PC1",
      getPower: () => true,
      setPower: () => {},
      skipBoot: () => {},
      removeModule: undefined,
    };

    const result = handleRemoveModule({ type: "removeModule", device: "PC1", slot: "0" }, createDeps(device));
    expect(result.ok).toBe(false);
    expect((result as any).code).toBe("UNSUPPORTED_OPERATION");
  });
});
