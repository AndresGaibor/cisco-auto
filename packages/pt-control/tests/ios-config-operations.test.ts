import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { IosConfigOperations } from '../src/application/services/ios-config-operations.js';
import type { CapabilitySet } from '@cisco-auto/ios-domain';
import type { CommandResult } from '@cisco-auto/ios-domain';

// Mock router capability set with full routing support
const mockRouterCaps = {
  routing: { dhcpRelay: true, ipRouting: true, svi: true, subinterfaces: true, nat: true, acl: true, pbr: true, vrf: true },
  switchport: { accessMode: true, trunkMode: true, dot1q: true, trunkEncapsulation: true },
  switching: { vlan: true, spanningTree: true, portSecurity: true },
} as unknown as CapabilitySet;

describe('IosConfigOperations', () => {
  const mockGetSession = mock(() => ({}));
  const mockGetCapabilities = mock((device: string) => mockRouterCaps);
  const mockExecutePlan = mock(async (device: string, plan: any) => {
    return [] as CommandResult[];
  });

  let operations: IosConfigOperations;

  beforeEach(() => {
    mockGetSession.mockClear();
    mockGetCapabilities.mockClear();
    mockExecutePlan.mockClear();
    operations = new IosConfigOperations(
      mockGetSession,
      mockGetCapabilities,
      mockExecutePlan,
    );
  });

  describe('configureSvi', () => {
    test('returns null for device without SVI capability', async () => {
      const nonSviCaps = {
        ...mockRouterCaps,
        routing: { ...mockRouterCaps.routing, svi: false },
      };
      mockGetCapabilities.mockImplementation((device: string) => nonSviCaps as CapabilitySet);

      const result = await operations.configureSvi('R1', 10, '192.168.10.1', '255.255.255.0');

      // Plan returns null when device doesn't support SVI
      expect(mockExecutePlan).toHaveBeenCalledWith('R1', null);
    });

    test('calls getCapabilities for the device', async () => {
      mockGetCapabilities.mockImplementation((device: string) => mockRouterCaps);
      await operations.configureSvi('R1', 10, '192.168.10.1', '255.255.255.0');

      expect(mockGetCapabilities).toHaveBeenCalledWith('R1');
    });

    test('calls executePlan when device has SVI capability', async () => {
      mockGetCapabilities.mockImplementation((device: string) => mockRouterCaps);
      await operations.configureSvi('R1', 10, '192.168.10.1', '255.255.255.0');

      expect(mockExecutePlan).toHaveBeenCalled();
    });
  });

  describe('configureAccessPort', () => {
    test('calls executePlan when device has access mode capability', async () => {
      await operations.configureAccessPort('S1', 'FastEthernet0/1', 10);

      expect(mockExecutePlan).toHaveBeenCalled();
    });
  });

  describe('configureTrunkPort', () => {
    test('calls executePlan when device has trunk mode capability', async () => {
      await operations.configureTrunkPort('S1', 'FastEthernet0/1', 99);

      expect(mockExecutePlan).toHaveBeenCalled();
    });
  });

  describe('configureSubinterface', () => {
    test('calls executePlan for subinterface configuration', async () => {
      await operations.configureSubinterface('R1', 'GigabitEthernet0/0', 100, '10.100.100.1', '255.255.255.0');

      expect(mockExecutePlan).toHaveBeenCalled();
    });
  });

  describe('configureStaticRoute', () => {
    test('calls executePlan for static route configuration', async () => {
      await operations.configureStaticRoute('R1', '0.0.0.0', '0.0.0.0', '192.168.1.254');

      expect(mockExecutePlan).toHaveBeenCalled();
    });
  });

  describe('configureDhcpRelay', () => {
    test('calls executePlan for DHCP relay configuration', async () => {
      await operations.configureDhcpRelay('R1', 'GigabitEthernet0/0', '192.168.1.1');

      expect(mockExecutePlan).toHaveBeenCalled();
    });
  });
});