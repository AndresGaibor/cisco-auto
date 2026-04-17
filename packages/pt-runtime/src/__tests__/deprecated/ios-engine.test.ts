import { expect, test, describe, vi } from "bun:test";
import { createIosSessionEngine } from "../../handlers/ios-engine";
import type { PtDeferredDeps } from "../../pt-api/pt-deps.js";

function createDeps(): PtDeferredDeps {
  return {
    ipc: {} as never,
    privileged: null,
    global: null,
    getLW: () => ({}) as never,
    getNet: () => ({}) as never,
    getFM: () => ({}) as never,
    dprint: () => {},
    DEV_DIR: "/tmp",
    getDeviceByName: () => null,
    getCommandLine: () => null,
    listDeviceNames: () => [],
    now: () => 123,
    querySessionState: () => null,
    createJob: () => "ticket-1",
    getJobState: () => null,
    getActiveJobs: () => [],
  };
}

describe("IosSessionEngine", () => {
  test("crea jobs con estado inicial", () => {
    const engine = createIosSessionEngine(createDeps());
    const ticket = engine.createJob("configIos", { commands: ["show version"] });

    const job = engine.getJob(ticket);
    expect(job).not.toBeNull();
    expect(job?.phase).toBe("queued");
    expect(job?.state).toBe("queued");
  });

  test("attachListeners registra eventos del terminal", () => {
    const engine = createIosSessionEngine(createDeps());
    const term = {
      registerEvent: vi.fn(),
      unregisterEvent: vi.fn(),
    } as any;

    engine.attachListeners("R1", term);
    expect(term.registerEvent).toHaveBeenCalled();

    engine.detachListeners("R1");
    expect(term.unregisterEvent).toHaveBeenCalled();
  });
});
