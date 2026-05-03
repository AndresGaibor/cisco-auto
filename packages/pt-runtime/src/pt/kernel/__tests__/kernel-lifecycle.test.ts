import { describe, expect, test, vi, beforeEach, afterEach } from "bun:test";
import { createKernelLifecycle } from "../kernel-lifecycle";
import * as queuePoller from "../queue-poller";

function createSubsystems() {
  return {
    dirs: { ensureDirectories: vi.fn() },
    queue: { count: vi.fn(() => 0) },
    runtimeLoader: {
      load: vi.fn(),
      loadDemo: vi.fn(),
      reloadIfNeeded: vi.fn(),
      getLastMtime: vi.fn(() => 0),
      getRuntimeFn: vi.fn(() => () => ({ ok: true })),
      hasPendingReload: vi.fn(() => false),
    },
    heartbeat: {
      write: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      setActiveCommand: vi.fn(),
      setQueuedCount: vi.fn(),
    },
    executionEngine: {
      getActiveJobs: vi.fn(() => []),
    },
    terminal: {
      attach: vi.fn(),
      detach: vi.fn(),
      getSession: vi.fn(() => null),
      getMode: vi.fn(() => "user-exec"),
      isBusy: vi.fn(() => false),
      isAnyBusy: vi.fn(() => false),
      executeCommand: vi.fn(),
      continuePager: vi.fn(),
      confirmPrompt: vi.fn(),
    },
    lease: {
      validate: vi.fn(() => true),
      waitForLease: vi.fn(),
      stop: vi.fn(),
    },
    config: {
      devDir: "/tmp/pt-dev",
      commandsDir: "/tmp/pt-dev/commands",
      inFlightDir: "/tmp/pt-dev/in-flight",
      resultsDir: "/tmp/pt-dev/results",
      deadLetterDir: "/tmp/pt-dev/dead-letter",
      logsDir: "/tmp/pt-dev/logs",
      commandsTraceDir: "/tmp/pt-dev/logs/commands",
      pollIntervalMs: 1000,
      deferredPollIntervalMs: 500,
      heartbeatIntervalMs: 1000,
    },
    kernelLog: vi.fn(),
    kernelLogSubsystem: vi.fn(),
  } as any;
}

describe("createKernelLifecycle", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("el poll interval sigue vivo si el poll lanza", () => {
    let callCount = 0;
    let shouldThrow = false;
    const pollSpy = vi.spyOn(queuePoller, "pollCommandQueue").mockImplementation(() => {
      callCount += 1;
      if (shouldThrow && callCount === 2) {
        throw new Error("poll boom");
      }
    });

    const subsystems = createSubsystems();
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

    let timeoutCallback: (() => void) | null = null;
    vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: () => void) => {
      timeoutCallback = callback;
      return 1 as any;
    }) as typeof setTimeout);

    const lifecycle = createKernelLifecycle(subsystems, state);
    lifecycle.boot();

    expect(timeoutCallback).not.toBeNull();
    const cb = timeoutCallback!;
    cb();
    expect(pollSpy).toHaveBeenCalledTimes(1);
    shouldThrow = true;
    expect(() => cb()).not.toThrow();
    expect(pollSpy).toHaveBeenCalledTimes(2);
  });
});
