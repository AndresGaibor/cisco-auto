import { expect, test, describe } from 'bun:test';
import { createStatusCommand } from '../src/commands/status.js';
import { createDoctorCommand } from '../src/commands/doctor.js';
import { COMMAND_CATALOG, getRegisteredCommandIds } from '../src/commands/command-catalog.js';
import { collectContextStatus } from '../src/application/context-supervisor.js';

describe('Fase 5 registry and metadata', () => {
  test('status is registered in the catalog and command list', () => {
    expect(getRegisteredCommandIds()).toContain('status');
    expect(COMMAND_CATALOG.status).toBeDefined();
    expect(createStatusCommand().name()).toBe('status');
  });

  test('doctor is registered in the catalog and command list', () => {
    expect(getRegisteredCommandIds()).toContain('doctor');
    expect(COMMAND_CATALOG.doctor).toBeDefined();
    expect(createDoctorCommand().name()).toBe('doctor');
  });

  test('collectContextStatus materializa topologia si no hay snapshot cacheado', async () => {
    const controller = {
      getCachedSnapshot: () => null,
      getSystemContext: () => ({
        bridgeReady: true,
        topologyMaterialized: false,
        deviceCount: 0,
        linkCount: 0,
        heartbeat: { state: 'ok' as const },
        warnings: [],
      }),
      getBridgeStatus: () => ({ ready: true, queuedCount: 0, inFlightCount: 0, warnings: [] }),
      snapshot: async () => ({
        version: '1',
        timestamp: 1,
        devices: {
          SW1: { name: 'SW1' },
          SW2: { name: 'SW2' },
        },
        links: {
          L1: { device1: 'SW1', port1: 'Gi0/1', device2: 'SW2', port2: 'Gi0/1' },
        },
      }),
    } as any;

    const status = await collectContextStatus(controller);

    expect(status.topology.materialized).toBe(true);
    expect(status.topology.deviceCount).toBe(2);
    expect(status.topology.linkCount).toBe(1);
  });
});
