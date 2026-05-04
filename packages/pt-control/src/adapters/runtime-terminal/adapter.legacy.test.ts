import { describe, expect, test, vi } from "bun:test";

import { createRuntimeTerminalAdapter } from "./adapter.js";

describe("createRuntimeTerminalAdapter legacy fallback", () => {
  test("fallback a legacy cuando terminal.plan.run no está soportado", async () => {
    const calls: Array<{ type: string }> = [];

    const bridge = {
      sendCommandAndWait: vi.fn(async (type: string) => {
        calls.push({ type });

        if (type === "terminal.plan.run") {
          return {
            ok: true,
            status: 0,
            completedAt: Date.now(),
            value: {
              error: "Unknown command 'terminal.plan.run'",
            },
          };
        }

        if (type === "execIos") {
          return {
            ok: true,
            status: 0,
            completedAt: Date.now(),
            value: {
              raw: "R1#show version\nCisco IOS\nR1#",
              output: "Cisco IOS",
              parsed: { modeBefore: "user-exec", modeAfter: "privileged-exec" },
            },
          };
        }

        throw new Error(`unexpected ${type}`);
      }),
    };

    const adapter = createRuntimeTerminalAdapter({
      bridge: bridge as never,
      generateId: () => "id-1",
      defaultTimeout: 30000,
    });

    const result = await adapter.runTerminalPlan({
      id: "plan-1",
      device: "R1",
      steps: [{ command: "show version" }],
    } as never);

    expect(result.ok).toBe(true);
    expect(calls.map((c) => c.type)).toContain("execIos");
  });

  test("ensureSession retorna sesion valida", async () => {
    const bridge = {
      sendCommandAndWait: vi.fn(),
    };

    const adapter = createRuntimeTerminalAdapter({
      bridge: bridge as never,
      generateId: () => "id-1",
    });

    const result = await adapter.ensureSession("R1");

    expect(result.ok).toBe(true);
    expect(result.sessionId).toBe("terminal:R1");
  });

  test("ensureSession falla con device vacio", async () => {
    const bridge = {
      sendCommandAndWait: vi.fn(),
    };

    const adapter = createRuntimeTerminalAdapter({
      bridge: bridge as never,
      generateId: () => "id-1",
    });

    const result = await adapter.ensureSession("");

    expect(result.ok).toBe(false);
    expect(result.error).toContain("obligatorio");
  });

  test("pollTerminalJob lanza error indicando que no esta habilitado", async () => {
    const bridge = {
      sendCommandAndWait: vi.fn(),
    };

    const adapter = createRuntimeTerminalAdapter({
      bridge: bridge as never,
      generateId: () => "id-1",
    });

    await expect(adapter.pollTerminalJob("job-1")).rejects.toThrow("pollTerminalJob");
  });
});