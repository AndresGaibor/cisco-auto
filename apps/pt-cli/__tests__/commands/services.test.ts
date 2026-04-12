import { test, expect } from 'bun:test';
import { buildDhcpCommands, buildNtpCommands, buildSyslogCommands } from '../../src/commands/services.ts';

test('buildDhcpCommands generates DHCP pool and network lines', () => {
  const cmds = buildDhcpCommands('R1', 'TEST_POOL', '192.168.50.0/24');
  expect(Array.isArray(cmds)).toBe(true);
  expect(cmds).toContain('ip dhcp pool TEST_POOL');
  expect(cmds).toContain(' network 192.168.50.0 255.255.255.0');
});

test('buildNtpCommands generates ntp server line', () => {
  const cmds = buildNtpCommands('R1', '1.2.3.4');
  expect(cmds).toContain('! NTP Configuration');
  expect(cmds.some((c: string) => c.startsWith('ntp server 1.2.3.4'))).toBe(true);
});

test('buildSyslogCommands generates logging host line', () => {
  const cmds = buildSyslogCommands('R1', '10.0.0.5');
  expect(cmds).toContain('! Syslog Configuration');
  expect(cmds.some((c: string) => c.includes('logging 10.0.0.5'))).toBe(true);
});
