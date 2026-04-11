import { describe, test, expect } from 'bun:test';
import { PortBuilder, type AccessPortConfig, type TrunkPortConfig } from '../src/intent/port-builder.js';

describe('PortBuilder', () => {
  const builder = new PortBuilder();

  describe('buildAccessPort', () => {
    test('generates basic access port commands', () => {
      const config: AccessPortConfig = {
        interfaceName: 'FastEthernet0/1',
        vlanId: 10,
      };

      const commands = builder.buildAccessPort(config);

      expect(commands).toContain('interface FastEthernet0/1');
      expect(commands).toContain('switchport mode access');
      expect(commands).toContain('switchport access vlan 10');
      expect(commands).toContain('exit');
    });

    test('includes portfast when enabled', () => {
      const config: AccessPortConfig = {
        interfaceName: 'GigabitEthernet0/0',
        vlanId: 20,
        spanning_tree_portfast: true,
      };

      const commands = builder.buildAccessPort(config);

      expect(commands).toContain('spanning-tree portfast');
    });

    test('includes bpduguard when enabled', () => {
      const config: AccessPortConfig = {
        interfaceName: 'GigabitEthernet0/0',
        vlanId: 20,
        bpdu_guard: true,
      };

      const commands = builder.buildAccessPort(config);

      expect(commands).toContain('spanning-tree bpduguard enable');
    });

    test('includes description when provided', () => {
      const config: AccessPortConfig = {
        interfaceName: 'FastEthernet0/1',
        vlanId: 10,
        description: 'Access to VLAN 10',
      };

      const commands = builder.buildAccessPort(config);

      expect(commands).toContain('description Access to VLAN 10');
    });

    test('includes all optional features together', () => {
      const config: AccessPortConfig = {
        interfaceName: 'GigabitEthernet0/1',
        vlanId: 50,
        spanning_tree_portfast: true,
        bpdu_guard: true,
        description: 'Server port',
      };

      const commands = builder.buildAccessPort(config);

      expect(commands).toContain('interface GigabitEthernet0/1');
      expect(commands).toContain('switchport mode access');
      expect(commands).toContain('switchport access vlan 50');
      expect(commands).toContain('spanning-tree portfast');
      expect(commands).toContain('spanning-tree bpduguard enable');
      expect(commands).toContain('description Server port');
      expect(commands).toContain('exit');
    });
  });

  describe('buildTrunkPort', () => {
    test('generates basic trunk port commands', () => {
      const config: TrunkPortConfig = {
        interfaceName: 'FastEthernet0/1',
        allowedVlans: [10, 20, 30],
      };

      const commands = builder.buildTrunkPort(config);

      expect(commands).toContain('interface FastEthernet0/1');
      expect(commands).toContain('switchport mode trunk');
      expect(commands).toContain('switchport trunk allowed vlan 10,20,30');
      expect(commands).toContain('exit');
    });

    test('includes dot1q encapsulation when specified', () => {
      const config: TrunkPortConfig = {
        interfaceName: 'GigabitEthernet0/1',
        encapsulation: 'dot1q',
        allowedVlans: [10, 20],
      };

      const commands = builder.buildTrunkPort(config);

      expect(commands).toContain('switchport trunk encapsulation dot1q');
    });

    test('includes isl encapsulation when specified', () => {
      const config: TrunkPortConfig = {
        interfaceName: 'FastEthernet0/1',
        encapsulation: 'isl',
        allowedVlans: [10],
      };

      const commands = builder.buildTrunkPort(config);

      expect(commands).toContain('switchport trunk encapsulation isl');
    });

    test('includes native VLAN when specified', () => {
      const config: TrunkPortConfig = {
        interfaceName: 'GigabitEthernet0/1',
        nativeVlan: 99,
        allowedVlans: [10, 20],
      };

      const commands = builder.buildTrunkPort(config);

      expect(commands).toContain('switchport trunk native vlan 99');
    });

    test('includes description when provided', () => {
      const config: TrunkPortConfig = {
        interfaceName: 'FastEthernet0/1',
        allowedVlans: [10, 20],
        description: 'Trunk to core switch',
      };

      const commands = builder.buildTrunkPort(config);

      expect(commands).toContain('description Trunk to core switch');
    });

    test('generates full trunk config with all options', () => {
      const config: TrunkPortConfig = {
        interfaceName: 'GigabitEthernet0/1',
        encapsulation: 'dot1q',
        nativeVlan: 1,
        allowedVlans: [10, 20, 30, 99],
        description: 'Uplink trunk',
      };

      const commands = builder.buildTrunkPort(config);

      expect(commands).toContain('interface GigabitEthernet0/1');
      expect(commands).toContain('switchport mode trunk');
      expect(commands).toContain('switchport trunk encapsulation dot1q');
      expect(commands).toContain('switchport trunk native vlan 1');
      expect(commands).toContain('switchport trunk allowed vlan 10,20,30,99');
      expect(commands).toContain('description Uplink trunk');
      expect(commands).toContain('exit');
    });
  });

  describe('buildPortSpeed', () => {
    test('generates speed command only', () => {
      const commands = builder.buildPortSpeed('FastEthernet0/1', '100');

      expect(commands).toContain('interface FastEthernet0/1');
      expect(commands).toContain('speed 100');
      expect(commands).toContain('exit');
    });

    test('includes duplex when specified', () => {
      const commands = builder.buildPortSpeed('GigabitEthernet0/0', '1000', 'full');

      expect(commands).toContain('duplex full');
    });

    test('handles auto duplex', () => {
      const commands = builder.buildPortSpeed('FastEthernet0/1', 'auto', 'auto');

      expect(commands).toContain('speed auto');
      expect(commands).toContain('duplex auto');
    });
  });

  describe('buildPortDescription', () => {
    test('generates description commands', () => {
      const commands = builder.buildPortDescription('FastEthernet0/1', 'Connected to SW1');

      expect(commands).toEqual([
        'interface FastEthernet0/1',
        'description Connected to SW1',
        'exit',
      ]);
    });
  });

  describe('buildPortShutdown', () => {
    test('generates shutdown command', () => {
      const commands = builder.buildPortShutdown('FastEthernet0/1', true);

      expect(commands).toEqual([
        'interface FastEthernet0/1',
        'shutdown',
        'exit',
      ]);
    });

    test('generates no shutdown command', () => {
      const commands = builder.buildPortShutdown('FastEthernet0/1', false);

      expect(commands).toEqual([
        'interface FastEthernet0/1',
        'no shutdown',
        'exit',
      ]);
    });
  });

  describe('validateAccessPort', () => {
    test('returns no errors for valid config', () => {
      const config: AccessPortConfig = {
        interfaceName: 'FastEthernet0/1',
        vlanId: 100,
      };

      const errors = builder.validateAccessPort(config);

      expect(errors).toHaveLength(0);
    });

    test('returns error for missing interface name', () => {
      const config = {
        interfaceName: '',
        vlanId: 10,
      } as AccessPortConfig;

      const errors = builder.validateAccessPort(config);

      expect(errors).toContain('Interface name is required');
    });

    test('returns error for VLAN ID below range', () => {
      const config: AccessPortConfig = {
        interfaceName: 'FastEthernet0/1',
        vlanId: 0,
      };

      const errors = builder.validateAccessPort(config);

      expect(errors).toContain('Invalid VLAN ID: 0 (1-4094)');
    });

    test('returns error for VLAN ID above range', () => {
      const config: AccessPortConfig = {
        interfaceName: 'FastEthernet0/1',
        vlanId: 5000,
      };

      const errors = builder.validateAccessPort(config);

      expect(errors).toContain('Invalid VLAN ID: 5000 (1-4094)');
    });

    test('accepts boundary VLAN IDs 1 and 4094', () => {
      const minConfig: AccessPortConfig = {
        interfaceName: 'FastEthernet0/1',
        vlanId: 1,
      };
      const maxConfig: AccessPortConfig = {
        interfaceName: 'FastEthernet0/1',
        vlanId: 4094,
      };

      expect(builder.validateAccessPort(minConfig)).toHaveLength(0);
      expect(builder.validateAccessPort(maxConfig)).toHaveLength(0);
    });
  });

  describe('validateTrunkPort', () => {
    test('returns no errors for valid config', () => {
      const config: TrunkPortConfig = {
        interfaceName: 'FastEthernet0/1',
        allowedVlans: [10, 20, 30],
      };

      const errors = builder.validateTrunkPort(config);

      expect(errors).toHaveLength(0);
    });

    test('returns error for missing interface name', () => {
      const config = {
        interfaceName: '',
        allowedVlans: [10],
      } as TrunkPortConfig;

      const errors = builder.validateTrunkPort(config);

      expect(errors).toContain('Interface name is required');
    });

    test('returns error when no VLANs allowed', () => {
      const config: TrunkPortConfig = {
        interfaceName: 'FastEthernet0/1',
        allowedVlans: [],
      };

      const errors = builder.validateTrunkPort(config);

      expect(errors).toContain('At least one VLAN must be allowed on trunk');
    });

    test('returns error for invalid VLAN ID in allowed list', () => {
      const config: TrunkPortConfig = {
        interfaceName: 'FastEthernet0/1',
        allowedVlans: [10, 5000],
      };

      const errors = builder.validateTrunkPort(config);

      expect(errors).toContain('Invalid VLAN ID: 5000 (1-4094)');
    });

    test('returns error for invalid native VLAN', () => {
      const config: TrunkPortConfig = {
        interfaceName: 'FastEthernet0/1',
        allowedVlans: [10],
        nativeVlan: 5000,
      };

      const errors = builder.validateTrunkPort(config);

      expect(errors).toContain('Invalid native VLAN: 5000 (1-4094)');
    });

    test('nativeVlan of 0 is currently accepted (validation gap)', () => {
      // Note: The code uses `config.nativeVlan &&` which treats 0 as falsy
      const config: TrunkPortConfig = {
        interfaceName: 'FastEthernet0/1',
        allowedVlans: [10],
        nativeVlan: 0,
      };

      const errors = builder.validateTrunkPort(config);

      // Currently passes - this is a validation gap
      expect(errors).toHaveLength(0);
    });

    test('accepts valid native VLAN', () => {
      const config: TrunkPortConfig = {
        interfaceName: 'FastEthernet0/1',
        allowedVlans: [10, 20],
        nativeVlan: 99,
      };

      const errors = builder.validateTrunkPort(config);

      expect(errors).toHaveLength(0);
    });

    test('accepts single VLAN in allowed list', () => {
      const config: TrunkPortConfig = {
        interfaceName: 'FastEthernet0/1',
        allowedVlans: [10],
      };

      const errors = builder.validateTrunkPort(config);

      expect(errors).toHaveLength(0);
    });
  });
});