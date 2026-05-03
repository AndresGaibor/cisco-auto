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

  test("usa el tuning conservador del scheduler en el primer ciclo idle", () => {
    const pollSpy = vi.spyOn(queuePoller, "pollCommandQueue").mockImplementation(() => {});

    const subsystems = createSubsystems();
    subsystems.config.minPollDelayMs = 100;

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

    let timeoutCallbacks: Array<() => void> = [];
    const timeoutDelays: number[] = [];
    vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: () => void, delayMs?: number) => {
      timeoutCallbacks.push(callback);
      timeoutDelays.push(Number(delayMs ?? 0));
      return timeoutCallbacks.length as any;
    }) as typeof setTimeout);

    const lifecycle = createKernelLifecycle(subsystems, state);
    lifecycle.boot();

    expect(timeoutDelays[0]).toBe(0);
    expect(timeoutCallbacks.length).toBe(1);

    timeoutCallbacks[0]!();

    expect(pollSpy).toHaveBeenCalledTimes(1);
    expect(state.pollStats.idlePollDelayMs).toBe(200);
    expect(state.pollStats.nextDelayMs).toBe(200);
    expect(timeoutDelays[1]).toBe(200);
  });

  test("extiende el hot poll budget a 16 ticks tras actividad", () => {
    const pollSpy = vi.spyOn(queuePoller, "pollCommandQueue").mockImplementation(() => {});

    const subsystems = createSubsystems();
    subsystems.config.minPollDelayMs = 100;

    const state = {
      isRunning: true,
      isShuttingDown: false,
      activeCommand: { id: "cmd-1", device: "R1", command: "show version", createdAt: Date.now() } as any,
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
    timeoutCallback!();

    expect(pollSpy).toHaveBeenCalledTimes(1);
    expect(state.pollStats.hotPollBudget).toBe(16);
    expect(state.pollStats.idlePollDelayMs).toBe(100);
    expect(state.pollStats.nextDelayMs).toBe(100);
  });
});
