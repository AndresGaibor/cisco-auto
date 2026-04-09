import { expect, test, describe } from 'bun:test';
import { IosService } from '../src/application/services/ios-service.js';
import type { FileBridgePort } from '../src/application/ports/file-bridge.port.js';

function makeBridge(responseMap: Record<string, any>) {
  return {
    sendCommandAndWait: async (type: string, payload: any) => {
      const key = type;
      if (responseMap[key]) {
        if (typeof responseMap[key] === 'function') {
          return { value: responseMap[key](payload) };
        }
        return { value: responseMap[key] };
      }
      return { value: { ok: true, raw: '', source: 'terminal' } };
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
    const svc = new IosService(bridge, generateId, mockInspect);
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
    const svc = new IosService(bridge, generateId, mockInspect);
    await expect(svc.configureDhcpPool('R1', 'MISSING', '10.0.0.0', '255.255.255.0', '10.0.0.1')).rejects.toThrow('MISSING');
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
    const svc = new IosService(bridge, generateId, mockInspect);
    await svc.configureOspfNetwork('R1', 1, '192.168.1.0', '0.0.0.255', 0);
    expect(callLog).toContain('show ip protocols');
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
    const svc = new IosService(bridge, generateId, mockInspect);
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
    const svc = new IosService(bridge, generateId, mockInspect);
    await svc.configureAccessListStandard('R1', 10, ['permit 192.168.1.0 0.0.0.255']);
    expect(callLog).toContain('show access-lists');
  });
});
