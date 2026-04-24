import { describe, expect, test } from "bun:test";
import { IosService } from "./ios-service.js";
import type { FileBridgePort } from "../ports/file-bridge.port.js";
import type { RuntimeTerminalPort } from "../../ports/runtime-terminal-port.js";

function createTerminalPort() {
  const llamadas: Array<{ plan: unknown; options?: { timeoutMs?: number } }> = [];

  const terminalPort: RuntimeTerminalPort & { llamadas: typeof llamadas } = {
    llamadas,
    runTerminalPlan: async (plan, options) => {
      llamadas.push({ plan, options });
      const steps = (plan as any).steps ?? [];
      const hasRunningConfig = steps.some((step: any) => step.command === "show running-config");

      if (hasRunningConfig) {
        return {
          ok: true,
          output: "show running-config\nSW Core#",
          status: 0,
          promptBefore: "R1>",
          promptAfter: "R1#",
          modeBefore: "user-exec",
          modeAfter: "privileged-exec",
          events: [],
          warnings: [],
          confidence: 1,
        };
      }

      return {
        ok: true,
        output: "ok",
        status: 0,
        promptBefore: "R1>",
        promptAfter: "R1#",
        modeBefore: "user-exec",
        modeAfter: "privileged-exec",
        events: [],
        warnings: [],
        confidence: 1,
      };
    },
    ensureSession: async () => ({ ok: true, sessionId: "s1" }),
    pollTerminalJob: async () => null,
  };

  return terminalPort;
}

function createBridgeWithConfig(config: string): FileBridgePort {
  const llamadas: Array<{ type: string; payload: unknown }> = [];

  return {
    llamadas,
    start: () => undefined,
    stop: async () => undefined,
    sendCommandAndWait: async (type: string, payload: unknown) => {
      llamadas.push({ type, payload });

      if (type === "getNetworkGenoma") {
        return {
          ok: true,
          status: 0,
          completedAt: Date.now(),
          value: `<device><runningConfig>${config}</runningConfig></device>`,
        } as any;
      }

      return {
        ok: true,
        status: 0,
        completedAt: Date.now(),
        value: null,
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
}

function createBridge(): FileBridgePort {
  return {
    start: () => undefined,
    stop: async () => undefined,
    sendCommandAndWait: async () => ({
      ok: true,
      status: 0,
      completedAt: Date.now(),
      value: null,
    } as any),
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

describe("IosService.configIos", () => {
  test("propaga un timeout suficiente para planes largos", async () => {
    const terminalPort = createTerminalPort();
    const service = new IosService(
      createBridge(),
      () => "id-1",
      async () => ({ name: "R1", model: "2911", type: "router" } as any),
      terminalPort,
    );

    await service.configIos("R1", [
      "interface GigabitEthernet0/0",
      "ip address 10.0.0.1 255.255.255.0",
      "no shutdown",
      "exit",
      "interface GigabitEthernet0/1",
      "ip address 10.0.1.1 255.255.255.0",
      "no shutdown",
    ]);

    expect(terminalPort.llamadas).toHaveLength(1);
    expect(terminalPort.llamadas[0]!.options?.timeoutMs).toBe(550000);
    expect((terminalPort.llamadas[0]!.plan as any).steps[1].command).toBe("configure terminal");
  });

  test("showIpInterfaceBrief usa un timeout mayor", async () => {
    const terminalPort = createTerminalPort();
    const service = new IosService(
      createBridge(),
      () => "id-2",
      async () => ({ name: "R1", model: "2911", type: "router" } as any),
      terminalPort,
    );

    await service.showIpInterfaceBrief("R1");

    expect(terminalPort.llamadas).toHaveLength(1);
    expect(terminalPort.llamadas[0]!.options?.timeoutMs).toBe(30000);
  });

  test("showRunningConfig usa fallback omnisciente cuando IOS solo devuelve eco y prompt", async () => {
    const terminalPort = createTerminalPort();
    const bridge = createBridgeWithConfig(`
hostname SW Core
interface GigabitEthernet1/0/1
 switchport access vlan 10
!`);

    const service = new IosService(
      bridge,
      () => "id-3",
      async () => ({ name: "SW Core", model: "3650-24PS", type: "switch" } as any),
      terminalPort,
    );

    const result = await service.showRunningConfig("SW Core");

    expect((bridge as any).llamadas[0]?.type).toBe("getNetworkGenoma");
    expect(result.raw).toContain("hostname SW Core");
    expect(result.interfaces).toBeDefined();
  });
});
