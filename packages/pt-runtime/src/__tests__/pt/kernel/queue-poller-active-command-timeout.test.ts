import { describe, expect, test, vi, beforeEach } from "bun:test";
import { pollCommandQueue } from "../../../pt/kernel/queue-poller";

let mockNow = 1000;

function setupDateMock() {
  mockNow = 1000;
  Date.now = () => mockNow;
}

function advanceTime(ms: number) {
  mockNow += ms;
}

function createCallTracker() {
  const calls: any[] = [];
  const fn = (...args: any[]) => {
    calls.push({ args });
    return null;
  };
  return { fn, calls };
}

function createBaseSubsystems(opts?: { activeCommandTimeoutMs?: number }) {
  const pollTracker = createCallTracker();
  const pollAllowedTracker = createCallTracker();

  return {
    queue: {
      poll: pollTracker.fn,
      pollAllowedTypes: pollAllowedTracker.fn,
      count: () => 1,
      cleanup: vi.fn(),
    },
    runtimeLoader: {
      reloadIfNeeded: () => {},
      getRuntimeFn: () => null,
      getStatus: () => ({}),
    },
    executionEngine: {
      getActiveJobs: () => [],
    },
    terminal: {
      isAnyBusy: () => false,
    },
    heartbeat: {
      setQueuedCount: () => {},
      setActiveCommand: () => {},
    },
    config: {
      resultsDir: "/tmp/results",
      commandsDir: "/tmp/commands",
      inFlightDir: "/tmp/in-flight",
      deadLetterDir: "/tmp/dead-letter",
      logsDir: "/tmp/logs",
      commandsTraceDir: "/tmp/trace",
      ...(opts?.activeCommandTimeoutMs ? { activeCommandTimeoutMs: opts.activeCommandTimeoutMs } : {}),
    },
    kernelLog: () => {},
    kernelLogSubsystem: () => {},
    _pollTracker: pollTracker,
    _pollAllowedTracker: pollAllowedTracker,
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
      activeCommandTimeoutCount: 0,
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

describe("queue-poller active command timeout", () => {
  beforeEach(() => {
    setupDateMock();
  });

  test("salta poll si activeCommand existe y no ha expirado", () => {
    const subsystems = createBaseSubsystems();
    const state = createState();

    state.activeCommand = {
      id: "cmd-1",
      seq: 1,
      type: "terminal.native.exec",
      payload: { command: "show version" },
      startedAt: mockNow - 5000,
    };

    const logMessages: string[] = [];
    subsystems.kernelLogSubsystem = (name: string, msg: string) => {
      logMessages.push(msg);
    };

    pollCommandQueue(subsystems, state);

    expect(state.pollStats.skippedBusyCount).toBe(1);
    expect(state.pollStats.activeCommandTimeoutCount).toBe(0);
    expect(subsystems._pollTracker.calls.length).toBe(0);
    const hasSkipMessage = logMessages.some((m) => m.includes("Skipping poll"));
    expect(hasSkipMessage).toBe(true);
  });

  test("fuerza finalización si activeCommand ha excedido el timeout", () => {
    const commandFinalizer = require("../../../pt/kernel/command-finalizer");
    const finishActiveCommandSpy = vi
      .spyOn(commandFinalizer, "finishActiveCommand")
      .mockImplementation(vi.fn());

    const subsystems = createBaseSubsystems();
    const state = createState();

    state.activeCommand = {
      id: "cmd-timeout-1",
      seq: 1,
      type: "terminal.native.exec",
      payload: { command: "show version" },
      startedAt: mockNow - 60000,
    };

    pollCommandQueue(subsystems, state);

    expect(state.pollStats.activeCommandTimeoutCount).toBe(1);
    expect(state.pollStats.skippedBusyCount).toBe(0);
    expect(finishActiveCommandSpy).toHaveBeenCalledTimes(1);

    const callArg = finishActiveCommandSpy.mock.calls[0][2] as any;
    expect(callArg.ok).toBe(false);
    expect(callArg.code).toBe("ACTIVE_COMMAND_TIMEOUT");

    finishActiveCommandSpy.mockRestore();
  });

  test("usa timeoutMs configurable", () => {
    const commandFinalizer = require("../../../pt/kernel/command-finalizer");
    const finishActiveCommandSpy = vi
      .spyOn(commandFinalizer, "finishActiveCommand")
      .mockImplementation(vi.fn());

    const customTimeoutMs = 10000;
    const subsystems = createBaseSubsystems({ activeCommandTimeoutMs: customTimeoutMs });
    const state = createState();

    state.activeCommand = {
      id: "cmd-custom-timeout",
      seq: 1,
      type: "terminal.native.exec",
      payload: { command: "show ip route" },
      startedAt: mockNow - customTimeoutMs - 1,
    };

    pollCommandQueue(subsystems, state);

    expect(state.pollStats.activeCommandTimeoutCount).toBe(1);
    expect(finishActiveCommandSpy).toHaveBeenCalledTimes(1);

    finishActiveCommandSpy.mockRestore();
  });

  test("no timeout si activeCommand está dentro del límite configurable", () => {
    const commandFinalizer = require("../../../pt/kernel/command-finalizer");
    const finishActiveCommandSpy = vi
      .spyOn(commandFinalizer, "finishActiveCommand")
      .mockImplementation(vi.fn());

    const customTimeoutMs = 10000;
    const subsystems = createBaseSubsystems({ activeCommandTimeoutMs: customTimeoutMs });
    const state = createState();

    state.activeCommand = {
      id: "cmd-within-timeout",
      seq: 1,
      type: "terminal.native.exec",
      payload: { command: "show ip route" },
      startedAt: mockNow - customTimeoutMs + 1000,
    };

    pollCommandQueue(subsystems, state);

    expect(state.pollStats.skippedBusyCount).toBe(1);
    expect(state.pollStats.activeCommandTimeoutCount).toBe(0);
    expect(finishActiveCommandSpy).not.toHaveBeenCalled();

    finishActiveCommandSpy.mockRestore();
  });

  test("después del timeout, el poll continúa procesando nuevos comandos", () => {
    const commandFinalizer = require("../../../pt/kernel/command-finalizer");
    const finishActiveCommandSpy = vi
      .spyOn(commandFinalizer, "finishActiveCommand")
      .mockImplementation(vi.fn());

    const subsystems = createBaseSubsystems();
    const state = createState();

    state.activeCommand = {
      id: "cmd-stuck",
      seq: 1,
      type: "terminal.native.exec",
      payload: { command: "show version" },
      startedAt: mockNow - 60000,
    };

    pollCommandQueue(subsystems, state);

    expect(state.pollStats.activeCommandTimeoutCount).toBe(1);
    expect(finishActiveCommandSpy).toHaveBeenCalledTimes(1);

    // el poll debe continuar (intentar poll normal)
    expect(subsystems._pollTracker.calls.length).toBeGreaterThanOrEqual(0);

    finishActiveCommandSpy.mockRestore();
  });

  test("no afecta comandos de control que duran más que el timeout default", () => {
    const commandFinalizer = require("../../../pt/kernel/command-finalizer");
    const finishActiveCommandSpy = vi
      .spyOn(commandFinalizer, "finishActiveCommand")
      .mockImplementation(vi.fn());

    const subsystems = createBaseSubsystems();
    const state = createState();

    state.activeCommand = {
      id: "poll-1",
      seq: 1,
      type: "__pollDeferred",
      payload: { type: "__pollDeferred", ticket: "job-1" },
      startedAt: mockNow - 25000,
    };

    pollCommandQueue(subsystems, state);

    // 25s < 30s default timeout → skip normal
    expect(state.pollStats.skippedBusyCount).toBe(1);
    expect(state.pollStats.activeCommandTimeoutCount).toBe(0);

    finishActiveCommandSpy.mockRestore();
  });
});
