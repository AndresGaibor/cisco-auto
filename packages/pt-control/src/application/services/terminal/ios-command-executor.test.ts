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