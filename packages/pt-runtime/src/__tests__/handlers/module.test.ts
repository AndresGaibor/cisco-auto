import { expect, test, describe } from "bun:test";
import { handleAddModule, handleRemoveModule } from "../../handlers/module";
import { inspectModuleSlots } from "../../primitives/module";
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
    listDeviceNames: () => ["R1"],
    now: () => 0,
  } as HandlerDeps;
}

describe("Module handlers", () => {
  test("inspectModuleSlots devuelve slots vacios cuando el dispositivo no expone root module", () => {
    const net = {
      getDevice: () => ({
        getModel: () => "2911",
        getRootModule: null,
      }),
    };

    const result = inspectModuleSlots("R1", net as any);

    expect(result.ok).toBe(true);
    expect((result.value as any)?.slots).toEqual([]);
    expect((result.evidence as any)?.slots).toEqual([]);
    expect((result.evidence as any)?.slotCount).toBe(0);
  });

  test("inspectModuleSlots incluye ocupacion y modulo instalado", () => {
    const root = {
      getSlotCount: () => 2,
      getSlotTypeAt: (index: number) => (index === 0 ? 1 : 2),
      getModuleAt: (index: number) => (index === 1 ? { getModuleNameAsString: () => "WIC-2T" } : null),
    };
    const net = {
      getDevice: () => ({
        getModel: () => "2911",
        getRootModule: () => root,
      }),
    };

    const result = inspectModuleSlots("R1", net as any);

    expect(result.ok).toBe(true);
    expect((result.value as any)?.slots?.[1]?.occupied).toBe(true);
    expect((result.value as any)?.slots?.[1]?.installedModule).toBe("WIC-2T");
    expect((result.value as any)?.slots?.[1]?.compatibleModules).toContain("WIC-2T");
  });

  test("handleAddModule returns error for non-existent device", () => {
    const deps = createDeps(null);
    const result = handleAddModule(
      { type: "addModule", device: "NONEXISTENT", slot: "0", module: "HWIC-4T" },
      deps,
    );
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

    const result = handleAddModule(
      { type: "addModule", device: "R1", slot: "0", module: "HWIC-4T" },
      createDeps(device),
    );
    expect(result.ok).toBe(true);
    expect((result as any).device).toBe("R1");
    expect((result as any).module).toBe("HWIC-4T");
  });

  test("handleAddModule respeta el slot explícito cuando hay getRootModule", () => {
    const addModuleAt = (mod: string, slot: number) => slot === 1 && mod === "WIC-2T";
    const root = {
      getSlotCount: () => 2,
      getSlotTypeAt: (index: number) => (index === 0 ? 2 : 2),
      getModuleCount: () => 0,
      getModuleAt: () => null,
      addModuleAt,
    };
    const device = {
      getName: () => "R1",
      getModel: () => "2911",
      getPower: () => true,
      setPower: () => {},
      skipBoot: () => {},
      getRootModule: () => root,
      addModule: () => false,
    };

    const result = handleAddModule(
      { type: "addModule", device: "R1", slot: "1", module: "WIC-2T" },
      createDeps(device),
    );

    expect(result.ok).toBe(true);
    expect((result as any).slot).toBe("root:1");
  });

  test("handleRemoveModule returns error for non-existent device", () => {
    const deps = createDeps(null);
    const result = handleRemoveModule(
      { type: "removeModule", device: "NONEXISTENT", slot: "0" },
      deps,
    );
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

    const result = handleRemoveModule(
      { type: "removeModule", device: "PC1", slot: "0" },
      createDeps(device),
    );
    expect(result.ok).toBe(false);
    expect((result as any).code).toBe("UNSUPPORTED_OPERATION");
  });
});
