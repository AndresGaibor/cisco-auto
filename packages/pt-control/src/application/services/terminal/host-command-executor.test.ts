import { describe, expect, test, vi } from "bun:test";
import { createHostCommandExecutor } from "./host-command-executor.js";

describe("HostCommandExecutor", () => {
  test("ejecuta comando host exitosamente via runtimeTerminal", async () => {
    const executor = createHostCommandExecutor({
      generateId: () => "plan-1",
      controller: {
        execHost: vi.fn(),
      },
      runtimeTerminal: {
        runTerminalPlan: async () => ({
          ok: true,
          output: "Windows IP Configuration",
          rawOutput: "C:\\>ipconfig\nWindows IP Configuration\nC:\\>",
          status: 0,
          warnings: [],
          evidence: { test: true },
        }),
        ensureSession: async () => ({ ok: true }) as any,
        pollTerminalJob: async () => null,
      } as any,
    });

    const result = await executor.executeHostCommand("PC1", "ipconfig");

    expect(result.ok).toBe(true);
    expect(result.status).toBe(0);
    expect(result.deviceKind).toBe("host");
  });

  test("resuelve capabilityId para ping", async () => {
    const runTerminalPlan = vi.fn().mockResolvedValue({
      ok: true,
      output: "Pinging 192.168.1.1",
      rawOutput: "C:\\>ping 192.168.1.1\nPinging 192.168.1.1",
      status: 0,
      warnings: [],
      evidence: {},
    });

    const executor = createHostCommandExecutor({
      generateId: () => "plan-2",
      controller: {
        execHost: vi.fn(),
      },
      runtimeTerminal: {
        runTerminalPlan,
        ensureSession: async () => ({ ok: true }) as any,
        pollTerminalJob: async () => null,
      } as any,
    });

    const result = await executor.executeHostCommand("PC1", "ping 192.168.1.1");

    expect(result.ok).toBe(true);
  });

  test("detecta comando host invalido", async () => {
    const executor = createHostCommandExecutor({
      generateId: () => "plan-3",
      controller: {
        execHost: vi.fn(),
      },
      runtimeTerminal: {
        runTerminalPlan: async () => ({
          ok: false,
          output: "Invalid command",
          rawOutput: "C:\\>invalidcmd\n'invalidcmd' is not recognized",
          status: 1,
          error: {
            code: "HOST_INVALID_COMMAND",
            message: "Command not recognized",
          },
          warnings: [],
          evidence: {},
        }),
        ensureSession: async () => ({ ok: true }) as any,
        pollTerminalJob: async () => null,
      } as any,
    });

    const result = await executor.executeHostCommand("PC1", "invalidcmd");

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("HOST_INVALID_COMMAND");
  });

  test("rechaza comando cuando heartbeat supera 20s", async () => {
    const runTerminalPlan = vi.fn();

    const executor = createHostCommandExecutor({
      generateId: () => "plan-4",
      controller: {
        getHeartbeatHealth: () => ({ state: "stale", ageMs: 25000, lastSeenTs: Date.now() - 25000 }),
        execHost: vi.fn(),
      },
      runtimeTerminal: {
        runTerminalPlan,
        ensureSession: async () => ({ ok: true }) as any,
        pollTerminalJob: async () => null,
      } as any,
    });

    const result = await executor.executeHostCommand("PC1", "ipconfig");

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("PT_RUNTIME_UNAVAILABLE");
    expect(runTerminalPlan).not.toHaveBeenCalled();
  });

  test("fallback a legacy execHost cuando runtimeTerminal no existe", async () => {
    const execHost = vi.fn().mockResolvedValue({
      success: true,
      raw: "Windows IP Configuration",
      verdict: { ok: true },
      parsed: {},
    });

    const executor = createHostCommandExecutor({
      generateId: () => "plan-5",
      controller: {
        execHost,
      },
      runtimeTerminal: null,
    });

    const result = await executor.executeHostCommand("PC1", "ipconfig");

    expect(result.ok).toBe(true);
    expect(execHost).toHaveBeenCalledWith("PC1", "ipconfig", "host.ipconfig", { timeoutMs: 45000 });
  });

  test("registra timings de ejecucion", async () => {
    const executor = createHostCommandExecutor({
      generateId: () => "plan-6",
      controller: {
        execHost: vi.fn(),
      },
      runtimeTerminal: {
        runTerminalPlan: async () => ({
          ok: true,
          output: "Windows IP Configuration",
          rawOutput: "C:\\>ipconfig\nWindows IP Configuration\nC:\\>",
          status: 0,
          warnings: [],
          evidence: { test: true },
        }),
        ensureSession: async () => ({ ok: true }) as any,
        pollTerminalJob: async () => null,
      } as any,
    });

    const timings: any = {};
    await executor.executeHostCommand("PC1", "ipconfig", undefined, timings);

    expect(timings.buildHostPlanMs).toBeGreaterThanOrEqual(0);
    expect(timings.resolveHostCapabilityIdMs).toBeGreaterThanOrEqual(0);
    expect(timings.runtimeTerminalRunPlanMs).toBeGreaterThanOrEqual(0);
  });

  test("maneja verdict.ok false en fallback legacy", async () => {
    const execHost = vi.fn().mockResolvedValue({
      success: false,
      raw: "Invalid command",
      verdict: { ok: false, reason: "Command not found" },
      parsed: {},
    });

    const executor = createHostCommandExecutor({
      generateId: () => "plan-7",
      controller: {
        execHost,
      },
      runtimeTerminal: null,
    });

    const result = await executor.executeHostCommand("PC1", "invalidcmd");

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("HOST_INVALID_COMMAND");
  });
});