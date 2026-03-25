import { test, expect } from 'bun:test';
import {
  buildVlanApplyCommands,
  buildVlanCreateCommands,
  buildVlanTrunkCommands,
  createLabVlanCommand,
} from '../../src/commands/vlan.ts';

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
