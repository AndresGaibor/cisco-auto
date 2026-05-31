import { describe, expect, test } from "bun:test";
import { CmdRunOutputSchema } from "./output-schemas.js";
import {
  analyzeCommandPerformance,
  buildSlowSuccessWarning,
  enrichCmdRunJobResultWithPerformance,
} from "./cmd-performance.js";

function makeJobResult(timings: Record<string, unknown>, ok = true) {
  return {
    index: 0,
    device: "MLS-CORE-1",
    commandCount: 1,
    commands: ["show clock"],
    result: {
      ok,
      action: "ios.exec",
      device: "MLS-CORE-1",
      command: "show clock",
      output: "MLS-CORE-1>show clock",
      status: ok ? 0 : 1,
      warnings: [],
      evidence: {
        timings,
      },
    },
  };
}

describe("cmd performance diagnostics", () => {
  test("comando rápido no marca slow ni warning", () => {
    const entry = makeJobResult({
      adapterTotalMs: 1200,
      terminalCommandService: {
        terminalCommandServiceTotalMs: 1500,
      },
      terminalPlanSubmitBridgeWaitMs: 200,
      terminalPlanSubmitQueueLatencyMs: 100,
    });

    const performance = analyzeCommandPerformance(entry, 8000);

    expect(performance.durationMs).toBe(1500);
    expect(performance.slow).toBe(false);
    expect(buildSlowSuccessWarning(performance)).toBeNull();
  });

  test("comando exitoso lento genera CMD_SLOW_SUCCESS", () => {
    const entry = makeJobResult({
      adapterTotalMs: 21000,
      terminalCommandService: {
        terminalCommandServiceTotalMs: 22130,
      },
      terminalPlanSubmitBridgeWaitMs: 19324,
      terminalPlanSubmitQueueLatencyMs: 18221,
      terminalPlanSubmitExecLatencyMs: 478,
    });

    const enriched = enrichCmdRunJobResultWithPerformance(entry, 8000);

    expect(enriched.performance.slow).toBe(true);
    expect(enriched.performance.durationMs).toBe(22130);
    expect(enriched.performance.thresholdMs).toBe(8000);
    expect(enriched.performance.dominantTiming).toBe("terminalPlanSubmitBridgeWaitMs");
    expect(enriched.performance.category).toBe("bridge_wait");
    expect(enriched.warnings).toContainEqual(
      expect.objectContaining({
        code: "CMD_SLOW_SUCCESS",
        severity: "info",
        actionable: false,
      }),
    );
  });

  test("no marca slow success si el job falló aunque haya durado mucho", () => {
    const entry = makeJobResult({
      adapterTotalMs: 39000,
      terminalCommandService: {
        terminalCommandServiceTotalMs: 40000,
      },
      terminalPlanPollSleepMs: 20000,
    }, false);

    const enriched = enrichCmdRunJobResultWithPerformance(entry, 8000);

    expect(enriched.performance.slow).toBe(false);
    expect(enriched.warnings).toBeUndefined();
  });

  test("structuredContent valida contra CmdRunOutputSchema con performance", () => {
    const entry = enrichCmdRunJobResultWithPerformance(
      makeJobResult({
        adapterTotalMs: 21000,
        terminalCommandService: {
          terminalCommandServiceTotalMs: 22130,
        },
        terminalPlanSubmitBridgeWaitMs: 19324,
      }),
      8000,
    );

    CmdRunOutputSchema.parse({
      ok: true,
      schemaVersion: "1.0",
      timestamp: "2026-05-10T05:00:00.000Z",
      requestId: "mcp-deadbeef",
      action: "cmd.run",
      jobCount: 1,
      failedCount: 0,
      results: [entry],
      queue: {
        pending: [],
        running: [],
        done: [],
        done_with_errors: [],
        failed: [],
      },
    });
  });

  test("dominantTiming ignora wrappers agregados y elige bridge wait", () => {
    const entry = makeJobResult({
      adapterTotalMs: 4117,
      terminalPlanPollBridgeWaitMs: 3206,
      terminalPlanPollQueueLatencyMs: 2662,
      terminalPlanPollExecLatencyMs: 427,
      terminalCommandService: {
        executeIosCommandMs: 6050,
        terminalCommandServiceTotalMs: 6164,
      },
    });

    const performance = analyzeCommandPerformance(entry, 1);

    expect(performance.slow).toBe(true);
    expect(performance.dominantTiming).toBe("terminalPlanPollBridgeWaitMs");
    expect(performance.dominantTimingMs).toBe(3206);
    expect(performance.category).toBe("bridge_wait");
  });

  test("dominantTiming prioriza runtimeTerminalRetryRunPlanMs como retry_or_recovery", () => {
    const entry = makeJobResult({
      terminalPlanPollBridgeWaitMs: 3206,
      terminalPlanPollQueueLatencyMs: 2662,
      terminalCommandService: {
        runtimeTerminalRetryRunPlanMs: 4117,
        executeIosCommandMs: 6050,
        terminalCommandServiceTotalMs: 6164,
      },
    });

    const performance = analyzeCommandPerformance(entry, 1);

    expect(performance.dominantTiming).toBe("terminalCommandService.runtimeTerminalRetryRunPlanMs");
    expect(performance.dominantTimingMs).toBe(4117);
    expect(performance.category).toBe("retry_or_recovery");
  });

  test("schema acepta retry_or_recovery category", () => {
    const entry = enrichCmdRunJobResultWithPerformance(
      makeJobResult({
        terminalCommandService: {
          runtimeTerminalRetryRunPlanMs: 4117,
          terminalCommandServiceTotalMs: 5000,
        },
      }),
      1,
    );

    const parsed: any = CmdRunOutputSchema.parse({
      ok: true,
      schemaVersion: "1.0",
      timestamp: "2026-05-10T05:00:00.000Z",
      requestId: "mcp-deadbeef",
      action: "cmd.run",
      jobCount: 1,
      failedCount: 0,
      results: [entry],
      queue: {
        pending: [],
        running: [],
        done: [],
        done_with_errors: [],
        failed: [],
      },
    });

    expect(parsed.results[0].performance.category).toBe("retry_or_recovery");
  });
});


test("batch slow warning usa el comando lento real, no el path técnico", () => {
  const job = {
    index: 0,
    device: "MLS-CORE-1",
    commandCount: 3,
    commands: ["show clock", "show ip interface brief", "show vlan brief"],
    result: {
      ok: true,
      action: "ios.exec.batch",
      executionStrategy: "sequential-subcommands",
      failedSubcommandCount: 0,
      subResults: [
        { index: 0, command: "show clock", ok: true, durationMs: 853, result: { ok: true } },
        { index: 1, command: "show ip interface brief", ok: true, durationMs: 1757, result: { ok: true } },
        { index: 2, command: "show vlan brief", ok: true, durationMs: 2739, result: { ok: true } },
      ],
    },
  };

  const performance = analyzeCommandPerformance(job, 1);
  const warning = buildSlowSuccessWarning(performance);

  expect(performance.category).toBe("sequential_batch");
  expect(performance.slowestSubcommand).toEqual({
    index: 2,
    command: "show vlan brief",
    durationMs: 2739,
  });

  expect(warning?.message).toContain("Slowest subcommand: show vlan brief, 2739ms");
  expect(warning?.message).not.toContain("result.subResults");
});

test("schema acepta optimizedRuntimeBatchFallbackReason detallado", () => {
  const parsed: any = CmdRunOutputSchema.parse({
    ok: true,
    schemaVersion: "1.0",
    timestamp: "2026-05-10T05:00:00.000Z",
    requestId: "mcp-deadbeef",
    action: "cmd.run",
    jobCount: 1,
    failedCount: 0,
    results: [
      {
        index: 0,
        device: "MLS-CORE-1",
        commandCount: 2,
        commands: ["show clock", "show vlan brief"],
        result: {
          ok: false,
          action: "ios.exec.batch",
          executionStrategy: "sequential-subcommands",
          optimizedRuntimeBatchAttempted: true,
          optimizedRuntimeBatchAvailable: true,
          optimizedRuntimeBatchFallbackReason: "command_mismatch",
          failedSubcommandCount: 0,
          subResults: [],
        },
      },
    ],
    queue: {
      pending: [],
      running: [],
      done: [],
      done_with_errors: [],
      failed: [],
    },
  });

  expect(parsed.results[0].result.optimizedRuntimeBatchFallbackReason).toBe("command_mismatch");
});


test("optimized-runtime-multistep usa timings agregados cuando subResults no tienen durationMs", () => {
  const job = {
    index: 0,
    device: "MLS-CORE-1",
    commandCount: 3,
    commands: ["show clock", "show ip interface brief", "show vlan brief"],
    result: {
      ok: true,
      action: "ios.exec.batch",
      executionStrategy: "optimized-runtime-multistep",
      failedSubcommandCount: 0,
      evidence: {
        timings: {
          terminalPlanRunMs: 7899,
          adapterTotalMs: 7899,
          terminalCommandService: {
            runtimeTerminalBatchOptimizedRunPlanMs: 7899,
            executeIosCommandBatchOptimizedMs: 7905,
            terminalCommandServiceTotalMs: 8373,
          },
        },
      },
      subResults: [
        { index: 0, command: "show clock", ok: true, status: 0, result: { ok: true } },
        { index: 1, command: "show ip interface brief", ok: true, status: 0, result: { ok: true } },
        { index: 2, command: "show vlan brief", ok: true, status: 0, result: { ok: true } },
      ],
    },
  };

  const performance = analyzeCommandPerformance(job, 1);
  const warning = buildSlowSuccessWarning(performance);

  expect(performance.category).toBe("sequential_batch");
  expect(performance.durationMs).toBe(8373);
  expect(performance.slow).toBe(true);
  expect(performance.dominantTiming).toBe("terminalCommandService.runtimeTerminalBatchOptimizedRunPlanMs");
  expect(performance.dominantTimingMs).toBe(7899);
  expect(performance.slowestSubcommand).toBeUndefined();
  expect(warning?.message).toContain("Optimized batch succeeded but took 8373ms");
  expect(warning?.message).toContain("terminalCommandService.runtimeTerminalBatchOptimizedRunPlanMs");
  expect(warning?.message).not.toContain("Command succeeded");
});


test("optimized-runtime-multistep warning dice optimized batch", () => {
  const job = {
    index: 0,
    device: "MLS-CORE-1",
    commandCount: 3,
    commands: ["show clock", "show ip interface brief", "show vlan brief"],
    result: {
      ok: true,
      action: "ios.exec.batch",
      executionStrategy: "optimized-runtime-multistep",
      failedSubcommandCount: 0,
      evidence: {
        timings: {
          terminalCommandService: {
            runtimeTerminalBatchOptimizedRunPlanMs: 8152,
            terminalCommandServiceTotalMs: 8312,
          },
        },
      },
      subResults: [
        { index: 0, command: "show clock", ok: true, status: 0, result: { ok: true } },
        { index: 1, command: "show ip interface brief", ok: true, status: 0, result: { ok: true } },
        { index: 2, command: "show vlan brief", ok: true, status: 0, result: { ok: true } },
      ],
    },
  };

  const performance = analyzeCommandPerformance(job, 1);
  const warning = buildSlowSuccessWarning(performance);

  expect(performance.executionStrategy).toBe("optimized-runtime-multistep");
  expect(warning?.message).toContain("Optimized batch succeeded");
  expect(warning?.message).not.toContain("Command succeeded");
});

test("optimized-runtime-partial-plus-sequential usa label parcial", () => {
  const job = {
    index: 0,
    device: "MLS-CORE-1",
    commandCount: 3,
    commands: ["show clock", "show ip interface brief", "show vlan brief"],
    result: {
      ok: true,
      action: "ios.exec.batch",
      executionStrategy: "optimized-runtime-partial-plus-sequential",
      failedSubcommandCount: 0,
      evidence: {
        timings: {
          terminalCommandService: {
            runtimeTerminalBatchOptimizedRunPlanMs: 8152,
            terminalCommandServiceTotalMs: 8312,
          },
        },
      },
      subResults: [
        { index: 0, command: "show clock", ok: true, status: 0, result: { ok: true } },
        { index: 1, command: "show ip interface brief", ok: true, status: 0, result: { ok: true } },
        { index: 2, command: "show vlan brief", ok: true, status: 0, result: { ok: true } },
      ],
    },
  };

  const performance = analyzeCommandPerformance(job, 1);
  const warning = buildSlowSuccessWarning(performance);

  expect(performance.executionStrategy).toBe("optimized-runtime-partial-plus-sequential");
  expect(warning?.message).toContain("Partial optimized batch succeeded");
  expect(warning?.message).not.toContain("Command succeeded");
});

test("partial optimized batch con fallos genera CMD_BATCH_PARTIAL_FAILURE", () => {
  const job = {
    index: 0,
    device: "MLS-CORE-1",
    commandCount: 3,
    commands: ["show clock", "show standby brief", "show cdp neighbors"],
    result: {
      ok: false,
      action: "ios.exec.batch",
      executionStrategy: "optimized-runtime-partial-plus-sequential",
      optimizedRuntimeBatchPartial: true,
      optimizedRuntimeBatchMatchedCommandCount: 1,
      optimizedRuntimeBatchNextCommandIndex: 1,
      failedSubcommandCount: 1,
      subResults: [
        { index: 0, command: "show clock", ok: true, status: 0, result: { ok: true } },
        { index: 1, command: "show standby brief", ok: false, status: 1, result: { ok: false } },
        { index: 2, command: "show cdp neighbors", ok: true, status: 0, result: { ok: true } },
      ],
    },
  };

  const enriched = enrichCmdRunJobResultWithPerformance(job as any, 1);

  expect(enriched.warnings).toContainEqual(
    expect.objectContaining({
      code: "CMD_BATCH_PARTIAL_FAILURE",
      severity: "warning",
      actionable: true,
    }),
  );

  expect(enriched.warnings?.find((warning: any) => warning.code === "CMD_BATCH_PARTIAL_FAILURE")?.message)
    .toContain("show standby brief");
});

test("partial optimized batch usa timing agregado del intento optimizado si domina al parcial secuencial", () => {
  const job = {
    index: 0,
    device: "MLS-CORE-1",
    commandCount: 3,
    commands: ["a", "b", "c"],
    result: {
      ok: false,
      action: "ios.exec.batch",
      executionStrategy: "optimized-runtime-partial-plus-sequential",
      failedSubcommandCount: 1,
      evidence: {
        timings: {
          terminalCommandService: {
            runtimeTerminalBatchOptimizedRunPlanMs: 14000,
            terminalCommandServiceTotalMs: 14200,
          },
        },
      },
      subResults: [
        { index: 0, command: "a", ok: true, durationMs: 10, result: { ok: true } },
        { index: 1, command: "b", ok: false, durationMs: 900, result: { ok: false } },
        { index: 2, command: "c", ok: true, durationMs: 800, result: { ok: true } },
      ],
    },
  };

  const performance = analyzeCommandPerformance(job, 1);

  expect(performance.durationMs).toBe(14200);
  expect(performance.dominantTiming).toBe("terminalCommandService.runtimeTerminalBatchOptimizedRunPlanMs");
});
