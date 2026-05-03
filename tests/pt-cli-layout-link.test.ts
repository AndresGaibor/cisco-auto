import { describe, expect, test } from 'bun:test';

describe('layout and link command help', () => {
  test('link help exposes suggestion and verification subcommands', async () => {
    const child = Bun.spawn({
      cmd: ['bun', 'run', 'apps/pt-cli/src/index.ts', 'link', '--help'],
      cwd: process.cwd(),
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const stdout = await new Response(child.stdout).text();
    const exitCode = await child.exited;

    expect(exitCode).toBe(0);
    expect(stdout).toContain('suggest');
    expect(stdout).toContain('verify');
  }, 10000);
});
