import { describe, test, expect } from 'bun:test';
import { ptBridgeStatusTool, type BridgeStatusResult } from '../../../src/tools/deploy/bridge-status.ts';

describe('pt_bridge_status', () => {
  describe('ptBridgeStatusTool', () => {
    test('retorna connected=false cuando bridge no disponible', async () => {
      const result = await ptBridgeStatusTool.handler(
        { bridgeUrl: 'http://localhost:59999' },
        {} as any
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.connected).toBe(false);
        expect(result.data.lastError).toBeDefined();
      }
    });

    test('usa URL por defecto cuando no se provee bridgeUrl', async () => {
      const result = await ptBridgeStatusTool.handler(
        {},
        {} as any
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.connected).toBe(false);
      }
    });

    test('valida formato de URL', async () => {
      const result = await ptBridgeStatusTool.handler(
        { bridgeUrl: 'invalid-url' },
        {} as any
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_URL');
      }
    });

    test('valida URLs sin protocolo http', async () => {
      const result = await ptBridgeStatusTool.handler(
        { bridgeUrl: 'localhost:54321' },
        {} as any
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_URL');
      }
    });

    test('permite URLs con https', async () => {
      const result = await ptBridgeStatusTool.handler(
        { bridgeUrl: 'https://localhost:54321' },
        {} as any
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.connected).toBe(false);
      }
    });

    test('maneja URLs con trailing slash', async () => {
      const result = await ptBridgeStatusTool.handler(
        { bridgeUrl: 'http://localhost:54321/' },
        {} as any
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.connected).toBe(false);
      }
    });
  });

  describe('BridgeStatusResult interface', () => {
    test('cumple con schema para exito', () => {
      const result: BridgeStatusResult = {
        connected: true,
        version: '1.0.0',
        uptime: 3600
      };

      expect(result.connected).toBe(true);
      expect(result.version).toBe('1.0.0');
      expect(result.uptime).toBe(3600);
    });

    test('cumple con schema para error', () => {
      const result: BridgeStatusResult = {
        connected: false,
        lastError: 'Connection refused'
      };

      expect(result.connected).toBe(false);
      expect(result.lastError).toBe('Connection refused');
      expect(result.version).toBeUndefined();
      expect(result.uptime).toBeUndefined();
    });
  });

  describe('schema de entrada', () => {
    test('tool tiene nombre y categoria correctos', () => {
      expect(ptBridgeStatusTool.name).toBe('pt_bridge_status');
      expect(ptBridgeStatusTool.category).toBe('deploy');
    });

    test('tool tiene tags apropiados', () => {
      expect(ptBridgeStatusTool.tags).toContain('bridge');
      expect(ptBridgeStatusTool.tags).toContain('health');
    });

    test('schema tiene propiedad bridgeUrl', () => {
      const schema = ptBridgeStatusTool.inputSchema;
      expect(schema.properties?.bridgeUrl).toBeDefined();
    });
  });
});
