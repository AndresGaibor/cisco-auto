import { describe, test, expect } from 'bun:test';
import { ptGenerateConfigsTool } from '@cisco-auto/tools';
import type { TopologyPlan } from '@cisco-auto/core';

interface DeviceConfig {
  deviceType: string;
  iosConfig?: string;
  yamlConfig?: string;
  jsonConfig?: string;
}

interface GenerateConfigsData {
  configs: DeviceConfig[];
  summary: {
    totalDevices: number;
    routerCount: number;
    switchCount: number;
    pcCount: number;
    serverCount: number;
    totalLines?: number;
  };
}

function createTestPlan(): TopologyPlan {
  return {
    id: 'test-plan-configs',
    name: 'Test Config Plan',
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
          { name: 'FastEthernet0/1', vlan: 10, configured: false },
          { name: 'FastEthernet0/2', vlan: 20, configured: false }
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
      },
      {
        id: 'SERVER1',
        name: 'Server1',
        model: {
          name: 'Server-PT',
          type: 'server',
          ptType: 'Server-PT',
          ports: [{ name: 'FastEthernet0', type: 'fastethernet', available: true }]
        },
        position: { x: 400, y: 400 },
        interfaces: [
          { name: 'FastEthernet0', ip: '192.168.1.100', subnetMask: '255.255.255.0', configured: true }
        ],
        dhcp: [
          {
            poolName: 'LAN_POOL',
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
      }
    ],
    params: {
      routerCount: 1,
      switchCount: 1,
      pcCount: 1,
      serverCount: 1,
      networkType: 'single_lan',
      routingProtocol: 'ospf',
      dhcpEnabled: true
    }
  };
}

describe('pt_generate_configs', () => {
  test('genera configuraciones para plan válido', async () => {
    const plan = createTestPlan();
    const result = await ptGenerateConfigsTool.handler({ plan }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as GenerateConfigsData;
      expect(data.configs).toHaveLength(4);
      expect(data.summary.totalDevices).toBe(4);
      expect(data.summary.routerCount).toBe(1);
      expect(data.summary.switchCount).toBe(1);
      expect(data.summary.pcCount).toBe(1);
      expect(data.summary.serverCount).toBe(1);
    }
  });

  test('genera configuración IOS para router con OSPF', async () => {
    const plan = createTestPlan();
    const result = await ptGenerateConfigsTool.handler({ plan }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as GenerateConfigsData;
      const routerConfig = data.configs.find((c: DeviceConfig) => c.deviceType === 'router');
      expect(routerConfig).toBeDefined();
      expect(routerConfig!.iosConfig).toContain('hostname Router1');
      expect(routerConfig!.iosConfig).toContain('ip address 192.168.1.1 255.255.255.0');
      expect(routerConfig!.iosConfig).toContain('router ospf 1');
      expect(routerConfig!.iosConfig).toContain('network 192.168.1.0 0.0.0.255 area 0');
    }
  });

  test('genera configuración IOS para switch con VLANs', async () => {
    const plan = createTestPlan();
    const result = await ptGenerateConfigsTool.handler({ plan }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as GenerateConfigsData;
      const switchConfig = data.configs.find((c: DeviceConfig) => c.deviceType === 'switch');
      expect(switchConfig).toBeDefined();
      expect(switchConfig!.iosConfig).toContain('hostname Switch1');
      expect(switchConfig!.iosConfig).toContain('vlan 10');
      expect(switchConfig!.iosConfig).toContain('vlan 20');
      expect(switchConfig!.iosConfig).toContain('switchport mode access');
    }
  });

  test('genera configuración para PC', async () => {
    const plan = createTestPlan();
    const result = await ptGenerateConfigsTool.handler({ plan }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as GenerateConfigsData;
      const pcConfig = data.configs.find((c: DeviceConfig) => c.deviceType === 'pc');
      expect(pcConfig).toBeDefined();
      expect(pcConfig!.iosConfig).toContain('192.168.1.10');
    }
  });

  test('genera configuración para servidor con DHCP', async () => {
    const plan = createTestPlan();
    const result = await ptGenerateConfigsTool.handler({ plan }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as GenerateConfigsData;
      const serverConfig = data.configs.find((c: DeviceConfig) => c.deviceType === 'server');
      expect(serverConfig).toBeDefined();
      expect(serverConfig!.iosConfig).toContain('ip dhcp pool LAN_POOL');
      expect(serverConfig!.iosConfig).toContain('dns-server 192.168.1.100');
    }
  });

  test('soporta formato de salida YAML', async () => {
    const plan = createTestPlan();
    const result = await ptGenerateConfigsTool.handler({ plan, format: 'yaml' }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as GenerateConfigsData;
      const routerConfig = data.configs.find((c: DeviceConfig) => c.deviceType === 'router');
      expect(routerConfig!.yamlConfig).toBeDefined();
      expect(routerConfig!.yamlConfig).toContain('Router1:');
      expect(routerConfig!.yamlConfig).toContain('device_type: router');
    }
  });

  test('soporta formato de salida JSON', async () => {
    const plan = createTestPlan();
    const result = await ptGenerateConfigsTool.handler({ plan, format: 'json' }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as GenerateConfigsData;
      const routerConfig = data.configs.find((c: DeviceConfig) => c.deviceType === 'router');
      expect(routerConfig!.jsonConfig).toBeDefined();
      const jsonParsed = JSON.parse(routerConfig!.jsonConfig!);
      expect(jsonParsed.deviceName).toBe('Router1');
      expect(jsonParsed.deviceType).toBe('router');
    }
  });

  test('retorna error si no se proporciona plan', async () => {
    const result = await ptGenerateConfigsTool.handler({}, {} as any);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('INVALID_INPUT');
    }
  });

  test('retorna error si el plan no tiene devices', async () => {
    const result = await ptGenerateConfigsTool.handler({ plan: { links: [] } }, {} as any);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('INVALID_STRUCTURE');
    }
  });

  test('calcula líneas totales correctamente', async () => {
    const plan = createTestPlan();
    const result = await ptGenerateConfigsTool.handler({ plan }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as GenerateConfigsData;
      expect(data.summary.totalLines).toBeGreaterThan(0);
    }
  });

  test('incluye interfaces en configuración JSON', async () => {
    const plan = createTestPlan();
    const result = await ptGenerateConfigsTool.handler({ plan, format: 'json' }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as GenerateConfigsData;
      const routerConfig = data.configs.find((c: DeviceConfig) => c.deviceType === 'router');
      const jsonParsed = JSON.parse(routerConfig!.jsonConfig!);
      expect(jsonParsed.interfaces).toBeDefined();
      expect(jsonParsed.interfaces.length).toBeGreaterThan(0);
      expect(jsonParsed.interfaces[0].ip).toBe('192.168.1.1');
    }
  });
});
