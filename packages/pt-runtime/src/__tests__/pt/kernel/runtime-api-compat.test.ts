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

  test("getJobState usa el contexto reapeado y preserva debug", () => {
    const jobState = {
      id: "job-1",
      device: "R1",
      plan: { plan: [] },
      currentStep: 0,
      state: "running",
      outputBuffer: "show version\nRouter#",
      startedAt: Date.now() - 1000,
      updatedAt: Date.now() - 500,
      stepResults: [],
      lastMode: "privileged-exec",
      lastPrompt: "Router#",
      paged: false,
      waitingForCommandEnd: false,
      finished: false,
      result: null,
      error: null,
      errorCode: null,
      debug: ["trace-1"],
    };

    const executionEngine = {
      getJob: vi.fn(() => ({ context: { debug: ["wrong-path"] } })),
      getJobState: vi.fn(() => jobState),
      getActiveJobs: vi.fn(() => []),
      isJobFinished: vi.fn(() => false),
      startJob: vi.fn(),
      advanceJob: vi.fn(),
    } as any;

    const previousSelf = (globalThis as any).self;
    const previousDprint = (globalThis as any).dprint;

    (globalThis as any).self = {
      ipc: {
        network: vi.fn(() => ({ getDevice: vi.fn() })),
        appWindow: vi.fn(() => ({
          getActiveWorkspace: () => ({ getLogicalWorkspace: () => ({}) }),
          writeToPT: vi.fn(),
        })),
        systemFileManager: vi.fn(() => ({})),
      },
      _ScriptModule: {},
      DEV_DIR: "/tmp/pt-dev",
    };
    (globalThis as any).dprint = vi.fn();

    try {
      const api: any = createRuntimeApi({ executionEngine } as any);

      const result = api.getJobState("job-1");

      expect(executionEngine.getJobState).toHaveBeenCalledWith("job-1");
      expect(executionEngine.getJob).not.toHaveBeenCalled();
      expect(result?.debug).toEqual(["trace-1"]);
    } finally {
      (globalThis as any).self = previousSelf;
      (globalThis as any).dprint = previousDprint;
    }
  });
});
