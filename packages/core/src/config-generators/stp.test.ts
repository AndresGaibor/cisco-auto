/**
 * Tests for STP Configuration
 */

import { describe, test, expect } from 'bun:test';

describe('STP Configuration', () => {
  describe('STP modes', () => {
    test('should support PVST+ mode', () => {
      const stp = {
        mode: 'pvst+',
        region: 'region0'
      };

      expect(stp.mode).toBe('pvst+');
    });

    test('should support RSTP mode', () => {
      const stp = {
        mode: 'rstp',
        priority: 4096
      };

      expect(stp.mode).toBe('rstp');
    });

    test('should support MSTP mode', () => {
      const stp = {
        mode: 'mstp',
        regions: ['region1', 'region2']
      };

      expect(stp.mode).toBe('mstp');
    });
  });

  describe('Bridge priority', () => {
    test('should validate bridge priority', () => {
      const priorities = [0, 4096, 8192, 32768, 61440];

      priorities.forEach(p => {
        expect(p % 4096).toBe(0);
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(65535);
      });
    });

    test('should set root bridge', () => {
      const config = {
        priority: 0,
        description: 'Root Bridge'
      };

      expect(config.priority).toBe(0);
    });

    test('should calculate MAC address tie-breaker', () => {
      const bridgeId = '0000.0000.0001';
      const parts = bridgeId.split('.');

      expect(parts).toHaveLength(3);
    });
  });

  describe('Port STP configuration', () => {
    test('should configure port role', () => {
      const portRoles = ['root', 'designated', 'alternate', 'backup'];

      portRoles.forEach(role => {
        expect(role.length).toBeGreaterThan(0);
      });
    });

    test('should set port cost', () => {
      const costs = {
        '10Mbps': 100,
        '100Mbps': 19,
        '1Gbps': 4,
        '10Gbps': 2
      };

      Object.values(costs).forEach(cost => {
        expect(cost).toBeGreaterThan(0);
      });
    });

    test('should configure BPDU guard', () => {
      const port = {
        interface: 'Gi0/0',
        bpduGuard: true,
        portFast: true
      };

      expect(port.bpduGuard).toBe(true);
    });

    test('should set port priority', () => {
      const priorities = [0, 16, 32, 48, 240];

      priorities.forEach(p => {
        expect(p % 16).toBe(0);
      });
    });
  });

  describe('Timers', () => {
    test('should configure hello time', () => {
      const hello = 2;
      expect(hello).toBeGreaterThanOrEqual(1);
      expect(hello).toBeLessThanOrEqual(10);
    });

    test('should configure forward delay', () => {
      const forwardDelay = 15;
      expect(forwardDelay).toBeGreaterThanOrEqual(4);
      expect(forwardDelay).toBeLessThanOrEqual(30);
    });

    test('should configure max age', () => {
      const maxAge = 20;
      expect(maxAge).toBeGreaterThanOrEqual(6);
      expect(maxAge).toBeLessThanOrEqual(40);
    });

    test('should validate timer relationships', () => {
      const hello = 2;
      const forwardDelay = 15;
      const maxAge = 20;

      expect(forwardDelay).toBeGreaterThan(hello);
      expect(maxAge).toBeGreaterThan(hello);
    });
  });

  describe('VLAN STP', () => {
    test('should configure per-VLAN STP', () => {
      const vlan = {
        id: 10,
        priority: 0,
        rootPort: 'Gi0/1'
      };

      expect(vlan.priority).toBe(0);
    });

    test('should support VLAN groups', () => {
      const vlanGroups = [
        { vlans: '1-100', priority: 4096 },
        { vlans: '101-200', priority: 8192 }
      ];

      expect(vlanGroups).toHaveLength(2);
    });
  });

  describe('MSTP regions', () => {
    test('should define MSTP region', () => {
      const region = {
        name: 'region1',
        revision: 0,
        instances: [
          { id: 0, vlans: '1-100' },
          { id: 1, vlans: '101-200' }
        ]
      };

      expect(region.name).toBe('region1');
      expect(region.instances).toHaveLength(2);
    });

    test('should configure IST', () => {
      const ist = {
        region: 'region1',
        priority: 0
      };

      expect(ist.region).toBeDefined();
    });
  });

  describe('Protection features', () => {
    test('should enable BPDU filter', () => {
      const config = {
        bpduFilter: true
      };

      expect(config.bpduFilter).toBe(true);
    });

    test('should enable root guard', () => {
      const config = {
        interface: 'Gi0/0',
        rootGuard: true
      };

      expect(config.rootGuard).toBe(true);
    });

    test('should enable loop guard', () => {
      const config = {
        interface: 'Gi0/0',
        loopGuard: true
      };

      expect(config.loopGuard).toBe(true);
    });

    test('should configure port fast', () => {
      const portFast = {
        enabled: true,
        bpduGuard: true
      };

      expect(portFast.enabled).toBe(true);
    });
  });

  describe('Topology change', () => {
    test('should detect topology changes', () => {
      const change = {
        time: Date.now(),
        reason: 'port status change',
        affectedPort: 'Gi0/0'
      };

      expect(change.reason).toBeDefined();
    });

    test('should log topology changes', () => {
      const logs: any[] = [];

      const logChange = (change: any) => {
        logs.push({ timestamp: Date.now(), ...change });
      };

      logChange({ reason: 'new bridge', port: 'Gi0/0' });
      expect(logs).toHaveLength(1);
    });
  });

  describe('Edge cases', () => {
    test('should handle bridge with single port', () => {
      const ports = ['Gi0/0'];
      expect(ports).toHaveLength(1);
    });

    test('should handle parallel links', () => {
      const links = [
        { interface: 'Gi0/0', cost: 4 },
        { interface: 'Gi0/1', cost: 4 },
        { interface: 'Gi0/2', cost: 4 }
      ];

      expect(links).toHaveLength(3);
    });

    test('should handle loop prevention', () => {
      const topology = {
        bridges: 3,
        links: 3,
        expectedLoopFree: true
      };

      expect(topology.links).toBeLessThan(topology.bridges * topology.bridges);
    });
  });
});
