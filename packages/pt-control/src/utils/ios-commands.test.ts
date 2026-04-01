/**
 * Tests for iOS command builders
 */

import { describe, test, expect } from 'bun:test';
import { 
  buildVlanCommands, 
  buildTrunkCommands,
  buildSshCommands
} from './ios-commands';

describe('iOS Command Builders', () => {
  describe('buildVlanCommands', () => {
    test('should generate VLAN creation commands', () => {
      const cmds = buildVlanCommands([10, 20, 30]);
      
      expect(cmds).toContain('vlan 10');
      expect(cmds).toContain(' name VLAN10');
      expect(cmds).toContain(' exit');
    });

    test('should use custom VLAN name prefix', () => {
      const cmds = buildVlanCommands([10, 20], 'PROD');
      
      expect(cmds).toContain('vlan 10');
      expect(cmds).toContain(' name PROD');
      expect(cmds).toContain('vlan 20');
    });

    test('should handle single VLAN', () => {
      const cmds = buildVlanCommands([100]);
      
      expect(cmds).toContain('vlan 100');
      expect(cmds).toContain(' name VLAN100');
      expect(cmds.length).toBeGreaterThanOrEqual(3);
    });

    test('should handle empty array', () => {
      const cmds = buildVlanCommands([]);
      
      expect(Array.isArray(cmds)).toBe(true);
      expect(cmds.length).toBe(0);
    });

    test('should handle large VLAN IDs', () => {
      const cmds = buildVlanCommands([4094, 4093]);
      
      expect(cmds).toContain('vlan 4094');
      expect(cmds).toContain('vlan 4093');
    });

    test('should structure commands in groups of 3', () => {
      const cmds = buildVlanCommands([1, 2, 3]);
      
      expect(cmds.length).toBe(9); // 3 VLANs * 3 commands each
    });
  });

  describe('buildTrunkCommands', () => {
    test('should generate trunk port commands', () => {
      const cmds = buildTrunkCommands(['GigabitEthernet0/1'], [1, 10, 20]);
      
      expect(cmds).toContain('interface GigabitEthernet0/1');
      expect(cmds).toContain(' switchport mode trunk');
      expect(cmds).toContain(' switchport trunk allowed vlan 1,10,20');
    });

    test('should handle multiple ports', () => {
      const cmds = buildTrunkCommands(
        ['Gi0/0', 'Gi0/1', 'Gi0/2'],
        [1, 10]
      );
      
      expect(cmds).toContain('interface Gi0/0');
      expect(cmds).toContain('interface Gi0/1');
      expect(cmds).toContain('interface Gi0/2');
      // Should appear 3 times (once for each interface)
      const trunkCounts = cmds.filter(c => c.includes('switchport mode trunk')).length;
      expect(trunkCounts).toBe(3);
    });

    test('should format VLAN list correctly', () => {
      const cmds = buildTrunkCommands(['Gi0/0'], [1, 5, 10, 50, 100]);
      
      expect(cmds).toContain(' switchport trunk allowed vlan 1,5,10,50,100');
    });

    test('should include encapsulation when capability enabled', () => {
      const cmds = buildTrunkCommands(
        ['Gi0/0'],
        [1],
        { supportsTrunkEncapsulationCmd: true }
      );
      
      expect(cmds).toContain(' switchport trunk encapsulation dot1q');
    });

    test('should omit encapsulation when capability disabled', () => {
      const cmds = buildTrunkCommands(
        ['Gi0/0'],
        [1],
        { supportsTrunkEncapsulationCmd: false }
      );
      
      expect(cmds).not.toContain('encapsulation');
    });

    test('should always include shutdown commands', () => {
      const cmds = buildTrunkCommands(['Gi0/0'], [1]);
      
      expect(cmds).toContain(' no shutdown');
      expect(cmds).toContain(' exit');
    });

    test('should handle empty VLANs', () => {
      const cmds = buildTrunkCommands(['Gi0/0'], []);
      
      expect(cmds).toContain('interface Gi0/0');
      expect(cmds).toContain(' switchport trunk allowed vlan ');
    });

    test('should handle complex port names', () => {
      const cmds = buildTrunkCommands(
        ['GigabitEthernet0/0/0', 'TenGigabitEthernet1/0/1'],
        [1]
      );
      
      expect(cmds).toContain('interface GigabitEthernet0/0/0');
      expect(cmds).toContain('interface TenGigabitEthernet1/0/1');
    });
  });

  describe('buildSshCommands', () => {
    test('should generate SSH configuration commands', () => {
      const cmds = buildSshCommands('cisco.local', 'admin', 'P@ssw0rd');
      
      expect(cmds).toContain('ip domain-name cisco.local');
      expect(cmds).toContain('ip ssh version 2');
      expect(cmds).toContain('line vty 0 15');
    });

    test('should include crypto key generation', () => {
      const cmds = buildSshCommands('test.com', 'user', 'pass');
      
      expect(cmds).toContain('crypto key generate rsa general-keys modulus 2048');
    });

    test('should configure line vty with SSH transport', () => {
      const cmds = buildSshCommands('example.com', 'admin', 'secret');
      
      expect(cmds).toContain('line vty 0 15');
      expect(cmds).toContain(' transport input ssh');
      expect(cmds).toContain(' login local');
    });

    test('should add user with correct privilege', () => {
      const cmds = buildSshCommands('corp.local', 'sysadmin', 'MyPassword123');
      
      expect(cmds).toContain('username sysadmin privilege 15 password MyPassword123');
    });

    test('should handle special characters in domain', () => {
      const cmds = buildSshCommands('my-domain.co.uk', 'admin', 'pass');
      
      expect(cmds).toContain('ip domain-name my-domain.co.uk');
    });

    test('should handle special characters in username', () => {
      const cmds = buildSshCommands('local', 'admin-user', 'pass');
      
      expect(cmds.some(c => c.includes('admin-user'))).toBe(true);
    });

    test('should have proper structure', () => {
      const cmds = buildSshCommands('test.local', 'admin', 'pass');
      
      expect(cmds.length).toBeGreaterThan(5);
      expect(typeof cmds[0]).toBe('string');
    });

    test('should include exit command for line vty', () => {
      const cmds = buildSshCommands('local', 'admin', 'pass');
      
      const vtyIndex = cmds.findIndex(c => c.includes('line vty'));
      const exitAfterVty = cmds.slice(vtyIndex).some(c => c.includes(' exit'));
      expect(exitAfterVty).toBe(true);
    });
  });

  describe('command composition', () => {
    test('should allow chaining multiple command types', () => {
      const vlans = buildVlanCommands([10, 20]);
      const trunks = buildTrunkCommands(['Gi0/0'], [10, 20]);
      const ssh = buildSshCommands('local', 'admin', 'pass');

      const allCommands = [...vlans, ...trunks, ...ssh];

      expect(allCommands.length).toBeGreaterThan(10);
      expect(allCommands.every(c => typeof c === 'string')).toBe(true);
    });

    test('should preserve order in composed commands', () => {
      const cmds1 = buildVlanCommands([10]);
      const cmds2 = buildTrunkCommands(['Gi0/0'], [10]);

      expect(cmds1[cmds1.length - 1]).toContain('exit');
      expect(cmds2[0]).toContain('interface');
    });
  });

  describe('edge cases', () => {
    test('should handle very large VLAN lists', () => {
      const vlans = Array.from({ length: 100 }, (_, i) => i + 1);
      const cmds = buildTrunkCommands(['Gi0/0'], vlans);

      expect(cmds).toContain('interface Gi0/0');
      expect(cmds.some(c => c.includes('switchport trunk allowed vlan'))).toBe(true);
    });

    test('should handle special characters in passwords', () => {
      const cmds = buildSshCommands(
        'local',
        'admin',
        'P@ssw0rd!#$%'
      );

      expect(cmds.some(c => c.includes('P@ssw0rd!#$%'))).toBe(true);
    });

    test('should generate valid command strings', () => {
      const vlans = buildVlanCommands([1, 2]);
      const trunks = buildTrunkCommands(['Gi0/0'], [1, 2]);
      const ssh = buildSshCommands('local', 'admin', 'pass');

      const allCmds = [...vlans, ...trunks, ...ssh];

      allCmds.forEach(cmd => {
        expect(typeof cmd).toBe('string');
        expect(cmd.length).toBeGreaterThan(0);
      });
    });
  });
});
