import { describe, expect, test, vi } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTerminalCommandService } from "./terminal/terminal-command-service.js";

function createController(options: {
  deviceType: string | number;
  model?: string;
  fastDeviceState?: { type?: string | number; model?: string } | null;
  runtimeTerminal?: { runTerminalPlan?: ReturnType<typeof vi.fn> } | null;
  execIos?: ReturnType<typeof vi.fn>;
  execHost?: ReturnType<typeof vi.fn>;
}) {
  return {
    inspectDevice: vi.fn().mockResolvedValue({ type: options.deviceType, model: options.model }),
    inspectDeviceFast: vi.fn().mockResolvedValue(
      options.fastDeviceState !== undefined ? options.fastDeviceState : { type: options.deviceType, model: options.model },
    ),
    execIos:
      options.execIos ??
      vi.fn().mockResolvedValue({ ok: true, raw: "legacy-ios", evidence: { source: "legacy-ios" }, warnings: [] }),
    execHost:
      options.execHost ??
      vi.fn().mockResolvedValue({ success: true, raw: "legacy-host", verdict: { ok: true }, parsed: { source: "legacy-host" } }),
  };
}

function createService(deps: Parameters<typeof createTerminalCommandService>[0]) {
  return createTerminalCommandService({
    ...deps,
    cacheFilePath: join(
      mkdtempSync(join(tmpdir(), "pt-control-terminal-command-service-plan-run-")),
      "device-kind-cache.json",
    ),
  });
}

describe("createTerminalCommandService plan run", () => {
  test("usa runTerminalPlan para IOS cuando está disponible", async () => {
    const runTerminalPlan = vi.fn().mockResolvedValue({
      ok: true,
      status: 0,
      output: "Cisco IOS Software, C2960 Software",
      rawOutput: "SW1#show version\nCisco IOS Software, C2960 Software\nSW1#",
      warnings: ["runtime-warning"],
      evidence: { source: "runtime-ios" },
    });
    const controller = createController({ deviceType: "router", runtimeTerminal: { runTerminalPlan } });
    const service = createService({
      controller: controller as any,
      runtimeTerminal: { runTerminalPlan } as any,
      generateId: () => "ios-plan-id",
    });

    const result = await service.executeCommand("R1", "show version");

    expect(runTerminalPlan).toHaveBeenCalledTimes(1);
    expect((controller.execIos as any)).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      ok: true,
      action: "ios.exec",
      device: "R1",
      deviceKind: "ios",
      command: "show version",
      output: "Cisco IOS Software, C2960 Software",
      rawOutput: "SW1#show version\nCisco IOS Software, C2960 Software\nSW1#",
      status: 0,
      warnings: ["runtime-warning"],
      evidence: { source: "runtime-ios" },
    });
  });

  test("usa runTerminalPlan para host cuando está disponible", async () => {
    const runTerminalPlan = vi.fn().mockResolvedValue({
      ok: true,
      status: 0,
      output: "IP Configuration",
      rawOutput: "PC1>ipconfig\nIP Configuration\nPC1>",
      warnings: [],
      evidence: { source: "runtime-host" },
    });
    const controller = createController({ deviceType: "pc", runtimeTerminal: { runTerminalPlan } });
    const service = createService({
      controller: controller as any,
      runtimeTerminal: { runTerminalPlan } as any,
      generateId: () => "host-plan-id",
    });

    const result = await service.executeCommand("PC1", "ipconfig");

    expect(runTerminalPlan).toHaveBeenCalledTimes(1);
    expect((controller.execHost as any)).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      ok: true,
      action: "host.exec",
      device: "PC1",
      deviceKind: "host",
      command: "ipconfig",
      output: "IP Configuration",
      rawOutput: "PC1>ipconfig\nIP Configuration\nPC1>",
      status: 0,
      evidence: { source: "runtime-host" },
    });
    expect(result.error).toBeUndefined();
  });

  test("cae a execIos si no hay runTerminalPlan", async () => {
    const execIos = vi.fn().mockResolvedValue({ ok: true, raw: "legacy-ios", evidence: { source: "legacy-ios" }, warnings: [] });
    const controller = createController({ deviceType: "router", execIos });
    const service = createService({
      controller: controller as any,
      runtimeTerminal: null,
      generateId: () => "legacy-ios-id",
    });

    const result = await service.executeCommand("R1", "show version");

    expect(execIos).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: true,
      action: "ios.exec",
      deviceKind: "ios",
      output: "legacy-ios",
      rawOutput: "legacy-ios",
      evidence: { source: "legacy-ios" },
    });
  });

  test("cae a execHost si no hay runTerminalPlan", async () => {
    const execHost = vi.fn().mockResolvedValue({ success: true, raw: "legacy-host", verdict: { ok: true }, parsed: { source: "legacy-host" } });
    const controller = createController({ deviceType: "pc", execHost });
    const service = createService({
      controller: controller as any,
      runtimeTerminal: undefined,
      generateId: () => "legacy-host-id",
    });

    const result = await service.executeCommand("PC1", "ipconfig");

    expect(execHost).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: true,
      action: "host.exec",
      deviceKind: "host",
      output: "legacy-host",
      rawOutput: "legacy-host",
      evidence: { verdict: { ok: true }, parsed: { source: "legacy-host" } },
    });
  });

  test("rechaza dispositivos inexistentes con error claro", async () => {
    const controller = {
      inspectDevice: vi.fn().mockResolvedValue(null),
      execIos: vi.fn(),
      execHost: vi.fn(),
    };

    const service = createService({
      controller: controller as any,
      runtimeTerminal: null,
      generateId: () => "missing-device-id",
    });

    const result = await service.executeCommand("R1", "show version");

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("DEVICE_NOT_FOUND_OR_UNSUPPORTED");
    expect((controller.execIos as any)).not.toHaveBeenCalled();
    expect((controller.execHost as any)).not.toHaveBeenCalled();
  });

  test("clasifica Server-PT type 9 como host y usa runTerminalPlan", async () => {
    const runTerminalPlan = vi.fn().mockResolvedValue({
      ok: true,
      status: 0,
      output: "IP Configuration",
      warnings: [],
      evidence: { source: "runtime-host" },
    });

    const controller = createController({
      deviceType: 9,
      model: "Server-PT",
      runtimeTerminal: { runTerminalPlan },
    });

    const service = createService({
      controller: controller as any,
      runtimeTerminal: { runTerminalPlan } as any,
      generateId: () => "server-plan-id",
    });

    const result = await service.executeCommand("SRV1-CORE", "ipconfig");

    expect(runTerminalPlan).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: true,
      action: "host.exec",
      device: "SRV1-CORE",
      deviceKind: "host",
      command: "ipconfig",
      output: "IP Configuration",
      status: 0,
    });
  });

  test("resolveDeviceKind reconoce Server-PT aunque type sea numérico desconocido", async () => {
    const service = createService({
      controller: createController({
        deviceType: 9,
        model: "Server-PT",
      }) as any,
      runtimeTerminal: null,
      generateId: () => "server-kind-id",
    });

    await expect(service.resolveDeviceKind("SRV1-CORE")).resolves.toBe("host");
  });

  test("resolveDeviceKind usa inspectDeviceFast cuando está disponible", async () => {
    const controller = createController({
      deviceType: "unknown",
      fastDeviceState: { type: "pc", model: "PC-PT" },
    });

    const service = createService({
      controller: controller as any,
      runtimeTerminal: null,
      generateId: () => "fast-kind-id",
    });

    await expect(service.resolveDeviceKind("PC1")).resolves.toBe("host");
    expect((controller.inspectDeviceFast as any)).toHaveBeenCalledTimes(1);
    expect((controller.inspectDevice as any)).not.toHaveBeenCalled();
  });

  test("resolveDeviceKind no cae al inspector lento cuando fast retorna null", async () => {
    const controller = createController({
      deviceType: "router",
      fastDeviceState: null,
    });

    const service = createService({
      controller: controller as any,
      runtimeTerminal: null,
      generateId: () => "null-fast-kind-id",
    });

    await expect(service.resolveDeviceKind("MISSING-1")).resolves.toBe("unknown");
    expect((controller.inspectDeviceFast as any)).toHaveBeenCalledTimes(1);
    expect((controller.inspectDevice as any)).not.toHaveBeenCalled();
  });

  test("propaga runtime caído cuando inspectDeviceFast falla por timeout", async () => {
    const controller = createController({
      deviceType: "unknown",
      fastDeviceState: undefined,
    });
    (controller.inspectDeviceFast as any).mockRejectedValue(new Error("Timeout waiting for result"));

    const service = createService({
      controller: controller as any,
      runtimeTerminal: null,
      generateId: () => "runtime-timeout-id",
    });

    const result = await service.executeCommand("R1", "show version");

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("RUNTIME_NOT_POLLING");
    expect(result.error?.phase).toBe("detection");
  });

  test("runTerminalPlan recibe ensureMode para show running-config", async () => {
    const runTerminalPlan = vi.fn().mockResolvedValue({
      ok: true,
      status: 0,
      output: "Building configuration...\nend",
      warnings: [],
      evidence: { source: "runtime-ios" },
    });

    const controller = createController({
      deviceType: "switch",
      model: "2960-24TT",
      runtimeTerminal: { runTerminalPlan },
    });

    const service = createService({
      controller: controller as any,
      runtimeTerminal: { runTerminalPlan } as any,
      generateId: () => "show-run-plan-id",
    });

    const result = await service.executeCommand("SW1", "show running-config");

    expect(result.ok).toBe(true);
    expect(runTerminalPlan).toHaveBeenCalledTimes(1);

    const firstArg = runTerminalPlan.mock.calls[0]?.[0] as any;
    const submittedPlan = firstArg?.plan ?? firstArg;

    expect(submittedPlan).toMatchObject({
      id: "show-run-plan-id",
      device: "SW1",
      targetMode: "privileged-exec",
    });

    expect(submittedPlan.steps.map((step: any) => step.command ?? step.expectMode)).toEqual([
      "privileged-exec",
      "show running-config",
    ]);
  });

  test("runTerminalPlan no agrega ensureMode para show version", async () => {
    const runTerminalPlan = vi.fn().mockResolvedValue({
      ok: true,
      status: 0,
      output: "Cisco IOS Software",
      warnings: [],
      evidence: { source: "runtime-ios" },
    });

    const controller = createController({
      deviceType: "switch",
      model: "2960-24TT",
      runtimeTerminal: { runTerminalPlan },
    });

    const service = createService({
      controller: controller as any,
      runtimeTerminal: { runTerminalPlan } as any,
      generateId: () => "show-version-plan-id",
    });

    const result = await service.executeCommand("SW1", "show version");

    expect(result.ok).toBe(true);
    expect(runTerminalPlan).toHaveBeenCalledTimes(1);

    const firstArg = runTerminalPlan.mock.calls[0]?.[0] as any;
    const submittedPlan = firstArg?.plan ?? firstArg;

    expect(submittedPlan.targetMode).toBeUndefined();
    expect(submittedPlan.steps.map((step: any) => step.command ?? step.expectMode)).toEqual([
      "show version",
    ]);
  });
});
