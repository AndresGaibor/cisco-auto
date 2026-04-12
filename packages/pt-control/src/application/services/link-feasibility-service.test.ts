import { describe, expect, test } from 'bun:test';
import { LinkFeasibilityService } from './link-feasibility-service.js';

function createSnapshot() {
  return {
    devices: {
      R1: {
        name: 'R1',
        ports: {
          'Gi0/0': { name: 'Gi0/0', kind: 'ethernet', lastSeenAt: Date.now() },
          'Gi0/1': { name: 'Gi0/1', kind: 'ethernet', lastSeenAt: Date.now(), connectedTo: { deviceId: 'S1', portName: 'Fa0/1' } },
        },
      },
      S1: {
        name: 'S1',
        ports: {
          'Fa0/1': { name: 'Fa0/1', kind: 'ethernet', lastSeenAt: Date.now(), connectedTo: { deviceId: 'R1', portName: 'Gi0/1' } },
          'Fa0/2': { name: 'Fa0/2', kind: 'ethernet', lastSeenAt: Date.now() },
        },
      },
    },
    links: {
      L1: { device1: 'R1', port1: 'Gi0/1', device2: 'S1', port2: 'Fa0/1' },
    },
  } as any;
}

describe('LinkFeasibilityService', () => {
  test('suggestLink recommends free ports', () => {
    const service = new LinkFeasibilityService();
    const result = service.suggestLink(createSnapshot(), 'R1', 'S1');

    expect(result.feasible).toBe(true);
    expect(result.source?.port).toBe('Gi0/0');
    expect(result.target?.port).toBe('Fa0/2');
  });

  test('verifyLink rejects occupied ports', () => {
    const service = new LinkFeasibilityService();
    const result = service.verifyLink(createSnapshot(), 'R1', 'Gi0/1', 'S1', 'Fa0/1');

    expect(result.feasible).toBe(false);
    expect(result.reasons.length).toBeGreaterThan(0);
  });
});
