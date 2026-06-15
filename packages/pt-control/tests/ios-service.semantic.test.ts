import { expect, test, describe } from 'bun:test';
import { IosService } from '../src/application/services/ios-service.js';
import type { FileBridgePort } from '../src/application/ports/file-bridge.port.js';

function normalizeBridgeResult(result: any) {
  const inner = result && typeof result === "object" ? result : {};
  const value = inner.value ?? inner;

  if (typeof inner.ok === "boolean" && (inner.raw || inner.output)) {
    return {
      ok: inner.ok,
      status: typeof inner.status === "number" ? inner.status : inner.ok ? 0 : 1,
      output: String(inner.raw ?? inner.output ?? inner.rawOutput ?? value.rawOutput ?? value.output ?? ""),
      rawOutput: String(inner.rawOutput ?? inner.output ?? inner.raw ?? value.rawOutput ?? value.output ?? ""),
      warnings: Array.isArray(inner.warnings) ? inner.warnings : [],
      evidence: inner.evidence ?? {},
    };
  }

  if (typeof value.ok === "boolean") {
    return {
      ok: value.ok,
      status: typeof value.status === "number" ? value.status : value.ok ? 0 : 1,
      output: String(value.raw ?? value.output ?? inner.rawOutput ?? inner.output ?? ""),
      rawOutput: String(value.rawOutput ?? value.output ?? inner.rawOutput ?? inner.output ?? ""),
      warnings: Array.isArray(value.warnings) ? value.warnings : [],
      evidence: value.evidence ?? {},
    };
  }

  const success = Boolean(inner.success ?? inner.ok ?? value.success ?? value.ok);

  return {
    ok: success,
    status: success ? 0 : 1,
    output: String(value.raw ?? value.output ?? inner.raw ?? inner.output ?? ""),
    rawOutput: String(value.rawOutput ?? value.output ?? inner.rawOutput ?? inner.output ?? ""),
    warnings: Array.isArray(value.warnings) ? value.warnings : [],
    evidence: value.evidence ?? {},
    error: success
      ? undefined
      : {
          code: String(value?.error?.code ?? value?.code ?? "IOS_CONFIG_FAILED"),
          message: String(value?.error?.message ?? value?.message ?? "IOS configuration failed"),
          phase: "execution",
        },
  };
}

function createTerminalPortFromBridge(bridge: any) {
  return {
    runTerminalPlan: async (plan: any) => {
      const commands = (plan.steps ?? [])
        .map((step: any) => step.command)
        .filter(Boolean)
        .join("\n");

      let result;
      if (plan.steps?.some((s: any) => s.command?.startsWith("show "))) {
        // Para comandos show, usar execInteractive del bridge
        result = await bridge.sendCommandAndWait("execInteractive", {
          device: plan.device,
          command: commands,
        });
      } else {
        // Para configIos
        result = await bridge.sendCommandAndWait("configIos", {
          device: plan.device,
          commands,
        });
      }

      return normalizeBridgeResult(result);
    },
    ensureSession: async () => ({ ok: true }),
    runPrimitive: async (type: string, payload: unknown) =>
      normalizeBridgeResult(await bridge.sendCommandAndWait(type, payload)),
  } as any;
}

function makeBridge(responseMap: Record<string, any>) {
  return {
    sendCommandAndWait: async (type: string, payload: any) => {
      const key = type;
      const response =
        typeof responseMap[key] === 'function'
          ? responseMap[key](payload)
          : responseMap[key] ?? { ok: true, raw: '', source: 'terminal' };

      return {
        ...response,
        value: response,
      };
    },
    start: () => {},
    stop: async () => {},
    readState: () => null,
    getStateSnapshot: () => null,
    getHeartbeat: () => null,
    getHeartbeatHealth: () => ({ state: 'unknown' as const }),
    getBridgeStatus: () => ({ ready: true }),
    getContext: () => ({ bridgeReady: true, heartbeat: { state: 'unknown' } }),
    on: () => ({}) as any,
    onAll: () => () => {},
    loadRuntime: async () => {},
    loadRuntimeFromFile: async () => {},
    isReady: () => true,
  } as unknown as FileBridgePort;
}

const generateId = () => 'test_123';
const mockInspect = async (device: string) => ({
  model: device.startsWith('S') ? '2960-24TT' : '2911',
  name: device,
  type: device.startsWith('S') ? 'switch' : 'router',
} as any);

const terminalResponse = {
  ok: true,
  source: 'terminal',
  session: { mode: 'priv-exec', prompt: 'R1#' },
  diagnostics: { source: 'terminal', completionReason: 'command-ended' },
};

describe('configureDhcpPool()', () => {
  test('aplica pool y verifica en running-config', async () => {
    const callLog: string[] = [];
    const bridge = makeBridge({
      configIos: { ...terminalResponse },
      execInteractive: (payload: any) => {
        callLog.push(payload.command);
        if (payload.command === 'show running-config') {
          return {
            ...terminalResponse,
            raw: 'Building configuration...\nip dhcp pool MYPOOL\n   network 192.168.1.0 255.255.255.0\n   default-router 192.168.1.1\n',
          };
        }
        return { ...terminalResponse, raw: '' };
      },
    });
    const svc = new IosService(
      bridge,
      generateId,
      mockInspect,
      createTerminalPortFromBridge(bridge),
    );
    await svc.configureDhcpPool('R1', 'MYPOOL', '192.168.1.0', '255.255.255.0', '192.168.1.1');
    expect(callLog).toContain('show running-config');
  });

  test('lanza error si el pool no aparece en running-config', async () => {
    const bridge = makeBridge({
      configIos: { ...terminalResponse },
      execInteractive: {
        ...terminalResponse,
        raw: 'Building configuration...\nno dhcp pools configured\n',
      },
    });
    const svc = new IosService(
      bridge,
      generateId,
      mockInspect,
      createTerminalPortFromBridge(bridge),
    );
    await expect(svc.configureDhcpPool('R1', 'MISSING', '10.0.0.0', '255.255.255.0', '10.0.0.1')).rejects.toThrow('MISSING');
  });

  test('rechaza un switch L2 sin soporte de routing', async () => {
    const bridge = makeBridge({});
    const svc = new IosService(
      bridge,
      generateId,
      async (device: string) => ({
        model: '2960-24TC-L',
        name: device,
        type: 'switch',
      } as any),
      createTerminalPortFromBridge(bridge),
    );

    await expect(
      svc.configureDhcpPool('SW1', 'POOL1', '192.168.1.0', '255.255.255.0', '192.168.1.1'),
    ).rejects.toThrow('SW1 does not support DHCP pool');
  });
});

describe('configureOspfNetwork()', () => {
  test('aplica OSPF y verifica', async () => {
    const callLog: string[] = [];
    const bridge = makeBridge({
      configIos: { ...terminalResponse },
      execInteractive: (payload: any) => {
        callLog.push(payload.command);
        if (payload.command === 'show ip protocols') {
          return { ...terminalResponse, raw: 'Routing Protocol is "ospf 1"\n' };
        }
        return { ...terminalResponse, raw: '' };
      },
    });
    const svc = new IosService(
      bridge,
      generateId,
      mockInspect,
      createTerminalPortFromBridge(bridge),
    );
    await svc.configureOspfNetwork('R1', 1, '192.168.1.0', '0.0.0.255', 0);
    expect(callLog).toContain('show ip protocols');
  });

  test('rechaza un switch L2 sin soporte de routing', async () => {
    const bridge = makeBridge({});
    const svc = new IosService(
      bridge,
      generateId,
      async (device: string) => ({
        model: '2960-24TC-L',
        name: device,
        type: 'switch',
      } as any),
      createTerminalPortFromBridge(bridge),
    );

    await expect(
      svc.configureOspfNetwork('SW1', 1, '192.168.1.0', '0.0.0.255', 0),
    ).rejects.toThrow('SW1 does not support OSPF');
  });
});

describe('configureStaticRoute()', () => {
  test('rechaza un switch L2 sin soporte de routing', async () => {
    const bridge = makeBridge({});
    const svc = new IosService(
      bridge,
      generateId,
      async (device: string) => ({
        model: '2960-24TC-L',
        name: device,
        type: 'switch',
      } as any),
      createTerminalPortFromBridge(bridge),
    );

    await expect(
      svc.configureStaticRoute('SW1', '10.10.10.0', '255.255.255.0', '10.10.10.1'),
    ).rejects.toThrow('SW1 does not support static routes');
  });
});

describe('configureSshAccess()', () => {
  test('aplica SSH y verifica transporte y login', async () => {
    const bridge = makeBridge({
      configIos: { ...terminalResponse },
      execInteractive: {
        ...terminalResponse,
        raw: 'Building configuration...\nline vty 0 4\n transport input ssh\n login local\n',
      },
    });
    const svc = new IosService(
      bridge,
      generateId,
      mockInspect,
      createTerminalPortFromBridge(bridge),
    );
    await svc.configureSshAccess('R1', 'lab.local', 'admin', 'secret123');
  });
});

describe('configureAccessListStandard()', () => {
  test('aplica ACL y verifica', async () => {
    const callLog: string[] = [];
    const bridge = makeBridge({
      configIos: { ...terminalResponse },
      execInteractive: (payload: any) => {
        callLog.push(payload.command);
        if (payload.command === 'show access-lists') {
          return { ...terminalResponse, raw: 'Standard IP access list 10\n    10 permit 192.168.1.0 0.0.0.255\n' };
        }
        return { ...terminalResponse, raw: '' };
      },
    });
    const svc = new IosService(
      bridge,
      generateId,
      mockInspect,
      createTerminalPortFromBridge(bridge),
    );
    await svc.configureAccessListStandard('R1', 10, ['permit 192.168.1.0 0.0.0.255']);
    expect(callLog).toContain('show access-lists');
  });
});
