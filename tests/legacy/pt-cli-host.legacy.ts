import { describe, expect, test } from 'bun:test';
import { buildHostConfigVerificationChecks, verifyHostConfig } from '../apps/pt-cli/src/application/verify-host-config.js';

describe('host and DHCP normalization', () => {
  test('host help exposes canonical config and inspect subcommands', async () => {
    const child = Bun.spawn({
      cmd: ['bun', 'run', 'apps/pt-cli/src/index.ts', 'host', '--help'],
      cwd: process.cwd(),
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const stdout = await new Response(child.stdout).text();
    const exitCode = await child.exited;

    expect(exitCode).toBe(0);
    expect(stdout).toContain('config');
    expect(stdout).toContain('inspect');
  }, 10000);

  test('service dhcp help is available through the canonical root command and alias', async () => {
    const child = Bun.spawn({
      cmd: ['bun', 'run', 'apps/pt-cli/src/index.ts', 'service', 'dhcp', '--help'],
      cwd: process.cwd(),
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const stdout = await new Response(child.stdout).text();
    const exitCode = await child.exited;

    expect(exitCode).toBe(0);
    expect(stdout).toContain('create');
    expect(stdout).toContain('dhcp-server');
  }, 10000);

  test('host verification returns structured checks for DHCP mode', async () => {
    const controller = {
      inspectDevice: async () => ({ ip: null, mask: null, gateway: null, dns: null, dhcp: true }),
    } as any;

    const data = await verifyHostConfig(controller, 'PC1', undefined, undefined, undefined, undefined, true);
    const checks = buildHostConfigVerificationChecks(data, undefined, undefined, undefined, undefined, true);

    expect(data.dhcp).toBe(true);
    expect(data.configApplied).toBe(true);
    expect(checks.some((check) => check.name === 'dhcp-mode' && check.ok)).toBe(true);
    expect(checks.some((check) => check.name === 'config-applied' && check.ok)).toBe(true);
  });
});
