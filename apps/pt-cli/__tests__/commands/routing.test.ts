import { test, expect } from 'bun:test';
import {
  buildBgpEnableCommands,
  buildEigrpEnableCommands,
  buildOspfAddNetworkCommands,
  buildOspfEnableCommands,
  buildStaticRouteCommands,
  createRoutingCommand,
} from '../../src/commands/routing.ts';

test('routing static add genera una ruta IOS valida', () => {
  const comandos = buildStaticRouteCommands('R1', '10.10.10.0/24', '192.168.1.1');

  expect(comandos).toContain('! Rutas estáticas');
  expect(comandos).toContain('ip route 10.10.10.0 255.255.255.0 192.168.1.1');
});

test('routing ospf enable genera comandos IOS validos', () => {
  const comandos = buildOspfEnableCommands('R1', 1);

  expect(comandos).toEqual(['router ospf 1', ' exit']);
});

test('routing ospf add-network genera wildcard correcto', () => {
  const comandos = buildOspfAddNetworkCommands('R1', 10, '172.16.0.0/24', 0);

  expect(comandos).toContain('! Configuración OSPF');
  expect(comandos).toContain('router ospf 10');
  expect(comandos.some((c) => c.includes('network 172.16.0.0 0.0.0.255 area 0'))).toBe(true);
});

test('routing eigrp enable genera IOS valido', () => {
  const comandos = buildEigrpEnableCommands('R1', 100);

  expect(comandos).toEqual(['router eigrp 100', ' no auto-summary', ' exit']);
});

test('routing bgp enable genera IOS valido', () => {
  const comandos = buildBgpEnableCommands('R1', 65001);

  expect(comandos).toEqual(['router bgp 65001', ' bgp log-neighbor-changes', ' exit']);
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
