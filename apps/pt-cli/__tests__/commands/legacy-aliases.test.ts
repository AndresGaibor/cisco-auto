import { test, expect, describe } from 'bun:test';
import { createProgram } from '../../src/program.js';

describe('Legacy alias deprecation warnings', () => {
  const program = createProgram();

  const legacyCommands = [
    { name: 'devices-list', replacement: 'device list' },
    { name: 'devices-add', replacement: 'device add' },
    { name: 'topology-show', replacement: 'topology show / inspect topology' },
    { name: 'history-search', replacement: 'history list --action' },
    { name: 'history-failed', replacement: 'history list --failed' },
    { name: 'show-vlan', replacement: 'show vlan' },
    { name: 'show-run', replacement: 'show run-config' },
    { name: 'show-route', replacement: 'show ip-route' },
    { name: 'show-cdp', replacement: 'show cdp' },
    { name: 'show-mac', replacement: 'show mac-address-table' },
    { name: 'tail', replacement: 'history list / audit' },
    { name: 'export', replacement: 'history list --json' },
    { name: 'audit-failed', replacement: 'history list --failed' },
    { name: 'query', replacement: 'audit' },
  ];

  for (const legacy of legacyCommands) {
    test(`${legacy.name} is registered`, () => {
      const cmd = program.commands.find((c: any) => c.name() === legacy.name);
      expect(cmd).toBeDefined();
    });

    test(`${legacy.name} has deprecation notice in description`, () => {
      const cmd = program.commands.find((c: any) => c.name() === legacy.name);
      expect(cmd?.description()).toContain('DEPRECADO');
    });
  }
});

describe('No duplicate implementations', () => {
  const program = createProgram();

  test('device list is the canonical command (not devices-list)', () => {
    const deviceCmd = program.commands.find((c: any) => c.name() === 'device');
    expect(deviceCmd).toBeDefined();

    const listSubCmd = deviceCmd?.commands.find((c: any) => c.name() === 'list');
    expect(listSubCmd).toBeDefined();
  });

  test('topology show is the canonical command (not topology-show)', () => {
    const topologyCmd = program.commands.find((c: any) => c.name() === 'topology');
    expect(topologyCmd).toBeDefined();

    const showSubCmd = topologyCmd?.commands.find((c: any) => c.name() === 'show');
    expect(showSubCmd).toBeDefined();
  });

  test('show has all subcommands as canonical implementations', () => {
    const showCmd = program.commands.find((c: any) => c.name() === 'show');
    expect(showCmd).toBeDefined();

    const subcommandNames = showCmd?.commands.map((c: any) => c.name()) || [];
    expect(subcommandNames).toContain('vlan');
    expect(subcommandNames).toContain('run-config');
    expect(subcommandNames).toContain('ip-route');
    expect(subcommandNames).toContain('ip-int-brief');
  });

  test('history-search redirects to history list --action', () => {
    const cmd = program.commands.find((c: any) => c.name() === 'history-search');
    expect(cmd).toBeDefined();
    expect(cmd?.description()).toContain('DEPRECADO');
  });

  test('history-failed redirects to history list --failed', () => {
    const cmd = program.commands.find((c: any) => c.name() === 'history-failed');
    expect(cmd).toBeDefined();
    expect(cmd?.description()).toContain('DEPRECADO');
  });

  test('audit is the canonical command for audit operations', () => {
    const auditCmd = program.commands.find((c: any) => c.name() === 'audit');
    expect(auditCmd).toBeDefined();
  });
});
