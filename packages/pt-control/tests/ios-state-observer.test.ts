import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { IOSStateObserver } from '../src/application/lab/ios-state-observer.js';

describe('IOSStateObserver', () => {
  const mockIos = {
    showVlan: mock(async (device: string) => ({
      vlans: [
        { id: '10', name: 'ADMIN', status: 'active' },
        { id: '20', name: 'USERS', status: 'active' },
      ],
    })),
    showIpRoute: mock(async (device: string) => ({
      routes: [
        { type: 'S', network: '0.0.0.0', mask: '0.0.0.0', nextHop: '192.168.1.1' },
        { type: 'C', network: '192.168.10.0', mask: '255.255.255.0', nextHop: '' },
        { type: 'C', network: '192.168.20.0', mask: '255.255.255.0', nextHop: '' },
      ],
    })),
    showIpInterfaceBrief: mock(async (device: string) => ({
      interfaces: [
        { name: 'GigabitEthernet0/0', ip: '192.168.1.1' },
        { name: 'Vlan10', ip: '192.168.10.1' },
      ],
    })),
  };

  let observer: IOSStateObserver;

  beforeEach(() => {
    mockIos.showVlan.mockClear();
    mockIos.showIpRoute.mockClear();
    mockIos.showIpInterfaceBrief.mockClear();
    observer = new IOSStateObserver(mockIos as any);
  });

  describe('getObservedState', () => {
    test('collects all state from IOS service', async () => {
      const state = await observer.getObservedState('S1');

      expect(state.device).toBe('S1');
      expect(mockIos.showVlan).toHaveBeenCalledWith('S1');
      expect(mockIos.showIpRoute).toHaveBeenCalledWith('S1');
      expect(mockIos.showIpInterfaceBrief).toHaveBeenCalledWith('S1');
    });

    test('returns state with empty access ports and trunks initially', async () => {
      const state = await observer.getObservedState('S1');

      expect(state.accessPorts).toEqual([]);
      expect(state.trunks).toEqual([]);
    });
  });

  describe('getVlans', () => {
    test('parses VLAN entries from showVlan output', async () => {
      const vlans = await observer.getVlans('S1');

      expect(vlans).toHaveLength(2);
      expect(vlans[0].id).toBe(10);
      expect(vlans[0].name).toBe('ADMIN');
      expect(vlans[0].status).toBe('active');
    });

    test('returns empty array when showVlan fails', async () => {
      mockIos.showVlan.mockImplementation(async () => { throw new Error('Device not reachable'); });

      const vlans = await observer.getVlans('S1');

      expect(vlans).toEqual([]);
    });
  });

  describe('getStaticRoutes', () => {
    test('filters only static routes (type S)', async () => {
      const routes = await observer.getStaticRoutes('R1');

      expect(routes).toHaveLength(1);
      expect(routes[0].network).toBe('0.0.0.0');
    });

    test('extracts next hop from static routes', async () => {
      const routes = await observer.getStaticRoutes('R1');

      expect(routes[0].nextHop).toBe('192.168.1.1');
    });

    test('returns empty array when showIpRoute fails', async () => {
      mockIos.showIpRoute.mockImplementation(async () => { throw new Error('Device not reachable'); });

      const routes = await observer.getStaticRoutes('R1');

      expect(routes).toEqual([]);
    });
  });

  describe('getIpInterfaces', () => {
    test('returns interfaces from showIpInterfaceBrief', async () => {
      const interfaces = await observer.getIpInterfaces('R1');

      expect(interfaces).toHaveLength(2);
      expect(interfaces[0].name).toBe('GigabitEthernet0/0');
    });

    test('returns empty array when showIpInterfaceBrief fails', async () => {
      mockIos.showIpInterfaceBrief.mockImplementation(async () => { throw new Error('Device not reachable'); });

      const interfaces = await observer.getIpInterfaces('R1');

      expect(interfaces).toEqual([]);
    });
  });

  describe('getSvisFromRoute', () => {
    test('extracts SVI from connected routes with /24 or larger mask', async () => {
      // Using /26 mask which maskToBits correctly calculates as 26 bits
      mockIos.showIpRoute.mockImplementation(async () => ({
        routes: [
          { type: 'C', network: '192.168.10.0', mask: '255.255.255.192', nextHop: '' },
          { type: 'C', network: '192.168.20.0', mask: '255.255.255.192', nextHop: '' },
        ],
      }));

      const svis = await observer.getSvisFromRoute('R1');

      // Third octets 10 and 20 are valid VLAN IDs (1-4094), /26 mask is >= 24
      expect(svis).toHaveLength(2);
      expect(svis[0].vlan).toBe(10);
      expect(svis[1].vlan).toBe(20);
    });

    test('ignores routes with mask smaller than /24', async () => {
      mockIos.showIpRoute.mockImplementation(async () => ({
        routes: [
          { type: 'C', network: '10.0.0.0', mask: '255.0.0.0', nextHop: '' },
        ],
      }));

      const svis = await observer.getSvisFromRoute('R1');

      expect(svis).toHaveLength(0);
    });

    test('ignores third octets outside VLAN range', async () => {
      mockIos.showIpRoute.mockImplementation(async () => ({
        routes: [
          { type: 'C', network: '192.168.0.0', mask: '255.255.255.0', nextHop: '' },
        ],
      }));

      const svis = await observer.getSvisFromRoute('R1');

      // Third octet 0 is not in valid VLAN range 1-4094
      expect(svis).toHaveLength(0);
    });

    test('returns empty array when showIpRoute fails', async () => {
      mockIos.showIpRoute.mockImplementation(async () => { throw new Error('Device not reachable'); });

      const svis = await observer.getSvisFromRoute('R1');

      expect(svis).toEqual([]);
    });
  });
});