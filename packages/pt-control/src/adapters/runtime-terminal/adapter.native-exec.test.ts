import { describe, expect, test, vi } from "bun:test";

import { createRuntimeTerminalAdapter } from "./adapter.js";

describe("createRuntimeTerminalAdapter native fast path", () => {
  test("usa terminal.native.exec para show running-config IOS", async () => {
    const calls: Array<{ type: string; timeoutMs?: number; options?: unknown }> = [];

    const bridge = {
      sendCommandAndWait: vi.fn(async (type: string, payload: unknown, timeoutMs?: number, options?: unknown) => {
        calls.push({ type, timeoutMs, options });

        if (type === "terminal.native.exec") {
          return {
            ok: true,
            status: 0,
            completedAt: Date.now(),
            value: {
              ok: true,
              raw: "show running-config\nhostname SW1\nSW1#",
              output: "show running-config\nhostname SW1\nSW1#",
              status: 0,
              session: {
                modeBefore: "privileged-exec",
                modeAfter: "privileged-exec",
                promptBefore: "SW1#",
                promptAfter: "SW1#",
              },
              diagnostics: { completionReason: "stable-prompt", pagerAdvances: 5 },
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
      id: "plan-native",
      device: "SW1",
      targetMode: "privileged-exec",
      metadata: { deviceKind: "ios" },
      steps: [{ command: "show running-config" }],
    } as never);

    expect(result.ok).toBe(true);
    expect(calls.map((call) => call.type)).toEqual(["terminal.native.exec"]);
    expect(calls[0]?.options).toMatchObject({ resolveDeferred: false });
  });

  test("usa terminal.native.exec para un comando IOS de una línea que no sea show", async () => {
    const calls: Array<{ type: string; timeoutMs?: number; options?: unknown }> = [];

    const bridge = {
      sendCommandAndWait: vi.fn(async (type: string, payload: unknown, timeoutMs?: number, options?: unknown) => {
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
      metadata: { deviceKind: "ios" },
      steps: [{ command: "ping 1.1.1.1" }],
    } as never);

    expect(result.ok).toBe(true);
    expect(result.status).toBe(0);
    expect(result.output).toContain("Success rate is 100 percent");
    expect(calls.map((call) => call.type)).toEqual(["terminal.native.exec"]);
  });
});
