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
    expect(calls[0]?.timeoutMs).toBe(30000);
    expect(calls[0]?.options).toMatchObject({ resolveDeferred: false });
    expect(calls[1]?.timeoutMs).toBeGreaterThanOrEqual(62990);
    expect(calls[1]?.timeoutMs).toBeLessThanOrEqual(63000);
    expect((result.evidence as any)?.timings?.adapter?.terminalPlanPollIntervalMs).toBe(100);
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

  test("terminal.plan.run parsea pollValue con el comando real y no con terminal.plan.run", async () => {
    const calls: Array<{ type: string; timeoutMs?: number; options?: unknown }> = [];

    const bridge = {
      sendCommandAndWait: vi.fn(async (type: string, _payload: unknown, timeoutMs?: number, options?: unknown) => {
        calls.push({ type, timeoutMs, options });

        if (type === "terminal.plan.run") {
          return {
            ok: true,
            status: 0,
            completedAt: Date.now(),
            value: { deferred: true, ticket: "ticket-real-command" },
          };
        }

        if (type === "__pollDeferred") {
          const raw = [
            "SW1#show version",
            "OLD VERSION OUTPUT",
            "SW1#",
            "SW1#show ip interface brief",
            "Interface              IP-Address      OK? Method Status                Protocol",
            "Vlan99                 192.168.99.6    YES manual up                    up",
            "SW1#",
          ].join("\n");

          return {
            ok: true,
            status: 0,
            completedAt: Date.now(),
            value: {
              done: true,
              ok: true,
              status: 0,
              raw,
              output: raw,
              result: {
                ok: true,
                raw,
                status: 0,
                session: {
                  mode: "privileged-exec",
                  prompt: "SW1#",
                },
              },
              session: {
                mode: "privileged-exec",
                prompt: "SW1#",
              },
            },
          };
        }

        throw new Error(`unexpected ${type}`);
      }),
    };

    const adapter = createRuntimeTerminalAdapter({
      bridge: bridge as never,
      generateId: () => "id-real-command",
      defaultTimeout: 45000,
    });

    const result = await adapter.runTerminalPlan(
      {
        id: "plan-real-command",
        device: "SW1",
        targetMode: "privileged-exec",
        steps: [{ kind: "command", command: "show ip interface brief" }],
        timeouts: { commandTimeoutMs: 30000, stallTimeoutMs: 15000 },
        policies: { autoAdvancePager: true },
        metadata: { deviceKind: "ios" },
      } as never,
      { timeoutMs: 45000 },
    );

    expect(result.ok).toBe(true);
    expect(result.output).toContain("Interface");
    expect(result.output).toContain("Vlan99");
    expect(result.output).not.toContain("OLD VERSION OUTPUT");
    expect((result.events[0] as any)?.command).toBe("show ip interface brief");
    expect(calls.map((call) => call.type)).toEqual(["terminal.plan.run", "__pollDeferred"]);
  });

  test("usa el intervalo diferido definido en metadata", async () => {
    const calls: Array<{ type: string; timeoutMs?: number; options?: unknown }> = [];

    const bridge = {
      sendCommandAndWait: vi.fn(async (type: string, _payload: unknown, timeoutMs?: number, options?: unknown) => {
        calls.push({ type, timeoutMs, options });

        if (type === "terminal.plan.run") {
          return {
            ok: true,
            status: 0,
            completedAt: Date.now(),
            value: { deferred: true, ticket: "ticket-4" },
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
      generateId: () => "id-4",
      defaultTimeout: 45000,
    });

    const result = await adapter.runTerminalPlan({
      id: "plan-4",
      device: "R1",
      metadata: { deferredPollIntervalMs: 120 },
      steps: [{ command: "show version" }],
    } as never);

    expect(result.ok).toBe(true);
    expect(calls.map((call) => call.type)).toEqual(["terminal.plan.run", "__pollDeferred"]);
    expect((result.evidence as any)?.timings?.adapter?.terminalPlanPollIntervalMs).toBe(120);
  });
});
