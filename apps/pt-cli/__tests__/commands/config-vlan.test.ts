import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { generateVlanCommands } from '../../src/commands/config-vlan.ts';
import { parseVlans } from '../../src/utils/cli-parser.ts';
import { resetKernelRegistry, getKernelRegistry } from '../../src/kernel-bridge.ts';
import { vlanPlugin } from '@cisco-auto/kernel/plugins/vlan';

test('parseVlans canoniza nombres y valida IDs', () => {
  const vlans = parseVlans(['10,  Ventas  ', '20,USERS,active']);

  expect(vlans).toEqual([
    { id: '10', name: 'Ventas', state: 'active' },
    { id: '20', name: 'USERS', state: 'active' },
  ]);
});

test('parseVlans rechaza nombres de VLAN inválidos', () => {
  expect(() => parseVlans(['10, 1Ventas'])).toThrow('Error de validación de VLAN');
  expect(() => parseVlans(['10,Sales VLAN'])).toThrow('Error de validación de VLAN');
});

test('generateVlanCommands conserva nombres canónicos', () => {
  const vlans = parseVlans(['10,  Ventas  ']);

  expect(generateVlanCommands(vlans)).toEqual([
    'vlan 10',
    ' name Ventas',
    ' exit',
  ]);
});

describe('generateVlanCommands via kernel plugin', () => {
  beforeEach(() => {
    resetKernelRegistry();
    getKernelRegistry().register('protocol', vlanPlugin);
  });

  afterEach(() => {
    resetKernelRegistry();
  });

  test('genera comandos VLAN usando el plugin del kernel', () => {
    const vlans = parseVlans(['10, Ventas']);
    const commands = generateVlanCommands(vlans);

    expect(commands).toContain('vlan 10');
    expect(commands).toContain(' name Ventas');
  });

  test('genera comandos para multiples VLANs', () => {
    const vlans = parseVlans(['10,ADMIN', '20,USERS']);
    const commands = generateVlanCommands(vlans);

    expect(commands).toContain('vlan 10');
    expect(commands).toContain(' name ADMIN');
    expect(commands).toContain('vlan 20');
    expect(commands).toContain(' name USERS');
  });
});

describe('validateVlanConfig via kernel plugin', () => {
  beforeEach(() => {
    resetKernelRegistry();
    getKernelRegistry().register('protocol', vlanPlugin);
  });

  afterEach(() => {
    resetKernelRegistry();
  });

  test('valida configuracion VLAN correcta', () => {
    const vlans = parseVlans(['10,ADMIN', '20,USERS']);
    const result = vlanPlugin.validate({ switchName: 'S1', vlans });

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('rechaza VLAN ID invalido', () => {
    const vlans = [{ id: '0', name: 'INVALID' }];
    const result = vlanPlugin.validate({ switchName: 'S1', vlans });

    expect(result.ok).toBe(false);
  });
});
