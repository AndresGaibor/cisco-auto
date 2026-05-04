import { describe, expect, test, vi } from "bun:test";

import { createRuntimeTerminalAdapter } from "./adapter.js";

describe("createRuntimeTerminalAdapter plan-run transport", () => {
  test("submit timeout se calcula correctamente para planes cortos", async () => {
    const calls: Array<{ type: string; timeoutMs?: number }> = [];

    const bridge = {
      sendCommandAndWait: vi.fn(async (type: string, _payload: unknown, timeoutMs?: number) => {
        calls.push({ type, timeoutMs });
        return {
          ok: true,
          status: 0,
          completedAt: Date.now(),
          value: {
            ok: true,
            output: "R1#show version\nCisco IOS\nR1#",
            session: { mode: "privileged-exec", prompt: "R1#" },
            diagnostics: { statusCode: 0 },
          },
        };
      }),
    };

    const adapter = createRuntimeTerminalAdapter({
      bridge: bridge as never,
      generateId: () => "id-1",
      defaultTimeout: 45000,
    });

    await adapter.runTerminalPlan({
      id: "plan-1",
      device: "R1",
      steps: [{ command: "show version" }],
    } as never);

    expect(calls[0]?.type).toBe("terminal.plan.run");
    expect(calls[0]?.timeoutMs).toBeGreaterThanOrEqual(15000);
    expect(calls[0]?.timeoutMs).toBeLessThanOrEqual(30000);
  });

  test("terminal.plan.run recibe resolveDeferred:false", async () => {
    const calls: Array<{ type: string; options?: unknown }> = [];

    const bridge = {
      sendCommandAndWait: vi.fn(async (type: string, _payload: unknown, _timeoutMs?: number, options?: unknown) => {
        calls.push({ type, options });
        return {
          ok: true,
          status: 0,
          completedAt: Date.now(),
          value: {
            ok: true,
            output: "R1#show version\nCisco IOS\nR1#",
            session: { mode: "privileged-exec", prompt: "R1#" },
          },
        };
      }),
    };

    const adapter = createRuntimeTerminalAdapter({
      bridge: bridge as never,
      generateId: () => "id-1",
      defaultTimeout: 45000,
    });

    await adapter.runTerminalPlan({
      id: "plan-1",
      device: "R1",
      steps: [{ command: "show version" }],
    } as never);

    expect(calls[0]?.type).toBe("terminal.plan.run");
    expect(calls[0]?.options).toMatchObject({ resolveDeferred: false });
  });

  test("respuesta inmediata sin deferred se procesa correctamente", async () => {
    const bridge = {
      sendCommandAndWait: vi.fn(async () => ({
        ok: true,
        status: 0,
        completedAt: Date.now(),
        value: {
          ok: true,
          output: "R1#show version\nCisco IOS Software\nR1#",
          session: { modeBefore: "user-exec", modeAfter: "privileged-exec", promptBefore: "R1>", promptAfter: "R1#" },
          diagnostics: { completionReason: "completed", statusCode: 0 },
        },
      })),
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
    expect(result.output).toContain("Cisco IOS");
    expect(result.status).toBe(0);
    expect(result.promptAfter).toBe("R1#");
    expect(result.confidence).toBe(1);
  });

  test("respuesta fallida con ok:false retorna fallo", async () => {
    const bridge = {
      sendCommandAndWait: vi.fn(async () => ({
        ok: true,
        status: 1,
        completedAt: Date.now(),
        value: {
          ok: false,
          output: "% Invalid input detected",
          session: { mode: "privileged-exec", prompt: "R1#" },
          diagnostics: { statusCode: 1 },
          error: "% Invalid input detected at '^' marker.",
        },
      })),
    };

    const adapter = createRuntimeTerminalAdapter({
      bridge: bridge as never,
      generateId: () => "id-1",
      defaultTimeout: 45000,
    });

    const result = await adapter.runTerminalPlan({
      id: "plan-1",
      device: "R1",
      steps: [{ command: "invalid command" }],
    } as never);

    expect(result.ok).toBe(false);
    expect(result.status).toBe(1);
    expect(result.confidence).toBe(0);
  });
});