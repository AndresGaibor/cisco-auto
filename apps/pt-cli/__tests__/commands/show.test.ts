import { test, expect } from 'bun:test';
import {
  createShowCommand,
} from '../../src/commands/show.ts';

test('createShowCommand exports a function', () => {
  expect(typeof createShowCommand).toBe('function');
});

test('createShowCommand returns a Command with show as name', () => {
  const cmd = createShowCommand();
  expect(cmd.name()).toBe('show');
});

test('show command has all subcommands configured', () => {
  const cmd = createShowCommand();
  const subcommandNames = cmd.commands.map((c: any) => c.name());

  expect(subcommandNames).toContain('ip-int-brief');
  expect(subcommandNames).toContain('vlan');
  expect(subcommandNames).toContain('ip-route');
  expect(subcommandNames).toContain('run-config');
});

test('show ip-int-brief subcommand is configured', () => {
  const cmd = createShowCommand();
  const subCmd = cmd.commands.find((c: any) => c.name() === 'ip-int-brief');

  expect(subCmd).toBeDefined();
  expect(subCmd?.description()).toContain('IPs');
});

test('show vlan subcommand is configured', () => {
  const cmd = createShowCommand();
  const subCmd = cmd.commands.find((c: any) => c.name() === 'vlan');

  expect(subCmd).toBeDefined();
  expect(subCmd?.description()).toContain('VLAN');
});

test('show ip-route subcommand is configured', () => {
  const cmd = createShowCommand();
  const subCmd = cmd.commands.find((c: any) => c.name() === 'ip-route');

  expect(subCmd).toBeDefined();
  expect(subCmd?.description()).toContain('ruta');
});

test('show run-config subcommand is configured', () => {
  const cmd = createShowCommand();
  const subCmd = cmd.commands.find((c: any) => c.name() === 'run-config');

  expect(subCmd).toBeDefined();
  expect(subCmd?.description()).toContain('config');
});
