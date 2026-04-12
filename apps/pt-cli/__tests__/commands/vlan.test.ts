import { test, expect } from 'bun:test';
import {
  buildVlanApplyCommands,
  buildVlanCreateCommands,
  buildVlanTrunkCommands,
  createLabVlanCommand,
  executeVlanApply,
  executeVlanTrunk,
  parseVlanIds,
} from '../../src/commands/vlan.ts';
import { VlanId } from '@cisco-auto/ios-domain/value-objects';

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
    ' switchport trunk encapsulation dot1q',
    ' switchport mode trunk',
    ' switchport trunk allowed vlan 10,20',
    ' switchport trunk native vlan 1',
    ' exit',
  ]);
});

test('createLabVlanCommand expone los subcomandos create, apply y trunk', () => {
  const command = createLabVlanCommand();

  expect(command.commands.map((sub) => sub.name())).toEqual(['create', 'apply', 'trunk']);
});

test('parseVlanIds rechaza VLAN IDs no enteros', () => {
  expect(() => parseVlanIds('10.5')).toThrow('La lista de VLANs debe contener IDs válidos entre 1 y 4094');
  expect(() => parseVlanIds('1e2')).toThrow('La lista de VLANs debe contener IDs válidos entre 1 y 4094');
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

  const result = await executeVlanApply(controller, { name: 'Switch1', model: '2960-24TT' }, [VlanId.from(10), VlanId.from(20)]);

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
    { name: 'Switch1', model: '2960-24TT' },
    'GigabitEthernet0/1',
    [10, 20]
  );

  expect(result.ok).toBe(true);
  expect(llamadas).toEqual([
    {
      device: 'Switch1',
      commands: [
        'interface GigabitEthernet0/1',
        ' switchport trunk encapsulation dot1q',
        ' switchport mode trunk',
        ' switchport trunk allowed vlan 10,20',
        ' switchport trunk native vlan 1',
        ' exit',
      ],
      options: { save: true },
    },
  ]);
});
