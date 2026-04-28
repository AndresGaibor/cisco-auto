import { afterEach, describe, expect, test, vi } from "bun:test";

vi.mock("../../pt/kernel/command-finalizer", () => ({
  finishActiveCommand: vi.fn(),
}));

function createSubsystems(runtimeFn: () => unknown) {
  return {
    dirs: { ensureDirectories: vi.fn() },
    queue: {
      poll: vi.fn(() => ({
        id: "cmd_1",
        payload: { type: "execPc", device: "PC1", command: "ping 192.168.10.1" },
        seq: 1,
        filename: "cmd_1.json",
      })),
      count: vi.fn(() => 0),
    },
    runtimeLoader: {
      reloadIfNeeded: vi.fn(),
      getRuntimeFn: vi.fn(() => runtimeFn),
    },
    heartbeat: {
      setQueuedCount: vi.fn(),
      setActiveCommand: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      write: vi.fn(),
    },
    executionEngine: {
      getActiveJobs: vi.fn(() => []),
    },
    terminal: {
      isAnyBusy: vi.fn(() => false),
    },
    lease: {
      stop: vi.fn(),
      validate: vi.fn(() => true),
    },
    config: {
      pollIntervalMs: 1000,
      heartbeatIntervalMs: 1000,
      commandsDir: "/tmp/commands",
      inFlightDir: "/tmp/in-flight",
      resultsDir: "/tmp/results",
      deadLetterDir: "/tmp/dead-letter",
      logsDir: "/tmp/logs",
      commandsTraceDir: "/tmp/logs/commands",
    },
    kernelLog: vi.fn(),
    kernelLogSubsystem: vi.fn(),
  } as any;
}

describe("pollCommandQueue", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test("espera resultados async del runtime antes de finalizar el comando", async () => {
    const { pollCommandQueue } = await import("../../pt/kernel/queue-poller");
    const { finishActiveCommand } = await import("../../pt/kernel/command-finalizer");

    const runtimeFn = vi.fn(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ ok: true, raw: "captured-output" }), 10);
        }),
    );

    const subsystems = createSubsystems(runtimeFn);
    const state = {
      isRunning: true,
      isShuttingDown: false,
      activeCommand: null,
      activeCommandFilename: null,
    } as any;

    pollCommandQueue(subsystems, state);

    expect(state.activeCommand?.startedAt).toBeTypeOf("number");
    expect(state.activeCommand?.startedAt).toBeGreaterThan(0);
    expect(finishActiveCommand).not.toHaveBeenCalled();

    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(finishActiveCommand).toHaveBeenCalledTimes(1);
    expect((finishActiveCommand as any).mock.calls[0][2]).toEqual({
      ok: true,
      raw: "captured-output",
    });
  });
});
