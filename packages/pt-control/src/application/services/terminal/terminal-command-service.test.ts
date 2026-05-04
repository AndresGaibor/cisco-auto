import { describe, expect, test, vi } from "bun:test";
import { createTerminalCommandService } from "./terminal-command-service.js";

describe("TerminalCommandService IOS semantic errors", () => {
  test("convierte % Invalid input detected en ok:false aunque runtimeResult.ok sea true", async () => {
    const service = createTerminalCommandService({
      generateId: () => "test-plan-1",
      controller: {
        inspectDeviceFast: async () => ({ type: "switch", model: "2960" }),
        inspectDevice: async () => ({ type: "switch", model: "2960" }),
        execIos: async () => ({ ok: true }),
        execHost: async () => ({ success: true }),
      } as any,
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
        ensureSession: async () => ({ ok: true } as any),
        pollTerminalJob: async () => null,
      } as any,
    });

    const result = await service.executeCommand("SW-SRV-DIST", "hostname SW-SRV-DIST", {
      timeoutMs: 12000,
      mode: "safe",
    } as any);

    expect(result.ok).toBe(false);
    expect(result.status).toBe(1);
    expect(result.error?.code).toBe("IOS_INVALID_INPUT");
    expect(result.output).toContain("% Invalid input detected");
  });

  test("mantiene show version como ok:true", async () => {
    const service = createTerminalCommandService({
      generateId: () => "test-plan-2",
      controller: {
        inspectDeviceFast: async () => ({ type: "switch", model: "2960" }),
        inspectDevice: async () => ({ type: "switch", model: "2960" }),
        execIos: async () => ({ ok: true }),
        execHost: async () => ({ success: true }),
      } as any,
      runtimeTerminal: {
        runTerminalPlan: async () => ({
          ok: true,
          output: "Cisco IOS Software, C2960 Software",
          rawOutput: "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software\nSW-SRV-DIST#",
          status: 0,
          warnings: [],
          evidence: { test: true },
        }),
        ensureSession: async () => ({ ok: true } as any),
        pollTerminalJob: async () => null,
      } as any,
    });

    const result = await service.executeCommand("SW-SRV-DIST", "show version", {
      timeoutMs: 12000,
      mode: "safe",
    } as any);

    expect(result.ok).toBe(true);
    expect(result.status).toBe(0);
    expect(result.error).toBeUndefined();
  });

  test("preserva el error semántico aunque runtimeResult.output venga recortado", async () => {
    const service = createTerminalCommandService({
      generateId: () => "test-plan-3",
      controller: {
        inspectDeviceFast: async () => ({ type: "switch", model: "2960" }),
        inspectDevice: async () => ({ type: "switch", model: "2960" }),
        execIos: async () => ({ ok: true }),
        execHost: async () => ({ success: true }),
      } as any,
      runtimeTerminal: {
        runTerminalPlan: async () => ({
          ok: false,
          output: "end\nSW-SRV-DIST#",
          rawOutput: "end\nSW-SRV-DIST#",
          status: 1,
          error: {
            code: "IOS_INVALID_INPUT",
            message: "SW-SRV-DIST(config-if-range)#channel-group 7 mode active\n                                             ^\n% Invalid input detected at '^' marker.",
          },
          parsed: {
            result: {
              ok: false,
              rawOutput:
                "SW-SRV-DIST(config-if-range)#channel-group 7 mode active\n                                             ^\n% Invalid input detected at '^' marker.",
              output:
                "SW-SRV-DIST(config-if-range)#channel-group 7 mode active\n                                             ^\n% Invalid input detected at '^' marker.",
            },
          },
          warnings: [],
          evidence: { test: true },
        }),
        ensureSession: async () => ({ ok: true } as any),
        pollTerminalJob: async () => null,
      } as any,
    });

    const result = await service.executeCommand("SW-SRV-DIST", "channel-group 7 mode active", {
      timeoutMs: 12000,
      mode: "safe",
    } as any);

    expect(result.ok).toBe(false);
    expect(result.status).toBe(1);
    expect(result.error?.code).toBe("IOS_INVALID_INPUT");
    expect(result.error?.message).toContain("channel-group 7 mode active");
    expect(result.error?.message).toContain("Invalid input detected");
    expect(result.error?.message).not.toContain("[cleanup]");
    expect(result.error?.message).not.toContain("%SYS-5-CONFIG_I");
  });

  test("usa rawOutput para detectar error semántico cuando output viene recortado", async () => {
    const service = createTerminalCommandService({
      generateId: () => "test-plan-raw-semantic",
      controller: {
        inspectDeviceFast: async () => ({ type: "switch", model: "2960" }),
        inspectDevice: async () => ({ type: "switch", model: "2960" }),
        execIos: async () => ({ ok: true }),
        execHost: async () => ({ success: true }),
      } as any,
      runtimeTerminal: {
        runTerminalPlan: async () => ({
          ok: true,
          output: "SW-SRV-DIST#",
          rawOutput:
            "SW-SRV-DIST(config-if-range)#channel-group 7 mode active\n                                             ^\n% Invalid input detected at '^' marker.",
          status: 0,
          warnings: [],
          evidence: { test: true },
        }),
        ensureSession: async () => ({ ok: true } as any),
        pollTerminalJob: async () => null,
      } as any,
    });

    const result = await service.executeCommand("SW-SRV-DIST", "channel-group 7 mode active", {
      timeoutMs: 12000,
      mode: "safe",
    } as any);

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("IOS_INVALID_INPUT");
    expect(result.error?.message).toContain("channel-group 7 mode active");
  });

  test("auto-config falla si runtime termina en config-if", async () => {
    const service = createTerminalCommandService({
      generateId: () => "test-autoconfig-mode-fail",
      controller: {
        inspectDeviceFast: async () => ({ type: "switch", model: "2960" }),
        inspectDevice: async () => ({ type: "switch", model: "2960" }),
        execIos: async () => ({ ok: true }),
        execHost: async () => ({ success: true }),
      } as any,
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
        ensureSession: async () => ({ ok: true } as any),
        pollTerminalJob: async () => null,
      } as any,
    });

    const result = await service.executeCommand("SW1", "interface f0/6\nno description", {
      timeoutMs: 12000,
      mode: "safe",
    } as any);

    expect(result.ok).toBe(false);
    expect(result.status).toBe(1);
    expect(result.error?.code).toBe("IOS_AUTOCONFIG_DID_NOT_EXIT_CONFIG_MODE");
  });

  test("auto-config acepta éxito cuando termina en privileged-exec", async () => {
    const service = createTerminalCommandService({
      generateId: () => "test-autoconfig-mode-ok",
      controller: {
        inspectDeviceFast: async () => ({ type: "switch", model: "2960" }),
        inspectDevice: async () => ({ type: "switch", model: "2960" }),
        execIos: async () => ({ ok: true }),
        execHost: async () => ({ success: true }),
      } as any,
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
        ensureSession: async () => ({ ok: true } as any),
        pollTerminalJob: async () => null,
      } as any,
    });

    const result = await service.executeCommand("SW1", "interface f0/6\nno description", {
      timeoutMs: 12000,
      mode: "safe",
    } as any);

    expect(result.ok).toBe(true);
    expect(result.status).toBe(0);
  });

  test("cachea resolveDeviceKind para host y registra miss/hit en timings", async () => {
    const inspectDeviceFast = vi.fn().mockResolvedValue({ type: "pc", model: "PC-PT" });
    const execHost = vi.fn().mockResolvedValue({
      success: true,
      raw: "IP Configuration",
      verdict: { ok: true },
      parsed: { source: "host" },
    });

    const service = createTerminalCommandService({
      generateId: () => "host-cache-id",
      controller: {
        inspectDeviceFast,
        inspectDevice: async () => ({ type: "pc", model: "PC-PT" }),
        execHost,
        execIos: async () => ({ ok: true }),
      } as any,
      runtimeTerminal: null,
    });

    const uniqueDevice = "PC_UNIQUE_" + Date.now();
    const first = await service.executeCommand(uniqueDevice, "ipconfig");
    const second = await service.executeCommand(uniqueDevice, "ipconfig");

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(inspectDeviceFast).toHaveBeenCalledTimes(1);

    const firstTimings = (first.evidence as any)?.timings?.terminalCommandService;
    const secondTimings = (second.evidence as any)?.timings?.terminalCommandService;

    expect(firstTimings.resolveDeviceKindCacheMiss).toBe(1);
    expect(firstTimings.inspectDeviceFastMs).toBeGreaterThanOrEqual(0);
    expect(secondTimings.resolveDeviceKindCacheHit).toBe(1);
    expect(secondTimings.resolveDeviceKindMs).toBeGreaterThanOrEqual(0);
  });

  test("auto-config acepta rawOutput con prompt privilegiado aunque promptAfter venga stale en config-if", async () => {
    const service = createTerminalCommandService({
      generateId: () => "test-autoconfig-stale-prompt-raw-ok",
      controller: {
        inspectDeviceFast: async () => ({ type: "switch", model: "2960" }),
        inspectDevice: async () => ({ type: "switch", model: "2960" }),
        execIos: async () => ({ ok: true }),
        execHost: async () => ({ success: true }),
      } as any,
      runtimeTerminal: {
        runTerminalPlan: async () => ({
          ok: true,
          output: "end",
          rawOutput: "end\n\n\nSW-SRV-DIST#",
          status: 0,
          modeAfter: "config",
          promptAfter: "SW-SRV-DIST(config-if)#",
          warnings: [],
          evidence: { test: true },
        }),
        ensureSession: async () => ({ ok: true } as any),
        pollTerminalJob: async () => null,
      } as any,
    });

    const result = await service.executeCommand(
      "SW-SRV-DIST",
      "interface f0/6\nno switchport trunk allowed vlan\nno switchport trunk native vlan\nswitchport mode access\nshutdown",
      {
        timeoutMs: 12000,
        mode: "safe",
      } as any,
    );

    expect(result.ok).toBe(true);
    expect(result.status).toBe(0);
    expect(result.error).toBeUndefined();
  });

  test("bloquea comandos de configuracion si el heartbeat supera 10s", async () => {
    let runTerminalPlanCalls = 0;

    const service = createTerminalCommandService({
      generateId: () => "test-heartbeat-config-block",
      controller: {
        inspectDeviceFast: async () => ({ type: "switch", model: "2960" }),
        inspectDevice: async () => ({ type: "switch", model: "2960" }),
        getHeartbeatHealth: () => ({ state: "stale", ageMs: 11001, lastSeenTs: Date.now() - 11001 }),
        execIos: async () => ({ ok: true }),
        execHost: async () => ({ success: true }),
      } as any,
      runtimeTerminal: {
        runTerminalPlan: async () => {
          runTerminalPlanCalls++;

          return {
          ok: true,
          output: "SW1(config-if)#no description",
          rawOutput: "SW1(config)#interface f0/6\nSW1(config-if)#no description\nSW1(config-if)#",
          status: 0,
          modeAfter: "privileged-exec",
          promptAfter: "SW1#",
          warnings: [],
          evidence: { test: true },
          };
        },
        ensureSession: async () => ({ ok: true } as any),
        pollTerminalJob: async () => null,
      } as any,
    });

    const result = await service.executeCommand("SW1", "interface f0/6\nno description", {
      timeoutMs: 12000,
      mode: "safe",
    } as any);

    expect(result.ok).toBe(false);
    expect(result.status).toBe(1);
    expect(result.error?.code).toBe("PT_RUNTIME_UNAVAILABLE");
    expect(result.error?.phase).toBe("detection");
    expect(runTerminalPlanCalls).toBe(0);
  });

  test("permite show version si el heartbeat sigue bajo 20s", async () => {
    let runTerminalPlanCalls = 0;
    const runtimePlan = {
      ok: true,
      output: "Cisco IOS Software, C2960 Software",
      rawOutput: "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software\nSW-SRV-DIST#",
      status: 0,
      warnings: [],
      evidence: { test: true },
    };

    const service = createTerminalCommandService({
      generateId: () => "test-heartbeat-show-allowed",
      controller: {
        inspectDeviceFast: async () => ({ type: "switch", model: "2960" }),
        inspectDevice: async () => ({ type: "switch", model: "2960" }),
        getHeartbeatHealth: () => ({ state: "stale", ageMs: 11001, lastSeenTs: Date.now() - 11001 }),
        execIos: async () => ({ ok: true }),
        execHost: async () => ({ success: true }),
      } as any,
      runtimeTerminal: {
        runTerminalPlan: async () => {
          runTerminalPlanCalls++;
          return runtimePlan as any;
        },
        ensureSession: async () => ({ ok: true } as any),
        pollTerminalJob: async () => null,
      } as any,
    });

    const result = await service.executeCommand("SW-SRV-DIST", "show version", {
      timeoutMs: 12000,
      mode: "safe",
    } as any);

    expect(result.ok).toBe(true);
    expect(result.status).toBe(0);
    expect(result.error).toBeUndefined();
    expect(runTerminalPlanCalls).toBe(1);
  });

  test("falla rapido antes de inspectDeviceFast si el heartbeat supera 20s", async () => {
    const inspectDeviceFast = vi.fn().mockImplementation(async () => {
      throw new Error("inspectDeviceFast no debio ejecutarse");
    });

    const service = createTerminalCommandService({
      generateId: () => "test-heartbeat-preflight-before-inspect",
      controller: {
        inspectDeviceFast,
        inspectDevice: vi.fn().mockResolvedValue(null),
        execIos: vi.fn(),
        execHost: vi.fn(),
        getHeartbeatHealth: () => ({
          state: "stale",
          ageMs: 39_604,
          lastSeenTs: Date.now() - 39_604,
        }),
      } as any,
      runtimeTerminal: {
        runTerminalPlan: vi.fn(),
        ensureSession: vi.fn(),
        pollTerminalJob: vi.fn(),
      } as any,
    });

    const result = await service.executeCommand("SW-SRV-DIST", "show version");

    expect(result.ok).toBe(false);
    expect(result.deviceKind).toBe("unknown");
    expect(result.error?.code).toBe("PT_RUNTIME_UNAVAILABLE");
    expect(inspectDeviceFast).not.toHaveBeenCalled();

    const timings = (result.evidence as any)?.timings?.terminalCommandService;
    expect(timings.executeCommandHeartbeatMs).toBeGreaterThanOrEqual(0);
    expect(timings.executeCommandHeartbeatAgeMs).toBeGreaterThanOrEqual(0);
    expect(timings.resolveDeviceKindMs).toBeUndefined();
    expect(timings.inspectDeviceFastMs).toBeUndefined();
  });

  test("bloquea show version si el heartbeat supera 20s", async () => {
    let runTerminalPlanCalls = 0;
    const service = createTerminalCommandService({
      generateId: () => "test-heartbeat-show-block",
      controller: {
        inspectDeviceFast: async () => ({ type: "switch", model: "2960" }),
        inspectDevice: async () => ({ type: "switch", model: "2960" }),
        getHeartbeatHealth: () => ({ state: "stale", ageMs: 20001, lastSeenTs: Date.now() - 20001 }),
        execIos: async () => ({ ok: true }),
        execHost: async () => ({ success: true }),
      } as any,
      runtimeTerminal: {
        runTerminalPlan: async () => {
          runTerminalPlanCalls++;

          return {
          ok: true,
          output: "Cisco IOS Software, C2960 Software",
          rawOutput: "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software\nSW-SRV-DIST#",
          status: 0,
          warnings: [],
          evidence: { test: true },
          };
        },
        ensureSession: async () => ({ ok: true } as any),
        pollTerminalJob: async () => null,
      } as any,
    });

    const result = await service.executeCommand("SW-SRV-DIST", "show version", {
      timeoutMs: 12000,
      mode: "safe",
    } as any);

    expect(result.ok).toBe(false);
    expect(result.status).toBe(1);
    expect(result.error?.code).toBe("PT_RUNTIME_UNAVAILABLE");
    expect(result.error?.phase).toBe("detection");
    expect(runTerminalPlanCalls).toBe(0);
  });
});