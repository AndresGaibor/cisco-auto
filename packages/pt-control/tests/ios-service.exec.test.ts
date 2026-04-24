import { describe, expect, test } from "bun:test";
import { IosService } from "../src/application/services/ios-service.js";
import type { FileBridgePort } from "../src/application/ports/file-bridge.port.js";
import type { RuntimeTerminalPort } from "../src/ports/runtime-terminal-port.js";

function createBridge(): FileBridgePort {
  return {
    start: () => undefined,
    stop: async () => undefined,
    sendCommandAndWait: async () => ({ ok: true, status: 0, completedAt: Date.now(), value: null } as any),
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
  } as FileBridgePort;
}

function createTerminalPort(resultOverrides: Partial<any> = {}) {
  const llamadas: Array<{ plan: any; options?: { timeoutMs?: number } }> = [];

  const terminalPort: RuntimeTerminalPort & { llamadas: typeof llamadas } = {
    llamadas,
    runTerminalPlan: async (plan, options) => {
      llamadas.push({ plan, options });
      return {
        ok: true,
        output: "test output",
        status: 0,
        promptBefore: "R1>",
        promptAfter: "R1#",
        modeBefore: "user-exec",
        modeAfter: "privileged-exec",
        events: [],
        warnings: [],
        confidence: 1,
        ...resultOverrides,
      };
    },
    ensureSession: async () => ({ ok: true, sessionId: "s1" }),
    pollTerminalJob: async () => null,
  };

  return terminalPort;
}

function createService(terminalPort: RuntimeTerminalPort) {
  return new IosService(
    createBridge(),
    () => "test-id",
    async () => ({ name: "R1", model: "2911", type: "router", power: true, ports: [] } as any),
    terminalPort,
  );
}

describe("IosService", () => {
  test("execIos devuelve evidencia terminal", async () => {
    const terminalPort = createTerminalPort();
    const service = createService(terminalPort);

    const result = await service.execIos("R1", "show version");

    expect(result.ok).toBe(true);
    expect(result.raw).toBe("test output");
    expect(result.evidence?.source).toBe("terminal");
    expect(result.evidence?.mode).toBe("privileged-exec");
    expect(terminalPort.llamadas).toHaveLength(1);
  });

  test("execInteractive propaga timeout al plan", async () => {
    const terminalPort = createTerminalPort();
    const service = createService(terminalPort);

    const result = await service.execInteractive("R1", "show running-config");

    expect(result.ok).toBe(true);
    expect(terminalPort.llamadas[0]!.options?.timeoutMs).toBe(30000);
  });
});
