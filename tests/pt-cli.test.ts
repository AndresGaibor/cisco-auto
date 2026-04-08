import { describe, it, expect } from 'bun:test';
import { runPtCommand } from '../scripts/pt-cli.ts';
import { collectContextStatus } from '../apps/pt-cli/src/application/context-supervisor.js';

// Basic smoke test: runPtCommand should return an object with success boolean

describe('pt-cli helper', () => {
  it('returns object with success boolean', async () => {
    const res = await runPtCommand(['--version'] as string[]);
    expect(typeof res.success).toBe('boolean');
  });

  it('`bun run pt --help` termina con código cero', async () => {
    const proceso = Bun.spawn({
      cmd: ['bun', 'run', 'pt', '--help'],
      cwd: process.cwd(),
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const [exitCode, stdout] = await Promise.all([
      proceso.exited,
      new Response(proceso.stdout).text(),
    ]);

    expect(exitCode).toBe(0);
    expect(stdout).toContain('Usage: pt');
  });

  it('collectContextStatus refresca la snapshot viva antes de persistir estado', async () => {
    let deviceCount = 0;

    const controller = {
      snapshot: async () => {
        deviceCount = 2;
        return { devices: { R1: {}, R2: {} } };
      },
      getSystemContext: () => ({
        bridgeReady: true,
        topologyMaterialized: true,
        deviceCount,
        linkCount: 0,
        heartbeat: { state: 'ok' as const },
        warnings: [],
      }),
    } as any;

    const status = await collectContextStatus(controller);

    expect(status.topology.deviceCount).toBe(2);
    expect(status.topology.materialized).toBe(true);
  });
});
