import { describe, test, expect } from 'bun:test';
import { ptGetDeviceDetailsTool } from '@cisco-auto/tools';

describe('pt_get_device_details', () => {
  test('retorna detalles de router 2911', async () => {
    const result = await ptGetDeviceDetailsTool.handler({ model: '2911' }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as { device: { name: string; type: string; ports: unknown; portCount: number } };
      expect(data.device.name).toBe('2911');
      expect(data.device.type).toBe('router');
      expect(data.device.ports).toBeDefined();
      expect(data.device.portCount).toBeGreaterThan(0);
    }
  });

  test('retorna detalles de switch 2960-24TT', async () => {
    const result = await ptGetDeviceDetailsTool.handler({ model: '2960-24TT' }, {} as any);

    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as { device: { name: string; type: string; portCount: number } };
      expect(data.device.name).toBe('2960-24TT');
      expect(data.device.type).toBe('switch');
      expect(data.device.portCount).toBe(26);
    }
  });

  test('retorna error para modelo inexistente', async () => {
    const result = await ptGetDeviceDetailsTool.handler({ model: 'XYZ123' }, {} as any);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('DEVICE_NOT_FOUND');
      expect(result.error.suggestions).toBeDefined();
    }
  });

  test('retorna error si no se proporciona modelo', async () => {
    const result = await ptGetDeviceDetailsTool.handler({}, {} as any);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('INVALID_INPUT');
    }
  });
});
