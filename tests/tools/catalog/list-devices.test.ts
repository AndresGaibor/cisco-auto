import { describe, test, expect } from 'bun:test';
import { ptListDevicesTool, deviceCatalog } from '@cisco-auto/tools';

describe('pt_list_devices', () => {
  test('retorna todos los dispositivos sin filtro', async () => {
    const result = await ptListDevicesTool.handler({}, {} as any);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.devices).toHaveLength(deviceCatalog.length);
      expect(result.data.total).toBe(deviceCatalog.length);
    }
  });

  test('filtra por tipo router', async () => {
    const result = await ptListDevicesTool.handler({ type: 'router' }, {} as any);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.devices.every((d: any) => d.type === 'router')).toBe(true);
    }
  });

  test('filtra por tipo switch', async () => {
    const result = await ptListDevicesTool.handler({ type: 'switch' }, {} as any);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.devices.every((d: any) => d.type === 'switch')).toBe(true);
    }
  });

  test('incluye metadatos correctos', async () => {
    const result = await ptListDevicesTool.handler({}, {} as any);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.metadata?.itemCount).toBe(deviceCatalog.length);
    }
  });
});
