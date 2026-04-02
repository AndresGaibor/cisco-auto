import { describe, test, expect } from 'bun:test';
import { ptGenerateScriptTool } from '@cisco-auto/core/tools';
import type { TopologyPlan } from '@cisco-auto/core';

interface ScriptCommand {
  deviceId: string;
  deviceName: string;
  type: string;
  command: string;
  params: unknown;
}

interface ScriptData {
  script: string;
  format: string;
  deviceCount?: number;
  linkCount?: number;
  commands: ScriptCommand[];
}

function createTestPlan(): TopologyPlan {
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
          ptType: '2911',
          ports: [
            { name: 'GigabitEthernet0/0', type: 'gigabitethernet', available: true },
            { name: 'GigabitEthernet0/1', type: 'gigabitethernet', available: true }
          ]
        },
        position: { x: 100, y: 100 },
        interfaces: [
          { name: 'GigabitEthernet0/0', ip: '192.168.1.1/24', configured: true },
          { name: 'GigabitEthernet0/1', configured: false }
        ]
      },
      {
        id: 'S1',
        name: 'Switch1',
        model: {
          name: '2960-24TT',
          type: 'switch',
          ptType: '2960-24TT',
          ports: [
            { name: 'FastEthernet0/1', type: 'fastethernet', available: true },
            { name: 'FastEthernet0/2', type: 'fastethernet', available: true }
          ]
        },
        position: { x: 100, y: 250 },
        interfaces: [
          { name: 'FastEthernet0/1', configured: false },
          { name: 'FastEthernet0/2', configured: false }
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
        position: { x: 300, y: 400 },
        interfaces: [
          { name: 'FastEthernet0', ip: '192.168.1.10/24', configured: true }
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
      networkType: 'single_lan'
    }
  };
}

describe('pt_generate_script', () => {
  test('genera script JavaScript correctamente', async () => {
    const plan = createTestPlan();
    const result = await ptGenerateScriptTool.handler({ plan, format: 'javascript' }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as ScriptData;
      expect(data.script).toContain('pt.addDevice');
      expect(data.script).toContain('pt.addLink');
      expect(data.script).toContain('pt.configureIosDevice');
      expect(data.script).toContain('pt.configurePcIp');
      expect(data.format).toBe('javascript');
    }
  });

  test('genera script Python correctamente', async () => {
    const plan = createTestPlan();
    const result = await ptGenerateScriptTool.handler({ plan, format: 'python' }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as ScriptData;
      expect(data.script).toContain('pt.add_device');
      expect(data.script).toContain('pt.add_link');
      expect(data.script).toContain('pt.configure_ios_device');
      expect(data.script).toContain('pt.configure_pc_ip');
      expect(data.format).toBe('python');
    }
  });

  test('incluye todos los dispositivos en el script', async () => {
    const plan = createTestPlan();
    const result = await ptGenerateScriptTool.handler({ plan, format: 'javascript' }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as ScriptData;
      expect(data.script).toContain('pt.addDevice("R1"');
      expect(data.script).toContain('pt.addDevice("S1"');
      expect(data.script).toContain('pt.addDevice("PC1"');
      expect(data.deviceCount).toBe(3);
    }
  });

  test('incluye todos los enlaces en el script', async () => {
    const plan = createTestPlan();
    const result = await ptGenerateScriptTool.handler({ plan, format: 'javascript' }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as ScriptData;
      expect(data.script).toContain('pt.addLink("R1", "GigabitEthernet0/0"');
      expect(data.script).toContain('pt.addLink("S1", "FastEthernet0/2"');
      expect(data.linkCount).toBe(2);
    }
  });

  test('genera comandos de configuración IOS para routers', async () => {
    const plan = createTestPlan();
    const result = await ptGenerateScriptTool.handler({ plan, format: 'javascript' }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as ScriptData;
      expect(data.script).toContain('configureIosDevice');
      expect(data.script).toContain('interface GigabitEthernet0/0');
      expect(data.script).toContain('ip address 192.168.1.1 255.255.255.0');
    }
  });

  test('genera comandos de configuración para PCs', async () => {
    const plan = createTestPlan();
    const result = await ptGenerateScriptTool.handler({ plan, format: 'javascript' }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as ScriptData;
      expect(data.script).toContain('configurePcIp("PC1"');
      expect(data.script).toContain('192.168.1.10');
    }
  });

  test('devuelve array de comandos en el resultado', async () => {
    const plan = createTestPlan();
    const result = await ptGenerateScriptTool.handler({ plan, format: 'javascript' }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as ScriptData;
      expect(Array.isArray(data.commands)).toBe(true);
      expect(data.commands.length).toBeGreaterThan(0);
      expect(data.commands[0]!).toHaveProperty('deviceId');
      expect(data.commands[0]!).toHaveProperty('deviceName');
      expect(data.commands[0]!).toHaveProperty('type');
      expect(data.commands[0]!).toHaveProperty('command');
      expect(data.commands[0]!).toHaveProperty('params');
    }
  });

  test('usa default format javascript si no se especifica', async () => {
    const plan = createTestPlan();
    const result = await ptGenerateScriptTool.handler({ plan }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as ScriptData;
      expect(data.format).toBe('javascript');
    }
  });

  test('retorna error si no se proporciona plan', async () => {
    const result = await ptGenerateScriptTool.handler({}, {} as any);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('INVALID_INPUT');
    }
  });

  test('retorna error si el plan no tiene devices', async () => {
    const result = await ptGenerateScriptTool.handler({ plan: { links: [] } }, {} as any);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('INVALID_STRUCTURE');
    }
  });

  test('retorna error si el plan no tiene links', async () => {
    const result = await ptGenerateScriptTool.handler({ plan: { devices: [] } }, {} as any);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('INVALID_STRUCTURE');
    }
  });

  test('maneja plan sin interfaces configuradas', async () => {
    const plan: TopologyPlan = {
      id: 'empty-plan',
      name: 'Empty Plan',
      devices: [
        {
          id: 'S1',
          name: 'Switch1',
          model: { name: '2960-24TT', type: 'switch', ptType: '2960-24TT', ports: [] },
          position: { x: 100, y: 100 },
          interfaces: []
        }
      ],
      links: [],
      params: { routerCount: 0, switchCount: 1, pcCount: 0, networkType: 'single_lan' }
    };

    const result = await ptGenerateScriptTool.handler({ plan, format: 'javascript' }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as ScriptData;
      expect(data.script).toContain('pt.addDevice("S1"');
      expect(data.commands.some((c: ScriptCommand) => c.type === 'configureIosDevice')).toBe(false);
    }
  });

  test('incluye metadatos en el resultado', async () => {
    const plan = createTestPlan();
    const result = await ptGenerateScriptTool.handler({ plan, format: 'javascript' }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.itemCount).toBeGreaterThan(0);
      expect(result.metadata?.extras).toBeDefined();
    }
  });
});
