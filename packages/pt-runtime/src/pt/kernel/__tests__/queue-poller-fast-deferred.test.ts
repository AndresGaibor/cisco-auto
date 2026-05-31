import { afterEach, describe, expect, test, vi } from "bun:test";
import { pollCommandQueue } from "../queue-poller";
import * as commandFinalizer from "../command-finalizer";

function createSubsystems(overrides: {
  runtimeFn?: () => any;
  executionEngine?: any;
  claimed?: any;
}) {
  const { runtimeFn, executionEngine, claimed } = overrides;

  const runtimeLoader = {
    getRuntimeFn: vi.fn(() => runtimeFn),
    getStatus: vi.fn(() => ({
      runtimeFile: "/tmp/pt-dev/runtime.js",
      runtimeLoaded: true,
      hasRuntimeFn: true,
      lastMtime: 10,
      pendingReload: false,
      reloadCount: 1,
      loadAttempted: true,
      loadSucceeded: true,
      lastLoadError: null,
      lastReload: null,
    })),
    reloadNow: vi.fn(() => ({ ok: true })),
    reloadIfNeeded: vi.fn(),
    load: vi.fn(),
    loadDemo: vi.fn(),
    getLastMtime: vi.fn(() => 10),
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
      getJobState: vi.fn(),
      ...executionEngine,
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

function createState() {
  return {
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
}

describe("queue-poller fast deferred resolution", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  test("terminal.plan.run fast deferred se finaliza inline antes de escribir result", async () => {
    const finishSpy = vi.spyOn(commandFinalizer, "finishActiveCommand").mockImplementation(vi.fn());

    let getJobStateCalls = 0;

    const claimed = {
      id: "cmd_000000000001",
      type: "terminal.plan.run",
      payload: {
        type: "terminal.plan.run",
        waitForCompletion: true,
        inlineTimeoutMs: 1200,
        plan: { id: "plan-fast", device: "R1", steps: [{ kind: "command", command: "show clock" }] },
      },
      filename: "000000000001-terminal.plan.run.json",
    };

    const subsystems = createSubsystems({
      runtimeFn: () => ({
        ok: true,
        deferred: true,
        ticket: "job-fast",
        job: { id: "job-fast" },
      }),
      executionEngine: {
        getActiveJobs: () => [{ id: "job-fast", device: "R1", finished: false, state: "running" }],
        getJobState: () => {
          getJobStateCalls += 1;

          if (getJobStateCalls < 2) {
            return {
              id: "job-fast",
              state: "waiting-command",
              finished: false,
              outputBuffer: "",
              plan: { plan: [{ type: "command", value: "show clock" }] },
            };
          }

          return {
            id: "job-fast",
            state: "completed",
            finished: true,
            outputBuffer: "R1#show clock\n*1:00:00 UTC\nR1#",
            result: {
              ok: true,
              status: 0,
              raw: "R1#show clock\n*1:00:00 UTC\nR1#",
            },
            lastMode: "privileged-exec",
            lastPrompt: "R1#",
          };
        },
      },
      claimed,
    });

    const state = createState();

    pollCommandQueue(subsystems, state);

    await new Promise((resolve) => setTimeout(resolve, 80));

    expect(finishSpy).toHaveBeenCalledTimes(1);
    expect(finishSpy.mock.calls[0]?.[2]).toMatchObject({
      ok: true,
      done: true,
      inlineCompleted: true,
      ticket: "job-fast",
      status: 0,
    });
    expect(finishSpy.mock.calls[0]?.[2].output).toContain("show clock");
  });

  test("terminal.plan.run conserva deferred si no completa dentro del budget", async () => {
    const finishSpy = vi.spyOn(commandFinalizer, "finishActiveCommand").mockImplementation(vi.fn());

    const deferredResult = {
      ok: true,
      deferred: true,
      ticket: "job-slow",
      job: { id: "job-slow" },
    };

    const claimed = {
      id: "cmd_000000000002",
      type: "terminal.plan.run",
      payload: {
        type: "terminal.plan.run",
        waitForCompletion: true,
        inlineTimeoutMs: 50,
        plan: { id: "plan-slow", device: "R1", steps: [{ kind: "command", command: "show running-config" }] },
      },
      filename: "000000000002-terminal.plan.run.json",
    };

    const subsystems = createSubsystems({
      runtimeFn: () => deferredResult,
      executionEngine: {
        getActiveJobs: () => [{ id: "job-slow", device: "R1", finished: false, state: "running" }],
        getJobState: () => ({
          id: "job-slow",
          state: "waiting-command",
          finished: false,
          outputBuffer: "",
          plan: { plan: [{ type: "command", value: "show running-config" }] },
        }),
      },
      claimed,
    });

    const state = createState();

    pollCommandQueue(subsystems, state);

    await new Promise((resolve) => setTimeout(resolve, 120));

    expect(finishSpy).toHaveBeenCalledTimes(1);
    expect(finishSpy.mock.calls[0]?.[2]).toBe(deferredResult);
  });

  test("no espera deferred si waitForCompletion no es true", async () => {
    const finishSpy = vi.spyOn(commandFinalizer, "finishActiveCommand").mockImplementation(vi.fn());
    const getJobState = vi.fn();

    const deferredResult = {
      ok: true,
      deferred: true,
      ticket: "job-normal",
      job: { id: "job-normal" },
    };

    const claimed = {
      id: "cmd_000000000003",
      type: "terminal.plan.run",
      payload: {
        type: "terminal.plan.run",
        waitForCompletion: false,
        plan: { id: "plan-normal", device: "R1", steps: [{ kind: "command", command: "show clock" }] },
      },
      filename: "000000000003-terminal.plan.run.json",
    };

    const subsystems = createSubsystems({
      runtimeFn: () => deferredResult,
      executionEngine: {
        getActiveJobs: () => [],
        getJobState,
      },
      claimed,
    });

    const state = createState();

    pollCommandQueue(subsystems, state);

    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(getJobState).not.toHaveBeenCalled();
    expect(finishSpy.mock.calls[0]?.[2]).toBe(deferredResult);
  });
});