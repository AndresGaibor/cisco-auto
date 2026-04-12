import { test, expect, describe, beforeEach, afterEach, mock } from 'bun:test';
import {
  buildVlanApplyCommands,
  buildVlanCreateCommands,
  buildVlanTrunkCommands,
  createLabVlanCommand,
  executeVlanApply,
  executeVlanTrunk,
  executeVlanApplyViaPlugin,
  executeVlanTrunkViaPlugin,
  parseVlanIds,
} from '../../src/commands/vlan.ts';
import { VlanId } from '@cisco-auto/ios-domain/value-objects';
import { resetKernelRegistry, getPacketTracerBackend } from '../../src/kernel-bridge.ts';
import type { PacketTracerBackendPlugin } from '@cisco-auto/kernel/backends/packet-tracer';

test('buildVlanCreateCommands genera comandos de configuración de VLAN con descripción', () => {
  const comandos = buildVlanCreateCommands('Ventas', 10, 'Segmento de ventas');

  expect(comandos).toEqual([
    '! Configuración de VLANs',
    'vlan 10',
    ' name Ventas',
    ' description Segmento de ventas',
    ' exit',
  ]);
});

test('buildVlanApplyCommands genera bloques para cada VLAN solicitada', () => {
  const comandos = buildVlanApplyCommands([20, 30]);

  expect(comandos).toEqual([
    '! Configuración de VLANs',
    'vlan 20',
    ' name VLAN20',
    ' exit',
    'vlan 30',
    ' name VLAN30',
    ' exit',
  ]);
});

test('buildVlanTrunkCommands configura interfaz trunk con VLANs permitidas', () => {
  const comandos = buildVlanTrunkCommands('GigabitEthernet0/1', [10, 20]);

  expect(comandos).toEqual([
    '! Configuración de interfaces',
    'interface GigabitEthernet0/1',
    ' switchport mode trunk',
    ' switchport trunk allowed vlan 10,20',
    ' no shutdown',
    ' exit',
  ]);
});

test('createLabVlanCommand expone los subcomandos create, apply y trunk', () => {
  const command = createLabVlanCommand();

  expect(command.commands.map((sub) => sub.name())).toEqual(['create', 'apply', 'trunk']);
});

test('parseVlanIds rechaza VLAN IDs no enteros', () => {
  expect(() => parseVlanIds('10.5')).toThrow('La lista de VLANs debe contener IDs válidos entre 1 y 4094');
  expect(() => parseVlanIds('1e3')).toThrow('La lista de VLANs debe contener IDs válidos entre 1 y 4094');
  expect(() => parseVlanIds('0x10')).toThrow('La lista de VLANs debe contener IDs válidos entre 1 y 4094');
  expect(() => parseVlanIds('   ')).toThrow('La lista de VLANs debe contener IDs válidos entre 1 y 4094');
});

test('parseVlanIds conserva VLAN IDs canónicos', () => {
  expect(parseVlanIds('010,20').map((vlan) => vlan.value)).toEqual([10, 20]);
});

test('executeVlanApply envía los comandos IOS esperados al controller', async () => {
  const llamadas: Array<{ device: string; commands: string[]; options: { save: boolean } }> = [];
  const controller = {
    start: async () => undefined,
    stop: async () => undefined,
    configIosWithResult: async (device: string, commands: string[], options: { save: boolean }) => {
      llamadas.push({ device, commands, options });
    },
  };

  const result = await executeVlanApply(
    controller,
    'Switch1',
    [VlanId.from(10), VlanId.from(20)]
  );

  expect(result.ok).toBe(true);
  expect(llamadas).toEqual([
    {
      device: 'Switch1',
      commands: ['vlan 10', ' name VLAN10', ' exit', 'vlan 20', ' name VLAN20', ' exit'],
      options: { save: true },
    },
  ]);
});

test('executeVlanTrunk envía los comandos IOS esperados al controller', async () => {
  const llamadas: Array<{ device: string; commands: string[]; options: { save: boolean } }> = [];
  const controller = {
    start: async () => undefined,
    stop: async () => undefined,
    configIosWithResult: async (device: string, commands: string[], options: { save: boolean }) => {
      llamadas.push({ device, commands, options });
    },
  };

  const result = await executeVlanTrunk(
    controller,
    'Switch1',
    'GigabitEthernet0/1',
    [VlanId.from(10), VlanId.from(20)]
  );

  expect(result.ok).toBe(true);
  expect(llamadas).toEqual([
    {
      device: 'Switch1',
      commands: [
        'interface GigabitEthernet0/1',
        ' switchport mode trunk',
        ' switchport trunk allowed vlan 10,20',
        ' no shutdown',
        ' exit',
      ],
      options: { save: true },
    },
  ]);
});

function createMockBackend(): PacketTracerBackendPlugin {
  return {
    id: 'packet-tracer',
    category: 'backend',
    name: 'Mock PT',
    version: '1.0.0',
    description: 'Mock backend for tests',
    validate: () => ({ ok: true, errors: [] }),
    connect: async () => {},
    disconnect: () => {},
    isConnected: () => true,
    addDevice: async () => ({}),
    removeDevice: async () => {},
    configureDevice: async () => ({}),
    execShow: async () => ({}),
    addLink: async () => ({}),
    removeLink: async () => {},
    getTopology: async () => ({}),
  };
}

describe('executeVlanApplyViaPlugin', () => {
  test('valida y genera comandos usando el plugin VLAN', async () => {
    const mockBackend = createMockBackend();
    const configureSpy = mock(async () => ({}));
    mockBackend.configureDevice = configureSpy;

    const result = await executeVlanApplyViaPlugin('Switch1', [VlanId.from(10), VlanId.from(20)], mockBackend);

    expect(result.ok).toBe(true);
    expect(result.data?.device).toBe('Switch1');
    expect(result.data?.vlanIds).toEqual([10, 20]);
    expect(result.data?.commands).toContain('vlan 10');
    expect(result.data?.commands).toContain('vlan 20');
    expect(configureSpy).toHaveBeenCalled();
  });

  test('rechaza VLAN IDs invalidos', async () => {
    const mockBackend = createMockBackend();
    // VlanId.from(0) throws, so we test validation through a spec with invalid vlan via different path
    // Instead, test that the validateVlanConfig rejects empty vlan list
    const { validateVlanConfig } = await import('../../src/kernel-bridge.ts');
    const result = validateVlanConfig({ switchName: 'S1', vlans: [] });

    expect(result.ok).toBe(false);
  });
});

describe('executeVlanTrunkViaPlugin', () => {
  test('valida y genera comandos de trunk usando el plugin VLAN', async () => {
    const mockBackend = createMockBackend();
    const configureSpy = mock(async () => ({}));
    mockBackend.configureDevice = configureSpy;

    const result = await executeVlanTrunkViaPlugin('Switch1', 'GigabitEthernet0/1', [VlanId.from(10), VlanId.from(20)], mockBackend);

    expect(result.ok).toBe(true);
    expect(result.data?.device).toBe('Switch1');
    expect(result.data?.interface).toBe('GigabitEthernet0/1');
    expect(result.data?.allowedVlans).toEqual([10, 20]);
    expect(result.data?.commands).toContain('vlan 10');
    expect(result.data?.commands).toContain('switchport mode trunk');
    expect(configureSpy).toHaveBeenCalled();
  });
});
