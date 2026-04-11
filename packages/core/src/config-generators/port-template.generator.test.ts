import { describe, expect, it } from 'bun:test';
import { PortTemplateGenerator, defaultPortTemplates } from './port-template.generator';

describe('PortTemplateGenerator', () => {
  describe('generateInterfaceConfig', () => {
    it('should generate access port configuration', () => {
      const commands = PortTemplateGenerator.generateInterfaceConfig(
        'FastEthernet0/1',
        defaultPortTemplates.access
      );

      expect(commands).toContain('interface FastEthernet0/1');
      expect(commands).toContain(' switchport mode access');
      expect(commands).toContain(' switchport access vlan 1');
      expect(commands).toContain(' spanning-tree portfast');
      expect(commands).toContain(' spanning-tree bpduguard enable');
      expect(commands).toContain(' no shutdown');
    });

    it('should generate trunk port configuration', () => {
      const template = {
        ...defaultPortTemplates.trunk,
        nativeVlan: 99,
        allowedVlans: [1, 10, 20, 99]
      };

      const commands = PortTemplateGenerator.generateInterfaceConfig(
        'GigabitEthernet0/1',
        template
      );

      expect(commands).toContain('interface GigabitEthernet0/1');
      expect(commands).toContain(' switchport mode trunk');
      expect(commands).toContain(' switchport trunk native vlan 99');
      expect(commands).toContain(' switchport trunk allowed vlan 1,10,20,99');
      expect(commands).toContain(' no shutdown');
    });

    it('should generate voice port configuration', () => {
      const commands = PortTemplateGenerator.generateInterfaceConfig(
        'FastEthernet0/5',
        defaultPortTemplates.voice
      );

      expect(commands).toContain('interface FastEthernet0/5');
      expect(commands).toContain(' switchport mode access');
      expect(commands).toContain(' switchport access vlan 10');
      expect(commands).toContain(' switchport voice vlan 100');
      expect(commands).toContain(' spanning-tree portfast');
    });

    it('should generate server port with port security', () => {
      const commands = PortTemplateGenerator.generateInterfaceConfig(
        'GigabitEthernet0/10',
        defaultPortTemplates.server
      );

      expect(commands).toContain('interface GigabitEthernet0/10');
      expect(commands).toContain(' switchport mode access');
      expect(commands).toContain(' switchport port-security');
      expect(commands).toContain(' switchport port-security maximum 1');
      expect(commands).toContain(' switchport port-security violation shutdown');
      expect(commands).toContain(' speed 1000');
      expect(commands).toContain(' duplex full');
    });

    it('should generate shutdown port configuration', () => {
      const commands = PortTemplateGenerator.generateInterfaceConfig(
        'FastEthernet0/24',
        defaultPortTemplates.shutdown
      );

      expect(commands).toContain('interface FastEthernet0/24');
      expect(commands).toContain(' switchport access vlan 999');
      expect(commands).toContain(' shutdown');
      expect(commands).not.toContain(' no shutdown');
    });

    it('should include custom description', () => {
      const template = {
        ...defaultPortTemplates.access,
        description: 'PC Usuario Final',
        vlan: 20
      };

      const commands = PortTemplateGenerator.generateInterfaceConfig(
        'FastEthernet0/3',
        template
      );

      expect(commands).toContain(' description PC Usuario Final');
      expect(commands).toContain(' switchport access vlan 20');
    });
  });

  describe('applyTemplate', () => {
    it('should apply template to multiple interfaces', () => {
      const interfaces = ['FastEthernet0/1', 'FastEthernet0/2', 'FastEthernet0/3'];
      const commands = PortTemplateGenerator.applyTemplate(
        interfaces,
        defaultPortTemplates.access
      );

      expect(commands.filter(c => c.includes('interface '))).toHaveLength(3);
      expect(commands.filter(c => c.includes(' switchport mode access'))).toHaveLength(3);
    });
  });

  describe('getPortsByModel', () => {
    it('should get ports for 2960-24TT switch', () => {
      const ports = PortTemplateGenerator.getPortsByModel('2960-24TT');

      expect(ports.fastEthernet.length).toBe(24);
      expect(ports.sfp.length).toBe(2); // SFP uplinks (not in gigabitEthernet)
      expect(ports.all.length).toBeGreaterThan(25); // 24 FA + 2 SFP
      expect(ports.fastEthernet[0]).toBe('Fa0/1');
      expect(ports.fastEthernet[23]).toBe('Fa0/24');
    });

    it('should get ports for 3650-24PS switch', () => {
      const ports = PortTemplateGenerator.getPortsByModel('3650-24PS');

      expect(ports.gigabitEthernet.length).toBeGreaterThanOrEqual(24);
      expect(ports.sfp.length).toBe(4);
    });

    it('should return empty for unknown model', () => {
      const ports = PortTemplateGenerator.getPortsByModel('unknown-model');

      expect(ports.all).toHaveLength(0);
    });
  });

  describe('generateDefaultSwitchConfig', () => {
    it('should generate default config for 2960 switch', () => {
      const commands = PortTemplateGenerator.generateDefaultSwitchConfig('2960-24TT');

      expect(commands).toContain('! Default port configuration');
      expect(commands.filter(c => c.includes('interface ')).length).toBeGreaterThan(0);
    });
  });

  describe('validateTemplate', () => {
    it('should validate correct template', () => {
      const result = PortTemplateGenerator.validateTemplate(defaultPortTemplates.access);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid VLAN', () => {
      const template = {
        ...defaultPortTemplates.access,
        vlan: 5000
      };

      const result = PortTemplateGenerator.validateTemplate(template);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid VLAN 5000. Must be 1-4094');
    });

    it('should reject invalid native VLAN', () => {
      const template = {
        ...defaultPortTemplates.trunk,
        nativeVlan: 0
      };

      const result = PortTemplateGenerator.validateTemplate(template);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid native VLAN 0. Must be 1-4094');
    });

    it('should warn about trunk without allowed VLANs', () => {
      const template = {
        ...defaultPortTemplates.trunk,
        allowedVlans: []
      };

      const result = PortTemplateGenerator.validateTemplate(template);

      expect(result.warnings).toContain('Trunk port without allowed VLANs specified');
    });

    it('should warn about voice VLAN without access VLAN', () => {
      const template = {
        type: 'voice' as const,
        voiceVlan: 100
      };

      const result = PortTemplateGenerator.validateTemplate(template);

      expect(result.warnings).toContain('Voice VLAN configured without access VLAN');
    });
  });
});
