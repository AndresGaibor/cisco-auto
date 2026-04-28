import { afterEach, describe, expect, test, vi } from "bun:test";

import { buildCommandResultEnvelope } from "../../../pt/kernel/command-result-envelope";
import { finishActiveCommand } from "../../../pt/kernel/command-finalizer";

afterEach(() => {
  delete (globalThis as any).fm;
});

describe("buildCommandResultEnvelope", () => {
  test("preserva startedAt y completedAt distintos", () => {
    const envelope = buildCommandResultEnvelope(
      {
        id: "cmd-1",
        seq: 7,
        startedAt: 1500,
      },
      { ok: true, raw: "done", status: 0 },
      2000,
    );

    expect(envelope).toMatchObject({
      id: "cmd-1",
      seq: 7,
      type: "unknown",
      startedAt: 1500,
      completedAt: 2000,
      status: "completed",
      ok: true,
    });
  });

  test("incluye type cuando el comando activo lo trae", () => {
    const envelope = buildCommandResultEnvelope(
      {
        id: "cmd-2",
        seq: 8,
        type: "terminal.plan.run",
        startedAt: 1500,
      },
      { ok: true, raw: "done", status: 0 },
      2000,
    );

    expect(envelope.type).toBe("terminal.plan.run");
  });

  test("no limpia la cola si el result file no queda verificado", () => {
    const fm = {
      writePlainTextToFile: vi.fn(),
      fileExists: vi.fn(() => false),
      getFileSize: vi.fn(() => 0),
      getFileContents: vi.fn(() => ""),
      removeFile: vi.fn(),
    };

    (globalThis as any).fm = fm;

    const subsystems = {
      config: { resultsDir: "/tmp/results" },
      queue: { cleanup: vi.fn(), count: vi.fn(() => 1) },
      heartbeat: { setQueuedCount: vi.fn(), setActiveCommand: vi.fn() },
      kernelLog: vi.fn(),
      kernelLogSubsystem: vi.fn(),
    } as any;

    const state = {
      activeCommand: { id: "cmd-3", seq: 9, startedAt: 1234 },
      activeCommandFilename: "cmd-3.json",
      isRunning: true,
      isShuttingDown: false,
    } as any;

    finishActiveCommand(subsystems, state, { ok: true, raw: "done", status: 0 });

    expect(fm.writePlainTextToFile).toHaveBeenCalled();
    expect(subsystems.queue.cleanup).not.toHaveBeenCalled();
    expect(subsystems.heartbeat.setActiveCommand).not.toHaveBeenCalled();
    expect(state.activeCommand).not.toBeNull();
    expect(state.activeCommandFilename).toBe("cmd-3.json");
  });
});
