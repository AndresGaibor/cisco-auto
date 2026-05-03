import { afterEach, describe, expect, test, vi } from "bun:test";
import { finishActiveCommand } from "../../../pt/kernel/command-finalizer";

function createState() {
  return {
    activeCommand: {
      protocolVersion: 2,
      id: "cmd_000000000001",
      seq: 1,
      type: "terminal.native.exec",
      payload: {
        type: "terminal.native.exec",
        device: "SW1",
        command: "show version",
      },
      startedAt: 1000,
    },
    activeCommandFilename: "000000000001-terminal.native.exec.json",
  } as any;
}

function createSubsystems() {
  return {
    config: {
      resultsDir: "/tmp/pt-dev/results",
    },
    queue: {
      cleanup: vi.fn(),
      count: vi.fn(() => 0),
    },
    heartbeat: {
      setActiveCommand: vi.fn(),
      setQueuedCount: vi.fn(),
    },
    kernelLog: vi.fn(),
    kernelLogSubsystem: vi.fn(),
  } as any;
}

afterEach(() => {
  delete (globalThis as any).fm;
});

describe("finishActiveCommand", () => {
  test("no limpia in-flight si no pudo verificar result file", () => {
    const state = createState();
    const subsystems = createSubsystems();

    (globalThis as any).fm = {
      writePlainTextToFile: vi.fn(),
      fileExists: vi.fn(() => false),
      getFileContents: vi.fn(() => ""),
    };

    finishActiveCommand(subsystems, state, {
      ok: true,
      output: "ok",
      status: 0,
    });

    expect(subsystems.queue.cleanup).not.toHaveBeenCalled();
    expect(subsystems.kernelLog).toHaveBeenCalledWith(
      expect.stringContaining("RESULT WRITE FAILED"),
      "error",
    );
    expect(state.activeCommand).toBeNull();
    expect(state.activeCommandFilename).toBeNull();
  });

  test("limpia in-flight solo después de escribir y verificar result file válido", () => {
    const state = createState();
    const subsystems = createSubsystems();
    const files = new Map<string, string>();

    (globalThis as any).fm = {
      writePlainTextToFile: vi.fn((path: string, content: string) => {
        files.set(path, content);
      }),
      fileExists: vi.fn((path: string) => files.has(path)),
      getFileContents: vi.fn((path: string) => files.get(path) ?? ""),
    };

    finishActiveCommand(subsystems, state, {
      ok: true,
      output: "ok",
      status: 0,
    });

    expect(subsystems.queue.cleanup).toHaveBeenCalledWith(
      "000000000001-terminal.native.exec.json",
    );
    expect(files.has("/tmp/pt-dev/results/cmd_000000000001.json")).toBe(true);
    expect(JSON.parse(files.get("/tmp/pt-dev/results/cmd_000000000001.json")!).ok).toBe(true);
    expect(state.activeCommand).toBeNull();
    expect(state.activeCommandFilename).toBeNull();
  });

  test("no limpia si el result file escrito queda corrupto", () => {
    const state = createState();
    const subsystems = createSubsystems();

    (globalThis as any).fm = {
      writePlainTextToFile: vi.fn(),
      fileExists: vi.fn(() => true),
      getFileContents: vi.fn(() => "{ not valid json"),
    };

    finishActiveCommand(subsystems, state, {
      ok: true,
      output: "ok",
      status: 0,
    });

    expect(subsystems.queue.cleanup).not.toHaveBeenCalled();
    expect(subsystems.kernelLog).toHaveBeenCalledWith(
      expect.stringContaining("RESULT WRITE FAILED"),
      "error",
    );
  });
});
