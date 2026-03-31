import { describe, expect, it } from 'bun:test';
import { resolveDeviceNames } from '../device-name-resolver';
import type { TopologyPlan } from '../../..';

describe('device-name-resolver', () => {
  it('should map Router1 -> Router1(1) and update links', () => {
    const plan: TopologyPlan = {
      id: 'p1',
      name: 'plan1',
      devices: [
        { id: 'R1', name: 'Router1', model: { name: 'r', type: 'router', ptType: 'r', ports: [] }, position: { x:0,y:0 }, interfaces: [] },
      ],
      links: [
        { id: 'l1', from: { deviceId: 'R1', deviceName: 'Router1', port: 'G0/0' }, to: { deviceId: 'S1', deviceName: 'Switch1', port: 'G0/1' }, cableType: 'straight-through', validated: true }
      ],
      params: { routerCount:1, switchCount:1, pcCount:0, networkType: 'single_lan' },
      validation: { valid: true, errors: [], warnings: [] },
      metadata: { createdAt: new Date() }
    } as unknown as TopologyPlan;

    const currentTopology = [
      { id: 'x1', name: 'Router1(1)', type: 'router', status: 'up' },
      { id: 'x2', name: 'Switch1', type: 'switch', status: 'up' }
    ];

    const result = resolveDeviceNames(plan, currentTopology as any);

    expect(result.nameMap['Router1']).toBe('Router1(1)');
    expect(result.plan.devices[0]!.name).toBe('Router1(1)');
    expect(result.plan.links[0]!.from!.deviceName).toBe('Router1(1)');
  });

  it('should leave names unchanged when no match', () => {
    const plan: TopologyPlan = {
      id: 'p2',
      name: 'plan2',
      devices: [ { id: 'PC1', name: 'PC1', model: { name: 'pc', type: 'pc', ptType:'pc', ports: [] }, position: { x:0,y:0 }, interfaces: [] } ],
      links: [],
      params: { routerCount:0, switchCount:0, pcCount:1, networkType: 'single_lan' },
      validation: { valid: true, errors: [], warnings: [] },
      metadata: { createdAt: new Date() }
    } as unknown as TopologyPlan;

    const currentTopology: any[] = [ { id: 'a', name: 'OtherPC', type: 'pc', status: 'up' } ];

    const res = resolveDeviceNames(plan, currentTopology as any);
    expect(res.nameMap['PC1']).toBeUndefined();
    expect(res.plan.devices[0]!.name).toBe('PC1');
  });
});
