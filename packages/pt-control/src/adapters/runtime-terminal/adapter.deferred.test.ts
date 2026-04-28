import { describe, expect, test, vi } from "bun:test";

import { createRuntimeTerminalAdapter } from "./adapter.js";

describe("createRuntimeTerminalAdapter deferred flow", () => {
  test("no bloquea el plan diferido con el timeout completo", async () => {
    const calls: Array<{ type: string; timeoutMs?: number; options?: unknown }> = [];

    const bridge = {
      sendCommandAndWait: vi.fn(async (type: string, payload: unknown, timeoutMs?: number, options?: unknown) => {
        calls.push({ type, timeoutMs, options });

        if (type === "terminal.plan.run") {
          return {
            ok: true,
            status: 0,
            completedAt: Date.now(),
            value: { deferred: true, ticket: "ticket-1" },
          };
        }

        if (type === "__pollDeferred") {
          return {
            ok: true,
            status: 0,
            completedAt: Date.now(),
            value: {
              ok: true,
              output: "show version\nCisco IOS Software\nR1#",
              session: {
                modeBefore: "user-exec",
                modeAfter: "priv-exec",
                promptBefore: "R1>",
                promptAfter: "R1#",
              },
              diagnostics: { completionReason: "completed", statusCode: 0 },
            },
          };
        }

        throw new Error(`unexpected ${type}`);
      }),
    };

    const adapter = createRuntimeTerminalAdapter({
      bridge: bridge as never,
      generateId: () => "id-1",
      defaultTimeout: 45000,
    });

    const result = await adapter.runTerminalPlan({
      id: "plan-1",
      device: "R1",
      steps: [{ command: "show version" }],
    } as never);

    expect(result.ok).toBe(true);
    expect(calls.map((call) => call.type)).toEqual(["terminal.plan.run", "__pollDeferred"]);
    expect(calls[0]?.timeoutMs).toBeLessThanOrEqual(5000);
    expect(calls[0]?.options).toMatchObject({ resolveDeferred: false });
    expect(calls[1]?.timeoutMs).toBe(45000);
  });

  test("sigue consultando hasta que el job diferido termine", async () => {
    const calls: Array<{ type: string; timeoutMs?: number; options?: unknown }> = [];
    let pollCount = 0;

    const bridge = {
      sendCommandAndWait: vi.fn(async (type: string, payload: unknown, timeoutMs?: number, options?: unknown) => {
        calls.push({ type, timeoutMs, options });

        if (type === "terminal.plan.run") {
          return {
            ok: true,
            status: 0,
            completedAt: Date.now(),
            value: { deferred: true, ticket: "ticket-2" },
          };
        }

        if (type === "__pollDeferred") {
          pollCount += 1;

          if (pollCount === 1) {
            return {
              ok: true,
              status: 0,
              completedAt: Date.now(),
              value: {
                done: false,
                state: "waiting-ensure-mode",
                currentStep: 0,
                totalSteps: 2,
                outputTail: "",
              },
            };
          }

          return {
            ok: true,
            status: 0,
            completedAt: Date.now(),
            value: {
              done: true,
              ok: true,
              output: "show version\nCisco IOS Software\nR1#",
              error: null,
              errorCode: null,
              result: {
                ok: true,
                raw: "show version\nCisco IOS Software\nR1#",
                status: 0,
                session: {
                  modeBefore: "user-exec",
                  modeAfter: "priv-exec",
                  promptBefore: "R1>",
                  promptAfter: "R1#",
                },
              },
            },
          };
        }

        throw new Error(`unexpected ${type}`);
      }),
    };

    const adapter = createRuntimeTerminalAdapter({
      bridge: bridge as never,
      generateId: () => "id-2",
      defaultTimeout: 45000,
    });

    const result = await adapter.runTerminalPlan({
      id: "plan-2",
      device: "R1",
      steps: [{ command: "show version" }],
    } as never);

    expect(result.ok).toBe(true);
    expect(calls.map((call) => call.type)).toEqual([
      "terminal.plan.run",
      "__pollDeferred",
      "__pollDeferred",
    ]);
    expect(pollCount).toBe(2);
  });

  test("usa la ventana solicitada para consultar jobs diferidos largos", async () => {
    const calls: Array<{ type: string; timeoutMs?: number; options?: unknown }> = [];

    const bridge = {
      sendCommandAndWait: vi.fn(async (type: string, payload: unknown, timeoutMs?: number, options?: unknown) => {
        calls.push({ type, timeoutMs, options });

        if (type === "terminal.plan.run") {
          return {
            ok: true,
            status: 0,
            completedAt: Date.now(),
            value: { deferred: true, ticket: "ticket-3" },
          };
        }

        if (type === "__pollDeferred") {
          return {
            ok: true,
            status: 0,
            completedAt: Date.now(),
            value: {
              done: true,
              ok: true,
              output: "show version\nCisco IOS Software\nR1#",
              result: {
                ok: true,
                raw: "show version\nCisco IOS Software\nR1#",
                status: 0,
              },
            },
          };
        }

        throw new Error(`unexpected ${type}`);
      }),
    };

    const adapter = createRuntimeTerminalAdapter({
      bridge: bridge as never,
      generateId: () => "id-3",
      defaultTimeout: 45000,
    });

    const result = await adapter.runTerminalPlan(
      {
        id: "plan-3",
        device: "R1",
        steps: [{ command: "show version" }],
      } as never,
      { timeoutMs: 45000 },
    );

    expect(result.ok).toBe(true);
    expect(calls[1]?.type).toBe("__pollDeferred");
    expect(calls[1]?.timeoutMs).toBeGreaterThan(12000);
  });
});
