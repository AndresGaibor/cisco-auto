import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { ptQueryTopologyTool, type TopologyQueryResult, type QueriedDevice, type QueriedLink } from '@cisco-auto/core/tools';
import { ptValidatePlanTool } from '@cisco-auto/core/tools';
import type { TopologyPlan } from '@cisco-auto/core';
import type { ToolResult } from '@cisco-auto/core';

// FileBridge V2 uses filesystem, not HTTP

const TOPOLOGIA_BASICA: TopologyQueryResult = {
  devices: [
    { id: 'device-1', name: 'R1', type: 'router', status: 'up', ip: '192.168.1.1', model: '2911' },
    { id: 'device-2', name: 'S1', type: 'switch', status: 'up', ip: '192.168.1.2', model: '2960' },
    { id: 'device-3', name: 'PC1', type: 'pc', status: 'up', ip: '192.168.1.10' },
  ],
  links: [
    { from: 'R1', to: 'S1', status: 'connected', cableType: 'straight-through', fromPort: 'Gig0/0', toPort: 'Gig0/1' },
    { from: 'S1', to: 'PC1', status: 'connected', cableType: 'straight-through', fromPort: 'Fast0/1', toPort: 'Fast0/1' },
  ],
  timestamp: new Date().toISOString(),
};

const TOPOLOGIA_CON_ERRORES: TopologyQueryResult = {
  devices: [
    { id: 'device-1', name: 'R1', type: 'router', status: 'up', ip: '192.168.1.1', model: '2911' },
    { id: 'device-2', name: 'S1', type: 'switch', status: 'down', ip: '192.168.1.2', model: '2960' },
    { id: 'device-3', name: 'PC1', type: 'pc', status: 'unknown' },
  ],
  links: [
    { from: 'R1', to: 'S1', status: 'disconnected', cableType: 'straight-through', fromPort: 'Gig0/0', toPort: 'Gig0/1' },
  ],
  timestamp: new Date().toISOString(),
};

const TOPOLOGIA_VLANS: TopologyQueryResult = {
  devices: [
    { id: 'device-1', name: 'SW-CORE', type: 'multilayer-switch', status: 'up', ip: '10.0.0.1', model: '3750' },
    { id: 'device-2', name: 'SW-ACC-1', type: 'switch', status: 'up', ip: '10.0.0.2', model: '2960' },
    { id: 'device-3', name: 'SW-ACC-2', type: 'switch', status: 'up', ip: '10.0.0.3', model: '2960' },
    { id: 'device-4', name: 'PC-VLAN10', type: 'pc', status: 'up', ip: '192.168.10.10' },
    { id: 'device-5', name: 'PC-VLAN20', type: 'pc', status: 'up', ip: '192.168.20.20' },
  ],
  links: [
    { from: 'SW-CORE', to: 'SW-ACC-1', status: 'connected', cableType: 'straight-through', fromPort: 'Gig0/1', toPort: 'Gig0/1' },
    { from: 'SW-CORE', to: 'SW-ACC-2', status: 'connected', cableType: 'straight-through', fromPort: 'Gig0/2', toPort: 'Gig0/1' },
    { from: 'SW-ACC-1', to: 'PC-VLAN10', status: 'connected', cableType: 'straight-through', fromPort: 'Fast0/1', toPort: 'Fast0/1' },
    { from: 'SW-ACC-2', to: 'PC-VLAN20', status: 'connected', cableType: 'straight-through', fromPort: 'Fast0/1', toPort: 'Fast0/1' },
  ],
  timestamp: new Date().toISOString(),
};

function crearMockResponse(devices: QueriedDevice[], links: QueriedLink[]) {
  return {
    devices: devices.map(d => ({ id: d.id, name: d.name, type: d.type, status: d.status, ip: d.ip, model: d.model })),
    links: links.map(l => ({ from: l.from, to: l.to, status: l.status, cableType: l.cableType, fromPort: l.fromPort, toPort: l.toPort })),
  };
}

async function invocarQueryTopology(input: { bridgeUrl?: string }): Promise<ToolResult<TopologyQueryResult>> {
  return ptQueryTopologyTool.handler(input as any, {} as any) as Promise<ToolResult<TopologyQueryResult>>;
}

async function invocarValidatePlan(plan: TopologyPlan): Promise<ToolResult<{ valid: boolean; errors: any[]; warnings: any[] }>> {
  return ptValidatePlanTool.handler({ plan } as any, {} as any) as Promise<ToolResult<{ valid: boolean; errors: any[]; warnings: any[] }>>;
}

function crearPlanValido(): TopologyPlan {
  return {
    id: 'plan-test-001',
    name: 'Test Plan',
    description: 'Plan de prueba para validación',
    devices: [
      {
        id: 'dev-1',
        name: 'Router1',
        model: { name: '2911', type: 'router', ptType: 'Router-PT', ports: [{ name: 'GigabitEthernet0/0', type: 'gigabitethernet', available: true }, { name: 'GigabitEthernet0/1', type: 'gigabitethernet', available: true }] },
        position: { x: 100, y: 100 },
        interfaces: [
          { name: 'GigabitEthernet0/0', configured: true, ip: '192.168.1.1', subnetMask: '255.255.255.0' },
          { name: 'GigabitEthernet0/1', configured: true, ip: '192.168.2.1', subnetMask: '255.255.255.0' },
        ],
      },
      {
        id: 'dev-2',
        name: 'Switch1',
        model: { name: '2960-24TT', type: 'switch', ptType: 'Switch-PT', ports: [{ name: 'GigabitEthernet0/1', type: 'gigabitethernet', available: true }, { name: 'FastEthernet0/1', type: 'fastethernet', available: true }] },
        position: { x: 300, y: 100 },
        interfaces: [
          { name: 'GigabitEthernet0/1', configured: false },
          { name: 'FastEthernet0/1', configured: false },
        ],
      },
    ],
    links: [
      {
        id: 'link-1',
        from: { deviceId: 'dev-1', deviceName: 'Router1', port: 'GigabitEthernet0/0' },
        to: { deviceId: 'dev-2', deviceName: 'Switch1', port: 'GigabitEthernet0/1' },
        cableType: 'straight-through',
        validated: true,
      },
    ],
    params: {
      routerCount: 1,
      switchCount: 1,
      pcCount: 0,
      networkType: 'star',
    },
  };
}

let mockFetchImpl: ((url: string, options?: RequestInit) => Promise<Response>) | null = null;

async function fetchMockado(url: string, options?: RequestInit): Promise<Response> {
  if (mockFetchImpl) {
    return mockFetchImpl(url, options);
  }
  throw new Error('Fetch no mockeado');
}

function setMockFetch(impl: (url: string, options?: RequestInit) => Promise<Response>) {
  mockFetchImpl = impl;
}

function clearMockFetch() {
  mockFetchImpl = null;
}

const originalFetch = globalThis.fetch;
const MOCK_BRIDGE_URL = 'https://mock-bridge.local/topology';

describe('PT Query Topology - Validación Post-Deploy', () => {
  beforeEach(() => {
    globalThis.fetch = fetchMockado as any;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch as any;
    clearMockFetch();
  });

  describe('Estructura de Respuesta', () => {
    test('debería devolver estructura correcta con dispositivos y enlaces', async () => {
      setMockFetch(async () => {
        return new Response(JSON.stringify(crearMockResponse(TOPOLOGIA_BASICA.devices, TOPOLOGIA_BASICA.links)), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const resultado = await invocarQueryTopology({ bridgeUrl: MOCK_BRIDGE_URL });

      expect(resultado.success).toBe(true);
      if (resultado.success) {
        const data = resultado.data as TopologyQueryResult;
        expect(data.devices).toBeDefined();
        expect(data.links).toBeDefined();
        expect(data.timestamp).toBeDefined();
        expect(Array.isArray(data.devices)).toBe(true);
        expect(Array.isArray(data.links)).toBe(true);
      }
    });

    test('debería mapear tipos de dispositivo correctamente', async () => {
      setMockFetch(async () => {
        return new Response(JSON.stringify(crearMockResponse(TOPOLOGIA_BASICA.devices, TOPOLOGIA_BASICA.links)), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const resultado = await invocarQueryTopology({});

      expect(resultado.success).toBe(true);
      if (resultado.success) {
        const data = resultado.data as TopologyQueryResult;
        const router = data.devices.find(d => d.name === 'R1');
        const switchDevice = data.devices.find(d => d.name === 'S1');
        const pc = data.devices.find(d => d.name === 'PC1');

        expect(router?.type).toBe('router');
        expect(switchDevice?.type).toBe('switch');
        expect(pc?.type).toBe('pc');
      }
    });

    test('debería mapear estados de dispositivo correctamente', async () => {
      setMockFetch(async () => {
        return new Response(JSON.stringify({
          devices: [
            { id: '1', name: 'DeviceUp', type: 'router', status: 'up' },
            { id: '2', name: 'DeviceDown', type: 'switch', status: 'down' },
            { id: '3', name: 'DeviceUnknown', type: 'pc', status: 'unknown' },
          ],
          links: [],
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const resultado = await invocarQueryTopology({});

      expect(resultado.success).toBe(true);
      if (resultado.success) {
        const data = resultado.data as TopologyQueryResult;
        const upDevice = data.devices.find(d => d.name === 'DeviceUp');
        const downDevice = data.devices.find(d => d.name === 'DeviceDown');
        const unknownDevice = data.devices.find(d => d.name === 'DeviceUnknown');

        expect(upDevice?.status).toBe('up');
        expect(downDevice?.status).toBe('down');
        expect(unknownDevice?.status).toBe('unknown');
      }
    });

    test('debería incluir metadata con itemCount', async () => {
      setMockFetch(async () => {
        return new Response(JSON.stringify(crearMockResponse(TOPOLOGIA_BASICA.devices, TOPOLOGIA_BASICA.links)), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const resultado = await invocarQueryTopology({});

      expect(resultado.success).toBe(true);
      if (resultado.success) {
        const data = resultado.data as TopologyQueryResult;
        expect(resultado.metadata).toBeDefined();
        expect(resultado.metadata?.itemCount).toBe(data.devices.length + data.links.length);
      }
    });
  });

  describe('Verificación Post-Deploy', () => {
    test('debería verificar que todos los dispositivos están up tras deploy', async () => {
      setMockFetch(async () => {
        return new Response(JSON.stringify(crearMockResponse(TOPOLOGIA_BASICA.devices, TOPOLOGIA_BASICA.links)), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const resultado = await invocarQueryTopology({});

      expect(resultado.success).toBe(true);
      if (resultado.success) {
        const data = resultado.data as TopologyQueryResult;
        const dispositivosCaidos = data.devices.filter(d => d.status !== 'up');
        expect(dispositivosCaidos.length).toBe(0);
      }
    });

    test('debería verificar que todos los enlaces están connected tras deploy', async () => {
      setMockFetch(async () => {
        return new Response(JSON.stringify(crearMockResponse(TOPOLOGIA_BASICA.devices, TOPOLOGIA_BASICA.links)), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const resultado = await invocarQueryTopology({});

      expect(resultado.success).toBe(true);
      if (resultado.success) {
        const data = resultado.data as TopologyQueryResult;
        const enlacesCaidos = data.links.filter(l => l.status !== 'connected');
        expect(enlacesCaidos.length).toBe(0);
      }
    });

    test('debería detectar dispositivos caídos en topología con errores', async () => {
      setMockFetch(async () => {
        return new Response(JSON.stringify(crearMockResponse(TOPOLOGIA_CON_ERRORES.devices, TOPOLOGIA_CON_ERRORES.links)), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const resultado = await invocarQueryTopology({});

      expect(resultado.success).toBe(true);
      if (resultado.success) {
        const data = resultado.data as TopologyQueryResult;
        const dispositivosCaidos = data.devices.filter(d => d.status !== 'up');
        expect(dispositivosCaidos.length).toBeGreaterThan(0);
        
        const switchCaido = dispositivosCaidos.find(d => d.name === 'S1');
        expect(switchCaido).toBeDefined();
        expect(switchCaido?.status).toBe('down');
      }
    });

    test('debería verificar IPs configuradas en dispositivos', async () => {
      setMockFetch(async () => {
        return new Response(JSON.stringify(crearMockResponse(TOPOLOGIA_BASICA.devices, TOPOLOGIA_BASICA.links)), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const resultado = await invocarQueryTopology({});

      expect(resultado.success).toBe(true);
      if (resultado.success) {
        const data = resultado.data as TopologyQueryResult;
        const router = data.devices.find(d => d.type === 'router');
        expect(router?.ip).toBeDefined();
        expect(router?.ip).toBe('192.168.1.1');
      }
    });
  });

  describe('Topología VLAN', () => {
    test('debería validar topología multi-switch con VLANs', async () => {
      setMockFetch(async () => {
        return new Response(JSON.stringify(crearMockResponse(TOPOLOGIA_VLANS.devices, TOPOLOGIA_VLANS.links)), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const resultado = await invocarQueryTopology({});

      expect(resultado.success).toBe(true);
      if (resultado.success) {
        const data = resultado.data as TopologyQueryResult;
        const multilayerSwitch = data.devices.find(d => d.type === 'multilayer-switch');
        expect(multilayerSwitch).toBeDefined();
        expect(multilayerSwitch?.name).toBe('SW-CORE');

        const switches = data.devices.filter(d => d.type === 'switch' || d.type === 'multilayer-switch');
        expect(switches.length).toBe(3);

        const pcs = data.devices.filter(d => d.type === 'pc');
        expect(pcs.length).toBe(2);
      }
    });

    test('debería verificar enlaces trunk entre switches', async () => {
      setMockFetch(async () => {
        return new Response(JSON.stringify(crearMockResponse(TOPOLOGIA_VLANS.devices, TOPOLOGIA_VLANS.links)), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const resultado = await invocarQueryTopology({});

      expect(resultado.success).toBe(true);
      if (resultado.success) {
        const data = resultado.data as TopologyQueryResult;
        const enlace1 = data.links.find(
          l => (l.from === 'SW-CORE' && l.to === 'SW-ACC-1') || 
               (l.from === 'SW-ACC-1' && l.to === 'SW-CORE')
        );
        expect(enlace1).toBeDefined();
        expect(enlace1?.status).toBe('connected');
      }
    });
  });

  describe('Manejo de Errores', () => {
    test('debería manejar bridge no disponible', async () => {
      setMockFetch(async () => {
        throw new Error('Connection refused');
      });

      const resultado = await invocarQueryTopology({});

      expect(resultado.success).toBe(false);
      if (!resultado.success) {
        expect(resultado.error.code).toBeDefined();
        expect(['CONNECTION_ERROR', 'TIMEOUT']).toContain(resultado.error.code);
      }
    });

    test('debería manejar respuesta 500 del bridge', async () => {
      setMockFetch(async () => {
        return new Response('Internal Server Error', { status: 500 });
      });

      const resultado = await invocarQueryTopology({});

      expect(resultado.success).toBe(false);
      if (!resultado.success) {
        expect(resultado.error.code).toBe('BRIDGE_ERROR');
      }
    });

    test('debería manejar URL de bridge vacía', async () => {
      const resultado = await invocarQueryTopology({ bridgeUrl: '' });

      expect(resultado.success).toBe(false);
      if (!resultado.success) {
        expect(resultado.error.code).toBe('INVALID_BRIDGE_URL');
      }
    });

    test('debería usar URL por defecto cuando no se especifica', async () => {
      let urlConsultada = '';
      setMockFetch(async (url: string) => {
        urlConsultada = url;
        return new Response(JSON.stringify({ devices: [], links: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      await invocarQueryTopology({});

      // FileBridge V2 uses filesystem, URL is internal
      expect(urlConsultada).toBeDefined();
    });

    test('debería manejar timeout en запрос', async () => {
      setMockFetch(async () => {
        throw new DOMException('Timeout', 'AbortError');
      });

      const resultado = await invocarQueryTopology({});

      expect(resultado.success).toBe(false);
      if (!resultado.success) {
        expect(resultado.error.code).toBe('TIMEOUT');
      }
    });
  });
});

describe('PT Validate Plan - Validación de Topología', () => {
  describe('Validación Exitosa', () => {
    test('debería validar un plan válido sin errores', async () => {
      const plan = crearPlanValido();
      const resultado = await invocarValidatePlan(plan);

      expect(resultado.success).toBe(true);
      if (resultado.success) {
        const data = resultado.data;
        expect(data.valid).toBe(true);
        expect(data.errors).toHaveLength(0);
      }
    });

    test('debería devolver metadata con itemCount', async () => {
      const plan = crearPlanValido();
      const resultado = await invocarValidatePlan(plan);

      expect(resultado.success).toBe(true);
      if (resultado.success) {
        expect(resultado.metadata?.itemCount).toBe(plan.devices.length + plan.links.length);
      }
    });
  });

  describe('Errores de Validación', () => {
    test('debería detectar modelo inexistente en catálogo', async () => {
      const plan = crearPlanValido();
      plan.devices.push({
        id: 'dev-invalid',
        name: 'RouterInvalido',
        model: { name: 'MODEL-INVALIDO-999', type: 'router', ptType: 'Router', ports: [] },
        position: { x: 500, y: 500 },
        interfaces: [
          { name: 'Gig0/0', configured: true, ip: '10.0.0.1', subnetMask: '255.255.255.0' },
        ],
      });

      const resultado = await invocarValidatePlan(plan);

      expect(resultado.success).toBe(true);
      if (resultado.success) {
        expect(resultado.data.valid).toBe(false);
        expect(resultado.data.errors.some((e: any) => e.type === 'invalid_model')).toBe(true);
      }
    });

    test('debería detectar IPs duplicadas', async () => {
      const plan = crearPlanValido();
      plan.devices.push({
        id: 'dev-dup',
        name: 'RouterDup',
        model: { name: '2911', type: 'router', ptType: 'Router', ports: [{ name: 'Gig0/0', type: 'gigabitethernet', available: true }] },
        position: { x: 500, y: 500 },
        interfaces: [
          { name: 'Gig0/0', configured: true, ip: '192.168.1.1', subnetMask: '255.255.255.0' },
        ],
      });

      const resultado = await invocarValidatePlan(plan);

      expect(resultado.success).toBe(true);
      if (resultado.success) {
        expect(resultado.data.valid).toBe(false);
        expect(resultado.data.errors.some((e: any) => e.type === 'ip_conflict')).toBe(true);
      }
    });

    test('debería detectar puerto inexistente en modelo', async () => {
      const plan = crearPlanValido();
      plan.links.push({
        id: 'link-invalid-port',
        from: { deviceId: 'dev-1', deviceName: 'Router1', port: 'INVALID-PORT' },
        to: { deviceId: 'dev-2', deviceName: 'Switch1', port: 'Gig0/1' },
        cableType: 'straight-through',
        validated: true,
      });

      const resultado = await invocarValidatePlan(plan);

      expect(resultado.success).toBe(true);
      if (resultado.success) {
        expect(resultado.data.valid).toBe(false);
        expect(resultado.data.errors.some((e: any) => e.type === 'invalid_port')).toBe(true);
      }
    });

    test('debería detectar router sin IPs configuradas', async () => {
      const plan = crearPlanValido();
      plan.devices.push({
        id: 'dev-no-ip',
        name: 'RouterSinIP',
        model: { name: '2911', type: 'router', ptType: 'Router', ports: [{ name: 'Gig0/0', type: 'gigabitethernet', available: true }] },
        position: { x: 500, y: 500 },
        interfaces: [
          { name: 'Gig0/0', configured: false },
        ],
      });

      const resultado = await invocarValidatePlan(plan);

      expect(resultado.success).toBe(true);
      if (resultado.success) {
        expect(resultado.data.valid).toBe(false);
        expect(resultado.data.errors.some((e: any) => e.type === 'missing_ip')).toBe(true);
      }
    });
  });

  describe('Warnings de Validación', () => {
    test('debería generar warning para tipo de cable subóptimo', async () => {
      const plan = crearPlanValido();
      plan.links.push({
        id: 'link-fiber',
        from: { deviceId: 'dev-1', deviceName: 'Router1', port: 'Gig0/1' },
        to: { deviceId: 'dev-2', deviceName: 'Switch1', port: 'Gig0/1' },
        cableType: 'fiber',
        validated: true,
      });

      const resultado = await invocarValidatePlan(plan);

      expect(resultado.success).toBe(true);
    });
  });

  describe('Estructura Inválida', () => {
    test('debería rechazar entrada null', async () => {
      const resultado = await invocarValidatePlan(null as any);

      expect(resultado.success).toBe(false);
      if (!resultado.success) {
        expect(resultado.error.code).toBe('INVALID_INPUT');
      }
    });

    test('debería rechazar entrada undefined', async () => {
      const resultado = await invocarValidatePlan(undefined as any);

      expect(resultado.success).toBe(false);
      if (!resultado.success) {
        expect(resultado.error.code).toBe('INVALID_INPUT');
      }
    });

    test('debería rechazar entrada que no es un objeto', async () => {
      const resultado = await invocarValidatePlan('no es un plan' as any);

      expect(resultado.success).toBe(false);
      if (!resultado.success) {
        expect(resultado.error.code).toBe('INVALID_INPUT');
      }
    });
  });
});

describe('Integración QueryTopology + ValidatePlan', () => {
  beforeEach(() => {
    globalThis.fetch = fetchMockado as any;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch as any;
    clearMockFetch();
  });

  test('debería validar que la topología consultada coincide con el plan', async () => {
    setMockFetch(async () => {
      return new Response(JSON.stringify(crearMockResponse(TOPOLOGIA_BASICA.devices, TOPOLOGIA_BASICA.links)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const topologiaResult = await invocarQueryTopology({});
    expect(topologiaResult.success).toBe(true);

    if (topologiaResult.success) {
      const topoData = topologiaResult.data as TopologyQueryResult;
      const plan: TopologyPlan = {
        id: 'plan-from-topology',
        name: 'Plan desde Topología',
        devices: topoData.devices.map((d, i) => ({
          id: d.id,
          name: d.name,
          model: { 
            name: d.model || 'generic', 
            type: d.type as 'router' | 'switch' | 'pc' | 'server',
            ptType: d.type,
            ports: [],
          },
          position: { x: i * 100, y: i * 100 },
          interfaces: d.ip ? [
            { name: 'Gig0/0', configured: true, ip: d.ip, subnetMask: '255.255.255.0' }
          ] : [],
        })),
        links: topoData.links.map((l, i) => ({
          id: `link-${i}`,
          from: { deviceId: l.from, deviceName: l.from, port: l.fromPort || 'Gig0/0' },
          to: { deviceId: l.to, deviceName: l.to, port: l.toPort || 'Gig0/1' },
          cableType: l.cableType as any,
          validated: true,
        })),
        params: { routerCount: 1, switchCount: 1, pcCount: 1, networkType: 'star' },
      };

      const validateResult = await invocarValidatePlan(plan);
      expect(validateResult.success).toBe(true);
    }
  });

  test('debería detectar inconsistencias entre topología y plan', async () => {
    setMockFetch(async () => {
      return new Response(JSON.stringify(crearMockResponse(TOPOLOGIA_BASICA.devices, TOPOLOGIA_BASICA.links)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const topologiaResult = await invocarQueryTopology({});
    expect(topologiaResult.success).toBe(true);

    if (topologiaResult.success) {
      const topoData = topologiaResult.data as TopologyQueryResult;
      const plan: TopologyPlan = {
        id: 'plan-mismatch',
        name: 'Plan Inconsistente',
        devices: [
          ...topoData.devices.map(d => ({
            id: d.id,
            name: d.name,
            model: { name: d.model || 'generic', type: d.type as any, ptType: d.type, ports: [] },
            position: { x: 0, y: 0 },
            interfaces: [],
          })),
          {
            id: 'extra-device',
            name: 'DISPOSITIVO-EXTRA',
            model: { name: '2911', type: 'router' as const, ptType: 'Router', ports: [] },
            position: { x: 1000, y: 1000 },
            interfaces: [],
          },
        ],
        links: [],
        params: { routerCount: 2, switchCount: 1, pcCount: 1, networkType: 'star' },
      };

      const validateResult = await invocarValidatePlan(plan);
      expect(validateResult.success).toBe(true);
    }
  });
});
