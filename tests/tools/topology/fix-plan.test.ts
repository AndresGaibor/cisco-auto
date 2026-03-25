import { describe, test, expect } from 'bun:test';
import { ptFixPlanTool } from '../../../src/tools/topology/fix-plan.ts';
import type { TopologyPlan, FixSuggestion, ValidationError } from '../../../src/core/types/tool.ts';

interface FixPlanResult {
  plan: TopologyPlan;
  appliedFixes: FixSuggestion[];
  remainingErrors: ValidationError[];
}

function createValidPlan(): TopologyPlan {
  return {
    id: 'test-plan-1',
    name: 'Test Plan',
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
          { name: 'GigabitEthernet0/1', configured: false }
        ]
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
        position: { x: 200, y: 100 },
        interfaces: [
          { name: 'FastEthernet0/1', configured: false },
          { name: 'FastEthernet0/2', configured: false }
        ]
      }
    ],
    links: [
      {
        id: 'link-1',
        from: { deviceId: 'R1', deviceName: 'Router1', port: 'GigabitEthernet0/0' },
        to: { deviceId: 'S1', deviceName: 'Switch1', port: 'FastEthernet0/1' },
        cableType: 'straight-through',
        validated: false
      }
    ],
    params: {
      routerCount: 1,
      switchCount: 1,
      pcCount: 0,
      networkType: 'single_lan'
    }
  };
}

function createPlanWithDuplicateIps(): TopologyPlan {
  const plan = createValidPlan();
  plan.devices.push({
    id: 'PC1',
    name: 'PC1',
    model: {
      name: 'PC-PT',
      type: 'pc',
      ptType: 'PC-PT',
      ports: [{ name: 'FastEthernet0', type: 'fastethernet', available: true }]
    },
    position: { x: 300, y: 200 },
    interfaces: [
      { name: 'FastEthernet0', ip: '192.168.1.1', subnetMask: '255.255.255.0', configured: true }
    ]
  });
  return plan;
}

function createPlanWithWrongCableType(): TopologyPlan {
  const plan = createValidPlan();
  plan.links.push({
    id: 'link-2',
    from: { deviceId: 'R1', deviceName: 'Router1', port: 'GigabitEthernet0/1' },
    to: { deviceId: 'S1', deviceName: 'Switch1', port: 'FastEthernet0/2' },
    cableType: 'crossover',
    validated: false
  });
  return plan;
}

function createPlanWithRouterWithoutIp(): TopologyPlan {
  const plan = createValidPlan();
  plan.devices.push({
    id: 'R2',
    name: 'Router2',
    model: {
      name: '2911',
      type: 'router',
      ptType: 'Router-PT',
      ports: [
        { name: 'GigabitEthernet0/0', type: 'gigabitethernet', available: true }
      ]
    },
    position: { x: 400, y: 100 },
    interfaces: [
      { name: 'GigabitEthernet0/0', configured: false }
    ]
  });
  return plan;
}

function createPlanWithSwitchWithoutVlan(): TopologyPlan {
  const plan = createValidPlan();
  plan.devices.push({
    id: 'S2',
    name: 'Switch2',
    model: {
      name: '2960-24TT',
      type: 'switch',
      ptType: 'Switch-PT',
      ports: [
        { name: 'FastEthernet0/1', type: 'fastethernet', available: true }
      ]
    },
    position: { x: 300, y: 200 },
    interfaces: [
      { name: 'FastEthernet0/1', configured: false }
    ],
    vlans: []
  });
  return plan;
}

function createPlanWithInvalidModel(): TopologyPlan {
  const plan = createValidPlan();
  plan.devices.push({
    id: 'R3',
    name: 'Router3',
    model: {
      name: 'MODELOX-999',
      type: 'router',
      ptType: 'Router-PT',
      ports: []
    },
    position: { x: 500, y: 100 },
    interfaces: []
  });
  return plan;
}

describe('pt_fix_plan', () => {
  test('retorna plan sin cambios cuando es válido', async () => {
    const plan = createValidPlan();
    plan.devices.find(d => d.id === 'S1')!.vlans = [{ id: 1, name: 'default' }];
    
    const result = await ptFixPlanTool.handler({ plan }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as FixPlanResult;
      expect(data.appliedFixes).toHaveLength(0);
      expect(data.remainingErrors).toHaveLength(0);
    }
  });

  test('corrige IPs duplicados', async () => {
    const plan = createPlanWithDuplicateIps();
    const result = await ptFixPlanTool.handler({ plan }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as FixPlanResult;
      expect(data.appliedFixes.length).toBeGreaterThan(0);
      const ipFix = data.appliedFixes.find((f: FixSuggestion) => f.action.type === 'replace_ip');
      expect(ipFix).toBeDefined();
      expect(ipFix?.description).toContain('IP duplicada');
    }
  });

  test('corrige tipo de cable incorrecto (crossover entre router y switch)', async () => {
    const plan = createPlanWithWrongCableType();
    const result = await ptFixPlanTool.handler({ plan }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as FixPlanResult;
      const cableFix = data.appliedFixes.find((f: FixSuggestion) => f.action.type === 'change_cable');
      expect(cableFix).toBeDefined();
      expect(cableFix?.action.to).toEqual({ cableType: 'straight-through', linkId: 'link-2' });
    }
  });

  test('asigna IP a router sin IP configurada', async () => {
    const plan = createPlanWithRouterWithoutIp();
    const result = await ptFixPlanTool.handler({ plan }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as FixPlanResult;
      const ipFix = data.appliedFixes.find((f: FixSuggestion) => f.action.type === 'replace_ip');
      expect(ipFix).toBeDefined();
      expect(ipFix?.description).toContain('Router2');
      expect(ipFix?.description).toContain('no tiene IP configurada');
    }
  });

  test('agrega VLAN 1 por defecto a switch sin VLANs', async () => {
    const plan = createPlanWithSwitchWithoutVlan();
    const result = await ptFixPlanTool.handler({ plan }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as FixPlanResult;
      const vlanFix = data.appliedFixes.find((f: FixSuggestion) => f.action.type === 'use_alternative_port');
      expect(vlanFix).toBeDefined();
      expect(vlanFix?.description).toContain('VLAN 1');
      
      const switchDevice = data.plan.devices.find((d) => d.id === 'S2');
      expect(switchDevice?.vlans).toEqual([{ id: 1, name: 'default' }]);
    }
  });

  test('reporta errores residuales para modelos inválidos', async () => {
    const plan = createPlanWithInvalidModel();
    const result = await ptFixPlanTool.handler({ plan }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as FixPlanResult;
      expect(data.appliedFixes).toHaveLength(0);
      expect(data.remainingErrors.length).toBeGreaterThan(0);
      expect(data.remainingErrors.some((e: ValidationError) => e.type === 'invalid_model')).toBe(true);
    }
  });

  test('retorna error si no se proporciona plan', async () => {
    const result = await ptFixPlanTool.handler({}, {} as any);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('INVALID_INPUT');
    }
  });

  test('retorna error si el plan no tiene devices', async () => {
    const result = await ptFixPlanTool.handler({ plan: { links: [] } }, {} as any);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('INVALID_STRUCTURE');
    }
  });

  test('retorna error si el plan no tiene links', async () => {
    const result = await ptFixPlanTool.handler({ plan: { devices: [] } }, {} as any);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('INVALID_STRUCTURE');
    }
  });

  test('NO modifica credenciales existentes', async () => {
    const plan = createValidPlan();
    const router = plan.devices.find(d => d.id === 'R1');
    if (router) {
      router.credentials = { username: 'admin', password: 'secret' };
    }
    
    const result = await ptFixPlanTool.handler({ plan }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as FixPlanResult;
      const modifiedDevice = data.plan.devices.find((d) => d.id === 'R1');
      expect(modifiedDevice?.credentials?.username).toBe('admin');
      expect(modifiedDevice?.credentials?.password).toBe('secret');
    }
  });

  test('corrige múltiples errores en una sola ejecución', async () => {
    const plan = createPlanWithDuplicateIps();
    plan.devices.push({
      id: 'R2',
      name: 'Router2',
      model: {
        name: '2911',
        type: 'router',
        ptType: 'Router-PT',
        ports: [{ name: 'GigabitEthernet0/0', type: 'gigabitethernet', available: true }]
      },
      position: { x: 400, y: 100 },
      interfaces: [{ name: 'GigabitEthernet0/0', configured: false }]
    });

    const result = await ptFixPlanTool.handler({ plan }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as FixPlanResult;
      expect(data.appliedFixes.length).toBeGreaterThanOrEqual(2);
    }
  });
});
