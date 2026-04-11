import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { verifyLink, buildLinkVerificationChecks, type LinkVerificationData } from '../../src/application/verify-link';

describe('verify-link application service', () => {
  const mockController = {
    inspectDevice: mock(async (device: string) => {
      if (device === 'R1') {
        return {
          name: 'R1',
          ports: [
            { name: 'GigabitEthernet0/0', link: 'S1:GigabitEthernet0/1' },
            { name: 'GigabitEthernet0/1', link: null },
          ],
        };
      }
      if (device === 'S1') {
        return {
          name: 'S1',
          ports: [
            { name: 'GigabitEthernet0/1', link: 'R1:GigabitEthernet0/0' },
          ],
        };
      }
      if (device === 'UNKNOWN') {
        throw new Error('Device not found');
      }
      return { name: device, ports: [] };
    }),
  };

  beforeEach(() => {
    mockController.inspectDevice.mockClear();
  });

  describe('verifyLink', () => {
    test('returns link visible when both endpoints have connections', async () => {
      const result = await verifyLink(
        mockController as any,
        'R1', 'GigabitEthernet0/0',
        'S1', 'GigabitEthernet0/1'
      );

      expect(result.linkVisible).toBe(true);
      expect(result.endpointA.exists).toBe(true);
      expect(result.endpointB.exists).toBe(true);
    });

    test('returns link not visible when one endpoint has no link', async () => {
      const result = await verifyLink(
        mockController as any,
        'R1', 'GigabitEthernet0/1',
        'S1', 'GigabitEthernet0/1'
      );

      expect(result.linkVisible).toBe(false);
      expect(result.endpointA.exists).toBe(true);
      expect(result.endpointB.exists).toBe(true);
    });

    test('handles device inspection failure gracefully', async () => {
      const result = await verifyLink(
        mockController as any,
        'UNKNOWN', 'GigabitEthernet0/0',
        'S1', 'GigabitEthernet0/1'
      );

      // Should return partial data without throwing
      expect(result.endpointA.exists).toBe(false);
    });

    test('includes link details when link is visible', async () => {
      const result = await verifyLink(
        mockController as any,
        'R1', 'GigabitEthernet0/0',
        'S1', 'GigabitEthernet0/1'
      );

      expect(result.linkDetails).toBeDefined();
      expect(result.linkDetails?.device1).toBeTruthy();
      expect(result.linkDetails?.port1).toBeTruthy();
    });
  });

  describe('buildLinkVerificationChecks', () => {
    test('creates check for endpoint-a-exists', () => {
      const data: LinkVerificationData = {
        endpointA: { device: 'R1', port: 'Gig0/0', exists: true },
        endpointB: { device: 'S1', port: 'Gig0/1', exists: true },
        linkVisible: true,
      };

      const checks = buildLinkVerificationChecks(data);

      const check = checks.find(c => c.name === 'endpoint-a-exists');
      expect(check).toBeDefined();
      expect(check!.ok).toBe(true);
      expect(check!.details).toEqual({ device: 'R1', port: 'Gig0/0' });
    });

    test('creates check for endpoint-b-exists', () => {
      const data: LinkVerificationData = {
        endpointA: { device: 'R1', port: 'Gig0/0', exists: true },
        endpointB: { device: 'S1', port: 'Gig0/1', exists: false },
        linkVisible: false,
      };

      const checks = buildLinkVerificationChecks(data);

      const check = checks.find(c => c.name === 'endpoint-b-exists');
      expect(check).toBeDefined();
      expect(check!.ok).toBe(false);
    });

    test('creates check for link-visible', () => {
      const data: LinkVerificationData = {
        endpointA: { device: 'R1', port: 'Gig0/0', exists: true },
        endpointB: { device: 'S1', port: 'Gig0/1', exists: true },
        linkVisible: true,
        linkDetails: { device1: 'R1', port1: 'Gig0/0', device2: 'S1', port2: 'Gig0/1' },
      };

      const checks = buildLinkVerificationChecks(data);

      const check = checks.find(c => c.name === 'link-visible');
      expect(check).toBeDefined();
      expect(check!.ok).toBe(true);
      expect(check!.details).toEqual({ device1: 'R1', port1: 'Gig0/0', device2: 'S1', port2: 'Gig0/1' });
    });

    test('returns empty details for link-visible when not visible', () => {
      const data: LinkVerificationData = {
        endpointA: { device: 'R1', port: 'Gig0/0', exists: true },
        endpointB: { device: 'S1', port: 'Gig0/1', exists: true },
        linkVisible: false,
      };

      const checks = buildLinkVerificationChecks(data);

      const check = checks.find(c => c.name === 'link-visible');
      expect(check!.details).toBeUndefined();
    });
  });
});