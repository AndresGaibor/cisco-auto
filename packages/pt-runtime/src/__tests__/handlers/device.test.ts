import { expect, test, describe } from "bun:test";
import { handleRenameDevice, handleMoveDevice } from "../../handlers/device";
import type { HandlerDeps } from "../../utils/helpers";

function createDeps(device: any): HandlerDeps {
  return {
    ipc: {} as never,
    privileged: null,
    global: null,
    getLW: () => ({}) as never,
    getNet: () => ({ getDevice: () => device }) as never,
    getFM: () => ({}) as never,
    dprint: () => {},
    DEV_DIR: "/tmp",
    getDeviceByName: () => device,
    getCommandLine: () => null,
    listDeviceNames: () => [],
    now: () => 0,
  } as HandlerDeps;
}

describe("Device handlers (rename/move)", () => {
  test("handleRenameDevice returns error for non-existent device", () => {
    const deps = createDeps(null);
    const result = handleRenameDevice(
      { type: "renameDevice", oldName: "NONEXISTENT", newName: "R2" },
      deps,
    );
    expect(result.ok).toBe(false);
    expect((result as any).code).toBe("DEVICE_NOT_FOUND");
  });

  test("handleRenameDevice renames device successfully", () => {
    const device = {
      setName: (n: string) => {
        if (n !== "R2") throw new Error("fail");
      },
    };
    const deps = createDeps(device);
    const result = handleRenameDevice({ type: "renameDevice", oldName: "R1", newName: "R2" }, deps);
    expect(result.ok).toBe(true);
    expect((result as any).oldName).toBe("R1");
    expect((result as any).newName).toBe("R2");
  });

  test("handleMoveDevice returns error for non-existent device", () => {
    const deps = createDeps(null);
    const result = handleMoveDevice(
      { type: "moveDevice", name: "NONEXISTENT", x: 100, y: 200 },
      deps,
    );
    expect(result.ok).toBe(false);
    expect((result as any).code).toBe("DEVICE_NOT_FOUND");
  });

  test("handleMoveDevice moves device via moveToLocation", () => {
    const device = {
      getName: () => "R1",
      moveToLocation: (x: number, y: number) => x === 301 && y === 400,
    };
    const deps = createDeps(device);
    const result = handleMoveDevice({ type: "moveDevice", name: "R1", x: 300.7, y: 400.3 }, deps);
    expect(result.ok).toBe(true);
    expect((result as any).name).toBe("R1");
    expect((result as any).x).toBe(301);
    expect((result as any).y).toBe(400);
  });

  test("handleMoveDevice falls back to moveToLocationCentered", () => {
    const device = {
      getName: () => "R1",
      moveToLocation: null,
      moveToLocationCentered: (x: number, y: number) => x === 500 && y === 600,
    };
    const deps = createDeps(device);
    const result = handleMoveDevice({ type: "moveDevice", name: "R1", x: 500, y: 600 }, deps);
    expect(result.ok).toBe(true);
  });

  test("handleMoveDevice returns error when move rejected", () => {
    const device = {
      getName: () => "R1",
      moveToLocation: () => false,
    };
    const deps = createDeps(device);
    const result = handleMoveDevice({ type: "moveDevice", name: "R1", x: 100, y: 200 }, deps);
    expect(result.ok).toBe(false);
    expect((result as any).code).toBe("INTERNAL_ERROR");
  });
});
