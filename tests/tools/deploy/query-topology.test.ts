import { describe, test, expect, afterEach } from 'bun:test';
import { ptQueryTopologyTool } from '@cisco-auto/tools';

interface QueryTopologyData {
  devices: { id: string; type: string; status: string; ip?: string }[];
  links: { status: string; cableType: string }[];
  timestamp: string;
}

describe('pt_query_topology', () => {
  afterEach(() => {
    // Restore original fetch after each test
  });

  test('consulta topología exitosamente', async () => {
    const mockTopology = {
      devices: [
        { id: 'R1', name: 'Router1', type: 'router', status: 'up', ip: '192.168.1.1', model: '1941' },
        { id: 'S1', name: 'Switch1', type: 'switch', status: 'up', model: '2960' }
      ],
      links: [
        { from: 'R1', to: 'S1', status: 'connected', cableType: 'straight-through', fromPort: 'Gig0/0', toPort: 'Fa0/1' }
      ]
    };

    (globalThis as any).fetch = async () => {
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockTopology
      };
    };

    const result = await ptQueryTopologyTool.handler(
      { bridgeUrl: 'http://localhost:54321' },
      {} as any
    );

    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as QueryTopologyData;
      expect(data.devices).toHaveLength(2);
      expect(data.links).toHaveLength(1);
      expect(data.timestamp).toBeTruthy();

      const router = data.devices.find((d: { id: string }) => d.id === 'R1');
      expect(router).toBeDefined();
      expect(router!.type).toBe('router');
      expect(router!.status).toBe('up');
      expect(router!.ip).toBe('192.168.1.1');
    }
  });

  test('retorna error con URL inválida', async () => {
    const result = await ptQueryTopologyTool.handler(
      { bridgeUrl: '' },
      {} as any
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('INVALID_BRIDGE_URL');
    }
  });

  test('maneja error de conexión', async () => {
    (globalThis as any).fetch = async () => {
      throw new Error('Connection refused');
    };

    const result = await ptQueryTopologyTool.handler(
      { bridgeUrl: 'http://localhost:54321' },
      {} as any
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('CONNECTION_ERROR');
    }
  });

  test('maneja respuesta de error del bridge', async () => {
    (globalThis as any).fetch = async () => {
      return {
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      };
    };

    const result = await ptQueryTopologyTool.handler(
      { bridgeUrl: 'http://localhost:54321' },
      {} as any
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('BRIDGE_ERROR');
      expect(result.error.message).toContain('503');
    }
  });

  test('usa URL por defecto cuando no se provee bridgeUrl', async () => {
    (globalThis as any).fetch = async () => {
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ devices: [], links: [] })
      };
    };

    const result = await ptQueryTopologyTool.handler(
      {},
      {} as any
    );

    expect(result.success).toBe(true);
  });

  test('transforma tipos de dispositivos correctamente', async () => {
    const mockTopology = {
      devices: [
        { id: 'R1', name: 'Router1', type: 'ROUTER', status: 'ACTIVE', ip: '10.0.0.1' },
        { id: 'S1', name: 'Switch1', type: 'SWITCH', status: 'DOWN' },
        { id: 'PC1', name: 'PC1', type: 'PC', status: 'UP', ip: '192.168.1.10' },
        { id: 'SRV1', name: 'Server1', type: 'SERVER', status: 'ONLINE' }
      ],
      links: []
    };

    (globalThis as any).fetch = async () => {
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockTopology
      };
    };

    const result = await ptQueryTopologyTool.handler(
      { bridgeUrl: 'http://localhost:54321' },
      {} as any
    );

    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as QueryTopologyData;
      const devices = data.devices;
      expect(devices.find((d: { id: string }) => d.id === 'R1')!.type).toBe('router');
      expect(devices.find((d: { id: string }) => d.id === 'S1')!.type).toBe('switch');
      expect(devices.find((d: { id: string }) => d.id === 'PC1')!.type).toBe('pc');
      expect(devices.find((d: { id: string }) => d.id === 'SRV1')!.type).toBe('server');
    }
  });

  test('transforma estados de enlace correctamente', async () => {
    const mockTopology = {
      devices: [],
      links: [
        { from: 'R1', to: 'S1', status: 'CONNECTED', cableType: 'straight-through' },
        { from: 'S1', to: 'PC1', status: 'DISCONNECTED', cableType: 'crossover' }
      ]
    };

    (globalThis as any).fetch = async () => {
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockTopology
      };
    };

    const result = await ptQueryTopologyTool.handler(
      { bridgeUrl: 'http://localhost:54321' },
      {} as any
    );

    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as QueryTopologyData;
      const links = data.links;
      expect(links[0]!.status).toBe('connected');
      expect(links[0]!.cableType).toBe('straight-through');
      expect(links[1]!.status).toBe('disconnected');
      expect(links[1]!.cableType).toBe('crossover');
    }
  });

  test('incluye timestamp en formato ISO', async () => {
    const mockTopology = { devices: [], links: [] };

    (globalThis as any).fetch = async () => {
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockTopology
      };
    };

    const before = new Date().toISOString();

    const result = await ptQueryTopologyTool.handler(
      { bridgeUrl: 'http://localhost:54321' },
      {} as any
    );

    const after = new Date().toISOString();

    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as QueryTopologyData;
      expect(data.timestamp).toBeTruthy();
      expect(data.timestamp >= before).toBe(true);
      expect(data.timestamp <= after).toBe(true);
      expect(() => new Date(data.timestamp)).not.toThrow();
    }
  });

  test('maneja dispositivos unknown cuando el tipo no es reconocido', async () => {
    const mockTopology = {
      devices: [
        { id: 'DEV1', name: 'Device1', type: 'iot-sensor', status: 'unknown' }
      ],
      links: []
    };

    (globalThis as any).fetch = async () => {
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockTopology
      };
    };

    const result = await ptQueryTopologyTool.handler(
      { bridgeUrl: 'http://localhost:54321' },
      {} as any
    );

    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as QueryTopologyData;
      expect(data.devices[0]!.type).toBe('unknown');
      expect(data.devices[0]!.status).toBe('unknown');
    }
  });

  test('incluye metadatos en respuesta exitosa', async () => {
    const mockTopology = {
      devices: [{ id: 'R1', name: 'Router1', type: 'router', status: 'up' }],
      links: [{ from: 'R1', to: 'S1', status: 'connected', cableType: 'straight-through' }]
    };

    (globalThis as any).fetch = async () => {
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockTopology
      };
    };

    const result = await ptQueryTopologyTool.handler(
      { bridgeUrl: 'http://localhost:54321' },
      {} as any
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.metadata).toBeDefined();
      expect(result.metadata!.itemCount).toBe(2);
    }
  });
});
