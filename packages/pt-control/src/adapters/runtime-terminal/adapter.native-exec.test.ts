import { describe, expect, test, vi } from "bun:test";

import { createRuntimeTerminalAdapter } from "./adapter.js";

describe("createRuntimeTerminalAdapter native fast path", () => {
  test("usa terminal.native.exec y hace polling si retorna deferred", async () => {
    const calls: Array<{ type: string; payload?: unknown; timeoutMs?: number; options?: unknown }> = [];

    const bridge = {
      sendCommandAndWait: vi.fn(async (type: string, payload: unknown, timeoutMs?: number, options?: unknown) => {
        calls.push({ type, payload, timeoutMs, options });

        if (type === "terminal.native.exec") {
          return {
            ok: true,
            status: 0,
            completedAt: Date.now(),
            value: {
              ok: true,
              deferred: true,
              ticket: "native-ticket-1",
            },
            timings: { submit: true },
          };
        }

        if (type === "__pollDeferred") {
          return {
            ok: true,
            status: 0,
            completedAt: Date.now(),
            value: {
              ok: true,
              done: true,
              status: 0,
              raw: "show running-config\nhostname SW1\nSW1#",
              output: "show running-config\nhostname SW1\nSW1#",
              session: {
                modeBefore: "privileged-exec",
                modeAfter: "privileged-exec",
                promptBefore: "SW1#",
                promptAfter: "SW1#",
              },
              diagnostics: { completionReason: "stable-prompt", statusCode: 0 },
            },
            timings: { poll: true },
          };
        }

        throw new Error(`unexpected ${type}`);
      }),
    };

    const adapter = createRuntimeTerminalAdapter({
      bridge: bridge as never,
      generateId: () => "id-native",
      defaultTimeout: 45000,
    });

    const result = await adapter.runTerminalPlan({
      id: "plan-native",
      device: "SW1",
      targetMode: "privileged-exec",
      metadata: { deviceKind: "ios", nativeExec: true },
      steps: [{ command: "show running-config" }],
    } as never);

    expect(result.ok).toBe(true);
    expect(result.status).toBe(0);
    expect(result.output).toContain("hostname SW1");
    expect(result.promptAfter).toBe("SW1#");
    expect(result.evidence).toMatchObject({ timings: { poll: true } });

    expect(calls.map((call) => call.type)).toEqual([
      "terminal.native.exec",
      "__pollDeferred",
    ]);
    expect(calls[0]?.options).toMatchObject({ resolveDeferred: false });
    expect(calls[1]?.options).toMatchObject({ resolveDeferred: false });
    expect(calls[1]?.payload).toMatchObject({ ticket: "native-ticket-1" });
  });

  test("sigue soportando respuesta nativa inmediata sin deferred", async () => {
    const calls: Array<{ type: string; timeoutMs?: number; options?: unknown }> = [];

    const bridge = {
      sendCommandAndWait: vi.fn(async (type: string, _payload: unknown, timeoutMs?: number, options?: unknown) => {
        calls.push({ type, timeoutMs, options });

        if (type === "terminal.native.exec") {
          return {
            ok: true,
            status: 0,
            completedAt: Date.now(),
            value: {
              ok: true,
              raw: "SW-SRV-DIST#ping 1.1.1.1\nSending 5, 100-byte ICMP Echos to 1.1.1.1\nSuccess rate is 100 percent",
              output: "SW-SRV-DIST#ping 1.1.1.1\nSending 5, 100-byte ICMP Echos to 1.1.1.1\nSuccess rate is 100 percent",
              status: 0,
              session: {
                modeBefore: "privileged-exec",
                modeAfter: "privileged-exec",
                promptBefore: "SW-SRV-DIST#",
                promptAfter: "SW-SRV-DIST#",
                paging: false,
                awaitingConfirm: false,
                kind: "ios",
              },
              diagnostics: { statusCode: 0, completionReason: "stable-prompt" },
            },
          };
        }

        throw new Error(`unexpected ${type}`);
      }),
    };

    const adapter = createRuntimeTerminalAdapter({
      bridge: bridge as never,
      generateId: () => "id-native",
      defaultTimeout: 45000,
    });

    const result = await adapter.runTerminalPlan({
      id: "plan-native-ping",
      device: "SW-SRV-DIST",
      targetMode: "privileged-exec",
      metadata: { deviceKind: "ios", nativeExec: true },
      steps: [{ command: "ping 1.1.1.1" }],
    } as never);

    expect(result.ok).toBe(true);
    expect(result.status).toBe(0);
    expect(result.output).toContain("Success rate is 100 percent");
    expect(calls.map((call) => call.type)).toEqual(["terminal.native.exec"]);
  });

  test("reporta timeout si native deferred nunca termina", async () => {
    let pollCount = 0;
    let now = 1_000_000;

    const dateNowSpy = vi.spyOn(Date, "now").mockImplementation(() => now);

    const bridge = {
      sendCommandAndWait: vi.fn(
        async (
          type: string,
          _payload: unknown,
          _timeoutMs?: number,
          _options?: unknown,
        ) => {
          if (type === "terminal.native.exec") {
            return {
              ok: true,
              status: 0,
              completedAt: Date.now(),
              value: {
                ok: true,
                deferred: true,
                ticket: "native-ticket-stalled",
              },
            };
          }

          if (type === "__pollDeferred") {
            pollCount++;
            now += 30_000;

            return {
              ok: true,
              status: 0,
              completedAt: Date.now(),
              value: {
                ok: true,
                deferred: true,
                done: false,
                ticket: "native-ticket-stalled",
                state: "waiting-command",
              },
            };
          }

          throw new Error(`unexpected ${type}`);
        },
      ),
    };

    try {
      const adapter = createRuntimeTerminalAdapter({
        bridge: bridge as never,
        generateId: () => "id-native",
        defaultTimeout: 60000,
      });

      const result = await adapter.runTerminalPlan(
        {
          id: "plan-native-stalled",
          device: "SW1",
          targetMode: "privileged-exec",
          metadata: { deviceKind: "ios", nativeExec: true },
          steps: [{ command: "show version" }],
          timeouts: {
            commandTimeoutMs: 100,
            stallTimeoutMs: 100,
          },
        } as never,
        { timeoutMs: 100 },
      );

      expect(result.ok).toBe(false);
      expect(result.status).toBe(1);
      expect(result.parsed).toMatchObject({
        code: "TERMINAL_NATIVE_DEFERRED_STALLED",
      });
      expect(pollCount).toBe(1);
    } finally {
      dateNowSpy.mockRestore();
    }
  });

  test("no usa terminal.native.exec por defecto para comandos IOS read-only", async () => {
    const calls: Array<{ type: string; payload: unknown }> = [];

    const bridge = {
      sendCommandAndWait: async (type: string, payload: unknown) => {
        calls.push({ type, payload });

        if (type === "terminal.plan.run") {
          return {
            value: {
              ok: true,
              deferred: true,
              ticket: "ticket-1",
            },
            timings: {},
          };
        }

        if (type === "__pollDeferred") {
          return {
            value: {
              ok: true,
              done: true,
              status: 0,
              raw: "SW1#show version\nCisco IOS Software\nSW1#",
              output: "SW1#show version\nCisco IOS Software\nSW1#",
              session: {
                mode: "privileged-exec",
                prompt: "SW1#",
              },
            },
            timings: {},
          };
        }

        throw new Error(`unexpected command type: ${type}`);
      },
    } as any;

    const adapter = createRuntimeTerminalAdapter({
      bridge,
      generateId: () => "plan-1",
    });

    const result = await adapter.runTerminalPlan(
      {
        id: "plan-1",
        device: "SW1",
        targetMode: "exec",
        steps: [{ kind: "command", command: "show version" }],
        timeouts: { commandTimeoutMs: 30000, stallTimeoutMs: 15000 },
        policies: { autoAdvancePager: true },
        metadata: { deviceKind: "ios" },
      } as any,
      { timeoutMs: 30000 },
    );

    expect(result.ok).toBe(true);
    expect(calls.map((call) => call.type)).toContain("terminal.plan.run");
    expect(calls.map((call) => call.type)).not.toContain("terminal.native.exec");
  });

  test("usa terminal.native.exec solo con opt-in explícito", async () => {
    const calls: Array<{ type: string; payload: unknown }> = [];

    const bridge = {
      sendCommandAndWait: async (type: string, payload: unknown) => {
        calls.push({ type, payload });

        if (type === "terminal.native.exec") {
          return {
            value: {
              ok: true,
              deferred: true,
              ticket: "native-ticket-1",
            },
            timings: {},
          };
        }

        if (type === "__pollDeferred") {
          return {
            value: {
              ok: true,
              done: true,
              status: 0,
              raw: "SW1#show version\nCisco IOS Software\nSW1#",
              output: "SW1#show version\nCisco IOS Software\nSW1#",
              session: {
                mode: "privileged-exec",
                prompt: "SW1#",
              },
            },
            timings: {},
          };
        }

        throw new Error(`unexpected command type: ${type}`);
      },
    } as any;

    const adapter = createRuntimeTerminalAdapter({
      bridge,
      generateId: () => "plan-1",
    });

    const result = await adapter.runTerminalPlan(
      {
        id: "plan-1",
        device: "SW1",
        targetMode: "exec",
        steps: [{ kind: "command", command: "show version" }],
        timeouts: { commandTimeoutMs: 30000, stallTimeoutMs: 15000 },
        policies: { autoAdvancePager: true },
        metadata: {
          deviceKind: "ios",
          nativeExec: true,
        },
      } as any,
      { timeoutMs: 30000 },
    );

    expect(result.ok).toBe(true);
    expect(calls.map((call) => call.type)).toContain("terminal.native.exec");
  });
});
