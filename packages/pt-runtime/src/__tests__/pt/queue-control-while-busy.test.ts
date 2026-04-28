import { describe, expect, test, vi } from "bun:test";

import { pollCommandQueue } from "../../pt/kernel/queue-poller";

describe("pollCommandQueue control commands while busy", () => {
  test("procesa __pollDeferred aunque haya jobs activos", () => {
    const claimed = {
      id: "cmd_1",
      seq: 1,
      type: "__pollDeferred",
      payload: { type: "__pollDeferred", ticket: "job-1" },
      filename: "000000000001-__pollDeferred.json",
      createdAt: Date.now(),
      expiresAt: Date.now() + 10_000,
      attempt: 1,
    };

    const queue = {
      poll: vi.fn(),
      pollAllowedTypes: vi.fn().mockReturnValue(claimed),
      cleanup: vi.fn(),
      count: vi.fn().mockReturnValue(1),
    };

    const subsystems = {
      queue,
      runtimeLoader: {
        reloadIfNeeded: vi.fn(),
        getRuntimeFn: vi.fn().mockReturnValue(() => ({ ok: true, done: true, raw: "ok" })),
      },
      executionEngine: {
        getActiveJobs: vi.fn().mockReturnValue([{ id: "job-1" }]),
      },
      terminal: {
        isAnyBusy: vi.fn().mockReturnValue(false),
      },
      heartbeat: {
        setQueuedCount: vi.fn(),
        setActiveCommand: vi.fn(),
      },
      config: {},
      kernelLog: vi.fn(),
      kernelLogSubsystem: vi.fn(),
    };

    const state = {
      isRunning: true,
      isShuttingDown: false,
      activeCommand: null,
      activeCommandFilename: null,
    };

    pollCommandQueue(subsystems as any, state as any);

    expect(queue.poll).not.toHaveBeenCalled();
    expect(queue.pollAllowedTypes).toHaveBeenCalledWith(["__pollDeferred", "__ping"]);
    expect((state.activeCommand as any)?.type).toBe("__pollDeferred");
  });
});
