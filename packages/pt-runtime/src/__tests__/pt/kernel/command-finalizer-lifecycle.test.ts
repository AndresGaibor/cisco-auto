import { afterEach, describe, expect, test, vi } from "bun:test";

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
    const { finishActiveCommand } = require("../../../pt/kernel/command-finalizer");
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
    const { finishActiveCommand } = require("../../../pt/kernel/command-finalizer");
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
    const { finishActiveCommand } = require("../../../pt/kernel/command-finalizer");
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

  test("podar resultados antiguos después de escribir uno nuevo", () => {
    const { finishActiveCommand } = require("../../../pt/kernel/command-finalizer");
    const state = createState();
    const subsystems = createSubsystems();
    const files = new Map<string, string>();
    const mtimes = new Map<string, number>();
    const resultFiles = ["old.json"];

    mtimes.set("/tmp/pt-dev/results/old.json", 1000);
    files.set("/tmp/pt-dev/results/old.json", "{}");

    for (let i = 0; i < 499; i += 1) {
      const name = `mid-${String(i).padStart(3, "0")}.json`;
      const path = `/tmp/pt-dev/results/${name}`;
      resultFiles.push(name);
      mtimes.set(path, 2000 + i);
      files.set(path, "{}");
    }

    (globalThis as any).fm = {
      writePlainTextToFile: vi.fn((path: string, content: string) => {
        files.set(path, content);
        mtimes.set(path, 6000);
        resultFiles.push(path.slice(path.lastIndexOf("/") + 1));
      }),
      fileExists: vi.fn((path: string) => files.has(path) || mtimes.has(path)),
      getFileContents: vi.fn((path: string) => files.get(path) ?? "{}"),
      getFilesInDirectory: vi.fn(() => [...resultFiles]),
      getFileModificationTime: vi.fn((path: string) => mtimes.get(path) ?? 0),
      removeFile: vi.fn((path: string) => {
        files.delete(path);
        mtimes.delete(path);
        const filename = path.slice(path.lastIndexOf("/") + 1);
        const index = resultFiles.indexOf(filename);
        if (index >= 0) resultFiles.splice(index, 1);
      }),
    };

    finishActiveCommand(subsystems, state, {
      ok: true,
      output: "ok",
      status: 0,
    });

    expect(subsystems.queue.cleanup).toHaveBeenCalled();
    expect((globalThis as any).fm.removeFile).toHaveBeenCalledWith("/tmp/pt-dev/results/old.json");
    expect(files.has("/tmp/pt-dev/results/cmd_000000000001.json")).toBe(true);
    expect(state.activeCommand).toBeNull();
    expect(state.activeCommandFilename).toBeNull();
  });
});
