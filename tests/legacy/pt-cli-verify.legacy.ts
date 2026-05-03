import { describe, expect, test } from 'bun:test';

describe('verify ios CLI', () => {
  test('prints pass/fail checks from provided IOS evidence', async () => {
    const evidence = JSON.stringify({
      source: 'terminal',
      status: 0,
      mode: 'privileged-exec',
      prompt: 'R1#',
      paging: false,
      awaitingConfirm: false,
      completionReason: 'command-ended',
    });

    const child = Bun.spawn({
      cmd: ['bun', 'run', 'apps/pt-cli/src/index.ts', 'verify', 'ios', 'R1', 'show version', '--evidence', evidence],
      cwd: process.cwd(),
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const stdout = await new Response(child.stdout).text();
    const exitCode = await child.exited;

    expect(exitCode).toBe(0);
    expect(stdout).toContain('IOS verification report');
    expect(stdout).toContain('PASS');
    expect(stdout).toContain('source=terminal');
    expect(stdout).toContain('status=0');
    expect(stdout).toContain('mode=privileged-exec');
    expect(stdout).toContain('prompt=R1#');
  }, 10000);
});
