import { describe, expect, test, vi } from "bun:test";

import { createLiveDebugLogFollower } from "../../src/telemetry/log-live-tui";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("live log follower", () => {
  test("follows PT debug logs until stopped", async () => {
    let tailCalls = 0;
    let followCalls = 0;
    const follower = createLiveDebugLogFollower({
      sessionReader: () => [],
      stream: {
        tail: () => {
          tailCalls++;
          return [];
        },
        follow: () => {
          followCalls++;
          return () => {};
        },
      },
    });

    const done = follower.start();
    let settled = false;
    done.then(() => {
      settled = true;
    });

    await sleep(20);

    expect(tailCalls).toBe(1);
    expect(followCalls).toBe(1);
    expect(settled).toBe(false);

    follower.stop();
    await done;

    expect(settled).toBe(true);
  });

  test("does not duplicate tail entries when follow starts", async () => {
    const logs: string[] = [];
    const spy = vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      logs.push(args.join(" "));
    });

    const follower = createLiveDebugLogFollower({
      verbose: true,
      sessionReader: () => [],
      stream: {
        tail: () => [
          {
            seq: 1,
            timestamp: "2026-01-01T00:00:00.000Z",
            scope: "kernel",
            message: '[runtime] {"level":"info","msg":"first"}',
            level: "info",
          },
        ],
        follow: (onEntry) => {
          onEntry({
            seq: 1,
            timestamp: "2026-01-01T00:00:00.000Z",
            scope: "kernel",
            message: '[runtime] {"level":"info","msg":"first"}',
            level: "info",
          });
          onEntry({
            seq: 2,
            timestamp: "2026-01-01T00:00:01.000Z",
            scope: "kernel",
            message: '[runtime] {"level":"info","msg":"second"}',
            level: "info",
          });
          return () => {};
        },
      },
    });

    const done = follower.start();
    await sleep(20);
    follower.stop();
    await done;

    spy.mockRestore();

    const firstCount = logs.filter((line) => line.includes("first")).length;
    const secondCount = logs.filter((line) => line.includes("second")).length;

    expect(firstCount).toBe(1);
    expect(secondCount).toBe(1);
  });

  test("mezcla debug PT y respuesta de sesión", async () => {
    const logs: string[] = [];
    const spy = vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      logs.push(args.join(" "));
    });

    const follower = createLiveDebugLogFollower({
      verbose: true,
      stream: {
        tail: () => [
          {
            seq: 10,
            timestamp: "2026-01-01T00:00:00.000Z",
            scope: "kernel",
            message: "SUCCESS: runtime.js loaded",
            level: "info",
          },
        ],
        follow: () => () => {},
      },
      sessionReader: () => [
        {
          session_id: "s-1",
          correlation_id: "c-1",
          timestamp: "2026-01-01T00:00:00.000Z",
          phase: "start",
          action: "device.list",
          metadata: {
            flags: { quiet: true },
          },
        },
      ],
    });

    const done = follower.start();
    await sleep(20);
    follower.stop();
    await done;

    spy.mockRestore();

    expect(logs.some((line) => line.includes("SUCCESS: runtime.js loaded"))).toBe(true);
    expect(logs.some((line) => line.includes("device.list"))).toBe(true);
    expect(logs.some((line) => line.includes("session:s-1"))).toBe(true);
  });

  test("respeta el orden temporal entre PT y sesión", async () => {
    const logs: string[] = [];
    const spy = vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      logs.push(args.join(" "));
    });

    const follower = createLiveDebugLogFollower({
      verbose: true,
      stream: {
        tail: () => [
          {
            seq: 10,
            timestamp: "2026-01-01T00:00:02.000Z",
            scope: "kernel",
            message: "SUCCESS: runtime.js loaded",
            level: "info",
          },
        ],
        follow: () => () => {},
      },
      sessionReader: () => [
        {
          session_id: "s-1",
          correlation_id: "c-1",
          timestamp: "2026-01-01T00:00:01.000Z",
          phase: "start",
          action: "device.list",
          metadata: {
            flags: { quiet: true },
          },
        },
      ],
    });

    const done = follower.start();
    await sleep(20);
    follower.stop();
    await done;

    spy.mockRestore();

    const ptIndex = logs.findIndex((line) => line.includes("SUCCESS: runtime.js loaded"));
    const sessionIndex = logs.findIndex((line) => line.includes("device.list"));

    expect(sessionIndex).toBeGreaterThan(-1);
    expect(ptIndex).toBeGreaterThan(-1);
    expect(sessionIndex).toBeLessThan(ptIndex);
  });

  test("reordena eventos vivos aunque PT llegue antes que la sesión", async () => {
    const logs: string[] = [];
    const spy = vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      logs.push(args.join(" "));
    });

    let sessionPolls = 0;
    const follower = createLiveDebugLogFollower({
      verbose: true,
      stream: {
        tail: () => [],
        follow: (onEntry) => {
          onEntry({
            seq: 10,
            timestamp: "2026-01-01T00:00:02.000Z",
            scope: "kernel",
            message: "SUCCESS: runtime.js loaded",
            level: "info",
          });
          return () => {};
        },
      },
      sessionReader: () => {
        sessionPolls += 1;
        if (sessionPolls < 2) return [];
        return [
          {
            session_id: "s-1",
            correlation_id: "c-1",
            timestamp: "2026-01-01T00:00:01.000Z",
            phase: "end",
            action: "device.list",
            metadata: {
              ok: true,
              durationMs: 12,
            },
          },
        ];
      },
    });

    const done = follower.start();
    await sleep(300);
    follower.stop();
    await done;

    spy.mockRestore();

    const ptIndex = logs.findIndex((line) => line.includes("SUCCESS: runtime.js loaded"));
    const sessionIndex = logs.findIndex((line) => line.includes("device.list"));

    expect(sessionIndex).toBeGreaterThan(-1);
    expect(ptIndex).toBeGreaterThan(-1);
    expect(sessionIndex).toBeLessThan(ptIndex);
  });

  test("muestra el cierre del comando con resultado destacado", async () => {
    const logs: string[] = [];
    const spy = vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      logs.push(args.join(" "));
    });

    const follower = createLiveDebugLogFollower({
      verbose: true,
      stream: {
        tail: () => [],
        follow: () => () => {},
      },
      sessionReader: () => [
        {
          session_id: "s-1",
          correlation_id: "c-1",
          timestamp: "2026-01-01T00:00:03.000Z",
          phase: "end",
          action: "device.list",
          metadata: {
            ok: true,
            completionReason: "completed",
            commandIds: ["cmd-1"],
            resultSummary: {
              total: 3,
            },
          },
        },
      ],
    });

    const done = follower.start();
    await sleep(20);
    follower.stop();
    await done;

    spy.mockRestore();

    expect(logs.some((line) => line.includes("OK"))).toBe(true);
    expect(logs.some((line) => line.includes("resultado"))).toBe(true);
    expect(logs.some((line) => line.includes("completed"))).toBe(true);
    expect(logs.some((line) => line.includes("cmds:1"))).toBe(true);
    expect(logs.some((line) => line.includes("resultSummary"))).toBe(true);
  });

  test("agrupa queue dispatch y completing bajo un comando", async () => {
    const logs: string[] = [];
    const spy = vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      logs.push(args.join(" "));
    });

    const follower = createLiveDebugLogFollower({
      verbose: true,
      stream: {
        tail: () => [],
        follow: (onEntry) => {
          onEntry({
            seq: 1,
            timestamp: "2026-01-01T00:00:01.000Z",
            scope: "queue",
            level: "debug",
            message: "[queue-claim] claimed: 000000008180-listDevices.json",
          });
          onEntry({
            seq: 2,
            timestamp: "2026-01-01T00:00:02.000Z",
            scope: "kernel",
            level: "info",
            message: ">>> DISPATCH: cmd_000000008180 type=listDevices",
          });
          onEntry({
            seq: 3,
            timestamp: "2026-01-01T00:00:03.000Z",
            scope: "kernel",
            level: "info",
            message: "<<< COMPLETING: cmd_000000008180 ok=true",
          });
          return () => {};
        },
      },
      sessionReader: () => [],
    });

    const done = follower.start();
    await sleep(200);
    follower.stop();
    await done;

    spy.mockRestore();

    expect(logs.some((line) => line.includes("cmd_000000008180"))).toBe(true);
    expect(logs.some((line) => line.includes("listDevices"))).toBe(true);
    expect(logs.some((line) => line.includes("QUEUE"))).toBe(true);
    expect(logs.some((line) => line.includes("dispatch"))).toBe(true);
    expect(logs.some((line) => line.includes("OK"))).toBe(true);
  });

  test("oculta queue parsed duplicado del mismo comando", async () => {
    const logs: string[] = [];
    const spy = vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      logs.push(args.join(" "));
    });

    const follower = createLiveDebugLogFollower({
      verbose: true,
      stream: {
        tail: () => [],
        follow: (onEntry) => {
          onEntry({
            seq: 1,
            timestamp: "2026-01-01T00:00:01.000Z",
            scope: "queue",
            level: "debug",
            message: "[queue-claim] claimed: 000000008180-listDevices.json",
          });
          onEntry({
            seq: 2,
            timestamp: "2026-01-01T00:00:01.500Z",
            scope: "queue",
            level: "debug",
            message: "[queue-claim] parsed: 000000008180-listDevices.json",
          });
          onEntry({
            seq: 3,
            timestamp: "2026-01-01T00:00:02.000Z",
            scope: "kernel",
            level: "info",
            message: "<<< COMPLETING: cmd_000000008180 ok=true",
          });
          return () => {};
        },
      },
      sessionReader: () => [],
    });

    const done = follower.start();
    await sleep(200);
    follower.stop();
    await done;

    spy.mockRestore();

    const queueLineCount = logs.filter((line) => line.includes("QUEUE")).length;
    expect(queueLineCount).toBe(1);
    expect(logs.some((line) => line.includes("cmd_000000008180"))).toBe(true);
    expect(logs.some((line) => line.includes("OK"))).toBe(true);
  });
});
