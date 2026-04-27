import { describe, expect, test, vi } from "bun:test";
import { createExecutionEngine } from "../../pt/kernel/execution-engine.js";
import { createDeferredJobPlan, commandStep } from "../../domain/deferred-job-plan.js";

describe("ExecutionEngine auto attach", () => {
  test("startJob adjunta el terminal antes de ejecutar el plan", async () => {
    const terminal = {
      attach: vi.fn(),
      detach: vi.fn(),
      getSession: vi.fn(),
      getMode: vi.fn(),
      isBusy: vi.fn(() => false),
      isAnyBusy: vi.fn(() => false),
      executeCommand: vi.fn().mockResolvedValue({
        ok: true,
        output: "output\n",
        status: 0,
        session: { mode: "privileged-exec", prompt: "R1#", paging: false, awaitingConfirm: false },
        mode: "privileged-exec",
      }),
      continuePager: vi.fn(),
      confirmPrompt: vi.fn(),
    } as any;

    const previousIpc = (globalThis as any).ipc;
    const previousDprint = (globalThis as any).dprint;

    (globalThis as any).ipc = {
      network: () => ({
        getDevice: (name: string) =>
          name === "R1"
            ? {
                getCommandLine: () => ({
                  registerEvent: vi.fn(),
                  unregisterEvent: vi.fn(),
                  enterCommand: vi.fn(),
                  enterChar: vi.fn(),
                }),
              }
            : null,
      }),
    };
    (globalThis as any).dprint = vi.fn();

    try {
      const engine = createExecutionEngine(terminal);
      const plan = createDeferredJobPlan("R1", [commandStep("show version")]);

      const job = engine.startJob(plan);

      expect(terminal.attach).toHaveBeenCalledTimes(1);
      expect(terminal.attach).toHaveBeenCalledWith(
        "R1",
        expect.objectContaining({ registerEvent: expect.any(Function) }),
      );
      expect(job.context.phase).not.toBe("error");
      expect(terminal.executeCommand).toHaveBeenCalledWith("R1", "show version", expect.any(Object));
    } finally {
      (globalThis as any).ipc = previousIpc;
      (globalThis as any).dprint = previousDprint;
    }
  });

  test("startJob falla explícitamente si no puede adjuntar terminal", () => {
    const terminal = {
      attach: vi.fn(),
      detach: vi.fn(),
      getSession: vi.fn(),
      getMode: vi.fn(),
      isBusy: vi.fn(() => false),
      isAnyBusy: vi.fn(() => false),
      executeCommand: vi.fn(),
      continuePager: vi.fn(),
      confirmPrompt: vi.fn(),
    } as any;

    const previousIpc = (globalThis as any).ipc;
    const previousDprint = (globalThis as any).dprint;

    (globalThis as any).ipc = {
      network: () => ({
        getDevice: () => ({
          getCommandLine: () => null,
        }),
      }),
    };
    (globalThis as any).dprint = vi.fn();

    try {
      const engine = createExecutionEngine(terminal);
      const plan = createDeferredJobPlan("R1", [commandStep("show version")]);

      const job = engine.startJob(plan);

      expect(job.context.phase).toBe("error");
      expect(job.context.finished).toBe(true);
      expect(job.context.errorCode).toBe("NO_TERMINAL_ATTACHED");
      expect(job.context.error).toContain("No terminal attached to R1");
      expect(terminal.executeCommand).not.toHaveBeenCalled();
    } finally {
      (globalThis as any).ipc = previousIpc;
      (globalThis as any).dprint = previousDprint;
    }
  });
});
