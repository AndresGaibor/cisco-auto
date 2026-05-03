import { describe, expect, test } from 'bun:test';

const snapshotPath = 'tests/fixtures/agent-sample-twin.json';

describe('agent command help and workflow surface', () => {
  test('agent help exposes explicit context, plan, apply, and verify commands', async () => {
    const child = Bun.spawn({
      cmd: ['bun', 'run', 'apps/pt-cli/src/index.ts', 'agent', '--help'],
      cwd: process.cwd(),
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const stdout = await new Response(child.stdout).text();
    const exitCode = await child.exited;

    expect(exitCode).toBe(0);
    expect(stdout).toContain('context');
    expect(stdout).toContain('plan');
    expect(stdout).toContain('apply');
    expect(stdout).toContain('verify');
  }, 10000);

  test('agent context renders candidate ports and risks for the selected subgraph', async () => {
    const child = Bun.spawn({
      cmd: [
        'bun',
        'run',
        'apps/pt-cli/src/index.ts',
        'agent',
        'context',
        '--snapshot',
        snapshotPath,
        '--task',
        'connect R1 and S1',
      ],
      cwd: process.cwd(),
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const stdout = await new Response(child.stdout).text();
    const exitCode = await child.exited;

    expect(exitCode).toBe(0);
    expect(stdout).toContain('Tarea actual');
    expect(stdout).toContain('connect R1 and S1');
    expect(stdout).toContain('Puertos candidatos');
    expect(stdout).toContain('Riesgos');
    expect(stdout).toContain('R1');
    expect(stdout).toContain('S1');
  }, 10000);

  test('agent plan and verify share the same snapshot-driven context', async () => {
    const child = Bun.spawn({
      cmd: [
        'bun',
        'run',
        'apps/pt-cli/src/index.ts',
        'agent',
        'plan',
        '--snapshot',
        snapshotPath,
        '--goal',
        'connect R1 and S1',
      ],
      cwd: process.cwd(),
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const stdout = await new Response(child.stdout).text();
    const exitCode = await child.exited;

    expect(exitCode).toBe(0);
    expect(stdout).toContain('Plan de agente');
    expect(stdout).toContain('connect R1 and S1');
    expect(stdout).toContain('Puertos candidatos');

    const verifyChild = Bun.spawn({
      cmd: ['bun', 'run', 'apps/pt-cli/src/index.ts', 'agent', 'verify', '--snapshot', snapshotPath],
      cwd: process.cwd(),
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const verifyStdout = await new Response(verifyChild.stdout).text();
    const verifyExitCode = await verifyChild.exited;

    expect(verifyExitCode).toBe(0);
    expect(verifyStdout).toContain('Verificación de agente');
    expect(verifyStdout).toContain('Riesgos');
  }, 10000);
});
