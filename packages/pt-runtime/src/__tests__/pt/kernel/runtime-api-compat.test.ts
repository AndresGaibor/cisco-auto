import { describe, expect, test, vi } from "bun:test";
import { createRuntimeApi } from "../../../pt/kernel/runtime-api.js";

describe("createRuntimeApi", () => {
  test("expone compatibilidad legacy para handlers estables", () => {
    const red = { id: "red" };
    const blue = { id: "blue" };

    const fakeIpc = {
      network: vi.fn(() => red),
      appWindow: vi.fn(() => ({
        getActiveWorkspace: () => ({
          getLogicalWorkspace: () => ({ kind: "lw" }),
        }),
        writeToPT: vi.fn(),
      })),
      systemFileManager: vi.fn(() => ({ kind: "fm" })),
    };

    const previousSelf = (globalThis as any).self;
    const previousDprint = (globalThis as any).dprint;

    (globalThis as any).self = {
      ipc: fakeIpc,
      _ScriptModule: {},
      DEV_DIR: "/tmp/pt-dev",
    };
    (globalThis as any).dprint = vi.fn();

    try {
      const api: any = createRuntimeApi({} as any);

      expect(typeof api.getNet).toBe("function");
      expect(typeof api.getLW).toBe("function");
      expect(typeof api.getFM).toBe("function");
      expect(typeof api.getCommandLine).toBe("function");
      expect(typeof api.listDeviceNames).toBe("function");
      expect(api.DEV_DIR).toBe("/tmp/pt-dev");

      expect(api.getNet()).toBe(red);

      fakeIpc.network.mockImplementation(() => blue);

      expect(api.getNet()).toBe(blue);
      expect(api.getDeviceByName("R1")).toBeNull();
      expect(api.listDeviceNames()).toEqual([]);
    } finally {
      (globalThis as any).self = previousSelf;
      (globalThis as any).dprint = previousDprint;
    }
  });
});
