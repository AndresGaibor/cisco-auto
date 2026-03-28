import { describe, test, expect } from 'bun:test';
import { ptDeployTool } from '@cisco-auto/tools';

describe('pt_deploy', () => {
  test('copia configuraciones al portapapeles', async () => {
    const configs = [
      { name: 'Router-1', config: 'interface GigabitEthernet0/0\nip address 192.168.1.1 255.255.255.0\nno shutdown' },
      { name: 'Switch-1', config: 'vlan 10\nname DATA' }
    ];

    const result = await ptDeployTool.handler(
      { configs, target: 'clipboard' },
      {} as any
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.message).toBe('Configuraciones copiadas al portapapeles');
      expect(result.data.charCount).toBeGreaterThan(0);
    }
  });

  test('guarda configuraciones en archivo', async () => {
    const configs = [
      { name: 'Router-1', config: 'hostname Router-1' },
      { name: 'Switch-1', config: 'hostname Switch-1' }
    ];

    const result = await ptDeployTool.handler(
      { configs, target: 'file', filename: 'test-config.txt' },
      {} as any
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.message).toContain('test-config.txt');
      expect(result.data.outputPath).toBe('configs/test-config.txt');
      expect(result.data.charCount).toBeGreaterThan(0);
    }
  });

  test('usa nombre de archivo por defecto', async () => {
    const configs = [
      { name: 'Router-1', config: 'interface GigabitEthernet0/0' }
    ];

    const result = await ptDeployTool.handler(
      { configs, target: 'file' },
      {} as any
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.outputPath).toBe('configs/deploy-config.txt');
    }
  });

  test('retorna error con configs vacios', async () => {
    const result = await ptDeployTool.handler(
      { configs: [], target: 'clipboard' },
      {} as any
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('INVALID_INPUT');
    }
  });

  test('une correctamente múltiples configuraciones', async () => {
    const configs = [
      { name: 'Router-1', config: 'config router 1' },
      { name: 'Router-2', config: 'config router 2' },
      { name: 'Switch-1', config: 'config switch 1' }
    ];

    const result = await ptDeployTool.handler(
      { configs, target: 'clipboard' },
      {} as any
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.charCount).toBeGreaterThan(
        configs.reduce((sum, c) => sum + c.config.length, 0)
      );
    }
  });
});
