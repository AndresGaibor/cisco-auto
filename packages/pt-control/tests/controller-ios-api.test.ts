import { expect, test, describe } from 'bun:test';
import { ControllerIosService } from '../src/controller/ios-service.js';

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
  };
}

const terminalResponse = {
  ok: true,
  source: 'terminal',
  session: { mode: 'priv-exec', prompt: 'R1#' },
  diagnostics: { source: 'terminal', completionReason: 'command-ended' },
};

describe('PTController IOS API — Fase 4', () => {
  test('ControllerIosService.delega configureDhcpPool a IosService', async () => {
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

    const mockIosService = {
      execIos: async (device: string, cmd: string) => ({ raw: '' }),
      configIos: async (device: string, commands: string[]) => ({ executed: true, device, commands }),
      execInteractive: async (device: string, cmd: string, opts?: any) => {
        callLog.push({ type: 'execInteractive', payload: { device, command: cmd, ...opts } });
        return { raw: '' };
      },
      execIosWithEvidence: async (device: string, cmd: string) => ({ ok: true, raw: '' }),
      configIosWithResult: async (device: string, commands: string[]) => ({ executed: true }),
      show: async (device: string, cmd: string) => ({ raw: '' }),
      showParsed: async (device: string, cmd: string, opts?: any) => ({ raw: '' }),
      showIpInterfaceBrief: async (device: string) => ({ entries: [] }),
      showVlan: async (device: string) => ({ entries: [] }),
      showIpRoute: async (device: string) => ({ entries: [] }),
      showRunningConfig: async (device: string) => ({ raw: '' }),
      showMacAddressTable: async (device: string) => ({ entries: [] }),
      showCdpNeighbors: async (device: string) => ({ neighbors: [] }),
      getConfidence: async (device: string, evidence: any, check?: string) => ({ confidence: 1.0 }),
      resolveCapabilities: async (device: string) => ({ model: '2911' }),
      configureDhcpPool: async (device: string, poolName: string, network: string, mask: string, defaultRouter: string, dnsServer?: string) => {
        await bridge.sendCommandAndWait('execInteractive', { device, command: 'show running-config' });
      },
      configureOspfNetwork: async () => {},
      configureSshAccess: async () => {},
      configureAccessListStandard: async () => {},
    };

    const mockDeviceService = {
      inspect: async (device: string) => ({ name: device, model: '2911', type: 'router', power: true, ports: [] }),
    };

    const service = new ControllerIosService(mockIosService as any, mockDeviceService as any);
    await service.configureDhcpPool('R1', 'POOL1', '192.168.1.0', '255.255.255.0', '192.168.1.1');
    expect(callLog.some(c => c.payload.command === 'show running-config')).toBe(true);
  });

  test('ControllerIosService.delega configureOspfNetwork a IosService', async () => {
    const bridge = makeBridge({
      configIos: { ...terminalResponse },
      execInteractive: { ...terminalResponse, raw: 'Routing Protocol is "ospf 1"\n' },
    });

    const mockIosService = {
      configureOspfNetwork: async (device: string, pid: number, network: string, wildcard: string, area: number) => {
        await bridge.sendCommandAndWait('configIos', { device, commands: [`router ospf ${pid}`] });
      },
      configIos: async () => ({}),
      execIos: async () => ({ raw: '' }),
      execInteractive: async () => ({ raw: '' }),
      execIosWithEvidence: async () => ({ ok: true, raw: '' }),
      configIosWithResult: async () => ({ executed: true }),
      show: async () => ({ raw: '' }),
      showParsed: async () => ({ raw: '' }),
      showIpInterfaceBrief: async () => ({ entries: [] }),
      showVlan: async () => ({ entries: [] }),
      showIpRoute: async () => ({ entries: [] }),
      showRunningConfig: async () => ({ raw: '' }),
      showMacAddressTable: async () => ({ entries: [] }),
      showCdpNeighbors: async () => ({ neighbors: [] }),
      getConfidence: async () => ({ confidence: 1.0 }),
      resolveCapabilities: async () => ({ model: '2911' }),
    };

    const mockDeviceService = { inspect: async () => ({}) };

    const service = new ControllerIosService(mockIosService as any, mockDeviceService as any);
    await service.configureOspfNetwork('R1', 1, '10.0.0.0', '0.0.0.255', 0);
  });

  test('ControllerIosService.delega configureSshAccess a IosService', async () => {
    const bridge = makeBridge({
      configIos: { ...terminalResponse },
      execInteractive: { ...terminalResponse, raw: 'line vty 0 4\n transport input ssh\n login local\n' },
    });

    const mockIosService = {
      configureSshAccess: async (device: string, domain: string, user: string, pass: string) => {
        await bridge.sendCommandAndWait('configIos', { device, commands: ['ip domain-name ' + domain] });
      },
      configIos: async () => ({}),
      execIos: async () => ({ raw: '' }),
      execInteractive: async () => ({ raw: '' }),
      execIosWithEvidence: async () => ({ ok: true, raw: '' }),
      configIosWithResult: async () => ({ executed: true }),
      show: async () => ({ raw: '' }),
      showParsed: async () => ({ raw: '' }),
      showIpInterfaceBrief: async () => ({ entries: [] }),
      showVlan: async () => ({ entries: [] }),
      showIpRoute: async () => ({ entries: [] }),
      showRunningConfig: async () => ({ raw: '' }),
      showMacAddressTable: async () => ({ entries: [] }),
      showCdpNeighbors: async () => ({ neighbors: [] }),
      getConfidence: async () => ({ confidence: 1.0 }),
      resolveCapabilities: async () => ({ model: '2911' }),
    };

    const mockDeviceService = { inspect: async () => ({}) };

    const service = new ControllerIosService(mockIosService as any, mockDeviceService as any);
    await service.configureSshAccess('R1', 'lab.local', 'admin', 'secret');
  });

  test('ControllerIosService.delega configureAccessListStandard a IosService', async () => {
    const bridge = makeBridge({
      configIos: { ...terminalResponse },
      execInteractive: { ...terminalResponse, raw: 'Standard IP access list 10\n' },
    });

    const mockIosService = {
      configureAccessListStandard: async (device: string, acl: number, entries: string[]) => {
        await bridge.sendCommandAndWait('configIos', { device, commands: [`access-list ${acl}`] });
      },
      configIos: async () => ({}),
      execIos: async () => ({ raw: '' }),
      execInteractive: async () => ({ raw: '' }),
      execIosWithEvidence: async () => ({ ok: true, raw: '' }),
      configIosWithResult: async () => ({ executed: true }),
      show: async () => ({ raw: '' }),
      showParsed: async () => ({ raw: '' }),
      showIpInterfaceBrief: async () => ({ entries: [] }),
      showVlan: async () => ({ entries: [] }),
      showIpRoute: async () => ({ entries: [] }),
      showRunningConfig: async () => ({ raw: '' }),
      showMacAddressTable: async () => ({ entries: [] }),
      showCdpNeighbors: async () => ({ neighbors: [] }),
      getConfidence: async () => ({ confidence: 1.0 }),
      resolveCapabilities: async () => ({ model: '2911' }),
    };

    const mockDeviceService = { inspect: async () => ({}) };

    const service = new ControllerIosService(mockIosService as any, mockDeviceService as any);
    await service.configureAccessListStandard('R1', 10, ['permit 192.168.1.0 0.0.0.255']);
  });

  test('no rompe contratos existentes: showIpInterfaceBrief, showVlan, showIpRoute', async () => {
    const mockIosService = {
      showIpInterfaceBrief: async (device: string) => ({
        raw: 'Interface IP-Address OK? Method Status Protocol\nGi0/1 10.0.0.1 YES manual up up',
        interfaces: [{ interface: 'Gi0/1', ipAddress: '10.0.0.1', ok: 'YES', method: 'manual', status: 'up', protocol: 'up' }],
      }),
      showVlan: async (device: string) => ({
        raw: 'VLAN Name Status Ports\n10 ADMIN active',
        vlans: [{ id: 10, name: 'ADMIN', status: 'active', ports: [] }],
      }),
      showIpRoute: async (device: string) => ({
        raw: 'S    10.0.0.0/24 [1/0] via 192.168.1.1',
        routes: [{ type: 'S', network: '10.0.0.0', mask: '24', nextHop: '192.168.1.1' }],
      }),
      configIos: async () => ({}),
      execIos: async () => ({ raw: '' }),
      execInteractive: async () => ({ raw: '' }),
      execIosWithEvidence: async () => ({ ok: true, raw: '' }),
      configIosWithResult: async () => ({ executed: true }),
      show: async () => ({ raw: '' }),
      showParsed: async () => ({ raw: '' }),
      showRunningConfig: async () => ({ raw: '' }),
      showMacAddressTable: async () => ({ entries: [] }),
      showCdpNeighbors: async () => ({ neighbors: [] }),
      getConfidence: async () => ({ confidence: 1.0 }),
      resolveCapabilities: async () => ({ model: '2911' }),
    };

    const mockDeviceService = { inspect: async () => ({}) };

    const service = new ControllerIosService(mockIosService as any, mockDeviceService as any);

    const brief = await service.showIpInterfaceBrief('R1');
    expect(brief).toBeDefined();

    const vlan = await service.showVlan('SW1');
    expect(vlan).toBeDefined();

    const route = await service.showIpRoute('R1');
    expect(route).toBeDefined();
  });
});
