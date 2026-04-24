import { describe, expect, test } from "bun:test";
import { createRuntimeTerminalAdapter } from "./runtime-terminal-adapter.js";
import type { FileBridgePort } from "../application/ports/file-bridge.port.js";

function createBridge(options?: { deviceType?: "pc" | "router" }) {
  const llamadas: Array<{ type: string; timeoutMs?: number }> = [];
  const deviceType = options?.deviceType ?? "router";

  const bridge = {
    llamadas,
    start: () => undefined,
    stop: async () => undefined,
    sendCommandAndWait: async (type: string, _payload: unknown, timeoutMs?: number) => {
      llamadas.push({ type, timeoutMs });
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
        } as any;
      }
      return {
        ok: true,
        status: 0,
        completedAt: Date.now(),
        value: {
          raw: "show output",
          session: { mode: "priv-exec", prompt: "R1#", paging: false },
          diagnostics: { completionReason: "command-ended" },
        },
      } as any;
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
  } as FileBridgePort & { llamadas: typeof llamadas };

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
    expect(bridge.llamadas).toHaveLength(2);
    expect(bridge.llamadas[0]!.type).toBe("listDevices");
    expect(bridge.llamadas[1]!.type).toBe("execIos");
    expect(bridge.llamadas[1]!.timeoutMs).toBe(12345);
  });

  test("usa timeout por defecto cuando el paso no lo define", async () => {
    const bridge = createBridge();
    const adapter = createRuntimeTerminalAdapter({ bridge, generateId: () => "id-2", defaultTimeout: 30000 });

    await adapter.runTerminalPlan({
      id: "plan-2",
      device: "R1",
      steps: [{ command: "show ip interface brief" }],
    });

    expect(bridge.llamadas).toHaveLength(2);
    expect(bridge.llamadas[0]!.type).toBe("listDevices");
    expect(bridge.llamadas[1]!.type).toBe("execIos");
    expect(bridge.llamadas[1]!.timeoutMs).toBe(8000);
  });

  test("detecta host con listDevices y usa execPc", async () => {
    const bridge = createBridge({ deviceType: "pc" });
    const adapter = createRuntimeTerminalAdapter({ bridge, generateId: () => "id-3", defaultTimeout: 30000 });

    await adapter.runTerminalPlan({
      id: "plan-3",
      device: "PC1",
      steps: [{ command: "ping 192.168.10.1" }],
    });

    expect(bridge.llamadas).toHaveLength(2);
    expect(bridge.llamadas[0]!.type).toBe("listDevices");
    expect(bridge.llamadas[1]!.type).toBe("execPc");
  });
});
