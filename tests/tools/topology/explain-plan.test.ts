import { describe, test, expect } from 'bun:test';
import { ptExplainPlanTool } from '../../../src/tools/topology/explain-plan.ts';
import type { TopologyPlan } from '../../../src/core/types/tool.ts';

function createTestPlan(): TopologyPlan {
  return {
    id: 'test-plan-explain',
    name: 'Test LAN Plan',
    description: 'Una topología de prueba',
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
        ],
        routing: {
          protocol: 'ospf',
          ospf: {
            processId: 1,
            routerId: '1.1.1.1',
            areas: [{ area: 0, networks: ['192.168.1.0/24'] }],
            defaultRoute: false
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
          { name: 'FastEthernet0/1', configured: false },
          { name: 'FastEthernet0/2', configured: false }
        ],
        vlans: [
          { id: 10, name: 'DATA' },
          { id: 20, name: 'VOICE' }
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
      },
      {
        id: 'SRV1',
        name: 'Server1',
        model: {
          name: 'Server-PT',
          type: 'server',
          ptType: 'Server-PT',
          ports: [{ name: 'FastEthernet0', type: 'fastethernet', available: true }]
        },
        position: { x: 400, y: 300 },
        interfaces: [
          { name: 'FastEthernet0', ip: '192.168.1.100', subnetMask: '255.255.255.0', configured: true }
        ],
        dhcp: [
          {
            poolName: 'DHCP-POOL',
            network: '192.168.1.0',
            subnetMask: '255.255.255.0',
            defaultRouter: '192.168.1.1',
            dnsServer: '192.168.1.100'
          }
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
      },
      {
        id: 'link-2',
        from: { deviceId: 'S1', deviceName: 'Switch1', port: 'FastEthernet0/2' },
        to: { deviceId: 'PC1', deviceName: 'PC1', port: 'FastEthernet0' },
        cableType: 'straight-through',
        validated: true
      }
    ],
    params: {
      routerCount: 1,
      switchCount: 1,
      pcCount: 1,
      serverCount: 1,
      networkType: 'single_lan',
      routingProtocol: 'ospf',
      dhcpEnabled: true,
      baseNetwork: '192.168.1.0',
      subnetMask: '255.255.255.0'
    }
  };
}

describe('pt_explain_plan', () => {
  test('genera explicación en español por defecto', async () => {
    const plan = createTestPlan();
    const result = await ptExplainPlanTool.handler({ plan }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.explanation).toContain('Test LAN Plan');
      expect(result.data.sections).toHaveLength(6);
      expect(result.data.sections[0].title).toBe('Resumen');
      expect(result.data.sections[1].title).toBe('Dispositivos');
      expect(result.data.sections[2].title).toBe('Conexiones');
      expect(result.data.sections[3].title).toBe('Esquema IP');
      expect(result.data.sections[4].title).toBe('Enrutamiento');
      expect(result.data.sections[5].title).toBe('Recomendaciones');
    }
  });

  test('genera explicación en inglés', async () => {
    const plan = createTestPlan();
    const result = await ptExplainPlanTool.handler({ plan, language: 'en' }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.explanation).toContain('Test LAN Plan');
      expect(result.data.sections[0].title).toBe('Overview');
      expect(result.data.sections[1].title).toBe('Devices');
      expect(result.data.sections[2].title).toBe('Connections');
      expect(result.data.sections[3].title).toBe('IP Scheme');
      expect(result.data.sections[4].title).toBe('Routing');
      expect(result.data.sections[5].title).toBe('Recommendations');
    }
  });

  test('incluye información de OSPF en la explicación', async () => {
    const plan = createTestPlan();
    const result = await ptExplainPlanTool.handler({ plan }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      const routingSection = result.data.sections.find(s => s.title === 'Enrutamiento');
      expect(routingSection?.content).toContain('OSPF');
      expect(routingSection?.content).toContain('Router1');
    }
  });

  test('incluye información de VLANs', async () => {
    const plan = createTestPlan();
    const result = await ptExplainPlanTool.handler({ plan }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      const devicesSection = result.data.sections.find(s => s.title === 'Dispositivos');
      expect(devicesSection?.content).toContain('Switch1');
      expect(devicesSection?.content).toContain('VLANs');
    }
  });

  test('incluye información de DHCP', async () => {
    const plan = createTestPlan();
    const result = await ptExplainPlanTool.handler({ plan }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      const devicesSection = result.data.sections.find(s => s.title === 'Dispositivos');
      expect(devicesSection?.content).toContain('DHCP');
    }
  });

  test('lista todas las conexiones', async () => {
    const plan = createTestPlan();
    const result = await ptExplainPlanTool.handler({ plan }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      const connectionsSection = result.data.sections.find(s => s.title === 'Conexiones');
      expect(connectionsSection?.content).toContain('Router1');
      expect(connectionsSection?.content).toContain('Switch1');
      expect(connectionsSection).toBeDefined();
    }
  });

  test('lista todas las IPs configuradas', async () => {
    const plan = createTestPlan();
    const result = await ptExplainPlanTool.handler({ plan }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      const ipSection = result.data.sections.find(s => s.title === 'Esquema IP');
      expect(ipSection?.content).toContain('192.168.1.1');
      expect(ipSection?.content).toContain('192.168.1.10');
      expect(ipSection?.content).toContain('192.168.1.100');
    }
  });

  test('retorna error si no se proporciona plan', async () => {
    const result = await ptExplainPlanTool.handler({}, {} as any);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('INVALID_INPUT');
    }
  });

  test('retorna error si el plan no tiene devices', async () => {
    const result = await ptExplainPlanTool.handler({ plan: { links: [] } }, {} as any);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('INVALID_STRUCTURE');
    }
  });

  test('retorna error si el plan no tiene links', async () => {
    const result = await ptExplainPlanTool.handler({ plan: { devices: [] } }, {} as any);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('INVALID_STRUCTURE');
    }
  });

  test('maneja plan sin IPs configuradas', async () => {
    const plan = createTestPlan();
    plan.devices.forEach(d => {
      d.interfaces.forEach(i => {
        i.ip = undefined;
        i.configured = false;
      });
    });

    const result = await ptExplainPlanTool.handler({ plan }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      const ipSection = result.data.sections.find(s => s.title === 'Esquema IP');
      expect(ipSection?.content).toContain('No hay direcciones IP');
    }
  });

  test('genera recomendaciones cuando faltan VLANs', async () => {
    const plan = createTestPlan();
    // Quitar VLANs del switch
    const switchDevice = plan.devices.find(d => d.id === 'S1');
    if (switchDevice) {
      switchDevice.vlans = undefined;
    }

    const result = await ptExplainPlanTool.handler({ plan }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      const recSection = result.data.sections.find(s => s.title === 'Recomendaciones');
      expect(recSection?.content).toContain('VLANs');
    }
  });

  test('incluye metadatos en el resultado', async () => {
    const plan = createTestPlan();
    const result = await ptExplainPlanTool.handler({ plan }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.itemCount).toBe(6); // 4 devices + 2 links
    }
  });
});
