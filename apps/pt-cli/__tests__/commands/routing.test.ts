import { test, expect } from 'bun:test';
import {
  buildBgpEnableCommands,
  buildEigrpEnableCommands,
  buildOspfAddNetworkCommands,
  buildOspfEnableCommands,
  buildStaticRouteCommands,
  createRoutingCommand,
} from '../../src/commands/routing.ts';

test('routing static add genera una ruta IOS válida', () => {
  const comandos = buildStaticRouteCommands('R1', '10.10.10.0/24', '192.168.1.1');

  expect(comandos).toEqual([
    '! Rutas estáticas',
    'ip route 10.10.10.0 255.255.255.0 192.168.1.1',
  ]);
});

test('routing ospf enable genera comandos IOS válidos', () => {
  const comandos = buildOspfEnableCommands(1);

  expect(comandos).toEqual([
    '! Configuración OSPF Proceso 1',
    'router ospf 1',
    ' exit',
  ]);
});

test('routing ospf add-network genera wildcard correcto', () => {
  const comandos = buildOspfAddNetworkCommands(10, '172.16.0.0/24', 0);

  expect(comandos).toEqual([
    '! Configuración OSPF Proceso 10',
    'router ospf 10',
    ' network 172.16.0.0 0.0.0.255 area 0',
    ' exit',
  ]);
});

test('routing eigrp enable genera IOS válido', () => {
  const comandos = buildEigrpEnableCommands(100);

  expect(comandos).toEqual([
    '! Configuración EIGRP AS 100',
    'router eigrp 100',
    ' no auto-summary',
    ' exit',
  ]);
});

test('routing bgp enable genera IOS válido', () => {
  const comandos = buildBgpEnableCommands(65001);

  expect(comandos).toEqual([
    '! BGP Configuration',
    'router bgp 65001',
    ' bgp log-neighbor-changes',
    ' exit',
  ]);
});

test('createRoutingCommand expone los subcomandos esperados', () => {
  const command = createRoutingCommand();

  expect(command.commands.map((subcommand) => subcommand.name())).toEqual([
    'static',
    'ospf',
    'eigrp',
    'bgp',
  ]);
});
