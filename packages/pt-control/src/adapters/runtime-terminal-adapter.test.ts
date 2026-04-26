import { describe, expect, test, beforeEach } from "bun:test";
import { createRuntimeTerminalAdapter } from "./runtime-terminal/index.js";
import type { FileBridgePort } from "../application/ports/file-bridge.port.js";

interface BridgeCall {
  type: string;
  payload?: Record<string, unknown>;
  timeoutMs?: number;
}

function createBridge(options?: {
  deviceType?: "pc" | "router";
  responseDelay?: number;
  customResponse?: unknown;
}) {
  const calls: BridgeCall[] = [];
  const deviceType = options?.deviceType ?? "router";
  const responseDelay = options?.responseDelay ?? 0;

  const bridge = {
    calls,
    start: () => undefined,
    stop: async () => undefined,
    sendCommandAndWait: async (type: string, payload: Record<string, unknown>, timeoutMs?: number) => {
      calls.push({ type, payload, timeoutMs });

      if (responseDelay > 0) {
        await new Promise((r) => setTimeout(r, responseDelay));
      }

      if (type === "listDevices") {
        return {
          ok: true,
          status: 0,
          completedAt: Date.now(),
          value: {
            ok: true,
            devices: [
              {
                name: "PC1",
                model: deviceType === "pc" ? "PC-PT" : "2911",
                type: deviceType,
                power: true,
                ports: [],
              },
            ],
          },
        };
      }

      if (options?.customResponse) {
        return options.customResponse;
      }

      return {
        ok: true,
        status: 0,
        completedAt: Date.now(),
        value: {
          raw: "show output",
          output: "show output",
          session: { mode: "priv-exec", prompt: "R1#", paging: false, modeBefore: "user-exec", modeAfter: "priv-exec", promptBefore: "R1>", promptAfter: "R1#" },
          diagnostics: { completionReason: "command-ended", statusCode: 0 },
        },
      };
    },
    readState: () => null,
    getStateSnapshot: () => null,
    getHeartbeat: () => null,
    getHeartbeatHealth: () => ({ state: "unknown" as const }),
    getBridgeStatus: () => ({ ready: true }),
    getContext: () => ({ bridgeReady: true, heartbeat: { state: "unknown" as const } }),
    on: () => ({}) as any,
    onAll: () => () => undefined,
    loadRuntime: async () => undefined,
    loadRuntimeFromFile: async () => undefined,
    isReady: () => true,
  } as FileBridgePort & { calls: typeof calls };

  return bridge;
}

describe("createRuntimeTerminalAdapter", () => {
  test("propaga timeout por paso al bridge", async () => {
    const bridge = createBridge();
    const adapter = createRuntimeTerminalAdapter({ bridge, generateId: () => "id-1", defaultTimeout: 30000 });

    const result = await adapter.runTerminalPlan({
      id: "plan-1",
      device: "R1",
      steps: [{ command: "show version", timeout: 12345 }],
    });

    expect(result.ok).toBe(true);
    expect(bridge.calls).toHaveLength(2);
    expect(bridge.calls[0]!.type).toBe("listDevices");
    expect(bridge.calls[1]!.type).toBe("execIos");
    expect(bridge.calls[1]!.timeoutMs).toBe(12345);
  });

  test("usa timeout por defecto cuando el paso no lo define", async () => {
    const bridge = createBridge();
    const adapter = createRuntimeTerminalAdapter({ bridge, generateId: () => "id-2", defaultTimeout: 30000 });

    await adapter.runTerminalPlan({
      id: "plan-2",
      device: "R1",
      steps: [{ command: "show ip interface brief" }],
    });

    expect(bridge.calls).toHaveLength(2);
    expect(bridge.calls[0]!.type).toBe("listDevices");
    expect(bridge.calls[1]!.type).toBe("execIos");
    expect(bridge.calls[1]!.timeoutMs).toBe(8000);
  });

  test("detecta host con listDevices y usa execPc", async () => {
    const bridge = createBridge({ deviceType: "pc" });
    const adapter = createRuntimeTerminalAdapter({ bridge, generateId: () => "id-3", defaultTimeout: 30000 });

    await adapter.runTerminalPlan({
      id: "plan-3",
      device: "PC1",
      steps: [{ command: "ping 192.168.10.1" }],
    });

    expect(bridge.calls).toHaveLength(2);
    expect(bridge.calls[0]!.type).toBe("listDevices");
    expect(bridge.calls[1]!.type).toBe("execPc");
  });

  test("retorna success cuando el comando es exitoso", async () => {
    const bridge = createBridge();
    const adapter = createRuntimeTerminalAdapter({ bridge, generateId: () => "id-4", defaultTimeout: 30000 });

    const result = await adapter.runTerminalPlan({
      id: "plan-4",
      device: "R1",
      steps: [{ command: "show version" }],
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe(0);
    expect(result.output).toContain("show output");
    expect(result.confidence).toBe(1);
  });

  test("retorna failure cuando el comando falla", async () => {
    const bridge = createBridge({
      customResponse: {
        ok: false,
        status: 1,
        completedAt: Date.now(),
        value: {
          output: "% Invalid command",
          ok: false,
          session: { mode: "priv-exec", prompt: "R1#", paging: false },
          diagnostics: { completionReason: "error", statusCode: 1 },
        },
      },
    });
    const adapter = createRuntimeTerminalAdapter({ bridge, generateId: () => "id-5", defaultTimeout: 30000 });

    const result = await adapter.runTerminalPlan({
      id: "plan-5",
      device: "R1",
      steps: [{ command: "invalid command" }],
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(1);
    expect(result.confidence).toBe(0);
  });

  test("detecta partial output con paging", async () => {
    const bridge = createBridge({
      customResponse: {
        ok: true,
        status: 0,
        completedAt: Date.now(),
        value: {
          output: "Line 1\nLine 2\n-- More --",
          ok: true,
          session: { mode: "priv-exec", prompt: "R1#", paging: true, modeBefore: "priv-exec", modeAfter: "priv-exec", promptBefore: "R1#", promptAfter: "R1#" },
          diagnostics: { completionReason: "command-ended", statusCode: 0 },
        },
      },
    });
    const adapter = createRuntimeTerminalAdapter({ bridge, generateId: () => "id-6", defaultTimeout: 30000 });

    const result = await adapter.runTerminalPlan({
      id: "plan-6",
      device: "R1",
      steps: [{ command: "show run", allowPager: true }],
    });

    expect(result.ok).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("paginación");
  });

  test("detecta prompt mismatch cuando no se alcanza el prompt esperado", async () => {
    const bridge = createBridge({
      customResponse: {
        ok: true,
        status: 0,
        completedAt: Date.now(),
        value: {
          output: "some output",
          ok: true,
          session: { mode: "user-exec", prompt: "R1>", paging: false, modeBefore: "user-exec", modeAfter: "user-exec", promptBefore: "R1>", promptAfter: "R1>" },
          diagnostics: { completionReason: "command-ended", statusCode: 0 },
        },
      },
    });
    const adapter = createRuntimeTerminalAdapter({ bridge, generateId: () => "id-7", defaultTimeout: 30000 });

    const result = await adapter.runTerminalPlan({
      id: "plan-7",
      device: "R1",
      steps: [{ command: "enable", expectedPrompt: "#" }],
    });

    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("Prompt esperado");
  });

  test("maneja device obligatorio faltante", async () => {
    const bridge = createBridge();
    const adapter = createRuntimeTerminalAdapter({ bridge, generateId: () => "id-8", defaultTimeout: 30000 });

    const result = await adapter.runTerminalPlan({
      id: "plan-8",
      device: "",
      steps: [{ command: "show version" }],
    });

    expect(result.ok).toBe(false);
    expect(result.warnings).toContain("TerminalPlan.device es obligatorio");
    expect(result.confidence).toBe(0);
  });

  test("maneja steps vacíos", async () => {
    const bridge = createBridge();
    const adapter = createRuntimeTerminalAdapter({ bridge, generateId: () => "id-9", defaultTimeout: 30000 });

    const result = await adapter.runTerminalPlan({
      id: "plan-9",
      device: "R1",
      steps: [],
    });

    expect(result.ok).toBe(false);
    expect(result.warnings).toContain("TerminalPlan.steps no puede estar vacío");
    expect(result.confidence).toBe(0);
  });

  test("registra eventos por cada paso ejecutado", async () => {
    const bridge = createBridge();
    const adapter = createRuntimeTerminalAdapter({ bridge, generateId: () => "id-10", defaultTimeout: 30000 });

    const result = await adapter.runTerminalPlan({
      id: "plan-10",
      device: "R1",
      steps: [
        { command: "show version" },
        { command: "show ip interface brief" },
      ],
    });

    expect(result.events).toHaveLength(2);
    expect((result.events[0] as any).command).toBe("show version");
    expect((result.events[1] as any).command).toBe("show ip interface brief");
  });

  test("confidence es menor cuando hay advertencias", async () => {
    const bridge = createBridge({
      customResponse: {
        ok: true,
        status: 0,
        completedAt: Date.now(),
        value: {
          output: "output with -- More --",
          ok: true,
          session: { mode: "priv-exec", prompt: "R1#", paging: true, modeBefore: "priv-exec", modeAfter: "priv-exec", promptBefore: "R1#", promptAfter: "R1#" },
          diagnostics: { completionReason: "command-ended", statusCode: 0 },
        },
      },
    });
    const adapter = createRuntimeTerminalAdapter({ bridge, generateId: () => "id-11", defaultTimeout: 30000 });

    const result = await adapter.runTerminalPlan({
      id: "plan-11",
      device: "R1",
      steps: [{ command: "show run" }],
    });

    expect(result.ok).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.confidence).toBe(0.8);
  });
});