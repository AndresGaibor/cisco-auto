import { expect, test, describe } from 'bun:test';
import { PTController } from '../src/controller/index.js';
import type { FileBridgePort } from '../src/application/ports/file-bridge.port.js';

function makeBridge(responseMap: Record<string, any>) {
  const eventHandlers = new Map();
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
    getHeartbeatHealth: () => ({ state: 'ok' as const }),
    getBridgeStatus: () => ({ ready: true }),
    getContext: () => ({ bridgeReady: true, heartbeat: { state: 'ok' } }),
    on: function(eventType: string, handler: any) {
      eventHandlers.set(eventType, handler);
      return this;
    },
    onAll: function(handler: any) {
      eventHandlers.set('all', handler);
      return () => {};
    },
    loadRuntime: async () => {},
    loadRuntimeFromFile: async () => {},
    isReady: () => true,
  } as unknown as FileBridgePort;
}

const terminalResponse = {
  ok: true,
  source: 'terminal',
  session: { mode: 'priv-exec', prompt: 'R1#' },
  diagnostics: { source: 'terminal', completionReason: 'command-ended' },
};

describe('PTController IOS API — Fase 4', () => {
  test('expone execIosWithEvidence con evidencia', async () => {
    const bridge = makeBridge({
      execIos: {
        ...terminalResponse,
        raw: 'output',
        session: { mode: 'priv-exec' },
      },
    });
    const ctrl = new PTController(bridge);
    const result = await ctrl.execIosWithEvidence('R1', 'show version');
    expect(result.ok).toBe(true);
    expect(result.raw).toBe('output');
    expect(result.evidence.source).toBe('terminal');
  });

  test('expone configIosWithResult con IosConfigApplyResult', async () => {
    const bridge = makeBridge({
      configIos: { ...terminalResponse },
    });
    const ctrl = new PTController(bridge);
    const result = await ctrl.configIosWithResult('R1', ['hostname R1']);
    expect(result.executed).toBe(true);
    expect(result.device).toBe('R1');
    expect(result.commands).toEqual(['hostname R1']);
  });

  test('delega configureDhcpPool a IosService', async () => {
    const callLog: { type: string; payload: any }[] = [];
    const bridge = makeBridge({
      configIos: { ...terminalResponse },
      execInteractive: (payload: any) => {
        callLog.push({ type: 'execInteractive', payload });
        if (payload.command === 'show running-config') {
          return { ...terminalResponse, raw: 'ip dhcp pool POOL1\n' };
        }
        return { ...terminalResponse, raw: '' };
      },
    });
    const ctrl = new PTController(bridge);
    await ctrl.configureDhcpPool('R1', 'POOL1', '192.168.1.0', '255.255.255.0', '192.168.1.1');
    expect(callLog.some(c => c.payload.command === 'show running-config')).toBe(true);
  });

  test('delega configureOspfNetwork a IosService', async () => {
    const bridge = makeBridge({
      configIos: { ...terminalResponse },
      execInteractive: (payload: any) => {
        if (payload.command === 'show ip protocols') {
          return { ...terminalResponse, raw: 'Routing Protocol is "ospf 1"\n' };
        }
        return { ...terminalResponse, raw: '' };
      },
    });
    const ctrl = new PTController(bridge);
    await ctrl.configureOspfNetwork('R1', 1, '10.0.0.0', '0.0.0.255', 0);
  });

  test('delega configureSshAccess a IosService', async () => {
    const bridge = makeBridge({
      configIos: { ...terminalResponse },
      execInteractive: {
        ...terminalResponse,
        raw: 'line vty 0 4\n transport input ssh\n login local\n',
      },
    });
    const ctrl = new PTController(bridge);
    await ctrl.configureSshAccess('R1', 'lab.local', 'admin', 'secret');
  });

  test('delega configureAccessListStandard a IosService', async () => {
    const bridge = makeBridge({
      configIos: { ...terminalResponse },
      execInteractive: (payload: any) => {
        if (payload.command === 'show access-lists') {
          return { ...terminalResponse, raw: 'Standard IP access list 10\n' };
        }
        return { ...terminalResponse, raw: '' };
      },
    });
    const ctrl = new PTController(bridge);
    await ctrl.configureAccessListStandard('R1', 10, ['permit 192.168.1.0 0.0.0.255']);
  });

  test('no rompe contratos existentes: showIpInterfaceBrief, showVlan, showIpRoute', async () => {
    const bridge = makeBridge({
      execInteractive: (payload: any) => {
        if (payload.command === 'show ip interface brief') {
          return {
            ...terminalResponse,
            raw: 'Interface IP-Address OK? Method Status Protocol\nGi0/1 10.0.0.1 YES manual up up',
            parsed: { entries: [{ interface: 'Gi0/1', ipAddress: '10.0.0.1' }] },
          };
        }
        if (payload.command === 'show vlan brief') {
          return {
            ...terminalResponse,
            raw: 'VLAN Name Status Ports\n10 ADMIN active',
            parsed: { entries: [{ id: 10, name: 'ADMIN' }] },
          };
        }
        if (payload.command === 'show ip route') {
          return {
            ...terminalResponse,
            raw: 'S    10.0.0.0/24 [1/0] via 192.168.1.1',
            parsed: { entries: [{ network: '10.0.0.0', nextHop: '192.168.1.1' }] },
          };
        }
        return { ...terminalResponse, raw: '' };
      },
    });
    const ctrl = new PTController(bridge);

    const brief = await ctrl.showIpInterfaceBrief('R1');
    expect(brief).toBeDefined();

    const vlan = await ctrl.showVlan('SW1');
    expect(vlan).toBeDefined();

    const route = await ctrl.showIpRoute('R1');
    expect(route).toBeDefined();
  });
});
