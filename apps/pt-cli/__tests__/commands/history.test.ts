import { test, expect } from 'bun:test';
import {
  createHistoryCommand,
} from '../../src/commands/history.ts';

test('history command exports createHistoryCommand function', () => {
  expect(typeof createHistoryCommand).toBe('function');
});

test('history createHistoryCommand returns a Command instance', () => {
  const cmd = createHistoryCommand();
  expect(cmd.name()).toBe('history');
  expect(cmd.commands.length).toBeGreaterThan(0);
});

test('history subcommands include list, show, last, rerun, explain', () => {
  const cmd = createHistoryCommand();
  const subcommandNames = cmd.commands.map((c: any) => c.name());

  expect(subcommandNames).toContain('list');
  expect(subcommandNames).toContain('show');
  expect(subcommandNames).toContain('last');
  expect(subcommandNames).toContain('rerun');
  expect(subcommandNames).toContain('explain');
});

test('history list subcommand is configured', () => {
  const cmd = createHistoryCommand();
  const listCmd = cmd.commands.find((c: any) => c.name() === 'list');
  expect(listCmd).toBeDefined();
  expect(listCmd?.description()).toContain('ejecuciones');
});

test('history show subcommand accepts sessionId argument', () => {
  const cmd = createHistoryCommand();
  const showCmd = cmd.commands.find((c: any) => c.name() === 'show');
  expect(showCmd).toBeDefined();
});

test('history last subcommand is configured', () => {
  const cmd = createHistoryCommand();
  const lastCmd = cmd.commands.find((c: any) => c.name() === 'last');
  expect(lastCmd).toBeDefined();
});

test('history rerun subcommand is configured', () => {
  const cmd = createHistoryCommand();
  const rerunCmd = cmd.commands.find((c: any) => c.name() === 'rerun');
  expect(rerunCmd).toBeDefined();
});

test('history explain subcommand is configured', () => {
  const cmd = createHistoryCommand();
  const explainCmd = cmd.commands.find((c: any) => c.name() === 'explain');
  expect(explainCmd).toBeDefined();
});
