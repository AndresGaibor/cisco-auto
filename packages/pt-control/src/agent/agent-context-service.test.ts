import { describe, expect, test } from 'bun:test';
import { AgentContextService } from './agent-context-service.js';
import { createSessionState } from './agent-session-state.js';
import { renderBaseContext } from './context-renderer.js';

function createTwin() {
  return {
    metadata: { updatedAt: 1_700_000_000_000 },
    devices: {
      R1: {
        name: 'R1',
        family: 'router',
        logicalPosition: { x: 10, y: 10, width: 20, height: 20, centerX: 20, centerY: 20 },
        ports: {
          Gi0_0: { name: 'Gi0/0', media: 'copper', connectedTo: { device: 'S1', port: 'Fa0/1' } },
          Gi0_1: { name: 'Gi0/1', media: 'copper' },
        },
        modules: [],
        config: undefined,
      },
      S1: {
        name: 'S1',
        family: 'switch-l2',
        logicalPosition: { x: 60, y: 20, width: 20, height: 20, centerX: 70, centerY: 30 },
        ports: {
          Fa0_1: { name: 'Fa0/1', media: 'copper', connectedTo: { device: 'R1', port: 'Gi0/0' } },
          Fa0_2: { name: 'Fa0/2', media: 'copper' },
        },
        modules: [],
        config: undefined,
      },
    },
    links: {},
    zones: {
      Z_USERS: {
        id: 'Z_USERS',
        kind: 'rectangle',
        label: 'Users',
        geometry: { x1: 0, y1: 0, x2: 100, y2: 100 },
        style: { fillColor: '#FF00FF' },
        semantics: { vlanId: 20, role: 'users', tags: [] },
        membershipRule: { mode: 'center-inside' },
      },
    },
  } as any;
}

describe('AgentContextService', () => {
  test('buildTaskContext exposes task scope and merged focus devices', async () => {
    const service = new AgentContextService();
    const twin = createTwin();
    const session = createSessionState({ selectedDevice: 'R1', focusDevices: ['S1'] });

    const context = await service.buildTaskContext(
      twin,
      session,
      'connect R1 to S1',
      ['S1', 'R1'],
      ['Z_USERS'],
    );

    expect(context.selection?.selectedDevice).toBe('R1');
    expect(context.selection?.focusDevices).toEqual(['S1', 'R1']);
    expect(context.task?.goal).toBe('connect R1 to S1');
    expect(context.task?.affectedDevices).toEqual(['S1', 'R1']);
    expect(context.task?.affectedZones).toEqual(['Z_USERS']);
    expect(context.task?.candidatePorts?.map((candidate) => candidate.port)).toEqual([
      'Gi0/1',
      'Fa0/2',
    ]);
    expect(context.task?.risks?.some((risk) => risk.includes('connect'))).toBe(true);

    const rendered = renderBaseContext(context);
    expect(rendered).toContain('Tarea actual');
    expect(rendered).toContain('connect R1 to S1');
    expect(rendered).toContain('Puertos candidatos');
    expect(rendered).toContain('Riesgos');
    expect(rendered).toContain('S1');
  });

  test('buildDeviceContext includes zone membership for spatial context', async () => {
    const service = new AgentContextService();
    const twin = createTwin();
    const session = createSessionState();

    const context = await service.buildDeviceContext(twin, session, 'R1');

    expect(context).not.toBeNull();
    expect(context?.spatial.zones).toHaveLength(1);
    expect(context?.spatial.zones[0]?.zoneId).toBe('Z_USERS');
    expect(context?.spatial.zones[0]?.relation).toBe('inside');
  });
});
