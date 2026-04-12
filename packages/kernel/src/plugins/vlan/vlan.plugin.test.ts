import { describe, expect, test } from 'bun:test';
import { vlanPlugin } from './index.js';
import { generateVlanCommands, verifyShowVlanBriefOutput } from './vlan.generator.js';
import { vlanSchema } from './vlan.schema.js';

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
