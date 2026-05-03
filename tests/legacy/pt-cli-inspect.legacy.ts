import { describe, expect, test } from 'bun:test';
import { inspectTopologySnapshot } from '../apps/pt-cli/src/commands/inspect/topology.js';
import { inspectNeighbors } from '../apps/pt-cli/src/commands/inspect/neighbors.js';
import { inspectFreePorts } from '../apps/pt-cli/src/commands/inspect/free-ports.js';
import { inspectDrift } from '../apps/pt-cli/src/commands/inspect/drift.js';

function createController(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    start: async () => undefined,
    stop: async () => undefined,
    snapshot: async () => ({
      devices: {
        R1: { name: 'R1', model: '2911', type: 'router', status: 'online' },
        S1: { name: 'S1', model: '2960', type: 'switch', status: 'online' },
      },
      links: {
        L1: { device1: 'R1', port1: 'Gi0/0', device2: 'S1', port2: 'Fa0/1' },
      },
    }),
    inspectDevice: async () => ({
      ports: [
        { name: 'Gi0/0', link: 'L1' },
        { name: 'Gi0/1', link: null },
        { name: 'Gi0/2' },
      ],
    }),
    getSystemContext: () => ({
      bridgeReady: true,
      topologyMaterialized: true,
      deviceCount: 2,
      linkCount: 1,
      heartbeat: { state: 'ok' as const },
      warnings: [],
    }),
    ...overrides,
  } as any;
}

describe('inspect helpers', () => {
  test('inspect help exposes canonical subcommands', async () => {
    const child = Bun.spawn({
      cmd: ['bun', 'run', 'apps/pt-cli/src/index.ts', 'inspect', '--help'],
      cwd: process.cwd(),
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const stdout = await new Response(child.stdout).text();
    const exitCode = await child.exited;

    expect(exitCode).toBe(0);
    expect(stdout).toContain('topology');
    expect(stdout).toContain('neighbors');
    expect(stdout).toContain('free-ports');
    expect(stdout).toContain('drift');
  }, 10000);

  test('inspectTopologySnapshot summarizes the snapshot', async () => {
    const result = await inspectTopologySnapshot(createController() as any);

    expect(result.deviceCount).toBe(2);
    expect(result.linkCount).toBe(1);
    expect(result.devices.map((device) => device.name)).toEqual(['R1', 'S1']);
  });

  test('inspectNeighbors finds adjacent devices', async () => {
    const result = await inspectNeighbors(createController() as any, 'R1');

    expect(result.device).toBe('R1');
    expect(result.neighbors.map((neighbor) => neighbor.name)).toEqual(['S1']);
  });

  test('inspectFreePorts splits free and occupied ports', async () => {
    const result = await inspectFreePorts(createController() as any, 'R1');

    expect(result.freePorts).toEqual(['Gi0/1', 'Gi0/2']);
    expect(result.occupiedPorts).toEqual(['Gi0/0']);
  });

  test('inspectDrift detects count mismatches', async () => {
    const result = await inspectDrift(createController({
      getSystemContext: () => ({
        bridgeReady: true,
        topologyMaterialized: true,
        deviceCount: 3,
        linkCount: 1,
        heartbeat: { state: 'ok' as const },
        warnings: [],
      }),
    }) as any);

    expect(result.driftDetected).toBe(true);
    expect(result.warnings[0]).toContain('Dispositivos');
  });
});
