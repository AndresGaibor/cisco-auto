/**
 * TESTS DE INTEGRACIÓN PARA BRIDGE SERVER
 *
 * Verifica la funcionalidad del servidor bridge HTTP.
 * Tests: /health, /next, /execute, /bridge-client.js
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { startBridgeServer } from '@cisco-auto/bridge';

// ============================================================================
// Tipos locales (ya que no están exportados del paquete bridge)
// ============================================================================

interface ComandoPT {
  tipo: string;
  args: unknown[];
  id?: string;
  timestamp?: number;
}

interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  version: string;
  timestamp: string;
}

interface NextResponse {
  hasCommand: boolean;
  command: ComandoPT | null;
}

interface ExecuteResponse {
  success: boolean;
  commandId?: string;
  error?: string;
}

// ============================================================================
// Configuración
// ============================================================================

// Usar puerto aleatorio para evitar conflictos
const TEST_PORT = 54321 + Math.floor(Math.random() * 1000);
const BRIDGE_URL = `http://127.0.0.1:${TEST_PORT}`;
const TIMEOUT_MS = 5000;

// Overrides para usar puerto de test
const originalEnv = process.env;

beforeAll(() => {
  process.env = { ...originalEnv, BRIDGE_PORT: String(TEST_PORT) };
});

afterAll(() => {
  process.env = originalEnv;
});

// ============================================================================
// Helpers
// ============================================================================

/**
 * Realiza una petición HTTP al bridge server
 */
async function fetchBridge<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ status: number; data: T; headers: Headers }> {
  const response = await fetch(`${BRIDGE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  let data: T;
  const contentType = response.headers.get('content-type');

  if (contentType?.includes('application/json')) {
    data = await response.json() as T;
  } else {
    data = await response.text() as unknown as T;
  }

  return { status: response.status, data, headers: response.headers };
}

/**
 * Espera un tiempo dado en milisegundos
 */
function esperar(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Limpia la cola de comandos consumiendo todos los pendientes
 */
async function limpiarCola(): Promise<void> {
  while (true) {
    const { data } = await fetchBridge<NextResponse>('/next');
    if (!data.hasCommand) break;
  }
}

// ============================================================================
// Suite de Tests - Bridge Server
// ============================================================================

describe('Bridge Server - Integration Tests', () => {
  let serverControl: { stop: () => void };

  beforeAll(() => {
    serverControl = startBridgeServer();
  });

  afterAll(() => {
    serverControl.stop();
  });

  // =========================================================================
  // Test de Health Endpoint
  // =========================================================================

  describe('GET /health', () => {
    test('debería responder con status 200', async () => {
      const { status } = await fetchBridge<HealthResponse>('/health');
      expect(status).toBe(200);
    });

    test('debería devolver status ok', async () => {
      const { data } = await fetchBridge<HealthResponse>('/health');
      expect(data.status).toBe('ok');
    });

    test('debería devolver version y timestamp', async () => {
      const { data } = await fetchBridge<HealthResponse>('/health');
      expect(data.version).toBeDefined();
      expect(typeof data.version).toBe('string');
      expect(data.timestamp).toBeDefined();
      expect(typeof data.timestamp).toBe('string');
    });

    test('debería incluir headers CORS', async () => {
      const { headers } = await fetchBridge<HealthResponse>('/health');
      expect(headers.get('Access-Control-Allow-Origin')).toBeDefined();
      expect(headers.get('Access-Control-Allow-Methods')).toBeDefined();
    });
  });

  // =========================================================================
  // Test de Execute Endpoint
  // =========================================================================

  describe('POST /execute', () => {
    beforeAll(async () => {
      await limpiarCola();
    });

    test('debería encolar un comando y devolver 201', async () => {
      const comando = {
        tipo: 'agregarDispositivo',
        args: ['Router1', '2911', 100, 200],
      };

      const { status, data } = await fetchBridge<ExecuteResponse>('/execute', {
        method: 'POST',
        body: JSON.stringify(comando),
      });

      expect(status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.commandId).toBeDefined();
      expect(typeof data.commandId).toBe('string');
    });

    test('debería encolar comando de tipo configurar', async () => {
      const comando = {
        tipo: 'conectar',
        args: ['R1', 'Gig0/0', 'S1', 'Gig0/1', 'straight'],
      };

      const { status, data } = await fetchBridge<ExecuteResponse>('/execute', {
        method: 'POST',
        body: JSON.stringify(comando),
      });

      expect(status).toBe(201);
      expect(data.success).toBe(true);
    });

    test('debería devolver 400 si falta tipo', async () => {
      const { status } = await fetchBridge('/execute', {
        method: 'POST',
        body: JSON.stringify({ args: [] }),
      });

      expect(status).toBe(400);
    });

    test('debería devolver 400 si falta args', async () => {
      const { status } = await fetchBridge('/execute', {
        method: 'POST',
        body: JSON.stringify({ tipo: 'agregarDispositivo' }),
      });

      expect(status).toBe(400);
    });

    test('debería devolver 400 si no hay body', async () => {
      const { status } = await fetchBridge('/execute', {
        method: 'POST',
      });

      expect(status).toBe(400);
    });

    test('debería devolver 400 con JSON inválido', async () => {
      const { status } = await fetchBridge('/execute', {
        method: 'POST',
        body: 'no es json',
      });

      expect(status).toBe(400);
    });

    test('debería aceptar tipo de comando desconocido (validación elástica)', async () => {
      const { status, data } = await fetchBridge<ExecuteResponse>('/execute', {
        method: 'POST',
        body: JSON.stringify({
          tipo: 'comandoPersonalizado',
          args: ['arg1', 'arg2'],
        }),
      });

      expect(status).toBe(201);
      expect(data.success).toBe(true);
    });

    test('debería aceptar args con cualquier tipo de dato', async () => {
      const { status, data } = await fetchBridge<ExecuteResponse>('/execute', {
        method: 'POST',
        body: JSON.stringify({
          tipo: 'configurar',
          args: [
            'Router1',
            { nested: 'object' },
            [1, 2, 3],
            true,
            null,
            123,
          ],
        }),
      });

      expect(status).toBe(201);
      expect(data.success).toBe(true);
    });
  });

  // =========================================================================
  // Test de Next Endpoint
  // =========================================================================

  describe('GET /next', () => {
    beforeEach(async () => {
      await limpiarCola();
    });

    test('debería devolver hasCommand=false si no hay comandos', async () => {
      const { status, data } = await fetchBridge<NextResponse>('/next');

      expect(status).toBe(200);
      expect(data.hasCommand).toBe(false);
      expect(data.command).toBeNull();
    });

    test('debería devolver el comando encolado', async () => {
      const comando = {
        tipo: 'configurar',
        args: ['Router1', 'hostname NuevoHost'],
      };

      await fetchBridge('/execute', {
        method: 'POST',
        body: JSON.stringify(comando),
      });

      const { status, data } = await fetchBridge<NextResponse>('/next');

      expect(status).toBe(200);
      expect(data.hasCommand).toBe(true);
      expect(data.command).toBeDefined();
      expect(data.command?.tipo).toBe('configurar');
      expect(data.command?.args).toEqual(['Router1', 'hostname NuevoHost']);
    });

    test('debería remover el comando tras obtenerlo', async () => {
      const comando = {
        tipo: 'eliminarDispositivo',
        args: ['PC1'],
      };

      await fetchBridge('/execute', {
        method: 'POST',
        body: JSON.stringify(comando),
      });

      // Primer /next devuelve el comando
      const primero = await fetchBridge<NextResponse>('/next');
      expect(primero.data.hasCommand).toBe(true);

      // Segundo /next no debería devolver nada (ya se consumió)
      const segundo = await fetchBridge<NextResponse>('/next');
      expect(segundo.data.hasCommand).toBe(false);
    });

    test('debería mantener orden FIFO', async () => {
      const comandos = [
        { tipo: 'agregarDispositivo' as const, args: ['D1', '2911', 0, 0] },
        { tipo: 'agregarDispositivo' as const, args: ['D2', '2911', 0, 0] },
        { tipo: 'agregarDispositivo' as const, args: ['D3', '2911', 0, 0] },
      ];

      for (const cmd of comandos) {
        await fetchBridge('/execute', {
          method: 'POST',
          body: JSON.stringify(cmd),
        });
      }

      for (const cmd of comandos) {
        const { data } = await fetchBridge<NextResponse>('/next');
        expect(data.hasCommand).toBe(true);
        expect(data.command?.tipo).toBe(cmd.tipo);
        expect(data.command?.args).toEqual(cmd.args);
      }
    });

    test('debería tener id único y timestamp', async () => {
      const comando = {
        tipo: 'agregarDispositivo',
        args: ['R1', '2911', 100, 100],
      };

      const { data: executeData } = await fetchBridge<ExecuteResponse>('/execute', {
        method: 'POST',
        body: JSON.stringify(comando),
      });

      const { data: nextData } = await fetchBridge<NextResponse>('/next');

      expect(nextData.command?.id).toBeDefined();
      expect(nextData.command?.id).toBe(executeData.commandId);
      expect(nextData.command?.timestamp).toBeDefined();
      expect(typeof nextData.command?.timestamp).toBe('number');
    });
  });

  // =========================================================================
  // Test de Bridge Client Endpoint
  // =========================================================================

  describe('GET /bridge-client.js', () => {
    test('debería responder con status 200', async () => {
      const response = await fetch(`${BRIDGE_URL}/bridge-client.js`);
      expect(response.status).toBe(200);
    });

    test('debería devolver content-type javascript', async () => {
      const response = await fetch(`${BRIDGE_URL}/bridge-client.js`);
      expect(response.headers.get('Content-Type')).toContain('javascript');
    });

    test('debería devolver el script de bootstrap', async () => {
      const response = await fetch(`${BRIDGE_URL}/bridge-client.js`);
      const text = await response.text();

      // Verificar que contiene los elementos clave del script
      expect(text).toContain('BRIDGE_URL');
      expect(text).toContain('POLL_INTERVAL');
      expect(text).toContain('fetchNext');
      expect(text).toContain('executeCommand');
      expect(text).toContain('BridgeClient');
    });

    test('debería incluir función start y stop', async () => {
      const response = await fetch(`${BRIDGE_URL}/bridge-client.js`);
      const text = await response.text();

      expect(text).toContain('function start()');
      expect(text).toContain('function stop()');
    });

    test('debería incluir manejo de evaluateJavaScriptAsync', async () => {
      const response = await fetch(`${BRIDGE_URL}/bridge-client.js`);
      const text = await response.text();

      expect(text).toContain('evaluateJavaScriptAsync');
    });

    test('debería incluir headers CORS', async () => {
      const response = await fetch(`${BRIDGE_URL}/bridge-client.js`);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined();
    });
  });

  // =========================================================================
  // Test de Endpoints No Existentes
  // =========================================================================

  describe('404 Handling', () => {
    test('endpoint inexistente debería devolver 404', async () => {
      const { status } = await fetchBridge('/no-existe');
      expect(status).toBe(404);
    });

    test('GET a /execute debería devolver 404', async () => {
      const { status } = await fetchBridge('/execute');
      expect(status).toBe(404);
    });

    test('POST a /health debería devolver 404', async () => {
      const { status } = await fetchBridge('/health', {
        method: 'POST',
      });
      expect(status).toBe(404);
    });
  });

  // =========================================================================
  // Test de CORS
  // =========================================================================

  describe('CORS Headers', () => {
    test('OPTIONS request debería devolver 204', async () => {
      const response = await fetch(`${BRIDGE_URL}/health`, {
        method: 'OPTIONS',
      });

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined();
    });

    test('debería incluir Access-Control-Allow-Methods', async () => {
      const response = await fetch(`${BRIDGE_URL}/health`, {
        method: 'OPTIONS',
      });

      expect(response.headers.get('Access-Control-Allow-Methods')).toBeDefined();
    });
  });

  // =========================================================================
  // Test de Sostenibilidad
  // =========================================================================

  describe('Server Sustainability', () => {
    test('debería responder de forma sostenida', async () => {
      const iterations = 5;

      for (let i = 0; i < iterations; i++) {
        const { status, data } = await fetchBridge<HealthResponse>('/health');
        expect(status).toBe(200);
        expect(data.status).toBe('ok');
        await esperar(100);
      }
    });

    test('debería manejar requests concurrentes', async () => {
      const promises = Array.from({ length: 10 }, () =>
        fetchBridge<HealthResponse>('/health')
      );

      const results = await Promise.all(promises);

      for (const { status, data } of results) {
        expect(status).toBe(200);
        expect(data.status).toBe('ok');
      }
    });

    test('debería mantener estado entre requests', async () => {
      // Encolar varios comandos
      for (let i = 0; i < 3; i++) {
        await fetchBridge('/execute', {
          method: 'POST',
          body: JSON.stringify({
            tipo: 'configurar',
            args: [`Device${i}`, 'no shutdown'],
          }),
        });
      }

      // Verificar que todos están en cola
      let count = 0;
      while (true) {
        const { data } = await fetchBridge<NextResponse>('/next');
        if (!data.hasCommand) break;
        count++;
      }

      expect(count).toBe(3);
    });
  });
});

// ============================================================================
// Tests Adicionales - Edge Cases
// ============================================================================

describe('Bridge Server - Edge Cases', () => {
  let serverControl: { stop: () => void };

  beforeAll(() => {
    serverControl = startBridgeServer();
  });

  afterAll(() => {
    serverControl.stop();
  });

  test('comando con argumentos vacíos debería ser aceptado', async () => {
    const { status, data } = await fetchBridge<ExecuteResponse>('/execute', {
      method: 'POST',
      body: JSON.stringify({
        tipo: 'configurar',
        args: [],
      }),
    });

    expect(status).toBe(201);
    expect(data.success).toBe(true);
  });

  test('respuesta de error debería tener formato correcto', async () => {
    const { data } = await fetchBridge('/execute', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    expect(data).toHaveProperty('error');
    expect(typeof (data as any).error).toBe('string');
  });
});
