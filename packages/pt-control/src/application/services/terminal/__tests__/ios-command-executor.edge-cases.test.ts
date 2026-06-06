import { describe, expect, test, vi } from "bun:test";
import { createIosCommandExecutor } from "../ios-command-executor.js";

describe("IosCommandExecutor Edge Cases", () => {
  test("detecta IOS_PAGER_STUCK cuando el output contiene --More-- en un fallo", async () => {
    const executor = createIosCommandExecutor({
      generateId: () => "plan-pager",
      controller: {
        execIos: vi.fn(),
      },
      runtimeTerminal: {
        runTerminalPlan: async () => ({
          ok: false,
          output: "algun output previo...",
          rawOutput: "GigabitEthernet0/0 is up, line protocol is up\n --More-- ",
          status: 1,
          warnings: [],
          evidence: {},
        }),
        ensureSession: async () => ({ ok: true }) as any,
        pollTerminalJob: async () => null,
      } as any,
    });

    const result = await executor.executeIosCommand("SW1", "show interfaces");

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("IOS_PAGER_STUCK");
    expect(result.error?.message).toContain("--More--");
  });

  test("aplica timeout adaptativo mayor para comandos pesados", async () => {
    const runTerminalPlan = vi.fn().mockResolvedValue({ ok: true, output: "ok", status: 0 });
    const executor = createIosCommandExecutor({
      generateId: () => "plan-timeout",
      controller: {
        execIos: vi.fn(),
      },
      runtimeTerminal: {
        runTerminalPlan,
        ensureSession: async () => ({ ok: true }) as any,
        pollTerminalJob: async () => null,
      } as any,
    });

    await executor.executeIosCommand("R1", "show tech-support");

    // El primer argumento de runTerminalPlan es el plan
    const planSent = runTerminalPlan.mock.calls[0][0];
    // En el plan, los steps tienen 'timeout', no 'timeoutMs'
    expect(planSent.steps[0].timeout).toBeGreaterThanOrEqual(60000);
  });

  test("permite comando 'dir' en lote optimizado", async () => {
    const runTerminalPlan = vi.fn().mockResolvedValue({
      ok: true,
      stepResults: [
        { command: "dir", ok: true, status: 0, output: "files..." },
        { command: "show clock", ok: true, status: 0, output: "time..." }
      ]
    });
    const executor = createIosCommandExecutor({
      generateId: () => "plan-batch-dir",
      controller: {
        execIos: vi.fn(),
      },
      runtimeTerminal: {
        runTerminalPlan,
        ensureSession: async () => ({ ok: true }) as any,
        pollTerminalJob: async () => null,
      } as any,
    });

    const result = await executor.executeIosCommandBatchOptimized("R1", ["dir", "show clock"]);

    expect(result).not.toBeNull();
    expect(result?.ok).toBe(true);
    expect(runTerminalPlan).toHaveBeenCalled();
  });
});
