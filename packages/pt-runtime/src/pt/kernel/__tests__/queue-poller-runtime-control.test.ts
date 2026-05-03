import { afterEach, describe, expect, test, vi } from "bun:test";

vi.mock("../command-finalizer", () => ({
  finishActiveCommand: vi.fn(),
}));

import { finishActiveCommand } from "../command-finalizer";
import { pollCommandQueue } from "../queue-poller";

function createSubsystems(claimed: any) {
  const runtimeLoader = {
    getRuntimeFn: vi.fn(() => {
      throw new Error("runtimeFn no debería usarse");
    }),
    getStatus: vi.fn(() => ({
      runtimeFile: "/tmp/pt-dev/runtime.js",
      runtimeLoaded: false,
      hasRuntimeFn: false,
      lastMtime: 0,
      pendingReload: false,
      reloadCount: 0,
      loadAttempted: false,
      loadSucceeded: false,
      lastLoadError: null,
      lastReload: null,
    })),
    reloadNow: vi.fn(() => ({
      ok: true,
      loaded: true,
      changed: true,
      mtime: 10,
      status: {
        runtimeFile: "/tmp/pt-dev/runtime.js",
        runtimeLoaded: true,
        hasRuntimeFn: true,
        lastMtime: 10,
        pendingReload: false,
        reloadCount: 1,
        loadAttempted: true,
        loadSucceeded: true,
        lastLoadError: null,
        lastReload: { ok: true, at: 10, mtime: 10 },
      },
    })),
    reloadIfNeeded: vi.fn(),
    load: vi.fn(),
    loadDemo: vi.fn(),
    getLastMtime: vi.fn(() => 0),
    hasPendingReload: vi.fn(() => false),
  };

  return {
    dirs: { ensureDirectories: vi.fn(), directories: { devDir: "/tmp/pt-dev" } },
    queue: {
      poll: vi.fn(() => claimed),
      pollAllowedTypes: vi.fn(() => claimed),
      count: vi.fn(() => 0),
    },
    runtimeLoader,
    executionEngine: {
      getActiveJobs: vi.fn(() => []),
    },
    terminal: {
      isAnyBusy: vi.fn(() => false),
      attach: vi.fn(),
      detach: vi.fn(),
      getSession: vi.fn(),
      getMode: vi.fn(),
      isBusy: vi.fn(() => false),
      executeCommand: vi.fn(),
      continuePager: vi.fn(),
      confirmPrompt: vi.fn(),
    },
    heartbeat: {
      write: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      setActiveCommand: vi.fn(),
      setQueuedCount: vi.fn(),
    },
    lease: {
      validate: vi.fn(() => true),
      waitForLease: vi.fn(),
      stop: vi.fn(),
    },
    config: { devDir: "/tmp/pt-dev" },
    kernelLog: vi.fn(),
    kernelLogSubsystem: vi.fn(),
  } as any;
}

describe("queue-poller control commands", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test("__runtimeStatus no necesita runtimeFn", () => {
    const claimed = {
      id: "status-1",
      type: "__runtimeStatus",
      payload: { type: "__runtimeStatus" },
      filename: "000000000001-__runtimeStatus.json",
    };

    const subsystems = createSubsystems(claimed);
    const state = {
      isRunning: true,
      isShuttingDown: false,
      activeCommand: null,
      activeCommandFilename: null,
      pollStats: {
        tickCount: 0,
        processedCount: 0,
        emptyCount: 0,
        skippedBusyCount: 0,
        errorCount: 0,
        lastPollAt: 0,
        lastPollDurationMs: 0,
        lastBeforeCount: 0,
        lastAfterCount: 0,
        nextDelayMs: 0,
        idlePollDelayMs: 0,
        hotPollBudget: 0,
        lastClaimedCommandId: null,
        lastClaimedCommandType: null,
        lastError: null,
      },
    } as any;

    pollCommandQueue(subsystems, state);

    expect(subsystems.runtimeLoader.getRuntimeFn).not.toHaveBeenCalled();
    expect(subsystems.runtimeLoader.getStatus).toHaveBeenCalled();
    expect(finishActiveCommand).toHaveBeenCalled();
  });

  test("__reloadRuntime no necesita runtimeFn", () => {
    const claimed = {
      id: "reload-1",
      type: "__reloadRuntime",
      payload: { type: "__reloadRuntime" },
      filename: "000000000002-__reloadRuntime.json",
    };

    const subsystems = createSubsystems(claimed);
    const state = {
      isRunning: true,
      isShuttingDown: false,
      activeCommand: null,
      activeCommandFilename: null,
      pollStats: {
        tickCount: 0,
        processedCount: 0,
        emptyCount: 0,
        skippedBusyCount: 0,
        errorCount: 0,
        lastPollAt: 0,
        lastPollDurationMs: 0,
        lastBeforeCount: 0,
        lastAfterCount: 0,
        nextDelayMs: 0,
        idlePollDelayMs: 0,
        hotPollBudget: 0,
        lastClaimedCommandId: null,
        lastClaimedCommandType: null,
        lastError: null,
      },
    } as any;

    pollCommandQueue(subsystems, state);

    expect(subsystems.runtimeLoader.getRuntimeFn).not.toHaveBeenCalled();
    expect(subsystems.runtimeLoader.reloadNow).toHaveBeenCalled();
    expect(finishActiveCommand).toHaveBeenCalled();
  });
});
