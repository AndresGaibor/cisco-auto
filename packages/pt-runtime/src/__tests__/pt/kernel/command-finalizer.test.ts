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

  test("incluye meta con queueLatencyMs y execLatencyMs", () => {
    const envelope = buildCommandResultEnvelope(
      {
        id: "cmd-meta-1",
        seq: 10,
        type: "terminal.plan.run",
        createdAt: 1000,
        startedAt: 1250,
      },
      { ok: true, raw: "done", status: 0 },
      1750,
    );

    expect(envelope.meta).toMatchObject({
      queuedAt: 1000,
      claimedAt: 1250,
      completedAtMs: 1750,
      queueLatencyMs: 250,
      execLatencyMs: 500,
    });
  });

  test("usa startedAt como queuedAt fallback si el comando no trae createdAt", () => {
    const envelope = buildCommandResultEnvelope(
      {
        id: "cmd-meta-2",
        seq: 11,
        type: "inspectDeviceFast",
        startedAt: 2000,
      },
      { ok: true, value: { name: "SW1" } },
      2300,
    );

    expect(envelope.meta).toMatchObject({
      queuedAt: 2000,
      claimedAt: 2000,
      completedAtMs: 2300,
      queueLatencyMs: 0,
      execLatencyMs: 300,
    });
  });

  test("normaliza latencias negativas a cero si hay timestamps inconsistentes", () => {
    const envelope = buildCommandResultEnvelope(
      {
        id: "cmd-meta-3",
        seq: 12,
        type: "terminal.plan.run",
        createdAt: 3000,
        startedAt: 2500,
      },
      { ok: true, raw: "done", status: 0 },
      2400,
    );

    expect(envelope.meta.queueLatencyMs).toBe(0);
    expect(envelope.meta.execLatencyMs).toBe(0);
  });

  test("limpia el estado activeCommand aunque falle verificación de result file", () => {
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
    expect(subsystems.heartbeat.setActiveCommand).toHaveBeenCalledWith(null);
    expect(state.activeCommand).toBeNull();
    expect(state.activeCommandFilename).toBeNull();
  });
});
