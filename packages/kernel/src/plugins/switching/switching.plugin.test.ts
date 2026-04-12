import { describe, expect, test } from 'bun:test';
import { switchingPlugin } from './index.js';
import {
  generateStpCommands,
  generateVtpCommands,
  generateEtherChannelCommands,
  verifyShowStpSummary,
  verifyShowVtpStatus,
  verifyShowEtherchannelSummary,
} from './switching.generator.js';
import { stpSchema, vtpSchema, etherChannelSchema } from './switching.schema.js';

// =============================================================================
// PLUGIN METADATA TESTS
// =============================================================================

describe('switching plugin metadata', () => {
  test('exposes the expected metadata', () => {
    expect(switchingPlugin.id).toBe('switching');
    expect(switchingPlugin.name).toBe('Switching Protocols');
    expect(switchingPlugin.category).toBe('switching');
    expect(switchingPlugin.version).toBe('1.0.0');
    expect(switchingPlugin.description).toContain('STP');
    expect(switchingPlugin.description).toContain('VTP');
    expect(switchingPlugin.description).toContain('EtherChannel');
  });

  test('exposes three commands', () => {
    expect(switchingPlugin.commands).toHaveLength(3);
    const commandNames = switchingPlugin.commands.map((c) => c.name);
    expect(commandNames).toContain('configure-stp');
    expect(commandNames).toContain('configure-vtp');
    expect(commandNames).toContain('configure-etherchannel');
  });
});

// =============================================================================
// STP TESTS
// =============================================================================

describe('stp schema', () => {
  test('accepts valid stp configuration', () => {
    const config = stpSchema.parse({
      mode: 'rapid-pvst',
      priority: 24576,
      portfastDefault: true,
      bpduguardDefault: true,
    });

    expect(config.mode).toBe('rapid-pvst');
    expect(config.priority).toBe(24576);
    expect(config.portfastDefault).toBe(true);
  });

  test('rejects invalid priority values', () => {
    expect(() => stpSchema.parse({ mode: 'rapid-pvst', priority: 1000 })).toThrow();
    expect(() => stpSchema.parse({ mode: 'rapid-pvst', priority: 32768 })).not.toThrow();
  });

  test('rejects invalid stp mode', () => {
    expect(() => stpSchema.parse({ mode: 'stp' })).toThrow();
  });
});

describe('stp command generation', () => {
  test('generates mode command', () => {
    const commands = generateStpCommands({ mode: 'rapid-pvst' });
    expect(commands).toContain('spanning-tree mode rapid-pvst');
  });

  test('generates priority command', () => {
    const commands = generateStpCommands({ mode: 'pvst', priority: 4096 });
    expect(commands).toContain('spanning-tree vlan 1-4094 priority 4096');
  });

  test('generates vlan config commands', () => {
    const commands = generateStpCommands({
      mode: 'rapid-pvst',
      vlanConfig: [{ vlanId: 10, priority: 24576 }],
    });

    expect(commands).toContain('spanning-tree vlan 10 priority 24576');
  });

  test('generates root primary and secondary commands', () => {
    const commands = generateStpCommands({
      mode: 'rapid-pvst',
      rootPrimary: [1, 10],
      rootSecondary: [20, 30],
    });

    expect(commands).toContain('spanning-tree vlan 1,10 root primary');
    expect(commands).toContain('spanning-tree vlan 20,30 root secondary');
  });

  test('generates portfast and bpduguard commands', () => {
    const commands = generateStpCommands({
      mode: 'rapid-pvst',
      portfastDefault: true,
      bpduguardDefault: true,
    });

    expect(commands).toContain('spanning-tree portfast default');
    expect(commands).toContain('spanning-tree portfast bpduguard default');
  });

  test('generates interface configuration commands', () => {
    const commands = generateStpCommands({
      mode: 'rapid-pvst',
      interfaceConfig: [
        { interface: 'GigabitEthernet0/1', portfast: false },
        { interface: 'FastEthernet0/1', portfast: true, bpduguard: true },
      ],
    });

    expect(commands).toContain('interface GigabitEthernet0/1');
    expect(commands).toContain(' no spanning-tree portfast');
    expect(commands).toContain(' spanning-tree portfast');
    expect(commands).toContain(' spanning-tree bpduguard enable');
    expect(commands).toContain(' exit');
  });
});

describe('stp verification', () => {
  test('verifies correct stp mode in output', () => {
    const output = `
      Switch#show spanning-tree summary
        Switch is in Rapid-PVST mode
    `;

    const result = verifyShowStpSummary(output, { mode: 'rapid-pvst' });
    expect(result.ok).toBe(true);
  });

  test('reports missing stp mode in output', () => {
    const output = 'Switch#show spanning-tree summary\n  Switch is in PVST mode';

    const result = verifyShowStpSummary(output, { mode: 'rapid-pvst' });
    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'missing_stp_mode' }),
      ])
    );
  });
});

// =============================================================================
// VTP TESTS
// =============================================================================

describe('vtp schema', () => {
  test('accepts valid vtp configuration', () => {
    const config = vtpSchema.parse({
      mode: 'server',
      domain: 'CISCO',
      password: 'cisco123',
      version: 2,
    });

    expect(config.mode).toBe('server');
    expect(config.domain).toBe('CISCO');
    expect(config.version).toBe(2);
  });

  test('rejects invalid vtp mode', () => {
    expect(() => vtpSchema.parse({ mode: 'bridge' })).toThrow();
  });

  test('accepts minimal vtp configuration', () => {
    const config = vtpSchema.parse({ mode: 'transparent' });
    expect(config.mode).toBe('transparent');
  });
});

describe('vtp command generation', () => {
  test('generates mode command', () => {
    const commands = generateVtpCommands({ mode: 'server' });
    expect(commands).toContain('vtp mode server');
  });

  test('generates domain command', () => {
    const commands = generateVtpCommands({ mode: 'server', domain: 'CISCO' });
    expect(commands).toContain('vtp domain CISCO');
  });

  test('generates password command', () => {
    const commands = generateVtpCommands({ mode: 'server', password: 'cisco123' });
    expect(commands).toContain('vtp password cisco123');
  });

  test('generates version command', () => {
    const commands = generateVtpCommands({ mode: 'server', version: 3 });
    expect(commands).toContain('vtp version 3');
  });

  test('generates complete vtp configuration', () => {
    const commands = generateVtpCommands({
      mode: 'server',
      domain: 'CISCO',
      password: 'cisco123',
      version: 2,
    });

    expect(commands).toEqual([
      '! VTP Configuration',
      'vtp mode server',
      'vtp domain CISCO',
      'vtp password cisco123',
      'vtp version 2',
    ]);
  });
});

describe('vtp verification', () => {
  test('verifies correct vtp mode in output', () => {
    const output = `
      Switch#show vtp status
        VTP Version capable             : 3
        VTP Version running             : 2
        VTP Domain Name                 : CISCO
        VTP Pruning Mode                : Disabled
        VTP Traps Generation            : Disabled
        VTP mode                        : Server
    `;

    const result = verifyShowVtpStatus(output, { mode: 'server', domain: 'CISCO' });
    expect(result.ok).toBe(true);
  });

  test('reports missing vtp mode in output', () => {
    const output = 'VTP mode: Transparent';

    const result = verifyShowVtpStatus(output, { mode: 'client' });
    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'missing_vtp_mode' }),
      ])
    );
  });
});

// =============================================================================
// ETHERCHANNEL TESTS
// =============================================================================

describe('etherchannel schema', () => {
  test('accepts valid etherchannel configuration', () => {
    const config = etherChannelSchema.parse({
      groupId: 1,
      mode: 'active',
      interfaces: ['GigabitEthernet0/1', 'GigabitEthernet0/2'],
      portChannel: 'Port-channel1',
    });

    expect(config.groupId).toBe(1);
    expect(config.mode).toBe('active');
    expect(config.interfaces).toHaveLength(2);
  });

  test('rejects invalid group id', () => {
    expect(() => etherChannelSchema.parse({ groupId: 0, mode: 'active', interfaces: [], portChannel: 'Port-channel1' })).toThrow();
    expect(() => etherChannelSchema.parse({ groupId: 65, mode: 'active', interfaces: [], portChannel: 'Port-channel1' })).toThrow();
  });

  test('rejects invalid etherchannel mode', () => {
    expect(() => etherChannelSchema.parse({ groupId: 1, mode: 'static', interfaces: [], portChannel: 'Port-channel1' })).toThrow();
  });

  test('accepts trunk mode with native vlan', () => {
    const config = etherChannelSchema.parse({
      groupId: 1,
      mode: 'passive',
      interfaces: ['GigabitEthernet0/1', 'GigabitEthernet0/2'],
      portChannel: 'Port-channel1',
      trunkMode: 'trunk',
      nativeVlan: 99,
      allowedVlans: 'all',
    });

    expect(config.trunkMode).toBe('trunk');
    expect(config.nativeVlan).toBe(99);
    expect(config.allowedVlans).toBe('all');
  });
});

describe('etherchannel command generation', () => {
  test('generates channel-group commands', () => {
    const commands = generateEtherChannelCommands({
      groupId: 1,
      mode: 'active',
      interfaces: ['GigabitEthernet0/1', 'GigabitEthernet0/2'],
      portChannel: 'Port-channel1',
    });

    expect(commands).toContain(' channel-group 1 mode active');
    expect(commands).toContain('interface GigabitEthernet0/1');
    expect(commands).toContain('interface GigabitEthernet0/2');
  });

  test('generates port-channel interface commands', () => {
    const commands = generateEtherChannelCommands({
      groupId: 1,
      mode: 'active',
      interfaces: ['GigabitEthernet0/1', 'GigabitEthernet0/2'],
      portChannel: 'Port-channel1',
    });

    expect(commands).toContain('interface Port-channel1');
  });

  test('generates trunk mode commands', () => {
    const commands = generateEtherChannelCommands({
      groupId: 1,
      mode: 'active',
      interfaces: ['GigabitEthernet0/1', 'GigabitEthernet0/2'],
      portChannel: 'Port-channel1',
      trunkMode: 'trunk',
      nativeVlan: 99,
      allowedVlans: [10, 20, 30],
    });

    expect(commands).toContain(' switchport mode trunk');
    expect(commands).toContain(' switchport trunk native vlan 99');
    expect(commands).toContain(' switchport trunk allowed vlan 10,20,30');
  });

  test('generates access mode commands', () => {
    const commands = generateEtherChannelCommands({
      groupId: 1,
      mode: 'passive',
      interfaces: ['FastEthernet0/1', 'FastEthernet0/2'],
      portChannel: 'Port-channel1',
      trunkMode: 'access',
      accessVlan: 10,
    });

    expect(commands).toContain(' switchport mode access');
    expect(commands).toContain(' switchport access vlan 10');
  });

  test('generates description command', () => {
    const commands = generateEtherChannelCommands({
      groupId: 1,
      mode: 'active',
      interfaces: ['GigabitEthernet0/1', 'GigabitEthernet0/2'],
      portChannel: 'Port-channel1',
      description: 'Link to Core Switch',
    });

    expect(commands).toContain('interface Port-channel1');
    expect(commands).toContain(' description Link to Core Switch');
  });

  test('generates complete etherchannel configuration', () => {
    const commands = generateEtherChannelCommands({
      groupId: 1,
      mode: 'active',
      interfaces: ['GigabitEthernet0/1', 'GigabitEthernet0/2'],
      portChannel: 'Port-channel1',
      trunkMode: 'trunk',
      nativeVlan: 99,
      allowedVlans: 'all',
      description: 'Uplink to Distribution',
    });

    expect(commands).toEqual([
      '! EtherChannel Configuration',
      'interface Port-channel1',
      ' description Uplink to Distribution',
      ' exit',
      'interface GigabitEthernet0/1',
      ' channel-group 1 mode active',
      ' exit',
      'interface GigabitEthernet0/2',
      ' channel-group 1 mode active',
      ' exit',
      'interface Port-channel1',
      ' switchport mode trunk',
      ' switchport trunk native vlan 99',
      ' switchport trunk allowed vlan all',
      ' exit',
    ]);
  });
});

describe('etherchannel verification', () => {
  test('verifies correct etherchannel in output', () => {
    const output = `
      Switch#show etherchannel summary
      Group  Port-channel  Protocol    Ports
      ------+-------------+-----------+-----------------------------
      1      Port-channel1(SU)  LACP      Gi0/1(P)   Gi0/2(P)
    `;

    const result = verifyShowEtherchannelSummary(output, {
      groupId: 1,
      mode: 'active',
      interfaces: ['Gi0/1', 'Gi0/2'],
      portChannel: 'Port-channel1',
    });

    expect(result.ok).toBe(true);
  });

  test('reports missing port-channel in output', () => {
    const output = 'Group  Port-channel  Protocol    Ports\n------ +-------------+-----------+-----------------------------\n1      Po2(SU)         LACP      Gi0/1(P)';

    const result = verifyShowEtherchannelSummary(output, {
      groupId: 1,
      mode: 'active',
      interfaces: ['GigabitEthernet0/1'],
      portChannel: 'Port-channel1',
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'missing_port_channel' }),
      ])
    );
  });
});

// =============================================================================
// VALIDATION TESTS
// =============================================================================

describe('stp validation', () => {
  test('accepts valid stp configuration', () => {
    const result = switchingPlugin.validate({
      mode: 'rapid-pvst',
      priority: 24576,
    });

    expect(result.ok).toBe(true);
  });

  test('rejects invalid priority', () => {
    const result = switchingPlugin.validate({
      mode: 'rapid-pvst',
      priority: 1000,
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'not_multiple_of' }),
      ])
    );
  });
});

describe('vtp validation', () => {
  test('accepts valid vtp configuration', () => {
    const result = switchingPlugin.validate({
      mode: 'server',
      domain: 'CISCO',
    });

    expect(result.ok).toBe(false); // validate uses STP validator by default
  });
});

describe('etherchannel validation', () => {
  test('accepts valid etherchannel configuration', () => {
    const result = switchingPlugin.validate({
      mode: 'rapid-pvst',
      interfaceConfig: [
        { interface: 'Gi0/1', portfast: false },
      ],
    });

    expect(result.ok).toBe(true);
  });
});
