import { describe, it, expect } from 'bun:test';
import { runPtCommand } from '../scripts/pt-cli.ts';
import { collectContextStatus } from '../apps/pt-cli/src/application/context-supervisor.js';

// Basic smoke test: runPtCommand should return an object with success boolean

describe('pt-cli helper', () => {
  it('returns object with success boolean', async () => {
    const res = await runPtCommand(['--version'] as string[]);
    expect(typeof res.success).toBe('boolean');
  }, 10000);

  it('`bun run src/index.ts --help` termina con código cero', async () => {
    const proceso = Bun.spawn({
      cmd: ['bun', 'run', 'apps/pt-cli/src/index.ts', '--help'],
      cwd: process.cwd(),
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const [exitCode, stdout] = await Promise.all([
      proceso.exited,
      new Response(proceso.stdout).text(),
    ]);

    expect(exitCode).toBe(0);
    expect(stdout).toContain('Usage: cisco-auto');
    expect(stdout).toContain('inspect');
    expect(stdout).toContain('layout');
    expect(stdout).toContain('verify');
    expect(stdout).toContain('agent');
    expect(stdout).toContain('topology-show');
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
        heartbeat: { state: 'ok' as const, ageMs: 0, lastSeenTs: Date.now() },
        warnings: [],
      }),
      getBridgeStatus: () => ({
        ready: true,
        leaseValid: true,
        queuedCount: 0,
        inFlightCount: 0,
        warnings: [],
      }),
    } as any;

    const status = await collectContextStatus(controller);

    expect(status.topology.deviceCount).toBe(2);
    expect(status.topology.materialized).toBe(true);
    expect(status.notes?.length ?? 0).toBeGreaterThan(0);
  });
});
