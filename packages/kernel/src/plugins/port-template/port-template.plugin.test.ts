import { describe, expect, test } from 'bun:test';
import { portTemplatePlugin } from './index.js';
import { generatePortTemplateCommands } from './port-template.generator.js';
import { portTemplateConfigSchema } from './port-template.schema.js';

describe('port-template plugin', () => {
  // Metadata
  test('exposes the expected metadata', () => {
    expect(portTemplatePlugin.id).toBe('port-template');
    expect(portTemplatePlugin.name).toBe('Port Template');
    expect(portTemplatePlugin.category).toBe('switching');
    expect(portTemplatePlugin.version).toBe('1.0.0');
    expect(portTemplatePlugin.description).toContain('port template');
    expect(portTemplatePlugin.commands).toHaveLength(1);
    expect(portTemplatePlugin.commands[0].name).toBe('configure-port-template');
  });

  // Schema validation
  test('schema accepts valid access port config', () => {
    const result = portTemplateConfigSchema.safeParse({
      deviceName: 'Switch1',
      interfaces: [
        {
          interfaceName: 'GigabitEthernet0/1',
          template: { type: 'access', vlan: 10 },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  test('schema accepts valid trunk port config', () => {
    const result = portTemplateConfigSchema.safeParse({
      deviceName: 'Switch1',
      interfaces: [
        {
          interfaceName: 'GigabitEthernet0/24',
          template: { type: 'trunk', nativeVlan: 99, allowedVlans: [10, 20, 30] },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  test('schema accepts valid voice port config', () => {
    const result = portTemplateConfigSchema.safeParse({
      deviceName: 'Switch1',
      interfaces: [
        {
          interfaceName: 'FastEthernet0/1',
          template: { type: 'voice', vlan: 10, voiceVlan: 100 },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  test('schema accepts valid shutdown port config', () => {
    const result = portTemplateConfigSchema.safeParse({
      deviceName: 'Switch1',
      interfaces: [
        {
          interfaceName: 'FastEthernet0/10',
          template: { type: 'shutdown', shutdown: true },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  test('schema rejects invalid VLAN number', () => {
    const result = portTemplateConfigSchema.safeParse({
      deviceName: 'Switch1',
      interfaces: [
        {
          interfaceName: 'GigabitEthernet0/1',
          template: { type: 'access', vlan: 5000 },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  test('schema rejects empty interfaces array', () => {
    const result = portTemplateConfigSchema.safeParse({
      deviceName: 'Switch1',
      interfaces: [],
    });
    expect(result.success).toBe(false);
  });

  test('schema rejects empty deviceName', () => {
    const result = portTemplateConfigSchema.safeParse({
      deviceName: '',
      interfaces: [
        { interfaceName: 'Gi0/1', template: { type: 'access' } },
      ],
    });
    expect(result.success).toBe(false);
  });

  // Command generation: access port
  test('generates access port commands', () => {
    const commands = generatePortTemplateCommands({
      deviceName: 'Switch1',
      interfaces: [
        {
          interfaceName: 'GigabitEthernet0/1',
          template: { type: 'access', vlan: 10 },
        },
      ],
    });

    expect(commands).toContain('interface GigabitEthernet0/1');
    expect(commands).toContain(' switchport mode access');
    expect(commands).toContain(' switchport access vlan 10');
    expect(commands).toContain(' no shutdown');
    expect(commands).toContain(' exit');
  });

  test('generates access port with description', () => {
    const commands = generatePortTemplateCommands({
      deviceName: 'Switch1',
      interfaces: [
        {
          interfaceName: 'GigabitEthernet0/1',
          template: { type: 'access', vlan: 10, description: 'User PC' },
        },
      ],
    });

    expect(commands).toContain(' description User PC');
  });

  // Command generation: trunk port
  test('generates trunk port commands', () => {
    const commands = generatePortTemplateCommands({
      deviceName: 'Switch1',
      interfaces: [
        {
          interfaceName: 'GigabitEthernet0/24',
          template: { type: 'trunk', nativeVlan: 99, allowedVlans: [10, 20, 30] },
        },
      ],
    });

    expect(commands).toContain('interface GigabitEthernet0/24');
    expect(commands).toContain(' switchport mode trunk');
    expect(commands).toContain(' switchport trunk native vlan 99');
    expect(commands).toContain(' switchport trunk allowed vlan 10,20,30');
  });

  // Command generation: voice port
  test('generates voice port commands', () => {
    const commands = generatePortTemplateCommands({
      deviceName: 'Switch1',
      interfaces: [
        {
          interfaceName: 'FastEthernet0/1',
          template: { type: 'voice', vlan: 10, voiceVlan: 100 },
        },
      ],
    });

    expect(commands).toContain(' switchport mode access');
    expect(commands).toContain(' switchport access vlan 10');
    expect(commands).toContain(' switchport voice vlan 100');
  });

  // Command generation: shutdown port
  test('generates shutdown port commands', () => {
    const commands = generatePortTemplateCommands({
      deviceName: 'Switch1',
      interfaces: [
        {
          interfaceName: 'FastEthernet0/10',
          template: { type: 'shutdown', shutdown: true },
        },
      ],
    });

    expect(commands).toContain(' shutdown');
  });

  // Command generation: speed and duplex
  test('generates speed and duplex commands', () => {
    const commands = generatePortTemplateCommands({
      deviceName: 'Switch1',
      interfaces: [
        {
          interfaceName: 'GigabitEthernet0/1',
          template: { type: 'access', speed: '1000', duplex: 'full' },
        },
      ],
    });

    expect(commands).toContain(' speed 1000');
    expect(commands).toContain(' duplex full');
  });

  // Command generation: STP
  test('generates STP portfast and bpduguard', () => {
    const commands = generatePortTemplateCommands({
      deviceName: 'Switch1',
      interfaces: [
        {
          interfaceName: 'GigabitEthernet0/1',
          template: { type: 'access', stpPortfast: true, stpBpduguard: true },
        },
      ],
    });

    expect(commands).toContain(' spanning-tree portfast');
    expect(commands).toContain(' spanning-tree bpduguard enable');
  });

  // Command generation: port security
  test('generates port security commands', () => {
    const commands = generatePortTemplateCommands({
      deviceName: 'Switch1',
      interfaces: [
        {
          interfaceName: 'GigabitEthernet0/1',
          template: { type: 'access', portSecurity: true, maxMacAddresses: 2 },
        },
      ],
    });

    expect(commands).toContain(' switchport port-security');
    expect(commands).toContain(' switchport port-security maximum 2');
    expect(commands).toContain(' switchport port-security violation shutdown');
    expect(commands).toContain(' switchport port-security aging time 2');
  });

  // Multiple interfaces
  test('generates commands for multiple interfaces', () => {
    const commands = generatePortTemplateCommands({
      deviceName: 'Switch1',
      interfaces: [
        {
          interfaceName: 'GigabitEthernet0/1',
          template: { type: 'access', vlan: 10 },
        },
        {
          interfaceName: 'GigabitEthernet0/2',
          template: { type: 'access', vlan: 20 },
        },
      ],
    });

    expect(commands.filter((c) => c.startsWith('interface ')).length).toBe(2);
    expect(commands).toContain('interface GigabitEthernet0/1');
    expect(commands).toContain('interface GigabitEthernet0/2');
  });

  // Combined config
  test('generates combined config with access, trunk, and voice', () => {
    const commands = generatePortTemplateCommands({
      deviceName: 'Switch1',
      interfaces: [
        {
          interfaceName: 'GigabitEthernet0/1',
          template: { type: 'access', vlan: 10, description: 'User', stpPortfast: true },
        },
        {
          interfaceName: 'GigabitEthernet0/24',
          template: { type: 'trunk', allowedVlans: [10, 20, 99], speed: '1000', duplex: 'full' },
        },
        {
          interfaceName: 'FastEthernet0/1',
          template: { type: 'voice', vlan: 10, voiceVlan: 100 },
        },
      ],
    });

    expect(commands).toContain('interface GigabitEthernet0/1');
    expect(commands).toContain('interface GigabitEthernet0/24');
    expect(commands).toContain('interface FastEthernet0/1');
    expect(commands).toContain(' switchport mode access');
    expect(commands).toContain(' switchport mode trunk');
    expect(commands).toContain(' switchport voice vlan 100');
  });

  // Deterministic output
  test('commands are deterministic', () => {
    const spec = {
      deviceName: 'Switch1',
      interfaces: [
        {
          interfaceName: 'GigabitEthernet0/1',
          template: { type: 'access', vlan: 10 },
        },
      ],
    };

    const run1 = generatePortTemplateCommands(spec);
    const run2 = generatePortTemplateCommands(spec);
    const run3 = generatePortTemplateCommands(spec);

    expect(run1).toEqual(run2);
    expect(run2).toEqual(run3);
  });

  // Validation
  test('validation rejects trunk without allowed VLANs', () => {
    const result = portTemplatePlugin.validate({
      deviceName: 'Switch1',
      interfaces: [
        {
          interfaceName: 'GigabitEthernet0/24',
          template: { type: 'trunk' },
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'trunk_no_allowed_vlans' }),
      ])
    );
  });

  test('validation rejects voice without access VLAN', () => {
    const result = portTemplatePlugin.validate({
      deviceName: 'Switch1',
      interfaces: [
        {
          interfaceName: 'FastEthernet0/1',
          template: { type: 'voice', voiceVlan: 100 },
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'voice_without_access_vlan' }),
      ])
    );
  });

  test('validation rejects invalid schema', () => {
    const result = portTemplatePlugin.validate({
      deviceName: '',
      interfaces: [],
    });

    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('validation accepts valid config', () => {
    const result = portTemplatePlugin.validate({
      deviceName: 'Switch1',
      interfaces: [
        {
          interfaceName: 'GigabitEthernet0/1',
          template: { type: 'access', vlan: 10 },
        },
        {
          interfaceName: 'GigabitEthernet0/24',
          template: { type: 'trunk', allowedVlans: [10, 20, 30] },
        },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
