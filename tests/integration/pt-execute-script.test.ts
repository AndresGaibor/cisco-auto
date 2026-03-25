/**
 * TESTS DE INTEGRACIÓN PARA PT EXECUTE SCRIPT
 * 
 * Verifica la generación y estructura de scripts PTBuilder (JavaScript y Python).
 * Incluye tests de comandos IOS generados y configuración de PCs.
 */

import { describe, test, expect } from 'bun:test';
import { generateIosCommands, ptGenerateScriptTool } from '../../src/tools/topology/generate-script.ts';
import type { TopologyPlan, DevicePlan, LinkPlan } from '../../src/core/types/tool.ts';

// ============================================================================
// Fixtures - Topologías de prueba
// ============================================================================

/**
 * Topología simple con router, switch y PCs
 */
function crearTopologiaSimple(): TopologyPlan {
  return {
    id: 'plan-simple',
    name: 'Lab-Simple',
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
            { name: 'GigabitEthernet0/1', type: 'gigabitethernet', available: true },
          ],
        },
        position: { x: 100, y: 100 },
        interfaces: [
          {
            name: 'GigabitEthernet0/0',
            configured: true,
            ip: '192.168.1.1',
            subnetMask: '255.255.255.0',
          },
        ],
      },
      {
        id: 'S1',
        name: 'Switch1',
        model: {
          name: '2960',
          type: 'switch',
          ptType: '2960',
          ports: [
            { name: 'FastEthernet0/1', type: 'fastethernet', available: true },
          ],
        },
        position: { x: 300, y: 100 },
        interfaces: [
          {
            name: 'FastEthernet0/1',
            configured: true,
            description: 'PC1',
          },
        ],
      },
      {
        id: 'PC1',
        name: 'PC1',
        model: {
          name: 'PC',
          type: 'pc',
          ptType: 'PC',
          ports: [
            { name: 'FastEthernet0', type: 'fastethernet', available: true },
          ],
        },
        position: { x: 500, y: 100 },
        interfaces: [
          {
            name: 'FastEthernet0',
            configured: true,
            ip: '192.168.1.10',
            subnetMask: '255.255.255.0',
          },
        ],
      },
    ],
    links: [
      {
        id: 'link-1',
        from: { deviceId: 'R1', deviceName: 'Router1', port: 'GigabitEthernet0/0' },
        to: { deviceId: 'S1', deviceName: 'Switch1', port: 'FastEthernet0/1' },
        cableType: 'straight-through',
        validated: true,
      },
      {
        id: 'link-2',
        from: { deviceId: 'S1', deviceName: 'Switch1', port: 'FastEthernet0/2' },
        to: { deviceId: 'PC1', deviceName: 'PC1', port: 'FastEthernet0' },
        cableType: 'straight-through',
        validated: true,
      },
    ],
    params: {
      routerCount: 1,
      switchCount: 1,
      pcCount: 1,
      networkType: 'star',
    },
  };
}

/**
 * Topología con múltiples routers y VLANs
 */
function crearTopologiaVLAN(): TopologyPlan {
  return {
    id: 'plan-vlan',
    name: 'Lab-VLAN',
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
            { name: 'GigabitEthernet0/1', type: 'gigabitethernet', available: true },
          ],
        },
        position: { x: 0, y: 0 },
        interfaces: [
          {
            name: 'GigabitEthernet0/0',
            configured: true,
            ip: '10.1.1.1',
            subnetMask: '255.255.255.0',
          },
        ],
        routing: {
          protocol: 'static',
          static: [
            { network: '0.0.0.0', mask: '0.0.0.0', nextHop: '10.1.1.254' },
          ],
        },
      },
      {
        id: 'S1',
        name: 'Switch1',
        model: {
          name: '2960',
          type: 'switch',
          ptType: '2960',
          ports: [],
        },
        position: { x: 200, y: 0 },
        interfaces: [
          {
            name: 'FastEthernet0/1',
            configured: true,
            vlan: 10,
          },
          {
            name: 'FastEthernet0/2',
            configured: true,
            vlan: 20,
          },
        ],
        vlans: [
          { id: 10, name: 'USERS' },
          { id: 20, name: 'SERVERS' },
        ],
      },
      {
        id: 'SRV1',
        name: 'Server1',
        model: {
          name: 'Server',
          type: 'server',
          ptType: 'Server',
          ports: [
            { name: 'FastEthernet0', type: 'fastethernet', available: true },
          ],
        },
        position: { x: 400, y: 0 },
        interfaces: [
          {
            name: 'FastEthernet0',
            configured: true,
            ip: '192.168.10.100',
            subnetMask: '255.255.255.0',
          },
        ],
      },
    ],
    links: [
      {
        id: 'link-1',
        from: { deviceId: 'R1', deviceName: 'Router1', port: 'GigabitEthernet0/0' },
        to: { deviceId: 'S1', deviceName: 'Switch1', port: 'GigabitEthernet0/1' },
        cableType: 'straight-through',
        validated: true,
      },
    ],
    params: {
      routerCount: 1,
      switchCount: 1,
      pcCount: 0,
      serverCount: 1,
      networkType: 'router_on_a_stick',
      vlans: [10, 20],
    },
  };
}

/**
 * Topología vacía para tests edge
 */
function crearTopologiaVacia(): TopologyPlan {
  return {
    id: 'plan-vacio',
    name: 'Lab-Vacio',
    devices: [],
    links: [],
    params: {
      routerCount: 0,
      switchCount: 0,
      pcCount: 0,
      networkType: 'single_lan',
    },
  };
}

// ============================================================================
// Suite de Tests - Generación JavaScript
// ============================================================================

describe('PT Execute Script - JavaScript Generation', () => {

  test('genera script con cabecera correcta', async () => {
    const plan = crearTopologiaSimple();
    const result = await ptGenerateScriptTool.handler({ plan, format: 'javascript' } as any, {} as any);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const script = (result.data as any).script;
    expect(script).toContain('// PTBuilder Script');
    expect(script).toContain('// Generado automáticamente');
    expect(script).toContain(`// Topología: ${plan.name}`);
  });

  test('genera comandos pt.addDevice para cada dispositivo', async () => {
    const plan = crearTopologiaSimple();
    const result = await ptGenerateScriptTool.handler({ plan, format: 'javascript' } as any, {} as any);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const script = (result.data as any).script;

    // Verificar que cada dispositivo tiene addDevice
    expect(script).toContain('pt.addDevice("R1"');
    expect(script).toContain('pt.addDevice("S1"');
    expect(script).toContain('pt.addDevice("PC1"');
  });

  test('genera comandos pt.addLink para cada enlace', async () => {
    const plan = crearTopologiaSimple();
    const result = await ptGenerateScriptTool.handler({ plan, format: 'javascript' } as any, {} as any);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const script = (result.data as any).script;

    // Verificar que los enlaces usan addLink con parámetros correctos
    expect(script).toContain('pt.addLink(');
    expect(script).toContain('"R1"');
    expect(script).toContain('"S1"');
    expect(script).toContain('"straight-through"');
  });

  test('genera comandos pt.configureIosDevice para routers', async () => {
    const plan = crearTopologiaSimple();
    const result = await ptGenerateScriptTool.handler({ plan, format: 'javascript' } as any, {} as any);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const script = (result.data as any).script;

    // Router debe tener configureIosDevice
    expect(script).toContain('pt.configureIosDevice("R1"');
    // Switch también (IOS device)
    expect(script).toContain('pt.configureIosDevice("S1"');
  });

  test('genera comandos pt.configurePcIp para PCs configurados', async () => {
    const plan = crearTopologiaSimple();
    const result = await ptGenerateScriptTool.handler({ plan, format: 'javascript' } as any, {} as any);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const script = (result.data as any).script;

    // PC1 tiene IP configurada, debe usar configurePcIp
    expect(script).toContain('pt.configurePcIp("PC1"');
    expect(script).toContain('"192.168.1.10"');
    expect(script).toContain('"255.255.255.0"');
  });

  test('incluye secciones organizadas en el script', async () => {
    const plan = crearTopologiaSimple();
    const result = await ptGenerateScriptTool.handler({ plan, format: 'javascript' } as any, {} as any);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const script = (result.data as any).script;

    expect(script).toContain('// === Dispositivos ===');
    expect(script).toContain('// === Enlaces ===');
    expect(script).toContain('// Script completado');
  });

  test('registra todos los comandos en el array de commands', async () => {
    const plan = crearTopologiaSimple();
    const result = await ptGenerateScriptTool.handler({ plan, format: 'javascript' } as any, {} as any);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const data = result.data as any;
    const commands = data.commands as any[];

    // Debe haber comandos para: 3 dispositivos + 2 enlaces + 2 configureIos + 1 configurePc = 8
    expect(commands.length).toBeGreaterThanOrEqual(6);

    // Verificar tipos de comandos
    const tipos = commands.map((c: any) => c.type);
    expect(tipos).toContain('addDevice');
    expect(tipos).toContain('addLink');
    expect(tipos).toContain('configureIos');
    expect(tipos).toContain('configurePc');
  });

  test('reporta counts correctos de dispositivos y enlaces', async () => {
    const plan = crearTopologiaSimple();
    const result = await ptGenerateScriptTool.handler({ plan, format: 'javascript' } as any, {} as any);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const data = result.data as any;
    expect(data.deviceCount).toBe(3);
    expect(data.linkCount).toBe(2);
  });

  test('formato es javascript', async () => {
    const plan = crearTopologiaSimple();
    const result = await ptGenerateScriptTool.handler({ plan, format: 'javascript' } as any, {} as any);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const data = result.data as any;
    expect(data.format).toBe('javascript');
  });
});

// ============================================================================
// Suite de Tests - Generación Python
// ============================================================================

describe('PT Execute Script - Python Generation', () => {

  test('genera script con cabecera correcta en Python', async () => {
    const plan = crearTopologiaSimple();
    const result = await ptGenerateScriptTool.handler({ plan, format: 'python' } as any, {} as any);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const script = (result.data as any).script;
    expect(script).toContain('# PTBuilder Script (Python)');
    expect(script).toContain('# Generado automáticamente');
    expect(script).toContain(`# Topología: ${plan.name}`);
  });

  test('genera comandos pt.add_device (snake_case) para Python', async () => {
    const plan = crearTopologiaSimple();
    const result = await ptGenerateScriptTool.handler({ plan, format: 'python' } as any, {} as any);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const script = (result.data as any).script;

    // Python usa snake_case
    expect(script).toContain("pt.add_device('R1'");
    expect(script).toContain("pt.add_device('S1'");
    expect(script).toContain("pt.add_device('PC1'");
  });

  test('genera comandos pt.add_link (snake_case) para Python', async () => {
    const plan = crearTopologiaSimple();
    const result = await ptGenerateScriptTool.handler({ plan, format: 'python' } as any, {} as any);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const script = (result.data as any).script;

    expect(script).toContain("pt.add_link('R1'");
    expect(script).toContain("pt.add_link('S1'");
    expect(script).toContain("'straight-through'");
  });

  test('genera comandos pt.configure_ios_device para routers en Python', async () => {
    const plan = crearTopologiaSimple();
    const result = await ptGenerateScriptTool.handler({ plan, format: 'python' } as any, {} as any);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const script = (result.data as any).script;

    // Python usa configure_ios_device con docstring
    expect(script).toContain("pt.configure_ios_device(");
  });

  test('genera comandos pt.configure_pc_ip para PCs en Python', async () => {
    const plan = crearTopologiaSimple();
    const result = await ptGenerateScriptTool.handler({ plan, format: 'python' } as any, {} as any);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const script = (result.data as any).script;

    expect(script).toContain('pt.configure_pc_ip("PC1"');
  });

  test('formato es python', async () => {
    const plan = crearTopologiaSimple();
    const result = await ptGenerateScriptTool.handler({ plan, format: 'python' } as any, {} as any);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const data = result.data as any;
    expect(data.format).toBe('python');
  });

  test('script Python usa triple comillas para configuración IOS', async () => {
    const plan = crearTopologiaSimple();
    const result = await ptGenerateScriptTool.handler({ plan, format: 'python' } as any, {} as any);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const script = (result.data as any).script;

    // IOS config en Python usa docstrings
    expect(script).toContain('"""');
  });
});

// ============================================================================
// Suite de Tests - Comandos IOS
// ============================================================================

describe('PT Execute Script - IOS Commands', () => {

  test('generateIosCommands genera comandos para router', () => {
    const plan = crearTopologiaSimple();
    const router = plan.devices.find(d => d.id === 'R1')!;
    const commands = generateIosCommands(router);

    expect(commands.length).toBeGreaterThan(0);
    // El router debe tener comandos de configuración de interfaz
    expect(commands.some(c => c.includes('ip address'))).toBe(true);
  });

  test('generateIosCommands genera comandos para switch con VLANs', () => {
    const plan = crearTopologiaVLAN();
    const switchDevice = plan.devices.find(d => d.id === 'S1')!;
    const commands = generateIosCommands(switchDevice);

    expect(commands.length).toBeGreaterThan(0);
    // Switch con VLANs debe incluir comandos VLAN
    expect(commands.some(c => c.includes('vlan'))).toBe(true);
  });

  test('generateIosCommands incluye routing estático cuando está configurado', () => {
    const plan = crearTopologiaVLAN();
    const router = plan.devices.find(d => d.id === 'R1')!;
    const commands = generateIosCommands(router);

    expect(commands.some(c => c.includes('ip route'))).toBe(true);
  });

  test('comandos IOS aparecen en script JavaScript', async () => {
    const plan = crearTopologiaVLAN();
    const result = await ptGenerateScriptTool.handler({ plan, format: 'javascript' } as any, {} as any);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const script = (result.data as any).script;

    // Los comandos IOS deben estar en el script
    expect(script).toContain('ip address');
  });

  test('comandos IOS aparecen en script Python', async () => {
    const plan = crearTopologiaVLAN();
    const result = await ptGenerateScriptTool.handler({ plan, format: 'python' } as any, {} as any);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const script = (result.data as any).script;

    // Los comandos IOS deben estar en el script Python
    expect(script).toContain('ip address');
  });
});

// ============================================================================
// Suite de Tests - Edge Cases
// ============================================================================

describe('PT Execute Script - Edge Cases', () => {

  test('topología vacía genera script válido', async () => {
    const plan = crearTopologiaVacia();
    const result = await ptGenerateScriptTool.handler({ plan, format: 'javascript' } as any, {} as any);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const data = result.data as any;
    expect(data.deviceCount).toBe(0);
    expect(data.linkCount).toBe(0);
    expect(data.script).toContain('// PTBuilder Script');
  });

  test('plan sin format usa JavaScript por defecto', async () => {
    const plan = crearTopologiaSimple();
    const result = await ptGenerateScriptTool.handler({ plan } as any, {} as any);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const data = result.data as any;
    expect(data.format).toBe('javascript');
  });

  test('plan inválido devuelve error', async () => {
    const result = await ptGenerateScriptTool.handler({ plan: null } as any, {} as any);

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error).toBeDefined();
    expect(result.error?.code).toBe('INVALID_INPUT');
  });

  test('plan sin devices devuelve error', async () => {
    const result = await ptGenerateScriptTool.handler({ plan: { id: 'test', name: 'Test', links: [] } } as any, {} as any);

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error?.code).toBe('INVALID_STRUCTURE');
  });

  test('plan sin links devuelve error', async () => {
    const result = await ptGenerateScriptTool.handler({
      plan: { id: 'test', name: 'Test', devices: [], links: undefined as any }
    } as any, {} as any);

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error?.code).toBe('INVALID_STRUCTURE');
  });

  test('server sin IP no genera configurePcIp', async () => {
    const plan: TopologyPlan = {
      ...crearTopologiaSimple(),
      devices: [
        ...crearTopologiaSimple().devices,
        {
          id: 'SRV1',
          name: 'Server1',
          model: {
            name: 'Server',
            type: 'server',
            ptType: 'Server',
            ports: [],
          },
          position: { x: 600, y: 100 },
          interfaces: [
            {
              name: 'FastEthernet0',
              configured: false, // Sin IP configurada
            },
          ],
        },
      ],
    };

    const result = await ptGenerateScriptTool.handler({ plan, format: 'javascript' } as any, {} as any);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const script = (result.data as any).script;
    // Server sin IP no debe tener configurePcIp
    expect(script).not.toContain('pt.configurePcIp("SRV1"');
  });
});

// ============================================================================
// Suite de Tests - Métricas y Metadata
// ============================================================================

describe('PT Execute Script - Metadata', () => {

  test('result incluye metadata con itemCount', async () => {
    const plan = crearTopologiaSimple();
    const result = await ptGenerateScriptTool.handler({ plan, format: 'javascript' } as any, {} as any);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.metadata).toBeDefined();
    expect(result.metadata?.itemCount).toBeGreaterThan(0);
  });

  test('result incluye extras con deviceCount y linkCount', async () => {
    const plan = crearTopologiaSimple();
    const result = await ptGenerateScriptTool.handler({ plan, format: 'javascript' } as any, {} as any);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.metadata?.extras).toBeDefined();
    expect(result.metadata?.extras?.deviceCount).toBe(3);
    expect(result.metadata?.extras?.linkCount).toBe(2);
  });

  test('commands tienen deviceId y deviceName correctos', async () => {
    const plan = crearTopologiaSimple();
    const result = await ptGenerateScriptTool.handler({ plan, format: 'javascript' } as any, {} as any);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const commands = (result.data as any).commands as any[];

    // Verificar que cada comando tiene los campos requeridos
    for (const cmd of commands) {
      expect(cmd.deviceId).toBeDefined();
      expect(cmd.deviceName).toBeDefined();
      expect(cmd.type).toBeDefined();
      expect(cmd.command).toBeDefined();
      expect(cmd.params).toBeDefined();
    }
  });

  test('commands addDevice tienen params correctos', async () => {
    const plan = crearTopologiaSimple();
    const result = await ptGenerateScriptTool.handler({ plan, format: 'javascript' } as any, {} as any);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const commands = (result.data as any).commands as any[];
    const addDeviceCmds = commands.filter((c: any) => c.type === 'addDevice');

    for (const cmd of addDeviceCmds) {
      expect(cmd.params.name).toBeDefined();
      expect(cmd.params.type).toBeDefined();
      expect(cmd.params.x).toBeDefined();
      expect(cmd.params.y).toBeDefined();
    }
  });

  test('commands addLink tienen params correctos', async () => {
    const plan = crearTopologiaSimple();
    const result = await ptGenerateScriptTool.handler({ plan, format: 'javascript' } as any, {} as any);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const commands = (result.data as any).commands as any[];
    const addLinkCmds = commands.filter((c: any) => c.type === 'addLink');

    for (const cmd of addLinkCmds) {
      expect(cmd.params.device1).toBeDefined();
      expect(cmd.params.port1).toBeDefined();
      expect(cmd.params.device2).toBeDefined();
      expect(cmd.params.port2).toBeDefined();
      expect(cmd.params.cableType).toBeDefined();
    }
  });
});
