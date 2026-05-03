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
      const plan = createDeferredJobPlan("R1", [commandStep("show version")], {
        targetMode: "privileged-exec",
      } as any);
      (plan as any).targetMode = "privileged-exec";

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
      executeCommand: vi.fn().mockReturnValue(new Promise(() => {})),
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
      const plan = createDeferredJobPlan("R1", [commandStep("show version")], {
        targetMode: "privileged-exec",
      } as any);
      (plan as any).targetMode = "privileged-exec";

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

  test("startJob habilita pager en comandos normales", async () => {
    const terminal = {
      attach: vi.fn(),
      detach: vi.fn(),
      getSession: vi.fn(),
      getMode: vi.fn(),
      isBusy: vi.fn(() => false),
      isAnyBusy: vi.fn(() => false),
      executeCommand: vi.fn().mockResolvedValue({
        ok: true,
        output: "show version\n",
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
      const plan = createDeferredJobPlan("R1", [commandStep("show version")]);

      engine.startJob(plan);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(terminal.executeCommand).toHaveBeenCalledWith(
        "R1",
        "show version",
        expect.objectContaining({
          allowPager: true,
          autoAdvancePager: true,
          maxPagerAdvances: 25,
        }),
      );
    } finally {
      (globalThis as any).ipc = previousIpc;
      (globalThis as any).dprint = previousDprint;
    }
  });

  test("startJob propaga maxPagerAdvances desde policies del plan", async () => {
    const terminal = {
      attach: vi.fn(),
      detach: vi.fn(),
      getSession: vi.fn(),
      getMode: vi.fn(),
      isBusy: vi.fn(() => false),
      isAnyBusy: vi.fn(() => false),
      executeCommand: vi.fn().mockResolvedValue({
        ok: true,
        output: "show interfaces\n",
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
      const plan = createDeferredJobPlan("R1", [commandStep("show interfaces")]);

      (plan as any).payload = {
        ...((plan as any).payload ?? {}),
        policies: {
          maxPagerAdvances: 120,
        },
      };

      engine.startJob(plan);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(terminal.executeCommand).toHaveBeenCalledWith(
        "R1",
        "show interfaces",
        expect.objectContaining({
          allowPager: true,
          autoAdvancePager: true,
          maxPagerAdvances: 120,
        }),
      );
    } finally {
      (globalThis as any).ipc = previousIpc;
      (globalThis as any).dprint = previousDprint;
    }
  });

  test("reapStaleJobs rescata un comando atascado desde el terminal nativo", async () => {
    let outputPhase = 0;
    const nativeTerminal = {
      registerEvent: vi.fn(),
      unregisterEvent: vi.fn(),
      enterCommand: vi.fn(),
      enterChar: vi.fn(),
      getCommandInput: vi.fn(() => " "),
      getAllOutput: vi.fn(() => {
        outputPhase += 1;
        return outputPhase === 1 ? "Router#" : "Router#show version\nCisco IOS Software\nRouter#";
      }),
      getPrompt: vi.fn(() => "Router#"),
      getMode: vi.fn(() => "enable"),
    } as any;

    const terminal = {
      attach: vi.fn(),
      detach: vi.fn(),
      getSession: vi.fn(),
      getMode: vi.fn(),
      isBusy: vi.fn(() => false),
      isAnyBusy: vi.fn(() => false),
      executeCommand: vi.fn().mockReturnValue(new Promise(() => {})),
      continuePager: vi.fn(),
      confirmPrompt: vi.fn(),
    } as any;

    const previousIpc = (globalThis as any).ipc;
    const previousDprint = (globalThis as any).dprint;

    (globalThis as any).ipc = {
      network: () => ({
        getDevice: () => ({
          getCommandLine: () => nativeTerminal,
        }),
      }),
    };
    (globalThis as any).dprint = vi.fn();

    try {
      const engine = createExecutionEngine(terminal);
      const plan = createDeferredJobPlan("R1", [commandStep("show version")]);
      const job = engine.startJob(plan);

      job.context.updatedAt = Date.now() - 1000;

      const refreshed = engine.getJob(job.id);

      expect(refreshed?.context.finished).toBe(true);
      expect(refreshed?.context.phase).toBe("completed");
      expect(refreshed?.context.stepResults).toHaveLength(1);
      expect(refreshed?.context.outputBuffer).toContain("Cisco IOS Software");
      expect(nativeTerminal.enterChar).toHaveBeenCalledWith(13, 0);
      expect((refreshed?.context as any).debug).toEqual(
        expect.arrayContaining([
          expect.stringContaining("native-tick reason=getJob"),
          expect.stringContaining("native-output-len="),
          expect.stringContaining("native-check command=\"show version\""),
          expect.stringContaining("complete=true"),
        ]),
      );
    } finally {
      (globalThis as any).ipc = previousIpc;
      (globalThis as any).dprint = previousDprint;
    }
  });

  test("reapStaleJobs usa solo el delta del step actual y no el historial viejo", async () => {
    let outputPhase = 0;
    const nativeTerminal = {
      registerEvent: vi.fn(),
      unregisterEvent: vi.fn(),
      enterCommand: vi.fn(),
      enterChar: vi.fn(),
      getCommandInput: vi.fn(() => " "),
      getAllOutput: vi.fn(() => {
        outputPhase += 1;
        return outputPhase === 1
          ? ["show version", "Cisco IOS Software", "Router#"].join("\n")
          : ["show version", "Cisco IOS Software", "Router#", "Router#"].join("\n");
      }),
      getPrompt: vi.fn(() => "Router#"),
      getMode: vi.fn(() => "enable"),
    } as any;

    const terminal = {
      attach: vi.fn(),
      detach: vi.fn(),
      getSession: vi.fn(),
      getMode: vi.fn(),
      isBusy: vi.fn(() => false),
      isAnyBusy: vi.fn(() => false),
      executeCommand: vi.fn().mockReturnValue(new Promise(() => {})),
      continuePager: vi.fn(),
      confirmPrompt: vi.fn(),
    } as any;

    const previousIpc = (globalThis as any).ipc;
    const previousDprint = (globalThis as any).dprint;

    (globalThis as any).ipc = {
      network: () => ({
        getDevice: () => ({
          getCommandLine: () => nativeTerminal,
        }),
      }),
    };
    (globalThis as any).dprint = vi.fn();

    try {
      const engine = createExecutionEngine(terminal);
      const plan = createDeferredJobPlan("R1", [commandStep("show version")]);
      const job = engine.startJob(plan);

      (job.context as any).nativeBaselineOutput = ["show version", "Cisco IOS Software", "Router#"].join("\n");
      (job.context as any).nativeBaselineStep = job.context.currentStep;
      job.context.updatedAt = Date.now() - 1000;

      const context = engine.getJobState(job.id);

      expect(context?.finished).toBe(false);
      expect(context?.phase).toBe("waiting-command");
      expect((context as any)?.debug).toEqual(
        expect.arrayContaining([
          expect.stringContaining("native-tick reason=getJobState"),
          expect.stringContaining("deltaLen="),
        ]),
      );
    } finally {
      (globalThis as any).ipc = previousIpc;
      (globalThis as any).dprint = previousDprint;
    }
  });

  test("native fallback completa shows largos aunque el eco del comando ya no esté en el buffer", async () => {
    let outputPhase = 0;

    const nativeTerminal = {
      registerEvent: vi.fn(),
      unregisterEvent: vi.fn(),
      enterCommand: vi.fn(),
      enterChar: vi.fn(),
      getCommandInput: vi.fn(() => ""),
      getAllOutput: vi.fn(() => {
        outputPhase += 1;

        if (outputPhase === 1) {
          return "SW-SRV-DIST#";
        }

        return [
          "FastEthernet0/24 is down, line protocol is down",
          "  Hardware is Lance, address is 0060.5c93.4501",
          "  MTU 1500 bytes, BW 100000 Kbit",
          "  5 minute input rate 0 bits/sec, 0 packets/sec",
          "GigabitEthernet0/1 is up, line protocol is up (connected)",
          "  Hardware is Lance, address is 0060.5c93.4519",
          "  MTU 1500 bytes, BW 1000000 Kbit",
          "SW-SRV-DIST#",
        ].join("\n");
      }),
      getPrompt: vi.fn(() => "SW-SRV-DIST#"),
      getMode: vi.fn(() => "enable"),
    } as any;

    const terminal = {
      attach: vi.fn(),
      detach: vi.fn(),
      getSession: vi.fn(),
      getMode: vi.fn(),
      isBusy: vi.fn(() => false),
      isAnyBusy: vi.fn(() => false),
      executeCommand: vi.fn().mockReturnValue(new Promise(() => {})),
      continuePager: vi.fn(),
      confirmPrompt: vi.fn(),
    } as any;

    const previousIpc = (globalThis as any).ipc;
    const previousDprint = (globalThis as any).dprint;

    (globalThis as any).ipc = {
      network: () => ({
        getDevice: () => ({
          getCommandLine: () => nativeTerminal,
        }),
      }),
    };
    (globalThis as any).dprint = vi.fn();

    try {
      const engine = createExecutionEngine(terminal);
      const plan = createDeferredJobPlan("SW-SRV-DIST", [commandStep("show interfaces")]);
      const job = engine.startJob(plan);

      job.context.updatedAt = Date.now() - 1000;

      const refreshed = engine.getJob(job.id);

      expect(refreshed?.context.finished).toBe(true);
      expect(refreshed?.context.phase).toBe("completed");
      expect(refreshed?.context.result?.ok).toBe(true);
      expect(String(refreshed?.context.result?.output ?? "")).toContain("GigabitEthernet0/1");
      expect(String(refreshed?.context.result?.output ?? "")).not.toContain("JOB_TIMEOUT");
    } finally {
      (globalThis as any).ipc = previousIpc;
      (globalThis as any).dprint = previousDprint;
    }
  });

  test("native fallback marca show interfaces parcial cuando completa sin eco y sin encabezado inicial", async () => {
    const nativeTerminal = {
      registerEvent: vi.fn(),
      unregisterEvent: vi.fn(),
      enterCommand: vi.fn(),
      enterChar: vi.fn(),
      getCommandInput: vi.fn(() => ""),
      getAllOutput: vi.fn(() =>
        [
          "Queueing strategy: fifo",
          "Output queue: 0/40",
          "ARP type: ARPA, ARP Timeout 04:00:00",
          "SW-SRV-DIST#",
        ].join("\n"),
      ),
      getPrompt: vi.fn(() => "SW-SRV-DIST#"),
      getMode: vi.fn(() => "enable"),
    } as any;

    const terminal = {
      attach: vi.fn(),
      detach: vi.fn(),
      getSession: vi.fn(),
      getMode: vi.fn(),
      isBusy: vi.fn(() => false),
      isAnyBusy: vi.fn(() => false),
      executeCommand: vi.fn().mockReturnValue(new Promise(() => {})),
      continuePager: vi.fn(),
      confirmPrompt: vi.fn(),
    } as any;

    const previousIpc = (globalThis as any).ipc;
    const previousDprint = (globalThis as any).dprint;

    (globalThis as any).ipc = {
      network: () => ({
        getDevice: () => ({
          getCommandLine: () => nativeTerminal,
        }),
      }),
    };
    (globalThis as any).dprint = vi.fn();

    try {
      const engine = createExecutionEngine(terminal);
      const plan = createDeferredJobPlan("SW-SRV-DIST", [commandStep("show interfaces")]);
      const job = engine.startJob(plan);

      job.context.updatedAt = Date.now() - 1000;
      const refreshed = engine.getJob(job.id);

      expect(refreshed?.context.finished).toBe(true);
      expect(refreshed?.context.phase).toBe("completed");
      expect(refreshed?.context.result?.ok).toBe(true);
      expect((refreshed?.context.result as any)?.warnings).toContain(
        "Output posiblemente parcial: el comando largo terminó sin eco ni encabezado inicial esperado.",
      );
      expect((refreshed?.context.result as any)?.diagnostics?.partialOutput).toBe(true);
    } finally {
      (globalThis as any).ipc = previousIpc;
      (globalThis as any).dprint = previousDprint;
    }
  });

  test("native fallback marca show interfaces parcial aunque exista eco si empieza con tail", async () => {
    const nativeTerminal = {
      registerEvent: vi.fn(),
      unregisterEvent: vi.fn(),
      enterCommand: vi.fn(),
      enterChar: vi.fn(),
      getCommandInput: vi.fn(() => ""),
      getAllOutput: vi.fn(() =>
        [
          "SW-SRV-DIST>show interfaces",
          "2357 packets output, 263570 bytes, 0 underruns",
          "     0 output errors, 0 collisions, 10 interface resets",
          "",
          "FastEthernet0/22 is down, line protocol is down (disabled)",
          "SW-SRV-DIST>",
        ].join("\n"),
      ),
      getPrompt: vi.fn(() => "SW-SRV-DIST>"),
      getMode: vi.fn(() => "user"),
    } as any;

    const terminal = {
      attach: vi.fn(),
      detach: vi.fn(),
      getSession: vi.fn(),
      getMode: vi.fn(),
      isBusy: vi.fn(() => false),
      isAnyBusy: vi.fn(() => false),
      executeCommand: vi.fn().mockReturnValue(new Promise(() => {})),
      continuePager: vi.fn(),
      confirmPrompt: vi.fn(),
    } as any;

    const previousIpc = (globalThis as any).ipc;
    const previousDprint = (globalThis as any).dprint;

    (globalThis as any).ipc = {
      network: () => ({
        getDevice: () => ({
          getCommandLine: () => nativeTerminal,
        }),
      }),
    };
    (globalThis as any).dprint = vi.fn();

    try {
      const engine = createExecutionEngine(terminal);
      const plan = createDeferredJobPlan("SW-SRV-DIST", [commandStep("show interfaces")]);
      const job = engine.startJob(plan);

      job.context.updatedAt = Date.now() - 1000;
      const refreshed = engine.getJob(job.id);

      expect(refreshed?.context.finished).toBe(true);
      expect(refreshed?.context.phase).toBe("completed");
      expect(refreshed?.context.result?.ok).toBe(true);
      expect((refreshed?.context.result as any)?.warnings).toContain(
        "Output posiblemente parcial: el comando largo terminó sin eco ni encabezado inicial esperado.",
      );
      expect((refreshed?.context.result as any)?.diagnostics?.partialOutput).toBe(true);
    } finally {
      (globalThis as any).ipc = previousIpc;
      (globalThis as any).dprint = previousDprint;
    }
  });

  test("getJobState rescata un job aunque pendingCommand sea null", () => {
    let outputPhase = 0;
    const nativeTerminal = {
      registerEvent: vi.fn(),
      unregisterEvent: vi.fn(),
      enterCommand: vi.fn(),
      enterChar: vi.fn(),
      getAllOutput: vi.fn(() => {
        outputPhase += 1;
        return outputPhase === 1 ? "Router#" : "Router#show version\nCisco IOS Software\nRouter#";
      }),
      getPrompt: vi.fn(() => "Router#"),
      getMode: vi.fn(() => "enable"),
    } as any;

    const terminal = {
      attach: vi.fn(),
      detach: vi.fn(),
      getSession: vi.fn(),
      getMode: vi.fn(),
      isBusy: vi.fn(() => false),
      isAnyBusy: vi.fn(() => false),
      executeCommand: vi.fn().mockReturnValue(new Promise(() => {})),
      continuePager: vi.fn(),
      confirmPrompt: vi.fn(),
    } as any;

    const previousIpc = (globalThis as any).ipc;
    const previousDprint = (globalThis as any).dprint;

    (globalThis as any).ipc = {
      network: () => ({
        getDevice: () => ({
          getCommandLine: () => nativeTerminal,
        }),
      }),
    };
    (globalThis as any).dprint = vi.fn();

    try {
      const engine = createExecutionEngine(terminal);
      const plan = createDeferredJobPlan("R1", [commandStep("show version")]);
      const job = engine.startJob(plan);

      job.pendingCommand = null;
      job.context.waitingForCommandEnd = true;
      job.context.phase = "waiting-command";
      job.context.updatedAt = Date.now() - 1000;

      const context = engine.getJobState(job.id);

      expect(context?.finished).toBe(true);
      expect(context?.phase).toBe("completed");
      expect(context?.debug).toEqual(
        expect.arrayContaining([
          expect.stringContaining("native-tick reason=getJobState"),
        ]),
      );
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

  test("native force-complete no finaliza un auto-config si sigue en config-if", async () => {
    const nativeTerminal = {
      registerEvent: vi.fn(),
      unregisterEvent: vi.fn(),
      enterCommand: vi.fn(),
      enterChar: vi.fn(),
      getCommandInput: vi.fn(() => ""),
      getAllOutput: vi.fn(() => "description TEST\nSW1(config-if)#"),
      getPrompt: vi.fn(() => "SW1(config-if)#"),
      getMode: vi.fn(() => "config"),
    } as any;

    const terminal = {
      attach: vi.fn(),
      detach: vi.fn(),
      getSession: vi.fn(),
      getMode: vi.fn(),
      isBusy: vi.fn(() => false),
      isAnyBusy: vi.fn(() => false),
      executeCommand: vi.fn().mockReturnValue(new Promise(() => {})),
      continuePager: vi.fn(),
      confirmPrompt: vi.fn(),
    } as any;

    const previousIpc = (globalThis as any).ipc;
    const previousDprint = (globalThis as any).dprint;

    (globalThis as any).ipc = {
      network: () => ({
        getDevice: () => ({
          getCommandLine: () => nativeTerminal,
        }),
      }),
    };
    (globalThis as any).dprint = vi.fn();

    try {
      const engine = createExecutionEngine(terminal);
      const plan = createDeferredJobPlan("SW1", [commandStep("description TEST")], {
        targetMode: "privileged-exec",
      } as any);
      (plan as any).targetMode = "privileged-exec";

      const job = engine.startJob(plan);
      job.context.updatedAt = Date.now() - 1000;

      const context = engine.getJobState(job.id);

      expect(context?.finished).toBe(false);
      expect(context?.phase).not.toBe("completed");
      expect(context?.currentStep).toBe(0);
      expect(context?.stepResults).toHaveLength(0);
    } finally {
      (globalThis as any).ipc = previousIpc;
      (globalThis as any).dprint = previousDprint;
    }
  });

  test("native fallback completa end cuando el prompt final ya es privileged-exec", async () => {
    let outputPhase = 0;
    const nativeTerminal = {
      registerEvent: vi.fn(),
      unregisterEvent: vi.fn(),
      enterCommand: vi.fn(),
      enterChar: vi.fn(),
      getCommandInput: vi.fn(() => ""),
      getAllOutput: vi.fn(() => {
        outputPhase += 1;
        return outputPhase === 1 ? "SW1(config-if)#" : "SW1(config-if)#end\nSW1#";
      }),
      getPrompt: vi.fn(() => "SW1#"),
      getMode: vi.fn(() => "privileged-exec"),
    } as any;

    const terminal = {
      attach: vi.fn(),
      detach: vi.fn(),
      getSession: vi.fn(),
      getMode: vi.fn(),
      isBusy: vi.fn(() => false),
      isAnyBusy: vi.fn(() => false),
      executeCommand: vi.fn().mockReturnValue(new Promise(() => {})),
      continuePager: vi.fn(),
      confirmPrompt: vi.fn(),
    } as any;

    const previousIpc = (globalThis as any).ipc;
    const previousDprint = (globalThis as any).dprint;

    (globalThis as any).ipc = {
      network: () => ({
        getDevice: () => ({
          getCommandLine: () => nativeTerminal,
        }),
      }),
    };
    (globalThis as any).dprint = vi.fn();

    try {
      const engine = createExecutionEngine(terminal);
      const plan = createDeferredJobPlan("SW1", [commandStep("end")], {
        targetMode: "privileged-exec",
      } as any);
      (plan as any).targetMode = "privileged-exec";

      const job = engine.startJob(plan);
      job.context.updatedAt = Date.now() - 1000;

      const context = engine.getJobState(job.id);

      expect(context?.finished).toBe(true);
      expect(context?.phase).toBe("completed");
      expect(context?.currentStep).toBe(1);
      expect(context?.stepResults).toHaveLength(1);
      expect(String(context?.outputBuffer || "")).toContain("end\nSW1#");
      expect(String(context?.lastPrompt || "")).toBe("SW1#");
    } finally {
      (globalThis as any).ipc = previousIpc;
      (globalThis as any).dprint = previousDprint;
    }
  });

  test("native fallback completa disable cuando solo hay eco y prompt de usuario", async () => {
    let outputPhase = 0;
    const nativeTerminal = {
      registerEvent: vi.fn(),
      unregisterEvent: vi.fn(),
      enterCommand: vi.fn(),
      enterChar: vi.fn(),
      getCommandInput: vi.fn(() => ""),
      getAllOutput: vi.fn(() => {
        outputPhase += 1;
        return outputPhase === 1 ? "SW-SRV-DIST>" : "disable\nSW-SRV-DIST>";
      }),
      getPrompt: vi.fn(() => "SW-SRV-DIST>"),
      getMode: vi.fn(() => "user-exec"),
    } as any;

    const terminal = {
      attach: vi.fn(),
      detach: vi.fn(),
      getSession: vi.fn(),
      getMode: vi.fn(),
      isBusy: vi.fn(() => false),
      isAnyBusy: vi.fn(() => false),
      executeCommand: vi.fn().mockReturnValue(new Promise(() => {})),
      continuePager: vi.fn(),
      confirmPrompt: vi.fn(),
    } as any;

    const previousIpc = (globalThis as any).ipc;
    const previousDprint = (globalThis as any).dprint;

    (globalThis as any).ipc = {
      network: () => ({
        getDevice: () => ({
          getCommandLine: () => nativeTerminal,
        }),
      }),
    };
    (globalThis as any).dprint = vi.fn();

    try {
      const engine = createExecutionEngine(terminal);
      const plan = createDeferredJobPlan("SW-SRV-DIST", [commandStep("disable")]);
      const job = engine.startJob(plan);
      job.context.updatedAt = Date.now() - 1000;

      const context = engine.getJobState(job.id);

      expect(context?.finished).toBe(true);
      expect(context?.phase).toBe("completed");
      expect(context?.currentStep).toBe(1);
      expect(context?.stepResults).toHaveLength(1);
      expect(String(context?.outputBuffer || "")).toContain("disable\nSW-SRV-DIST>");
    } finally {
      (globalThis as any).ipc = previousIpc;
      (globalThis as any).dprint = previousDprint;
    }
  });

  test("native fallback falla cuando un step intermedio trae error IOS aunque end salga bien", async () => {
    let cleanupPhase = 0;
    let nativeOutput = [
      "SW-SRV-DIST(config-if-range)#channel-group 7 mode active",
      "                                             ^",
      "% Invalid input detected at '^' marker.",
      "SW-SRV-DIST(config-if-range)#",
    ].join("\n");
    const nativeTerminal = {
      registerEvent: vi.fn(),
      unregisterEvent: vi.fn(),
      enterCommand: vi.fn(() => {
        cleanupPhase = 1;
        nativeOutput += "end\nSW-SRV-DIST#";
      }),
      enterChar: vi.fn(),
      getCommandInput: vi.fn(() => ""),
      getAllOutput: vi.fn(() => nativeOutput),
      getPrompt: vi.fn(() => (cleanupPhase === 0 ? "SW-SRV-DIST(config-if-range)#" : "SW-SRV-DIST#")),
      getMode: vi.fn(() => (cleanupPhase === 0 ? "config-if-range" : "privileged-exec")),
    } as any;

    const terminal = {
      attach: vi.fn(),
      detach: vi.fn(),
      getSession: vi.fn(),
      getMode: vi.fn(),
      isBusy: vi.fn(() => false),
      isAnyBusy: vi.fn(() => false),
      executeCommand: vi.fn().mockResolvedValue({
        ok: true,
        output: "end\nSW-SRV-DIST#",
        rawOutput: "end\nSW-SRV-DIST#",
        raw: "end\nSW-SRV-DIST#",
        status: 0,
        session: { mode: "privileged-exec", prompt: "SW-SRV-DIST#", paging: false, awaitingConfirm: false },
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
          getCommandLine: () => nativeTerminal,
        }),
      }),
    };
    (globalThis as any).dprint = vi.fn();

    try {
      const engine = createExecutionEngine(terminal);
      const plan = createDeferredJobPlan("SW-SRV-DIST", [
        commandStep("configure terminal"),
        commandStep("interface range f0/21 - 22"),
        commandStep("channel-group 7 mode active"),
        commandStep("end"),
      ], {
        targetMode: "privileged-exec",
      } as any);
      (plan as any).targetMode = "privileged-exec";

      const job = engine.startJob(plan);
      job.context.updatedAt = Date.now() - 1000;

      const context = engine.getJobState(job.id);

      expect(context?.finished).toBe(false);
      expect(context?.phase).toBe("waiting-command");
      expect(terminal.executeCommand).toHaveBeenCalledWith(
        "SW-SRV-DIST",
        "configure terminal",
        expect.objectContaining({ allowPager: true, autoAdvancePager: true, maxPagerAdvances: 25 }),
      );

      await new Promise((resolve) => setTimeout(resolve, 750));

      const finalContext = engine.getJobState(job.id);

      expect(finalContext?.finished).toBe(true);
      expect(finalContext?.phase).toBe("completed");
      expect(finalContext?.errorCode).toBe("IOS_INVALID_INPUT");
      expect(finalContext?.result?.ok).toBe(false);
    } finally {
      (globalThis as any).ipc = previousIpc;
      (globalThis as any).dprint = previousDprint;
    }
  });

  test("startJob limpia config con end cuando un comando falla", async () => {
    let cleanupPhase = 0;
    let nativeOutput =
      "R1(config-if)#show version\n% Invalid input detected at '^' marker.\nR1(config-if)#";

    const nativeTerminal = {
      registerEvent: vi.fn(),
      unregisterEvent: vi.fn(),
      enterCommand: vi.fn(() => {
        cleanupPhase = 1;
        nativeOutput += "\nend\nR1#";
      }),
      enterChar: vi.fn(),
      getCommandInput: vi.fn(() => ""),
      getAllOutput: vi.fn(() => nativeOutput),
      getPrompt: vi.fn(() => (cleanupPhase === 0 ? "R1(config-if)#" : "R1#")),
      getMode: vi.fn(() => (cleanupPhase === 0 ? "config-if" : "privileged-exec")),
    } as any;

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
          getCommandLine: () => nativeTerminal,
        }),
      }),
    };
    (globalThis as any).dprint = vi.fn();

    try {
      const engine = createExecutionEngine(terminal);
      const plan = createDeferredJobPlan("R1", [commandStep("show version")], {
        targetMode: "privileged-exec",
      } as any);
      (plan as any).targetMode = "privileged-exec";

      const job = engine.startJob(plan);

      await new Promise((resolve) => setTimeout(resolve, 750));

      expect(job.context.phase).toBe("completed");
      expect(job.context.finished).toBe(true);
      expect(job.context.errorCode).toBe("IOS_INVALID_INPUT");
      expect(String(job.context.result?.output || "")).toContain("% Invalid input detected");
      expect(String(job.context.result?.output || "")).toContain("[cleanup]");
      expect(String(job.context.result?.output || "")).toContain("end\nR1#");
      expect(terminal.executeCommand).toHaveBeenCalledTimes(1);
      expect(nativeTerminal.enterCommand).toHaveBeenCalledTimes(1);
      expect(nativeTerminal.enterCommand).toHaveBeenCalledWith("end");
    } finally {
      (globalThis as any).ipc = previousIpc;
      (globalThis as any).dprint = previousDprint;
    }
  });

  test("startJob limpia config sin depender de targetMode cuando hay error semántico", async () => {
    let cleanupPhase = 0;
    let nativeOutput =
      "SW-SRV-DIST(config-if-range)#channel-group 7 mode active\n                                             ^\n% Invalid input detected at '^' marker.\nSW-SRV-DIST(config-if-range)#";

    const nativeTerminal = {
      registerEvent: vi.fn(),
      unregisterEvent: vi.fn(),
      enterCommand: vi.fn(() => {
        cleanupPhase = 1;
        nativeOutput += "\nend\nSW-SRV-DIST#";
      }),
      enterChar: vi.fn(),
      getCommandInput: vi.fn(() => ""),
      getAllOutput: vi.fn(() => nativeOutput),
      getPrompt: vi.fn(() => (cleanupPhase === 0 ? "SW-SRV-DIST(config-if-range)#" : "SW-SRV-DIST#")),
      getMode: vi.fn(() => (cleanupPhase === 0 ? "config-if-range" : "privileged-exec")),
    } as any;

    const terminal = {
      attach: vi.fn(),
      detach: vi.fn(),
      getSession: vi.fn(() => ({ mode: "config-if-range", prompt: "SW-SRV-DIST(config-if-range)#", paging: false, awaitingConfirm: false })),
      getMode: vi.fn(),
      isBusy: vi.fn(() => false),
      isAnyBusy: vi.fn(() => false),
      executeCommand: vi.fn().mockResolvedValue({
        ok: false,
        output: "                                             ^\n% Invalid input detected at '^' marker.\n",
        status: 1,
        session: { mode: "config-if-range", prompt: "SW-SRV-DIST(config-if-range)#", paging: false, awaitingConfirm: false },
        mode: "config-if-range",
      }),
      continuePager: vi.fn(),
      confirmPrompt: vi.fn(),
    } as any;

    const previousIpc = (globalThis as any).ipc;
    const previousDprint = (globalThis as any).dprint;

    (globalThis as any).ipc = {
      network: () => ({
        getDevice: () => ({
          getCommandLine: () => nativeTerminal,
        }),
      }),
    };
    (globalThis as any).dprint = vi.fn();

    try {
      const engine = createExecutionEngine(terminal);
      const plan = createDeferredJobPlan("SW-SRV-DIST", [commandStep("channel-group 7 mode active")]);

      const job = engine.startJob(plan);

      await new Promise((resolve) => setTimeout(resolve, 750));

      expect(job.context.phase).toBe("completed");
      expect(job.context.finished).toBe(true);
      expect(job.context.errorCode).toBe("IOS_INVALID_INPUT");
      expect(String(job.context.result?.output || "")).toContain("% Invalid input detected");
      expect(String(job.context.result?.output || "")).toContain("[cleanup]");
      expect(String(job.context.result?.output || "")).toContain("end\nSW-SRV-DIST#");
      expect(terminal.executeCommand).toHaveBeenCalledTimes(1);
      expect(nativeTerminal.enterCommand).toHaveBeenCalledTimes(1);
    } finally {
      (globalThis as any).ipc = previousIpc;
      (globalThis as any).dprint = previousDprint;
    }
  });

  test("cleanup semántico no reprocresa el mismo step mientras end está en curso", async () => {
    let resolverCleanup: ((value: any) => void) | null = null;
    const cleanupPromise = new Promise<any>((resolve) => {
      resolverCleanup = resolve;
    });

    let cleanupPhase = 0;
    let nativeOutput =
      "SW-SRV-DIST(config-if-range)#channel-group 7 mode active\n                                             ^\n% Invalid input detected at '^' marker.\nSW-SRV-DIST(config-if-range)#";

    const nativeTerminal = {
      registerEvent: vi.fn(),
      unregisterEvent: vi.fn(),
      enterCommand: vi.fn(() => {
        cleanupPhase = 1;
        nativeOutput += "\nend\nSW-SRV-DIST#";
      }),
      enterChar: vi.fn(),
      getCommandInput: vi.fn(() => " "),
      getAllOutput: vi.fn(() => nativeOutput),
      getPrompt: vi.fn(() => (cleanupPhase === 0 ? "SW-SRV-DIST(config-if-range)#" : "SW-SRV-DIST#")),
      getMode: vi.fn(() => (cleanupPhase === 0 ? "config-if-range" : "privileged-exec")),
    } as any;

    const terminal = {
      attach: vi.fn(),
      detach: vi.fn(),
      getSession: vi.fn(() => ({ mode: "config-if-range", prompt: "SW-SRV-DIST(config-if-range)#", paging: false, awaitingConfirm: false })),
      getMode: vi.fn(),
      isBusy: vi.fn(() => false),
      isAnyBusy: vi.fn(() => false),
      executeCommand: vi.fn().mockResolvedValue({
        ok: false,
        output: "\n% Invalid input detected at '^' marker.\n",
        status: 1,
        session: { mode: "config-if-range", prompt: "SW-SRV-DIST(config-if-range)#", paging: false, awaitingConfirm: false },
        mode: "config-if-range",
      }),
      continuePager: vi.fn(),
      confirmPrompt: vi.fn(),
    } as any;

    const previousIpc = (globalThis as any).ipc;
    const previousDprint = (globalThis as any).dprint;

    (globalThis as any).ipc = {
      network: () => ({
        getDevice: () => ({
          getCommandLine: () => nativeTerminal,
        }),
      }),
    };
    (globalThis as any).dprint = vi.fn();

    try {
      const engine = createExecutionEngine(terminal);
      const plan = createDeferredJobPlan("SW-SRV-DIST", [commandStep("channel-group 7 mode active")]);
      const job = engine.startJob(plan);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(terminal.executeCommand).toHaveBeenCalledTimes(1);
      expect(nativeTerminal.enterCommand).toHaveBeenCalledTimes(1);

      const midState = engine.getJobState(job.id);
      expect(midState?.finished).toBe(false);
      expect(midState?.phase).toBe("waiting-delay");
      expect(terminal.executeCommand).toHaveBeenCalledTimes(1);

      if (resolverCleanup) {
        const cleanupResolver = resolverCleanup as (value: any) => void;
        cleanupResolver({
          ok: true,
          output: "end\nSW-SRV-DIST#",
          rawOutput: "end\nSW-SRV-DIST#",
          raw: "end\nSW-SRV-DIST#",
          status: 0,
          session: { mode: "privileged-exec", prompt: "SW-SRV-DIST#", paging: false, awaitingConfirm: false },
          mode: "privileged-exec",
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 700));

      const finalState = engine.getJobState(job.id);
      expect(finalState?.finished).toBe(true);
      expect(String(finalState?.result?.output || "")).toContain("[cleanup]");
      expect(String(finalState?.result?.output || "")).toContain("end\nSW-SRV-DIST#");
    } finally {
      (globalThis as any).ipc = previousIpc;
      (globalThis as any).dprint = previousDprint;
    }
  });
});
