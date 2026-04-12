import { describe, expect, test } from 'bun:test';
import { vlanPlugin, validateSviConfig } from './index.js';
import { generateVlanCommands, verifyShowVlanBriefOutput, generateSviCommands, verifyShowIpInterfaceBrief } from './vlan.generator.js';
import { vlanSchema, sviSchema } from './vlan.schema.js';

describe('vlan plugin', () => {
  test('exposes the expected metadata', () => {
    expect(vlanPlugin.id).toBe('vlan');
    expect(vlanPlugin.name).toBe('VLAN');
    expect(vlanPlugin.category).toBe('switching');
    expect(vlanPlugin.version).toBe('1.0.0');
    expect(vlanPlugin.description).toContain('VLAN');
  });

  test('schema accepts valid vlan configs and rejects invalid ids', () => {
    const config = vlanSchema.parse({
      switchName: 'SW1',
      vlans: [{ id: 10, name: '  USERS  ' }],
      trunkPorts: ['GigabitEthernet0/1'],
      accessPorts: [{ port: 'FastEthernet0/1', vlan: 10 }],
    });

    expect(config.vlans[0].id.toNumber()).toBe(10);
    expect(config.vlans[0].name).toBe('USERS');
    expect(() => vlanSchema.parse({ switchName: 'SW1', vlans: [{ id: 4095 }] })).toThrow();
  });

  test('rejects invalid vlan names using domain rules', () => {
    expect(() =>
      vlanSchema.parse({
        switchName: 'SW1',
        vlans: [{ id: 10, name: '10USERS' }],
      })
    ).toThrow();
  });

  test('generates deterministic ios commands', () => {
    expect(
      generateVlanCommands({
        switchName: 'SW1',
        vlans: [
          { id: 10, name: '  USERS  ' },
          { id: 20 },
        ],
        trunkPorts: ['GigabitEthernet0/1'],
        accessPorts: [{ port: 'FastEthernet0/1', vlan: 10 }],
      })
    ).toEqual([
      'vlan 10',
      'name USERS',
      'exit',
      'vlan 20',
      'exit',
      'interface GigabitEthernet0/1',
      'switchport mode trunk',
      'exit',
      'interface FastEthernet0/1',
      'switchport mode access',
      'switchport access vlan 10',
      'exit',
    ]);
  });

  test('rejects duplicate vlan ids during validation', () => {
    const result = vlanPlugin.validate({
      switchName: 'SW1',
      vlans: [
        { id: 10, name: 'USERS' },
        { id: 10, name: 'GUESTS' },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'duplicate_vlan_id' }),
      ])
    );
  });

  test('reports duplicate vlan ids and invalid access port vlan references together', () => {
    const result = vlanPlugin.validate({
      switchName: 'SW1',
      vlans: [
        { id: 10, name: 'USERS' },
        { id: 10, name: 'GUESTS' },
      ],
      accessPorts: [{ port: 'FastEthernet0/1', vlan: 20 }],
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'duplicate_vlan_id' }),
        expect.objectContaining({ code: 'invalid_access_port_vlan_reference' }),
      ])
    );
  });

  test('verifies configured vlans in show vlan brief output', () => {
    const result = verifyShowVlanBriefOutput(
      [
        'VLAN Name                             Status    Ports',
        '---- -------------------------------- --------- -------------------------------',
        '1    default                          active    Gi0/1',
        '10   USERS                            active    Gi0/2',
        '20   SERVERS                          active',
      ].join('\n'),
      {
        switchName: 'SW1',
        vlans: [
          { id: 10, name: '  USERS  ' },
          { id: 20, name: 'SERVERS' },
        ],
      }
    );

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('requires configured vlan names to appear in show vlan brief output', () => {
    const result = verifyShowVlanBriefOutput(
      [
        'VLAN Name                             Status    Ports',
        '---- -------------------------------- --------- -------------------------------',
        '10   VLAN0010                         active    Gi0/2',
      ].join('\n'),
      {
        switchName: 'SW1',
        vlans: [{ id: 10, name: 'USERS' }],
      }
    );

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'missing_vlan_name' }),
      ])
    );
  });

  test('does not accept substring matches when verifying vlan names', () => {
    const result = verifyShowVlanBriefOutput(
      [
        'VLAN Name                             Status    Ports',
        '---- -------------------------------- --------- -------------------------------',
        '10   VLAN0010                         active    Gi0/2',
      ].join('\n'),
      {
        switchName: 'SW1',
        vlans: [{ id: 10, name: 'LAN' }],
      }
    );

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'missing_vlan_name' }),
      ])
    );
  });
});

describe('SVI schema', () => {
  test('accepts valid SVI config with numeric vlanId', () => {
    const config = sviSchema.parse({
      deviceName: 'SW1',
      svis: [{ vlanId: 10, ipAddress: '192.168.10.1', subnetMask: '255.255.255.0' }],
    });

    expect(config.svis[0].vlanId.toNumber()).toBe(10);
    expect(config.ipRouting).toBe(false);
  });

  test('accepts valid SVI config with string vlanId', () => {
    const config = sviSchema.parse({
      deviceName: 'SW1',
      svis: [{ vlanId: '20', ipAddress: '10.0.20.1', subnetMask: '255.255.255.0', description: 'Gateway VLAN 20' }],
    });

    expect(config.svis[0].vlanId.toNumber()).toBe(20);
    expect(config.svis[0].description).toBe('Gateway VLAN 20');
  });

  test('accepts SVI config with ipRouting enabled', () => {
    const config = sviSchema.parse({
      deviceName: 'L3-SW1',
      svis: [{ vlanId: 10, ipAddress: '192.168.10.1', subnetMask: '255.255.255.0' }],
      ipRouting: true,
    });

    expect(config.ipRouting).toBe(true);
  });

  test('rejects invalid VLAN ID for SVI', () => {
    expect(() =>
      sviSchema.parse({
        deviceName: 'SW1',
        svis: [{ vlanId: 5000, ipAddress: '192.168.10.1', subnetMask: '255.255.255.0' }],
      })
    ).toThrow();
  });

  test('rejects missing ipAddress', () => {
    expect(() =>
      sviSchema.parse({
        deviceName: 'SW1',
        svis: [{ vlanId: 10, subnetMask: '255.255.255.0' }],
      })
    ).toThrow();
  });

  test('rejects missing subnetMask', () => {
    expect(() =>
      sviSchema.parse({
        deviceName: 'SW1',
        svis: [{ vlanId: 10, ipAddress: '192.168.10.1' }],
      })
    ).toThrow();
  });

  test('defaults shutdown to false', () => {
    const config = sviSchema.parse({
      deviceName: 'SW1',
      svis: [{ vlanId: 10, ipAddress: '192.168.10.1', subnetMask: '255.255.255.0' }],
    });

    expect(config.svis[0].shutdown).toBe(false);
  });

  test('accepts shutdown true', () => {
    const config = sviSchema.parse({
      deviceName: 'SW1',
      svis: [{ vlanId: 10, ipAddress: '192.168.10.1', subnetMask: '255.255.255.0', shutdown: true }],
    });

    expect(config.svis[0].shutdown).toBe(true);
  });
});

describe('SVI command generation', () => {
  test('generates basic SVI commands', () => {
    const commands = generateSviCommands({
      deviceName: 'SW1',
      svis: [{ vlanId: 10, ipAddress: '192.168.10.1', subnetMask: '255.255.255.0' }],
    });

    expect(commands).toEqual([
      'interface Vlan10',
      'ip address 192.168.10.1 255.255.255.0',
      'no shutdown',
      'exit',
    ]);
  });

  test('generates SVI commands with description', () => {
    const commands = generateSviCommands({
      deviceName: 'SW1',
      svis: [{ vlanId: 20, ipAddress: '10.0.20.1', subnetMask: '255.255.255.0', description: 'Gateway USERS' }],
    });

    expect(commands).toEqual([
      'interface Vlan20',
      'description Gateway USERS',
      'ip address 10.0.20.1 255.255.255.0',
      'no shutdown',
      'exit',
    ]);
  });

  test('generates SVI commands with ip routing enabled', () => {
    const commands = generateSviCommands({
      deviceName: 'L3-SW1',
      svis: [{ vlanId: 10, ipAddress: '192.168.10.1', subnetMask: '255.255.255.0' }],
      ipRouting: true,
    });

    expect(commands).toEqual([
      'ip routing',
      'interface Vlan10',
      'ip address 192.168.10.1 255.255.255.0',
      'no shutdown',
      'exit',
    ]);
  });

  test('generates shutdown command when shutdown is true', () => {
    const commands = generateSviCommands({
      deviceName: 'SW1',
      svis: [{ vlanId: 99, ipAddress: '172.16.99.1', subnetMask: '255.255.255.0', shutdown: true }],
    });

    expect(commands).toEqual([
      'interface Vlan99',
      'ip address 172.16.99.1 255.255.255.0',
      'exit',
    ]);
    expect(commands).not.toContain('no shutdown');
  });

  test('generates multiple SVI commands in order', () => {
    const commands = generateSviCommands({
      deviceName: 'L3-SW1',
      svis: [
        { vlanId: 10, ipAddress: '192.168.10.1', subnetMask: '255.255.255.0', description: 'USERS' },
        { vlanId: 20, ipAddress: '192.168.20.1', subnetMask: '255.255.255.0', description: 'SERVERS' },
        { vlanId: 30, ipAddress: '192.168.30.1', subnetMask: '255.255.255.0' },
      ],
      ipRouting: true,
    });

    expect(commands).toEqual([
      'ip routing',
      'interface Vlan10',
      'description USERS',
      'ip address 192.168.10.1 255.255.255.0',
      'no shutdown',
      'exit',
      'interface Vlan20',
      'description SERVERS',
      'ip address 192.168.20.1 255.255.255.0',
      'no shutdown',
      'exit',
      'interface Vlan30',
      'ip address 192.168.30.1 255.255.255.0',
      'no shutdown',
      'exit',
    ]);
  });
});

describe('SVI verification', () => {
  test('verifies SVI in show ip interface brief output', () => {
    const output = [
      'Interface              IP-Address      OK? Method Status                Protocol',
      'Vlan1                  192.168.1.1     YES manual up                    up',
      'Vlan10                 192.168.10.1    YES manual up                    up',
      'Vlan20                 192.168.20.1    YES manual up                    up',
    ].join('\n');

    const result = verifyShowIpInterfaceBrief(output, {
      deviceName: 'SW1',
      svis: [
        { vlanId: 10, ipAddress: '192.168.10.1', subnetMask: '255.255.255.0' },
        { vlanId: 20, ipAddress: '192.168.20.1', subnetMask: '255.255.255.0' },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('detects missing SVI in output', () => {
    const output = [
      'Interface              IP-Address      OK? Method Status                Protocol',
      'Vlan1                  192.168.1.1     YES manual up                    up',
    ].join('\n');

    const result = verifyShowIpInterfaceBrief(output, {
      deviceName: 'SW1',
      svis: [{ vlanId: 10, ipAddress: '192.168.10.1', subnetMask: '255.255.255.0' }],
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'svi_not_found' }),
      ])
    );
  });

  test('detects SVI with wrong IP address', () => {
    const output = [
      'Interface              IP-Address      OK? Method Status                Protocol',
      'Vlan10                 192.168.10.2    YES manual up                    up',
    ].join('\n');

    const result = verifyShowIpInterfaceBrief(output, {
      deviceName: 'SW1',
      svis: [{ vlanId: 10, ipAddress: '192.168.10.1', subnetMask: '255.255.255.0' }],
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'svi_not_found' }),
      ])
    );
  });
});

describe('SVI plugin validation', () => {
  test('validates correct SVI config', () => {
    const result = validateSviConfig({
      deviceName: 'SW1',
      svis: [{ vlanId: 10, ipAddress: '192.168.10.1', subnetMask: '255.255.255.0' }],
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('rejects empty SVI list', () => {
    const result = validateSviConfig({
      deviceName: 'SW1',
      svis: [],
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'empty_svi_list' }),
      ])
    );
  });

  test('rejects invalid VLAN ID in SVI', () => {
    const result = validateSviConfig({
      deviceName: 'SW1',
      svis: [{ vlanId: 9999, ipAddress: '192.168.10.1', subnetMask: '255.255.255.0' }],
    });

    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('validates SVI VLAN references against VLAN config', () => {
    const vlanConfig = {
      switchName: 'SW1',
      vlans: [{ id: 10, name: 'USERS' }, { id: 20, name: 'SERVERS' }],
    };

    const result = validateSviConfig(
      {
        deviceName: 'SW1',
        svis: [{ vlanId: 10, ipAddress: '192.168.10.1', subnetMask: '255.255.255.0' }],
      },
      vlanConfig
    );

    expect(result.ok).toBe(true);
  });

  test('rejects SVI with VLAN not in VLAN config', () => {
    const vlanConfig = {
      switchName: 'SW1',
      vlans: [{ id: 10, name: 'USERS' }],
    };

    const result = validateSviConfig(
      {
        deviceName: 'SW1',
        svis: [{ vlanId: 30, ipAddress: '192.168.30.1', subnetMask: '255.255.255.0' }],
      },
      vlanConfig
    );

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'invalid_svi_vlan_reference' }),
      ])
    );
  });
});

describe('SVI integration with VLAN config', () => {
  test('plugin has configure-svi command', () => {
    const sviCommand = vlanPlugin.commands.find((cmd) => cmd.name === 'configure-svi');

    expect(sviCommand).toBeDefined();
    expect(sviCommand?.description).toContain('Switch Virtual Interfaces');
    expect(sviCommand?.examples).toHaveLength(1);
  });

  test('plugin description mentions SVI', () => {
    expect(vlanPlugin.description).toContain('VLAN');
    expect(vlanPlugin.description).toContain('SVI');
  });

  test('SVI command example is valid', () => {
    const sviCommand = vlanPlugin.commands.find((cmd) => cmd.name === 'configure-svi');
    const example = sviCommand?.examples[0];

    expect(example).toBeDefined();
    expect(example?.input.deviceName).toBe('SW1');
    expect(example?.input.svis).toHaveLength(1);
    expect(example?.input.ipRouting).toBe(true);
  });

  test('generates full VLAN + SVI configuration', () => {
    const vlanCommands = generateVlanCommands({
      switchName: 'SW1',
      vlans: [{ id: 10, name: 'USERS' }, { id: 20, name: 'SERVERS' }],
    });

    const sviCommands = generateSviCommands({
      deviceName: 'SW1',
      svis: [
        { vlanId: 10, ipAddress: '192.168.10.1', subnetMask: '255.255.255.0', description: 'Gateway USERS' },
        { vlanId: 20, ipAddress: '192.168.20.1', subnetMask: '255.255.255.0', description: 'Gateway SERVERS' },
      ],
      ipRouting: true,
    });

    const allCommands = [...vlanCommands, ...sviCommands];

    expect(allCommands).toContain('vlan 10');
    expect(allCommands).toContain('name USERS');
    expect(allCommands).toContain('vlan 20');
    expect(allCommands).toContain('name SERVERS');
    expect(allCommands).toContain('ip routing');
    expect(allCommands).toContain('interface Vlan10');
    expect(allCommands).toContain('interface Vlan20');
    expect(allCommands).toContain('ip address 192.168.10.1 255.255.255.0');
    expect(allCommands).toContain('ip address 192.168.20.1 255.255.255.0');
  });
});
