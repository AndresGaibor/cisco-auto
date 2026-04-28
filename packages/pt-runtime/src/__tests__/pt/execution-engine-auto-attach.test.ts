import { describe, expect, test, vi } from "bun:test";
import { createExecutionEngine } from "../../pt/kernel/execution-engine.js";
import { createDeferredJobPlan, commandStep, ensureModeStep } from "../../domain/deferred-job-plan.js";

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

  test("startJob completa ensure-mode aunque el status no sea cero si el modo llegó", async () => {
    const terminal = {
      attach: vi.fn(),
      detach: vi.fn(),
      getSession: vi.fn(),
      getMode: vi.fn(),
      isBusy: vi.fn(() => false),
      isAnyBusy: vi.fn(() => false),
      executeCommand: vi.fn().mockResolvedValue({
        ok: true,
        output: "enable\n",
        status: 1,
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
        getDevice: () => ({
          getCommandLine: () => ({
            registerEvent: vi.fn(),
            unregisterEvent: vi.fn(),
            enterCommand: vi.fn(),
            enterChar: vi.fn(),
          }),
        }),
      }),
    };
    (globalThis as any).dprint = vi.fn();

    try {
      const engine = createExecutionEngine(terminal);
      const plan = createDeferredJobPlan("R1", [ensureModeStep("privileged-exec")]);

      const job = engine.startJob(plan);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(job.context.phase).toBe("completed");
      expect(job.context.finished).toBe(true);
      expect(job.context.errorCode).toBeNull();
      expect(job.context.error).toBeNull();
      expect(terminal.executeCommand).toHaveBeenCalledTimes(1);
    } finally {
      (globalThis as any).ipc = previousIpc;
      (globalThis as any).dprint = previousDprint;
    }
  });

  test("startJob usa end para salir de config antes de elevar privilegios", async () => {
    const terminal = {
      attach: vi.fn(),
      detach: vi.fn(),
      getSession: vi.fn(() => ({ mode: "config-if", prompt: "R1(config-if)#", paging: false, awaitingConfirm: false })),
      getMode: vi.fn(),
      isBusy: vi.fn(() => false),
      isAnyBusy: vi.fn(() => false),
      executeCommand: vi.fn().mockResolvedValue({
        ok: true,
        output: "end\n",
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
        getDevice: () => ({
          getCommandLine: () => ({
            registerEvent: vi.fn(),
            unregisterEvent: vi.fn(),
            enterCommand: vi.fn(),
            enterChar: vi.fn(),
          }),
        }),
      }),
    };
    (globalThis as any).dprint = vi.fn();

    try {
      const engine = createExecutionEngine(terminal);
      const plan = createDeferredJobPlan("R1", [ensureModeStep("privileged-exec")]);

      const job = engine.startJob(plan);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(terminal.executeCommand).toHaveBeenCalledTimes(1);
      expect(terminal.executeCommand).toHaveBeenCalledWith(
        "R1",
        "end",
        expect.objectContaining({ commandTimeoutMs: 8000 }),
      );
      expect(job.context.phase).not.toBe("error");
    } finally {
      (globalThis as any).ipc = previousIpc;
      (globalThis as any).dprint = previousDprint;
    }
  });

  test("despierta jobs pendientes del mismo device cuando termina el anterior", async () => {
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
        getDevice: () => ({
          getCommandLine: () => ({
            registerEvent: vi.fn(),
            unregisterEvent: vi.fn(),
            enterCommand: vi.fn(),
            enterChar: vi.fn(),
          }),
        }),
      }),
    };
    (globalThis as any).dprint = vi.fn();

    try {
      const engine = createExecutionEngine(terminal);
      const planA = createDeferredJobPlan("R1", [commandStep("show version")]);
      const planB = createDeferredJobPlan("R1", [commandStep("show ip interface brief")]);

      engine.startJob(planA);
      engine.startJob(planB);

      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(terminal.executeCommand).toHaveBeenCalledTimes(2);
      expect(terminal.executeCommand).toHaveBeenNthCalledWith(1, "R1", "show version", expect.any(Object));
      expect(terminal.executeCommand).toHaveBeenNthCalledWith(2, "R1", "show ip interface brief", expect.any(Object));
    } finally {
      (globalThis as any).ipc = previousIpc;
      (globalThis as any).dprint = previousDprint;
    }
  });

  test("startJob limpia config con end cuando un comando falla", async () => {
    const terminal = {
      attach: vi.fn(),
      detach: vi.fn(),
      getSession: vi.fn(() => ({ mode: "config-if", prompt: "R1(config-if)#", paging: false, awaitingConfirm: false })),
      getMode: vi.fn(),
      isBusy: vi.fn(() => false),
      isAnyBusy: vi.fn(() => false),
      executeCommand: vi.fn().mockResolvedValue({
        ok: false,
        output: "% Invalid input detected at '^' marker.\n",
        status: 1,
        session: { mode: "config-if", prompt: "R1(config-if)#", paging: false, awaitingConfirm: false },
        mode: "config-if",
      }),
      continuePager: vi.fn(),
      confirmPrompt: vi.fn(),
    } as any;

    const previousIpc = (globalThis as any).ipc;
    const previousDprint = (globalThis as any).dprint;

    (globalThis as any).ipc = {
      network: () => ({
        getDevice: () => ({
          getCommandLine: () => ({
            registerEvent: vi.fn(),
            unregisterEvent: vi.fn(),
            enterCommand: vi.fn(),
            enterChar: vi.fn(),
          }),
        }),
      }),
    };
    (globalThis as any).dprint = vi.fn();

    try {
      const engine = createExecutionEngine(terminal);
      const plan = createDeferredJobPlan("R1", [commandStep("show version")]);

      const job = engine.startJob(plan);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(job.context.phase).toBe("error");
      expect(job.context.errorCode).toBe("CMD_FAILED");
      expect(terminal.executeCommand).toHaveBeenNthCalledWith(
        1,
        "R1",
        "show version",
        expect.any(Object),
      );
      expect(terminal.executeCommand).toHaveBeenNthCalledWith(
        2,
        "R1",
        "end",
        expect.objectContaining({ autoConfirm: false, allowPager: false }),
      );
    } finally {
      (globalThis as any).ipc = previousIpc;
      (globalThis as any).dprint = previousDprint;
    }
  });
});
