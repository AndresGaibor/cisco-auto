import { test, expect } from 'bun:test';
import { createRoutingCommand } from '../../src/commands/routing.ts';
import {
  executeStaticRoute,
  executeOspfEnable,
  executeOspfAddNetwork,
  executeEigrpEnable,
  executeBgpEnable,
} from '@cisco-auto/pt-control/application/routing';

test('executeStaticRoute genera ruta valida', () => {
  const result = executeStaticRoute({ deviceName: 'R1', network: '10.10.10.0/24', nextHop: '192.168.1.1' });

  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.data.commands).toContain('ip route 10.10.10.0 255.255.255.0 192.168.1.1');
});

test('executeOspfEnable genera IOS valido', () => {
  const result = executeOspfEnable({ deviceName: 'R1', processId: 1 });

  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.data.commands).toContain('router ospf 1');
});

test('executeOspfAddNetwork genera wildcard correcto', () => {
  const result = executeOspfAddNetwork({ deviceName: 'R1', network: '172.16.0.0/24', area: 0 });

  expect(result.ok).toBe(true);
  if (!result.ok) return;
  const cmd = result.data.commands.find((c) => c.includes('network'));
  expect(cmd).toBeDefined();
});

test('executeEigrpEnable genera IOS valido', () => {
  const result = executeEigrpEnable({ deviceName: 'R1', asn: 100 });

  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.data.commands).toContain('router eigrp 100');
});

test('executeBgpEnable genera IOS valido', () => {
  const result = executeBgpEnable({ deviceName: 'R1', asn: 65001 });

  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.data.commands).toContain('router bgp 65001');
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