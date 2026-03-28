import { describe, test, expect } from 'bun:test';
import { ptLiveDeployTool } from '@cisco-auto/tools';
import type { TopologyPlan } from '@cisco-auto/core';

function createTestPlan(): TopologyPlan {
  return {
    id: 'test-plan-live-deploy',
    name: 'Test Live Deploy Plan',
    devices: [
      {
        id: 'R1',
        name: 'Router1',
        model: {
          name: '2911',
          type: 'router',
          ptType: 'Router-PT',
          ports: [
            { name: 'GigabitEthernet0/0', type: 'gigabitethernet', available: true },
            { name: 'GigabitEthernet0/1', type: 'gigabitethernet', available: true }
          ]
        },
        position: { x: 100, y: 100 },
        interfaces: [
          { name: 'GigabitEthernet0/0', ip: '192.168.1.1', subnetMask: '255.255.255.0', configured: true },
          { name: 'GigabitEthernet0/1', ip: '10.0.0.1', subnetMask: '255.255.255.0', configured: true }
        ],
        routing: {
          protocol: 'ospf',
          ospf: {
            processId: 1,
            areas: [{ area: 0, networks: ['192.168.1.0 0.0.0.255'] }]
          }
        }
      },
      {
        id: 'S1',
        name: 'Switch1',
        model: {
          name: '2960-24TT',
          type: 'switch',
          ptType: 'Switch-PT',
          ports: [
            { name: 'FastEthernet0/1', type: 'fastethernet', available: true },
            { name: 'FastEthernet0/2', type: 'fastethernet', available: true }
          ]
        },
        position: { x: 200, y: 200 },
        interfaces: [
          { name: 'FastEthernet0/1', vlan: 10, configured: true },
          { name: 'FastEthernet0/2', vlan: 20, configured: true }
        ],
        vlans: [
          { id: 10, name: 'VLAN10' },
          { id: 20, name: 'VLAN20' }
        ]
      },
      {
        id: 'PC1',
        name: 'PC1',
        model: {
          name: 'PC-PT',
          type: 'pc',
          ptType: 'PC-PT',
          ports: [{ name: 'FastEthernet0', type: 'fastethernet', available: true }]
        },
        position: { x: 300, y: 300 },
        interfaces: [
          { name: 'FastEthernet0', ip: '192.168.1.10', subnetMask: '255.255.255.0', configured: true }
        ]
      }
    ],
    links: [
      {
        id: 'link-1',
        from: { deviceId: 'R1', deviceName: 'Router1', port: 'GigabitEthernet0/0' },
        to: { deviceId: 'S1', deviceName: 'Switch1', port: 'FastEthernet0/1' },
        cableType: 'straight-through',
        validated: true
      }
    ],
    params: {
      routerCount: 1,
      switchCount: 1,
      pcCount: 1,
      networkType: 'single_lan',
      routingProtocol: 'ospf'
    }
  };
}

describe('pt_live_deploy', () => {
  test('dry-run mode returns success for all devices', async () => {
    const plan = createTestPlan();
    const result = await ptLiveDeployTool.handler(
      { plan, dryRun: true },
      {} as any
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect((result as any).data.deployed).toHaveLength(3);
      expect((result as any).data.failed).toHaveLength(0);
      expect((result as any).data.summary.total).toBe(3);
      expect((result as any).data.summary.success).toBe(3);
      expect((result as any).data.summary.failed).toBe(0);
      expect((result as any).data.summary.dryRun).toBe(true);
    }
  });

  test('dry-run mode marks messages as simulated', async () => {
    const plan = createTestPlan();
    const result = await ptLiveDeployTool.handler(
      { plan, dryRun: true },
      {} as any
    );

    expect(result.success).toBe(true);
    if (result.success) {
      for (const device of (result as any).data.deployed) {
        expect(device.message).toContain('[DRY-RUN]');
        expect(device.status).toBe('success');
      }
    }
  });

  test('returns error for empty plan', async () => {
    const result = await ptLiveDeployTool.handler(
      { plan: { id: 'empty', name: 'Empty', devices: [], links: [], params: {} as any } },
      {} as any
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('EMPTY_PLAN');
    }
  });

  test('returns error for plan without devices array', async () => {
    const result = await ptLiveDeployTool.handler(
      { plan: { id: 'test', name: 'Test', links: [] } },
      {} as any
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('INVALID_STRUCTURE');
    }
  });

  test('returns error for invalid plan', async () => {
    const result = await ptLiveDeployTool.handler(
      { plan: null },
      {} as any
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('INVALID_INPUT');
    }
  });

  test('uses default bridgeUrl when not provided', async () => {
    const plan = createTestPlan();
    const result = await ptLiveDeployTool.handler(
      { plan, dryRun: true },
      {} as any
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.metadata?.extras?.bridgeUrl).toBe('http://localhost:54321');
    }
  });

  test('accepts custom bridgeUrl', async () => {
    const plan = createTestPlan();
    const customUrl = 'http://localhost:12345';
    const result = await ptLiveDeployTool.handler(
      { plan, bridgeUrl: customUrl, dryRun: true },
      {} as any
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.metadata?.extras?.bridgeUrl).toBe(customUrl);
    }
  });

  test('tracks deployment duration', async () => {
    const plan = createTestPlan();
    const result = await ptLiveDeployTool.handler(
      { plan, dryRun: true },
      {} as any
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect((result as any).data.summary.duration).toBeGreaterThanOrEqual(0);
      expect((result as any).data.summary.startedAt).toBeLessThanOrEqual((result as any).data.summary.completedAt);
    }
  });

  test('returns metadata with item count', async () => {
    const plan = createTestPlan();
    const result = await ptLiveDeployTool.handler(
      { plan, dryRun: true },
      {} as any
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.metadata?.itemCount).toBe(3);
    }
  });

  test('processes devices in order', async () => {
    const plan = createTestPlan();
    const result = await ptLiveDeployTool.handler(
      { plan, dryRun: true },
      {} as any
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect((result as any).data.deployed[0].deviceName).toBe('Router1');
      expect((result as any).data.deployed[1].deviceName).toBe('Switch1');
      expect((result as any).data.deployed[2].deviceName).toBe('PC1');
    }
  });
});

describe('pt_live_deploy - non-dry-run mode', () => {
  test('returns BRIDGE_UNAVAILABLE when bridge is not running', async () => {
    const plan = createTestPlan();
    // Preparar un stub temporal de fetch para garantizar que la comprobación de
    // disponibilidad del bridge falle sin afectar otros tests.
    const originalFetch = (globalThis as any).fetch;
    (globalThis as any).fetch = async (input: any, init?: any) => {
      const url = typeof input === 'string' ? input : input?.url;
      if (typeof url === 'string' && url.startsWith('http://localhost:59999')) {
        // Responder con un status no-ok para simular bridge no disponible
        return { ok: false, status: 504, statusText: 'Gateway Timeout', json: async () => ({}) } as any;
      }
      return originalFetch(input, init);
    };

    const result = await ptLiveDeployTool.handler(
      { plan, bridgeUrl: 'http://localhost:59999', dryRun: false },
      {} as any
    );

    // Restaurar fetch original inmediatamente
    (globalThis as any).fetch = originalFetch;

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('BRIDGE_UNAVAILABLE');
      expect(result.error.suggestions).toBeDefined();
    }
  });
});
