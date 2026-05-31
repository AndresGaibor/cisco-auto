import { describe, expect, test, vi } from "bun:test";
import { createIosCommandExecutor } from "./ios-command-executor.js";

describe("IosCommandExecutor", () => {
  test("ejecuta comando IOS exitosamente via runtimeTerminal", async () => {
    const executor = createIosCommandExecutor({
      generateId: () => "plan-1",
      controller: {
        execIos: vi.fn(),
      },
      runtimeTerminal: {
        runTerminalPlan: async () => ({
          ok: true,
          output: "SW1#show version\nCisco IOS Software",
          rawOutput: "SW1#show version\nCisco IOS Software\nSW1#",
          status: 0,
          warnings: [],
          evidence: { test: true },
        }),
        ensureSession: async () => ({ ok: true }) as any,
        pollTerminalJob: async () => null,
      } as any,
    });

    const result = await executor.executeIosCommand("SW1", "show version");

    expect(result.ok).toBe(true);
    expect(result.status).toBe(0);
    expect(result.deviceKind).toBe("ios");
    expect(result.error).toBeUndefined();
  });

  test("detecta error semantico IOS_INVALID_INPUT aunque ok sea true", async () => {
    const executor = createIosCommandExecutor({
      generateId: () => "plan-2",
      controller: {
        execIos: vi.fn(),
      },
      runtimeTerminal: {
        runTerminalPlan: async () => ({
          ok: true,
          output: "          ^\n% Invalid input detected at '^' marker.",
          rawOutput:
            "SW-SRV-DIST#hostname SW-SRV-DIST\n          ^\n% Invalid input detected at '^' marker.\nSW-SRV-DIST#",
          status: 0,
          warnings: [],
          evidence: { test: true },
        }),
        ensureSession: async () => ({ ok: true }) as any,
        pollTerminalJob: async () => null,
      } as any,
    });

    const result = await executor.executeIosCommand("SW-SRV-DIST", "hostname SW-SRV-DIST");

    expect(result.ok).toBe(false);
    expect(result.status).toBe(1);
    expect(result.error?.code).toBe("IOS_INVALID_INPUT");
  });

  test("detecta auto-config failure cuando termina en config mode", async () => {
    const executor = createIosCommandExecutor({
      generateId: () => "plan-3",
      controller: {
        execIos: vi.fn(),
      },
      runtimeTerminal: {
        runTerminalPlan: async () => ({
          ok: true,
          output: "SW1(config-if)#no description",
          rawOutput: "SW1(config)#interface f0/6\nSW1(config-if)#no description\nSW1(config-if)#",
          status: 0,
          modeAfter: "interface-config",
          promptAfter: "SW1(config-if)#",
          warnings: [],
          evidence: { test: true },
        }),
        ensureSession: async () => ({ ok: true }) as any,
        pollTerminalJob: async () => null,
      } as any,
    });

    const result = await executor.executeIosCommand("SW1", "interface f0/6\nno description");

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("IOS_AUTOCONFIG_DID_NOT_EXIT_CONFIG_MODE");
  });

  test("acepta auto-config success cuando termina en privileged-exec", async () => {
    const executor = createIosCommandExecutor({
      generateId: () => "plan-4",
      controller: {
        execIos: vi.fn(),
      },
      runtimeTerminal: {
        runTerminalPlan: async () => ({
          ok: true,
          output: "SW1(config-if)#end",
          rawOutput: "SW1(config-if)#end\nSW1#",
          status: 0,
          modeAfter: "privileged-exec",
          promptAfter: "SW1#",
          warnings: [],
          evidence: { test: true },
        }),
        ensureSession: async () => ({ ok: true }) as any,
        pollTerminalJob: async () => null,
      } as any,
    });

    const result = await executor.executeIosCommand("SW1", "interface f0/6\nno description");

    expect(result.ok).toBe(true);
    expect(result.status).toBe(0);
  });

  test("fallback a legacy execIos cuando runtimeTerminal no existe", async () => {
    const execIos = vi.fn().mockResolvedValue({
      ok: true,
      raw: "SW1#show version\nCisco IOS",
      output: "Cisco IOS",
      evidence: { events: [] },
    });

    const executor = createIosCommandExecutor({
      generateId: () => "plan-5",
      controller: {
        execIos,
      },
      runtimeTerminal: null,
    });

    const result = await executor.executeIosCommand("SW1", "show version");

    expect(result.ok).toBe(true);
    expect(execIos).toHaveBeenCalledWith("SW1", "show version", false, 45000);
  });

  test("maneja error de runtime result con extractIosFailureDetails", async () => {
    const executor = createIosCommandExecutor({
      generateId: () => "plan-6",
      controller: {
        execIos: vi.fn(),
      },
      runtimeTerminal: {
        runTerminalPlan: async () => ({
          ok: false,
          output: "Invalid input at '^' marker",
          rawOutput: "SW1(config)#invalid command\n          ^\n% Invalid input detected",
          status: 1,
          error: {
            code: "IOS_EXEC_FAILED",
            message: "Command failed",
          },
          warnings: [],
          evidence: { test: true },
        }),
        ensureSession: async () => ({ ok: true }) as any,
        pollTerminalJob: async () => null,
      } as any,
    });

    const result = await executor.executeIosCommand("SW1", "invalid command");

    expect(result.ok).toBe(false);
    expect(result.status).toBe(1);
  });

  test("registra timings de ejecucion", async () => {
    const executor = createIosCommandExecutor({
      generateId: () => "plan-7",
      controller: {
        execIos: vi.fn(),
      },
      runtimeTerminal: {
        runTerminalPlan: async () => ({
          ok: true,
          output: "SW1#show version",
          rawOutput: "SW1#show version\nSW1#",
          status: 0,
          warnings: [],
          evidence: { test: true },
        }),
        ensureSession: async () => ({ ok: true }) as any,
        pollTerminalJob: async () => null,
      } as any,
    });

    const timings: any = {};
    await executor.executeIosCommand("SW1", "show version", undefined, timings);

    expect(timings.buildIosPlanMs).toBeGreaterThanOrEqual(0);
    expect(timings.runtimeTerminalRunPlanMs).toBeGreaterThanOrEqual(0);
  });

  test("rechaza comando de alto riesgo cuando heartbeat supera 10s", async () => {
    const runTerminalPlan = vi.fn();

    const executor = createIosCommandExecutor({
      generateId: () => "plan-8",
      controller: {
        getHeartbeatHealth: () => ({ state: "stale", ageMs: 11001, lastSeenTs: Date.now() - 11001 }),
        execIos: vi.fn(),
      },
      runtimeTerminal: {
        runTerminalPlan,
        ensureSession: async () => ({ ok: true }) as any,
        pollTerminalJob: async () => null,
      } as any,
    });

    const result = await executor.executeIosCommand("SW1", "write memory");

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("PT_RUNTIME_UNAVAILABLE");
    expect(runTerminalPlan).not.toHaveBeenCalled();
  });

  test("permite show commands cuando heartbeat bajo 20s", async () => {
    let runTerminalPlanCalls = 0;

    const executor = createIosCommandExecutor({
      generateId: () => "plan-9",
      controller: {
        getHeartbeatHealth: () => ({ state: "stale", ageMs: 11000, lastSeenTs: Date.now() - 11000 }),
        execIos: vi.fn(),
      },
      runtimeTerminal: {
        runTerminalPlan: async () => {
          runTerminalPlanCalls++;
          return {
            ok: true,
            output: "Cisco IOS Software",
            rawOutput: "SW1#show version\nCisco IOS Software\nSW1#",
            status: 0,
            warnings: [],
            evidence: { test: true },
          };
        },
        ensureSession: async () => ({ ok: true }) as any,
        pollTerminalJob: async () => null,
      } as any,
    });

    const result = await executor.executeIosCommand("SW1", "show version");

    expect(result.ok).toBe(true);
    expect(runTerminalPlanCalls).toBe(1);
  });
});

test("executeIosCommandBatchOptimized ejecuta un solo terminal.plan.run y devuelve subResults", async () => {
  const runTerminalPlan = vi.fn(async () => ({
    ok: true,
    output: "combined",
    rawOutput: "combined raw",
    status: 0,
    warnings: [],
    evidence: { test: true },
    stepResults: [
      {
        stepIndex: 0,
        command: "show clock",
        ok: true,
        output: "R1#show clock\n*1:00:00 UTC\nR1#",
        rawOutput: "R1#show clock\n*1:00:00 UTC\nR1#",
        status: 0,
        warnings: [],
        durationMs: 100,
      },
      {
        stepIndex: 1,
        command: "show vlan brief",
        ok: true,
        output: "R1#show vlan brief\nVLAN Name Status Ports\nR1#",
        rawOutput: "R1#show vlan brief\nVLAN Name Status Ports\nR1#",
        status: 0,
        warnings: [],
        durationMs: 200,
      },
    ],
  }));

  const executor = createIosCommandExecutor({
    generateId: () => "plan-batch-1",
    controller: {
      execIos: vi.fn(),
    },
    runtimeTerminal: {
      runTerminalPlan,
      ensureSession: async () => ({ ok: true }) as any,
      pollTerminalJob: async () => null,
    } as any,
  });

  const result = await executor.executeIosCommandBatchOptimized(
    "R1",
    ["show clock", "show vlan brief"],
    {
      mode: "safe",
      allowConfirm: false,
      allowDestructive: false,
    } as any,
  ) as any;

  expect(runTerminalPlan).toHaveBeenCalledTimes(1);
  expect(result.ok).toBe(true);
  expect(result.action).toBe("ios.exec.batch");
  expect(result.executionStrategy).toBe("optimized-runtime-multistep");
  expect(result.subResults).toHaveLength(2);
  expect(result.subResults[0].command).toBe("show clock");
  expect(result.subResults[1].command).toBe("show vlan brief");
});

test("executeIosCommandBatchOptimized ignora stepResults internos extra y conserva los comandos solicitados", async () => {
  const runTerminalPlan = vi.fn(async () => ({
    ok: true,
    output: "combined",
    rawOutput: "combined raw",
    status: 0,
    warnings: [],
    evidence: { test: true },
    stepResults: [
      {
        stepIndex: 0,
        command: "show clock",
        ok: true,
        output: "R1#show clock\n*1:00:00 UTC\nR1#",
        rawOutput: "R1#show clock\n*1:00:00 UTC\nR1#",
        status: 0,
        warnings: [],
        durationMs: 100,
      },
      {
        stepIndex: 1,
        command: "terminal length 0",
        ok: true,
        output: "R1#terminal length 0\nR1#",
        rawOutput: "R1#terminal length 0\nR1#",
        status: 0,
        warnings: [],
        durationMs: 50,
      },
      {
        stepIndex: 2,
        command: "terminal width 512",
        ok: true,
        output: "R1#terminal width 512\nR1#",
        rawOutput: "R1#terminal width 512\nR1#",
        status: 0,
        warnings: [],
        durationMs: 50,
      },
      {
        stepIndex: 3,
        command: "show vlan brief",
        ok: true,
        output: "R1#show vlan brief\nVLAN Name Status Ports\nR1#",
        rawOutput: "R1#show vlan brief\nVLAN Name Status Ports\nR1#",
        status: 0,
        warnings: [],
        durationMs: 200,
      },
    ],
  }));

  const executor = createIosCommandExecutor({
    generateId: () => "plan-batch-1-extra",
    controller: {
      execIos: vi.fn(),
    },
    runtimeTerminal: {
      runTerminalPlan,
      ensureSession: async () => ({ ok: true }) as any,
      pollTerminalJob: async () => null,
    } as any,
  });

  const result = (await executor.executeIosCommandBatchOptimized(
    "R1",
    ["show clock", "show vlan brief"],
    {
      mode: "safe",
      allowConfirm: false,
      allowDestructive: false,
    } as any,
  )) as any;

  expect(result.ok).toBe(true);
  expect(result.executionStrategy).toBe("optimized-runtime-multistep");
  expect(result.subResults).toHaveLength(2);
  expect(result.subResults[0].command).toBe("show clock");
  expect(result.subResults[1].command).toBe("show vlan brief");
});

test("executeIosCommandBatchOptimized diagnostica command_mismatch con comandos runtime y plan", async () => {
  const executor = createIosCommandExecutor({
    generateId: () => "plan-batch-diagnostic",
    controller: {
      execIos: vi.fn(),
    },
    runtimeTerminal: {
      runTerminalPlan: async () => ({
        ok: true,
        output: "combined",
        status: 0,
        warnings: [],
        evidence: {},
        stepResults: [
          {
            stepIndex: 0,
            command: "MLS-CORE-1>show clock",
            ok: true,
            output: "MLS-CORE-1>show clock\n...",
            status: 0,
            warnings: [],
          },
        ],
      }),
      ensureSession: async () => ({ ok: true }) as any,
      pollTerminalJob: async () => null,
    } as any,
  });

  const result = (await executor.executeIosCommandBatchOptimized(
    "MLS-CORE-1",
    ["show clock", "show vlan brief"],
    { mode: "safe" } as any,
  )) as any;

  expect(result.optimizedBatchRejected).toBe(true);
  expect(result.optimizedBatchReason).toBe("command_mismatch");
  expect(result.optimizedBatchExpectedCommands).toEqual(["show clock", "show vlan brief"]);
  expect(result.optimizedBatchRuntimeStepCommands).toContain("MLS-CORE-1>show clock");
  expect(result.optimizedBatchUnmatchedCommands).toContain("show vlan brief");
  expect(result.optimizedBatchPlanStepSummary.length).toBeGreaterThan(0);
});

test("executeIosCommandBatchOptimized elimina pager prelude interno antes de ejecutar batch", async () => {
  const runTerminalPlan = vi.fn(async (plan: any) => {
    expect(plan.steps.map((step: any) => step.command)).not.toContain("terminal length 0");
    expect(plan.steps.map((step: any) => step.command)).not.toContain("terminal width 512");
    expect(plan.steps.map((step: any) => step.command)).toEqual(["show clock", "show vlan brief"]);

    return {
      ok: true,
      output: "combined",
      rawOutput: "combined raw",
      status: 0,
      warnings: [],
      evidence: {},
      stepResults: [
        {
          stepIndex: 0,
          command: "show clock",
          ok: true,
          output: "clock",
          rawOutput: "clock",
          status: 0,
          warnings: [],
        },
        {
          stepIndex: 1,
          command: "show vlan brief",
          ok: true,
          output: "vlan",
          rawOutput: "vlan",
          status: 0,
          warnings: [],
        },
      ],
    };
  });

  const executor = createIosCommandExecutor({
    generateId: () => "plan-batch-no-pager",
    controller: {
      execIos: vi.fn(),
    },
    runtimeTerminal: {
      runTerminalPlan,
      ensureSession: async () => ({ ok: true }) as any,
      pollTerminalJob: async () => null,
    } as any,
  });

  const result = (await executor.executeIosCommandBatchOptimized(
    "R1",
    ["show clock", "show vlan brief"],
    {
      mode: "safe",
      allowConfirm: false,
      allowDestructive: false,
    } as any,
  )) as any;

  expect(runTerminalPlan).toHaveBeenCalledTimes(1);
  expect(result.ok).toBe(true);
  expect(result.executionStrategy).toBe("optimized-runtime-multistep");
  expect(result.subResults).toHaveLength(2);
  expect(result.subResults[0].command).toBe("show clock");
  expect(result.subResults[1].command).toBe("show vlan brief");
});

test("executeIosCommandBatchOptimized expone cobertura parcial cuando faltan stepResults", async () => {
  const runTerminalPlan = vi.fn(async (plan: any) => {
    expect(plan.steps.map((step: any) => step.command)).toEqual([
      "show clock",
      "show ip interface brief",
      "show vlan brief",
      "show interfaces trunk",
      "show etherchannel summary",
      "show spanning-tree summary",
      "show ip route",
      "show standby brief",
      "show cdp neighbors",
      "show version",
    ]);

    return {
      ok: true,
      output: "combined",
      rawOutput: "combined raw",
      status: 0,
      warnings: [],
      evidence: {},
      stepResults: [
        { stepIndex: 0, command: "show clock", ok: true, output: "clock", rawOutput: "clock", status: 0, warnings: [] },
        { stepIndex: 1, command: "show ip interface brief", ok: true, output: "ip brief", rawOutput: "ip brief", status: 0, warnings: [] },
        { stepIndex: 2, command: "show vlan brief", ok: true, output: "vlan", rawOutput: "vlan", status: 0, warnings: [] },
        { stepIndex: 3, command: "show interfaces trunk", ok: true, output: "trunk", rawOutput: "trunk", status: 0, warnings: [] },
        { stepIndex: 4, command: "show etherchannel summary", ok: true, output: "ether", rawOutput: "ether", status: 0, warnings: [] },
        { stepIndex: 5, command: "show spanning-tree summary", ok: true, output: "stp", rawOutput: "stp", status: 0, warnings: [] },
        { stepIndex: 6, command: "show ip route", ok: true, output: "route", rawOutput: "route", status: 0, warnings: [] },
      ],
    };
  });

  const executor = createIosCommandExecutor({
    generateId: () => "plan-batch-partial",
    controller: {
      execIos: vi.fn(),
    },
    runtimeTerminal: {
      runTerminalPlan,
      ensureSession: async () => ({ ok: true }) as any,
      pollTerminalJob: async () => null,
    } as any,
  });

  const result = (await executor.executeIosCommandBatchOptimized(
    "MLS-CORE-1",
    [
      "show clock",
      "show ip interface brief",
      "show vlan brief",
      "show interfaces trunk",
      "show etherchannel summary",
      "show spanning-tree summary",
      "show ip route",
      "show standby brief",
      "show cdp neighbors",
      "show version",
    ],
    { mode: "safe", allowConfirm: false, allowDestructive: false, continueOnError: true } as any,
  )) as any;

  expect(result.ok).toBe(false);
  expect(result.optimizedBatchRejected).toBe(true);
  expect(result.optimizedBatchReason).toBe("partial_stepResults");
  expect(result.optimizedBatchPartial).toBe(true);
  expect(result.optimizedBatchMatchedCommandCount).toBe(7);
  expect(result.optimizedBatchNextCommandIndex).toBe(7);
  expect(result.subResults).toHaveLength(7);
  expect(result.subResults[0].command).toBe("show clock");
  expect(result.subResults[6].command).toBe("show ip route");
  expect(result.optimizedBatchPartialUnmatchedCommands).toEqual([
    "show standby brief",
    "show cdp neighbors",
    "show version",
  ]);
});

test("executeIosCommandBatchOptimized retorna null si faltan stepResults completos", async () => {
  const executor = createIosCommandExecutor({
    generateId: () => "plan-batch-2",
    controller: {
      execIos: vi.fn(),
    },
    runtimeTerminal: {
      runTerminalPlan: async () => ({
        ok: true,
        output: "combined",
        status: 0,
        warnings: [],
        evidence: {},
      }),
      ensureSession: async () => ({ ok: true }) as any,
      pollTerminalJob: async () => null,
    } as any,
  });

  const result = await executor.executeIosCommandBatchOptimized(
    "R1",
    ["show clock", "show vlan brief"],
    { mode: "safe" } as any,
  );

  expect(result).not.toBeNull();
  expect((result as any).optimizedBatchRejected).toBe(true);
  expect((result as any).optimizedBatchReason).toBe("missing_stepResults");
  expect((result as any).optimizedBatchExpectedCommandCount).toBe(2);
  expect((result as any).optimizedBatchRuntimeStepResultCount).toBe(0);
});
