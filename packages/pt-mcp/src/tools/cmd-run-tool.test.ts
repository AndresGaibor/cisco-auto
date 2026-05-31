import { describe, expect, test } from "bun:test";
import { registerCmdRunTool } from "./cmd-run-tool.js";
import { ok } from "./mcp-response.js";

function makeMockContext() {
  let callCount = 0;
  let toolHandler: ((input: any) => any) | null = null;

  return {
    callCount: () => callCount,
    getHandler: () => toolHandler,
    server: {
      registerTool: (_name: string, _schema: any, handlerFn: (input: any) => any) => {
        toolHandler = handlerFn;
      },
    },
    control: {
      terminalCommandService: {
        executeCommand: (async (_device: string, command: string, _options?: any) => {
          callCount++;
          return {
            ok: true,
            action: "ios.exec",
            device: "MLS-CORE-1",
            command,
            output: `MLS-CORE-1>${command}\n*1:19:25 UTC Mon Mar 1 1993\nMLS-CORE-1>`,
            rawOutput: "RAW_TERMINAL_OUTPUT_WITH_ESCAPE_CODES",
            status: 0,
            warnings: [],
            evidence: {
              timings: {
                adapterTotalMs: 1500,
                terminalPlanRunMs: 1400,
                terminalPlanPollBridgeWaitMs: 200,
                terminalPlanPollQueueLatencyMs: 100,
                terminalPlanPollExecLatencyMs: 400,
                terminalCommandService: {
                  terminalCommandServiceTotalMs: 1500,
                },
              },
            },
          };
        }) as any,
        resolveDeviceKind: async () => "ios" as const,
      },
    },
    defaultTimeoutMs: 30_000,
  };
}

async function executeCmdRun(ctx: ReturnType<typeof makeMockContext>, input: any): Promise<any> {
  registerCmdRunTool(ctx as any);
  const handler = ctx.getHandler();

  if (!handler) {
    throw new Error("No se registró el handler pt_cmd_run");
  }

  return handler(input);
}

describe("cmd-run-tool sequential commands", () => {
  const baseJob = {
    jobs: [{ device: "MLS-CORE-1", commands: ["show clock", "show ip interface brief", "show vlan brief"], mode: "safe" }],
    queueScope: "device",
    combineLines: true,
    continueOnError: true,
  };

  test("safe no une comandos en blob", async () => {
    const ctx = makeMockContext();
    const result = await executeCmdRun(ctx, { ...baseJob, profile: "audit" });

    expect(ctx.callCount()).toBe(3);
    expect(result.structuredContent.results[0].result.executionStrategy).toBe("sequential-subcommands");
    expect(result.structuredContent.results[0].result.subResults).toHaveLength(3);
    expect(result.structuredContent.results[0].result.subResults[0].command).toBe("show clock");
    expect(result.structuredContent.results[0].result.subResults[1].command).toBe("show ip interface brief");
    expect(result.structuredContent.results[0].result.subResults[2].command).toBe("show vlan brief");
  });

  test("raw conserva blob", async () => {
    const ctx = makeMockContext();
    const result = await executeCmdRun(ctx, {
      ...baseJob,
      jobs: [{ device: "MLS-CORE-1", commands: ["show clock", "show ip interface brief"], mode: "raw" }],
    });

    expect(ctx.callCount()).toBe(1);
    expect(result.structuredContent.results[0].result.command).toBe("show clock\nshow ip interface brief");
  });

  test("conserva subResults", async () => {
    const ctx = makeMockContext();
    const result = await executeCmdRun(ctx, { ...baseJob });

    expect(result.structuredContent.results[0].result.executionStrategy).toBe("sequential-subcommands");
    expect(result.structuredContent.results[0].result.subResults).toHaveLength(3);
    expect(result.structuredContent.results[0].result.subResults[0].command).toBe("show clock");
    expect(result.structuredContent.results[0].result.subResults[1].command).toBe("show ip interface brief");
    expect(result.structuredContent.results[0].result.subResults[2].command).toBe("show vlan brief");
  });

  test("corta si continueOnError=false", async () => {
    const ctx = makeMockContext();
    const original = ctx.control.terminalCommandService.executeCommand;
    let calls = 0;
    ctx.control.terminalCommandService.executeCommand = async (_device: string, command: string, _options?: any) => {
      calls += 1;
      if (command === "show ip interface brief") {
        return {
          ok: false,
          action: "ios.exec",
          device: "MLS-CORE-1",
          deviceKind: "ios",
          command,
          output: "% Invalid input",
          rawOutput: "% Invalid input",
          status: 1,
          warnings: [],
          evidence: {},
        };
      }

      return original(_device, command, _options);
    };

    const result = await executeCmdRun(ctx, {
      ...baseJob,
      continueOnError: false,
    });

    expect(calls).toBe(2);
    expect(result.structuredContent.results[0].result.ok).toBe(false);
    expect(result.structuredContent.results[0].result.failedSubcommandCount).toBe(1);
    expect(result.structuredContent.results[0].result.stoppedEarly).toBe(true);
  });

  test("continúa si continueOnError=true", async () => {
    const ctx = makeMockContext();
    const original = ctx.control.terminalCommandService.executeCommand;
    let calls = 0;
    ctx.control.terminalCommandService.executeCommand = async (_device: string, command: string, _options?: any) => {
      calls += 1;
      if (command === "show ip interface brief") {
        return {
          ok: false,
          action: "ios.exec",
          device: "MLS-CORE-1",
          deviceKind: "ios",
          command,
          output: "% Invalid input",
          rawOutput: "% Invalid input",
          status: 1,
          warnings: [],
          evidence: {},
        };
      }

      return original(_device, command, _options);
    };

    const result = await executeCmdRun(ctx, {
      ...baseJob,
      continueOnError: true,
    });

    expect(calls).toBe(3);
    expect(result.structuredContent.results[0].result.ok).toBe(false);
    expect(result.structuredContent.results[0].result.failedSubcommandCount).toBe(1);
    expect(result.structuredContent.results[0].result.subResults).toHaveLength(3);
  });

  test("marca performance como sequential_batch", async () => {
    const ctx = makeMockContext();
    ctx.control.terminalCommandService.executeCommand = (async (_device: string, command: string, _options?: any) => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return {
        ok: true,
        action: "ios.exec",
        device: "MLS-CORE-1",
        command,
        output: `MLS-CORE-1>${command}\n*1:19:25 UTC Mon Mar 1 1993\nMLS-CORE-1>`,
        rawOutput: "RAW_TERMINAL_OUTPUT_WITH_ESCAPE_CODES",
        status: 0,
        warnings: [],
        evidence: {
          timings: {
            adapterTotalMs: 1500,
            terminalPlanRunMs: 1400,
            terminalPlanPollBridgeWaitMs: 200,
            terminalPlanPollQueueLatencyMs: 100,
            terminalPlanPollExecLatencyMs: 400,
            terminalCommandService: {
              terminalCommandServiceTotalMs: 1500,
            },
          },
        },
      };
    }) as any;

    const result = await executeCmdRun(ctx, { ...baseJob, slowThresholdMs: 1 });

    expect(result.structuredContent.results[0].performance.category).toBe("sequential_batch");
    expect(result.structuredContent.results[0].performance.dominantTiming).toContain("result.subResults");
    expect(result.structuredContent.results[0].warnings?.[0]?.code).toBe("CMD_SLOW_SUCCESS");
  });

  test("terminalConcurrency default 1 serializa jobs aunque queueScope=device", async () => {
    const ctx = makeMockContext();
    const events: string[] = [];

    ctx.control.terminalCommandService.executeCommand = async (device: string, command: string) => {
      events.push(`start:${device}:${command}`);
      await new Promise((resolve) => setTimeout(resolve, 30));
      events.push(`end:${device}:${command}`);

      return {
        ok: true,
        action: "ios.exec",
        device,
        command,
        output: `${device}>${command}`,
        rawOutput: `${device}>${command}`,
        status: 0,
        warnings: [],
        evidence: {
          timings: {
            terminalCommandService: {
              terminalCommandServiceTotalMs: 30,
            },
          },
        },
      };
    };

    const startedAt = Date.now();

    const result = await executeCmdRun(ctx, {
      jobs: [
        { device: "SW1", commands: ["show clock"], mode: "safe" },
        { device: "SW2", commands: ["show clock"], mode: "safe" },
      ],
      queueScope: "device",
      combineLines: true,
      continueOnError: true,
      profile: "audit",
    });

    const elapsed = Date.now() - startedAt;

    expect(result.structuredContent.results).toHaveLength(2);
    expect(events).toEqual([
      "start:SW1:show clock",
      "end:SW1:show clock",
      "start:SW2:show clock",
      "end:SW2:show clock",
    ]);
    expect(elapsed).toBeGreaterThanOrEqual(40);
  });

  test("terminalConcurrency opt-in permite paralelismo experimental", async () => {
    const ctx = makeMockContext();
    const events: string[] = [];

    ctx.control.terminalCommandService.executeCommand = async (device: string, command: string) => {
      events.push(`start:${device}`);
      await new Promise((resolve) => setTimeout(resolve, 30));
      events.push(`end:${device}`);

      return {
        ok: true,
        action: "ios.exec",
        device,
        command,
        output: `${device}>${command}`,
        rawOutput: `${device}>${command}`,
        status: 0,
        warnings: [],
        evidence: {},
      };
    };

    await executeCmdRun(ctx, {
      jobs: [
        { device: "SW1", commands: ["show clock"], mode: "safe" },
        { device: "SW2", commands: ["show clock"], mode: "safe" },
      ],
      queueScope: "device",
      combineLines: true,
      continueOnError: true,
      terminalConcurrency: 2,
      profile: "audit",
    });

    expect(events.slice(0, 2)).toEqual(["start:SW1", "start:SW2"]);
  });

  test("batchStrategy sequential fuerza sequential-subcommands", async () => {
    const ctx = makeMockContext();

    const result = await executeCmdRun(ctx, {
      jobs: [{ device: "MLS-CORE-1", commands: ["show clock", "show vlan brief"], mode: "safe" }],
      queueScope: "device",
      combineLines: true,
      continueOnError: true,
      batchStrategy: "sequential",
      profile: "audit",
    });

    expect(result.structuredContent.results[0].result.executionStrategy).toBe("sequential-subcommands");
    expect(ctx.callCount()).toBe(2);
  });

  test("batchStrategy auto usa adaptive-optimized-chunks en lotes grandes", async () => {
    const ctx = makeMockContext();
    let optimizedCalls = 0;

    (ctx.control.terminalCommandService as any).executeCommandBatchOptimized = async (_device: string, commands: string[]) => {
      optimizedCalls += 1;
      return {
        ok: true,
        action: "ios.exec.batch",
        device: "MLS-CORE-1",
        deviceKind: "ios",
        command: commands.join("\n"),
        output: commands.join("\n"),
        rawOutput: commands.join("\n"),
        status: 0,
        warnings: [],
        evidence: {},
        executionStrategy: "optimized-runtime-multistep",
        failedSubcommandCount: 0,
        subResults: commands.map((command, index) => ({
          index,
          command,
          ok: true,
          status: 0,
          result: { ok: true, command, output: command, status: 0 },
          warnings: [],
        })),
      };
    };

    const result = await executeCmdRun(ctx, {
      jobs: [{
        device: "MLS-CORE-1",
        commands: ["show clock", "show vlan brief", "show cdp neighbors", "show standby brief", "show ip interface brief", "show running-config"],
        mode: "safe",
      }],
      queueScope: "device",
      combineLines: true,
      continueOnError: true,
      batchStrategy: "auto",
      experimentalAdaptiveChunks: true,
      profile: "audit",
    });

    expect(optimizedCalls).toBeGreaterThan(0);
    expect(result.structuredContent.results[0].result.executionStrategy).toBe("adaptive-optimized-chunks");
    expect(result.structuredContent.results[0].result.subResults).toHaveLength(6);
  });

  test("batchStrategy auto recupera subResults perdidos", async () => {
    const ctx = makeMockContext();
    const executedCommands: string[] = [];

    ctx.control.terminalCommandService.executeCommand = async (_device: string, command: string) => {
      executedCommands.push(command);

      return {
        ok: true,
        action: "ios.exec",
        device: "MLS-CORE-1",
        deviceKind: "ios",
        command,
        output: `ok:${command}`,
        rawOutput: `ok:${command}`,
        status: 0,
        warnings: [],
        evidence: {},
      };
    };

    (ctx.control.terminalCommandService as any).executeCommandBatchOptimized = async (_device: string, commands: string[]) => ({
      ok: false,
      action: "ios.exec.batch",
      device: "MLS-CORE-1",
      deviceKind: "ios",
      command: commands.join("\n"),
      output: commands.join("\n"),
      rawOutput: commands.join("\n"),
      status: 1,
      warnings: [],
      evidence: {},
      executionStrategy: "optimized-runtime-multistep",
      failedSubcommandCount: 0,
      subResults: [],
    });

    const result = await executeCmdRun(ctx, {
      jobs: [{
        device: "MLS-CORE-1",
        commands: ["show clock", "show vlan brief", "show cdp neighbors", "show standby brief", "show ip interface brief", "show running-config", "show version"],
        mode: "safe",
      }],
      queueScope: "device",
      combineLines: true,
      continueOnError: true,
      batchStrategy: "auto",
      experimentalAdaptiveChunks: true,
      profile: "audit",
    });

    const batchResult = result.structuredContent.results[0].result as any;

    expect(batchResult.ok).toBe(true);
    expect(batchResult.status).toBe(0);
    expect(batchResult.executionStrategy).toBe("adaptive-optimized-chunks-plus-sequential-recovery");
    expect(batchResult.adaptiveBatchRecoveryAttempted).toBe(true);
    expect(batchResult.adaptiveBatchRecoveryIndexes.length).toBeGreaterThan(0);
    expect(batchResult.failedSubcommandCount).toBe(0);
    expect(batchResult.warnings).toBeUndefined();
    expect(executedCommands.length).toBeGreaterThan(0);
  });

  test("batchStrategy auto recupera chunks fallidos", async () => {
    const ctx = makeMockContext();
    let chunkCalls = 0;

    ctx.control.terminalCommandService.executeCommand = async (_device: string, command: string) => ({
      ok: true,
      action: "ios.exec",
      device: "MLS-CORE-1",
      deviceKind: "ios",
      command,
      output: `ok:${command}`,
      rawOutput: `ok:${command}`,
      status: 0,
      warnings: [],
      evidence: {},
    });

    (ctx.control.terminalCommandService as any).executeCommandBatchOptimized = async (_device: string, commands: string[]) => {
      chunkCalls += 1;

      if (chunkCalls === 2) {
        return {
          ok: false,
          action: "ios.exec.batch",
          device: "MLS-CORE-1",
          deviceKind: "ios",
          command: commands.join("\n"),
          output: "",
          rawOutput: "",
          status: 1,
          warnings: [],
          evidence: {},
          executionStrategy: "optimized-runtime-multistep",
          failedSubcommandCount: 0,
          subResults: [],
        };
      }

      return {
        ok: true,
        action: "ios.exec.batch",
        device: "MLS-CORE-1",
        deviceKind: "ios",
        command: commands.join("\n"),
        output: commands.join("\n"),
        rawOutput: commands.join("\n"),
        status: 0,
        warnings: [],
        evidence: {},
        executionStrategy: "optimized-runtime-multistep",
        failedSubcommandCount: 0,
        subResults: commands.map((command, index) => ({
          index,
          command,
          ok: true,
          status: 0,
          result: { ok: true, command, output: command, status: 0 },
          warnings: [],
        })),
      };
    };

    const result = await executeCmdRun(ctx, {
      jobs: [{
        device: "MLS-CORE-1",
        commands: ["show clock", "show vlan brief", "show cdp neighbors", "show standby brief", "show ip interface brief", "show running-config", "show version"],
        mode: "safe",
      }],
      queueScope: "device",
      combineLines: true,
      continueOnError: true,
      batchStrategy: "auto",
      experimentalAdaptiveChunks: true,
      profile: "audit",
    });

    const batchResult = result.structuredContent.results[0].result as any;

    expect(chunkCalls).toBeGreaterThan(1);
    expect(batchResult.ok).toBe(true);
    expect(batchResult.executionStrategy).toBe("adaptive-optimized-chunks-plus-sequential-recovery");
    expect(batchResult.adaptiveBatchRecoveryAttempted).toBe(true);
    expect(batchResult.failedSubcommandCount).toBe(0);
  });

  test("batchStrategy auto recupera subResults faltantes en chunks adaptativos", async () => {
    const ctx = makeMockContext();
    let chunkCalls = 0;

    ctx.control.terminalCommandService.executeCommand = async (_device: string, command: string) => ({
      ok: true,
      action: "ios.exec",
      device: "MLS-CORE-1",
      deviceKind: "ios",
      command,
      output: `ok:${command}`,
      rawOutput: `ok:${command}`,
      status: 0,
      warnings: [],
      evidence: {},
    });

    (ctx.control.terminalCommandService as any).executeCommandBatchOptimized = async (_device: string, commands: string[]) => {
      chunkCalls += 1;

      if (chunkCalls === 1) {
        return {
          ok: true,
          action: "ios.exec.batch",
          device: "MLS-CORE-1",
          deviceKind: "ios",
          command: commands.join("\n"),
          output: commands.join("\n"),
          rawOutput: commands.join("\n"),
          status: 0,
          warnings: [],
          evidence: {},
          executionStrategy: "optimized-runtime-multistep",
          failedSubcommandCount: 0,
          subResults: commands.map((command, index) => ({
            index,
            command,
            ok: true,
            status: 0,
            result: { ok: true, command, output: command, status: 0 },
            warnings: [],
          })),
        };
      }

      if (chunkCalls === 2) {
        return {
          ok: false,
          action: "ios.exec.batch",
          device: "MLS-CORE-1",
          deviceKind: "ios",
          command: commands.join("\n"),
          output: "",
          rawOutput: "",
          status: 1,
          warnings: [],
          evidence: {},
          executionStrategy: "optimized-runtime-multistep",
          failedSubcommandCount: 0,
          subResults: [],
        };
      }

      if (chunkCalls === 3) {
        return {
          ok: true,
          action: "ios.exec.batch",
          device: "MLS-CORE-1",
          deviceKind: "ios",
          command: commands.join("\n"),
          output: commands.join("\n"),
          rawOutput: commands.join("\n"),
          status: 0,
          warnings: [],
          evidence: {},
          executionStrategy: "optimized-runtime-multistep",
          failedSubcommandCount: 0,
          subResults: commands.map((command, index) => ({
            index,
            command,
            ok: true,
            status: 0,
            result: { ok: true, command, output: command, status: 0 },
            warnings: [],
          })),
        };
      }

      return {
        ok: false,
        action: "ios.exec.batch",
        device: "MLS-CORE-1",
        deviceKind: "ios",
        command: commands.join("\n"),
        output: "",
        rawOutput: "",
        status: 1,
        warnings: [],
        evidence: {},
        executionStrategy: "optimized-runtime-multistep",
        failedSubcommandCount: 0,
        subResults: [],
      };
    };

    const result = await executeCmdRun(ctx, {
      jobs: [{
        device: "MLS-CORE-1",
        commands: [
          "show clock",
          "show vlan brief",
          "show cdp neighbors",
          "show standby brief",
          "show ip interface brief",
          "show interfaces trunk",
          "show running-config",
        ],
        mode: "safe",
      }],
      queueScope: "device",
      combineLines: true,
      continueOnError: true,
      batchStrategy: "auto",
      experimentalAdaptiveChunks: true,
      profile: "audit",
    });

    const batchResult = result.structuredContent.results[0].result as any;

    expect(chunkCalls).toBeGreaterThan(3);
    expect(batchResult.ok).toBe(true);
    expect(batchResult.status).toBe(0);
    expect(batchResult.executionStrategy).toBe("adaptive-optimized-chunks-plus-sequential-recovery");
    expect(batchResult.adaptiveBatchRecoveryAttempted).toBe(true);
    expect(batchResult.failedSubcommandCount).toBe(0);
    expect(batchResult.error).toBeUndefined();
  });

  test("batchStrategy auto recupera comandos faltantes por via secuencial", async () => {
    const ctx = makeMockContext();
    const executedCommands: string[] = [];

    ctx.control.terminalCommandService.executeCommand = async (_device: string, command: string) => {
      executedCommands.push(command);

      return {
        ok: true,
        action: "ios.exec",
        device: "MLS-CORE-1",
        deviceKind: "ios",
        command,
        output: `ok:${command}`,
        rawOutput: `ok:${command}`,
        status: 0,
        warnings: [],
        evidence: {},
      };
    };

    (ctx.control.terminalCommandService as any).executeCommandBatchOptimized = async (_device: string, commands: string[]) => {
      if (commands.includes("show interfaces trunk")) {
        return {
          ok: false,
          action: "ios.exec.batch",
          device: "MLS-CORE-1",
          deviceKind: "ios",
          command: commands.join("\n"),
          output: "",
          rawOutput: "",
          status: 1,
          warnings: [],
          evidence: {},
          executionStrategy: "optimized-runtime-multistep",
          failedSubcommandCount: 0,
          subResults: [],
        };
      }

      return {
        ok: true,
        action: "ios.exec.batch",
        device: "MLS-CORE-1",
        deviceKind: "ios",
        command: commands.join("\n"),
        output: commands.join("\n"),
        rawOutput: commands.join("\n"),
        status: 0,
        warnings: [],
        evidence: {},
        executionStrategy: "optimized-runtime-multistep",
        failedSubcommandCount: 0,
        subResults: commands.map((command, index) => ({
          index,
          command,
          ok: true,
          status: 0,
          result: { ok: true, command, output: command, status: 0 },
          warnings: [],
        })),
      };
    };

    const result = await executeCmdRun(ctx, {
      jobs: [{
        device: "MLS-CORE-1",
        commands: [
          "show clock",
          "show vlan brief",
          "show interfaces trunk",
          "show cdp neighbors",
          "show standby brief",
          "show ip interface brief",
          "show running-config",
        ],
        mode: "safe",
      }],
      queueScope: "device",
      combineLines: true,
      continueOnError: true,
      batchStrategy: "auto",
      experimentalAdaptiveChunks: true,
      profile: "audit",
    });

    const batchResult = result.structuredContent.results[0].result as any;

    expect(batchResult.ok).toBe(true);
    expect(batchResult.status).toBe(0);
    expect(batchResult.executionStrategy).toBe("adaptive-optimized-chunks-plus-sequential-recovery");
    expect(batchResult.adaptiveBatchRecoveryAttempted).toBe(true);
    expect(batchResult.adaptiveBatchRecoveryIndexes).toContain(2);
    expect(batchResult.subResults).toHaveLength(7);
    expect(batchResult.subResults.map((item: any) => item.index)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(executedCommands).toContain("show interfaces trunk");
  });

  test("batchStrategy auto conserva error si recovery no completa todo", async () => {
    const ctx = makeMockContext();

    ctx.control.terminalCommandService.executeCommand = async (_device: string, command: string) => {
      if (command === "show interfaces trunk") {
        return {
          ok: false,
          action: "ios.exec",
          device: "MLS-CORE-1",
          deviceKind: "ios",
          command,
          output: "",
          rawOutput: "",
          status: 1,
          warnings: [],
          error: {
            code: "IOS_EXEC_FAILED",
            message: "command failed",
          },
          evidence: {},
        };
      }

      return {
        ok: true,
        action: "ios.exec",
        device: "MLS-CORE-1",
        deviceKind: "ios",
        command,
        output: `ok:${command}`,
        rawOutput: `ok:${command}`,
        status: 0,
        warnings: [],
        evidence: {},
      };
    };

    (ctx.control.terminalCommandService as any).executeCommandBatchOptimized = async (_device: string, commands: string[]) => {
      if (commands.includes("show interfaces trunk")) {
        return {
          ok: false,
          action: "ios.exec.batch",
          device: "MLS-CORE-1",
          deviceKind: "ios",
          command: commands.join("\n"),
          output: "",
          rawOutput: "",
          status: 1,
          warnings: [],
          evidence: {},
          executionStrategy: "optimized-runtime-multistep",
          failedSubcommandCount: 0,
          subResults: [],
        };
      }

      return {
        ok: true,
        action: "ios.exec.batch",
        device: "MLS-CORE-1",
        deviceKind: "ios",
        command: commands.join("\n"),
        output: commands.join("\n"),
        rawOutput: commands.join("\n"),
        status: 0,
        warnings: [],
        evidence: {},
        executionStrategy: "optimized-runtime-multistep",
        failedSubcommandCount: 0,
        subResults: commands.map((command, index) => ({
          index,
          command,
          ok: true,
          status: 0,
          result: { ok: true, command, output: command, status: 0 },
          warnings: [],
        })),
      };
    };

    const result = await executeCmdRun(ctx, {
      jobs: [{
        device: "MLS-CORE-1",
        commands: [
          "show clock",
          "show vlan brief",
          "show cdp neighbors",
          "show interfaces trunk",
          "show standby brief",
          "show ip interface brief",
          "show running-config",
        ],
        mode: "safe",
      }],
      queueScope: "device",
      combineLines: true,
      continueOnError: true,
      batchStrategy: "auto",
      experimentalAdaptiveChunks: true,
      profile: "audit",
    });

    const batchResult = result.structuredContent.results[0].result as any;

    expect(batchResult.ok).toBe(false);
    expect(batchResult.status).toBe(1);
    expect(batchResult.error?.code).toBe("IOS_BATCH_SUBCOMMAND_FAILED");
    expect(batchResult.warnings?.some((warning: any) => warning.code === "CMD_BATCH_PARTIAL_FAILURE")).toBe(true);
  });

  test("batchStrategy auto timeouts de recovery retornan sin colgar", async () => {
    const ctx = makeMockContext();
    ctx.control.terminalCommandService.executeCommand = async (_device: string, command: string) => {
      if (command === "show interfaces trunk") {
        await new Promise(() => {});
      }

      return {
        ok: true,
        action: "ios.exec",
        device: "MLS-CORE-1",
        deviceKind: "ios",
        command,
        output: `ok:${command}`,
        rawOutput: `ok:${command}`,
        status: 0,
        warnings: [],
        evidence: {},
      };
    };

    (ctx.control.terminalCommandService as any).executeCommandBatchOptimized = async (_device: string, commands: string[]) => {
      if (commands.includes("show interfaces trunk")) {
        return {
          ok: false,
          action: "ios.exec.batch",
          device: "MLS-CORE-1",
          deviceKind: "ios",
          command: commands.join("\n"),
          output: "",
          rawOutput: "",
          status: 1,
          warnings: [],
          evidence: {},
          executionStrategy: "optimized-runtime-multistep",
          failedSubcommandCount: 0,
          subResults: [],
        };
      }

      return {
        ok: true,
        action: "ios.exec.batch",
        device: "MLS-CORE-1",
        deviceKind: "ios",
        command: commands.join("\n"),
        output: commands.join("\n"),
        rawOutput: commands.join("\n"),
        status: 0,
        warnings: [],
        evidence: {},
        executionStrategy: "optimized-runtime-multistep",
        failedSubcommandCount: 0,
        subResults: commands.map((command, index) => ({
          index,
          command,
          ok: true,
          status: 0,
          result: { ok: true, command, output: command, status: 0 },
          warnings: [],
        })),
      };
    };

    const promise = executeCmdRun(ctx, {
      jobs: [{
        device: "MLS-CORE-1",
        commands: ["show clock", "show vlan brief", "show cdp neighbors", "show interfaces trunk", "show standby brief", "show ip interface brief", "show running-config"],
        mode: "safe",
      }],
      queueScope: "device",
      combineLines: true,
      continueOnError: true,
      batchStrategy: "auto",
      experimentalAdaptiveChunks: true,
      profile: "audit",
      timeoutMs: 1_000,
    });

    const result = await Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("test_timeout")), 2_000)),
    ]);

    const batchResult = result.structuredContent.results[0].result as any;

    expect(batchResult.ok).toBe(false);
    expect(batchResult.status).toBe(1);
    expect(batchResult.error?.code).toBe("IOS_BATCH_SUBCOMMAND_FAILED");
    expect(batchResult.warnings?.some((warning: any) => warning.code === "CMD_BATCH_PARTIAL_FAILURE")).toBe(true);
  });

  test("continueOnError=false conserva stop-on-error serial", async () => {
    const ctx = makeMockContext();
    const calls: string[] = [];

    ctx.control.terminalCommandService.executeCommand = async (_device: string, command: string) => {
      calls.push(command);

      if (command === "show ip interface brief") {
        return {
          ok: false,
          action: "ios.exec",
          device: "SW1",
          deviceKind: "ios",
          command,
          output: "% Invalid input",
          rawOutput: "% Invalid input",
          status: 1,
          warnings: [],
          evidence: {},
        };
      }

      return {
        ok: true,
        action: "ios.exec",
        device: "SW1",
        command,
        output: `SW1>${command}`,
        rawOutput: `SW1>${command}`,
        status: 0,
        warnings: [],
        evidence: {},
      };
    };

    const result = await executeCmdRun(ctx, {
      ...baseJob,
      continueOnError: false,
    });

    expect(calls).toEqual(["show clock", "show ip interface brief"]);
    expect(result.structuredContent.results[0].result.failedSubcommandCount).toBe(1);
    expect(result.structuredContent.results[0].result.stoppedEarly).toBe(true);
  });
});


test("usa optimized-runtime-multistep cuando executeCommandBatchOptimized esta disponible", async () => {
  const ctx = makeMockContext();
  (ctx.control.terminalCommandService as any).executeCommandBatchOptimized = async (_device: string, commands: string[]) => ({
    ok: true,
    action: "ios.exec.batch",
    device: "MLS-CORE-1",
    deviceKind: "ios",
    command: commands.join("\n"),
    output: "optimized output",
    rawOutput: "optimized raw",
    status: 0,
    warnings: [],
    evidence: {},
    executionStrategy: "optimized-runtime-multistep",
    failedSubcommandCount: 0,
    subResults: commands.map((command, index) => ({
      index,
      command,
      ok: true,
      status: 0,
      durationMs: 100 + index,
      result: {
        ok: true,
        command,
        output: `${command} output`,
        status: 0,
      },
      warnings: [],
    })),
  });

  const result = await executeCmdRun(ctx, {
    jobs: [{ device: "MLS-CORE-1", commands: ["show clock", "show vlan brief"], mode: "safe" }],
    queueScope: "device",
    combineLines: true,
    continueOnError: true,
    profile: "audit",
  });

  expect(ctx.callCount()).toBe(0);
  expect(result.structuredContent.results[0].result.executionStrategy).toBe("optimized-runtime-multistep");
  expect(result.structuredContent.results[0].result.subResults).toHaveLength(2);
});

test("resume desde optimized parcial sin repetir comandos ya completados", async () => {
  const ctx = makeMockContext();
  const sequentialCalls: string[] = [];
  (ctx.control.terminalCommandService as any).executeCommandBatchOptimized = async (_device: string, commands: string[]) => ({
    ok: false,
    action: "ios.exec.batch",
    device: "MLS-CORE-1",
    deviceKind: "ios",
    command: commands.join("\n"),
    output: "optimized partial output",
    rawOutput: "optimized partial raw",
    status: 1,
    warnings: [],
    evidence: {},
    optimizedBatchPartial: true,
    optimizedBatchMatchedCommandCount: 7,
    optimizedBatchNextCommandIndex: 7,
    subResults: commands.slice(0, 7).map((command, index) => ({
      index,
      command,
      ok: true,
      status: 0,
      durationMs: 10,
      result: { ok: true, action: "ios.exec", command, output: command, rawOutput: command, status: 0, warnings: [] },
      warnings: [],
    })),
  });
  const originalExecuteCommand = ctx.control.terminalCommandService.executeCommand;
  ctx.control.terminalCommandService.executeCommand = async (device: string, command: string, options?: any) => {
    sequentialCalls.push(command);
    return originalExecuteCommand(device, command, options);
  };

  const result = await executeCmdRun(ctx, {
    jobs: [{ device: "MLS-CORE-1", commands: ["show clock", "show ip interface brief", "show vlan brief", "show interfaces trunk", "show etherchannel summary", "show spanning-tree summary", "show ip route", "show standby brief", "show cdp neighbors", "show version"], mode: "safe" }],
    queueScope: "device",
    combineLines: true,
    continueOnError: true,
    profile: "audit",
  });

  expect(ctx.callCount()).toBe(3);
  expect(sequentialCalls).toEqual(["show standby brief", "show cdp neighbors", "show version"]);
  expect(result.structuredContent.results[0].result.executionStrategy).toBe("optimized-runtime-partial-plus-sequential");
  expect(result.structuredContent.results[0].result.optimizedRuntimeBatchAttempted).toBe(true);
  expect(result.structuredContent.results[0].result.optimizedRuntimeBatchAvailable).toBe(true);
  expect(result.structuredContent.results[0].result.optimizedRuntimeBatchFallbackReason).toBe("partial_stepResults");
  expect(result.structuredContent.results[0].result.optimizedRuntimeBatchPartial).toBe(true);
  expect(result.structuredContent.results[0].result.optimizedRuntimeBatchNextCommandIndex).toBe(7);
  expect(result.structuredContent.results[0].result.subResults).toHaveLength(10);
});

test("fallback a sequential-subcommands si optimized retorna null", async () => {
  const ctx = makeMockContext();
  (ctx.control.terminalCommandService as any).executeCommandBatchOptimized = async () => null;

  const result = await executeCmdRun(ctx, {
    jobs: [{ device: "MLS-CORE-1", commands: ["show clock", "show vlan brief"], mode: "safe" }],
    queueScope: "device",
    combineLines: true,
    continueOnError: true,
    profile: "audit",
  });

  expect(ctx.callCount()).toBe(2);
  expect(result.structuredContent.results[0].result.executionStrategy).toBe("sequential-subcommands");
});

test("expone telemetria cuando optimized no esta disponible", async () => {
  const ctx = makeMockContext();

  const result = await executeCmdRun(ctx, {
    jobs: [{ device: "MLS-CORE-1", commands: ["show clock", "show vlan brief"], mode: "safe" }],
    queueScope: "device",
    combineLines: true,
    continueOnError: true,
    profile: "audit",
  });

  const batchResult = result.structuredContent.results[0].result as Record<string, unknown>;

  expect(batchResult.executionStrategy).toBe("sequential-subcommands");
  expect(batchResult.optimizedRuntimeBatchAttempted).toBe(true);
  expect(batchResult.optimizedRuntimeBatchAvailable).toBe(false);
  expect(batchResult.optimizedRuntimeBatchFallbackReason).toBe("method_missing");
});

test("propaga diagnostics de optimized batch rejected al fallback secuencial", async () => {
  const ctx = makeMockContext();
  (ctx.control.terminalCommandService as any).executeCommandBatchOptimized = async () => ({
    ok: false,
    optimizedBatchRejected: true,
    optimizedBatchReason: "command_mismatch",
    optimizedBatchExpectedCommands: ["show clock", "show vlan brief"],
    optimizedBatchRuntimeStepCommands: ["MLS-CORE-1>show clock"],
    optimizedBatchUnmatchedCommands: ["show vlan brief"],
    optimizedBatchPlanStepSummary: [{ index: 0, command: "show clock", internal: false }],
  });

  const result = await executeCmdRun(ctx, {
    jobs: [{ device: "MLS-CORE-1", commands: ["show clock", "show vlan brief"], mode: "safe" }],
    queueScope: "device",
    combineLines: true,
    continueOnError: true,
    profile: "audit",
  });

  const batchResult = result.structuredContent.results[0].result as Record<string, unknown>;

  expect(batchResult.optimizedRuntimeBatchFallbackReason).toBe("command_mismatch");
  expect((batchResult.evidence as any).optimizedBatchDiagnostics.runtimeStepCommands).toEqual(["MLS-CORE-1>show clock"]);
});
