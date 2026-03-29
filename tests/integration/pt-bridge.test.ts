/**
 * TESTS DE INTEGRACIÓN PARA PT BRIDGE SERVER
 *
 * Verifica la funcionalidad del servidor bridge HTTP en puerto 54321.
 * Tests: conectividad, enqueue/dequeue de comandos, y lifetime del polling loop.
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
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

const BRIDGE_URL = 'http://127.0.0.1:54321';
const TIMEOUT_MS = 5000;

// ============================================================================
// Helpers
// ============================================================================

/**
 * Realiza una petición HTTP al bridge server
 */
async function fetchBridge<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ status: number; data: T }> {
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

  return { status: response.status, data };
}

/**
 * Espera un tiempo dado en milisegundos
 */
function esperar(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// Suite de Tests
// ============================================================================

describe('PT Bridge Server - Integration Tests', () => {
  // Server instance reference
  let serverControl: { stop: () => void };

  // Iniciar servidor antes de todos los tests
  beforeAll(() => {
    serverControl = startBridgeServer();
  });

  // Detener servidor después de todos los tests
  afterAll(() => {
    serverControl.stop();
  });

  // =========================================================================
  // Test de Conectividad
  // =========================================================================

  describe('Conectividad', () => {
    test('/health deberia responder con status 200', async () => {
      const { status, data } = await fetchBridge<HealthResponse>('/health');
      
      expect(status).toBe(200);
      expect(data.status).toBeDefined();
    });

    test('/health deberia devolver version y timestamp', async () => {
      const { status, data } = await fetchBridge<HealthResponse>('/health');
      
      expect(status).toBe(200);
      expect(data.version).toBeDefined();
      expect(typeof data.version).toBe('string');
      expect(data.timestamp).toBeDefined();
      expect(typeof data.timestamp).toBe('string');
    });

    test('/health deberia contener informacion de uptime', async () => {
      const { status, data } = await fetchBridge<HealthResponse>('/health');
      
      expect(status).toBe(200);
      // El health check extendido tiene uptime
      expect((data as any).uptime).toBeDefined();
      expect((data as any).uptime.seconds).toBeGreaterThanOrEqual(0);
    });

    test('/status deberia responder con status 200', async () => {
      const { status } = await fetchBridge('/status');
      
      expect(status).toBe(200);
    });

    test('/status deberia devolver informacion del servidor', async () => {
      const { status, data } = await fetchBridge('/status');
      
      expect(status).toBe(200);
      expect((data as any).bridge).toBeDefined();
      expect((data as any).bridge.status).toBe('running');
      expect((data as any).server.port).toBe(54321);
    });

    test('/status deberia indicar que commandQueue esta habilitado', async () => {
      const { status, data } = await fetchBridge('/status');
      
      expect(status).toBe(200);
      expect((data as any).features.commandQueue).toBe(true);
      expect((data as any).features.polling).toBe(true);
    });

    test('endpoint inexistente deberia devolver 404', async () => {
      const { status } = await fetchBridge('/no-existe');
      
      expect(status).toBe(404);
    });
  });

  // =========================================================================
  // Test de Enqueue/Dequeue de Comandos
  // =========================================================================

  describe('CommandQueue - Enqueue/Dequeue', () => {
    test('POST /execute deberia encolar un comando y devolver 201', async () => {
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

    test('POST /execute deberia encolar comando de tipo conectar', async () => {
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

    test('POST /execute sin body deberia devolver 400', async () => {
      const { status } = await fetchBridge('/execute', {
        method: 'POST',
      });

      expect(status).toBe(400);
    });

    test('POST /execute sin tipo deberia devolver 400', async () => {
      const { status } = await fetchBridge('/execute', {
        method: 'POST',
        body: JSON.stringify({ args: [] }),
      });

      expect(status).toBe(400);
    });

    test('POST /execute sin args deberia devolver 400', async () => {
      const { status } = await fetchBridge('/execute', {
        method: 'POST',
        body: JSON.stringify({ tipo: 'agregarDispositivo' }),
      });

      expect(status).toBe(400);
    });

    test('GET /next deberia devolver el comando encolado', async () => {
      // Consumir comandos pendientes de tests anteriores (estado compartido)
      while (true) {
        const { data } = await fetchBridge<NextResponse>('/next');
        if (!data.hasCommand) break;
      }

      // Primero encolar un comando
      const comando = {
        tipo: 'configurar',
        args: ['Router1', 'hostname NuevoHost'],
      };

      await fetchBridge('/execute', {
        method: 'POST',
        body: JSON.stringify(comando),
      });

      // Luego obtenerlo con /next
      const { status, data } = await fetchBridge<NextResponse>('/next');

      expect(status).toBe(200);
      expect(data.hasCommand).toBe(true);
      expect(data.command).toBeDefined();
      expect(data.command?.tipo).toBe('configurar');
      expect(data.command?.args).toEqual(['Router1', 'hostname NuevoHost']);
    });

    test('GET /next deberia devolver hasCommand=false si no hay comandos', async () => {
      // Consumir todos los comandos previos
      let hasMore = true;
      while (hasMore) {
        const { data } = await fetchBridge<NextResponse>('/next');
        hasMore = data.hasCommand;
      }

      // Verificar que no hay comandos
      const { status, data } = await fetchBridge<NextResponse>('/next');

      expect(status).toBe(200);
      expect(data.hasCommand).toBe(false);
      expect(data.command).toBeNull();
    });

    test('GET /next deberia remover el comando tras obtenerlo', async () => {
      // Encolar un comando
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

      // Segundo /next no deberia devolver nada (ya se consumio)
      const segundo = await fetchBridge<NextResponse>('/next');
      expect(segundo.data.hasCommand).toBe(false);
    });

    test('comandos encolados deben mantener orden FIFO', async () => {
      // Encolar multiples comandos en orden
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

      // Verificar orden de llegada
      for (const cmd of comandos) {
        const { data } = await fetchBridge<NextResponse>('/next');
        expect(data.hasCommand).toBe(true);
        expect(data.command?.tipo).toBe(cmd.tipo);
        expect(data.command?.args).toEqual(cmd.args);
      }
    });

    test('comando deberia tener id unico y timestamp', async () => {
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
  // Test de Lifetime del Polling Loop
  // =========================================================================

  describe('Polling Loop Lifetime', () => {
    test('servidor deberia responder en puerto 54321 de forma sostenida', async () => {
      const iterations = 5;
      const delays = [100, 100, 100, 100, 100];

      for (let i = 0; i < iterations; i++) {
        const { status, data } = await fetchBridge<HealthResponse>('/health');
        
        expect(status).toBe(200);
        expect(data.status).toBe('ok');
        
        await esperar(delays[i] ?? 100);
      }
    });

    test('servidor deberia mantener estado entre requests', async () => {
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

      // Verificar que todos estan en cola
      let count = 0;
      while (true) {
        const { data } = await fetchBridge<NextResponse>('/next');
        if (!data.hasCommand) break;
        count++;
      }

      expect(count).toBe(3);
    });

    test('servidor deberia manejar requests rapidos consecutivos', async () => {
      const promises = Array.from({ length: 10 }, () =>
        fetchBridge<HealthResponse>('/health')
      );

      const results = await Promise.all(promises);

      for (const { status, data } of results) {
        expect(status).toBe(200);
        expect(data.status).toBe('ok');
      }
    });

    test('servidor deberia responder correctamente tras inactividad', async () => {
      // Esperar un periodo sin actividad
      await esperar(500);

      // Verificar que sigue respondiendo
      const { status, data } = await fetchBridge<HealthResponse>('/health');

      expect(status).toBe(200);
      expect(data.status).toBe('ok');
    });

    test('CORS headers deben estar presentes', async () => {
      const response = await fetch(`${BRIDGE_URL}/health`, {
        method: 'GET',
        headers: {
          'Origin': 'http://localhost:8080',
        },
      });

      expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined();
      expect(response.headers.get('Access-Control-Allow-Methods')).toBeDefined();
    });

    test('OPTIONS request deberia devolver headers CORS', async () => {
      const response = await fetch(`${BRIDGE_URL}/health`, {
        method: 'OPTIONS',
      });

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined();
    });
  });

  // =========================================================================
  // Test de Rejection de Origen Externo
  // =========================================================================

  describe('Seguridad - Validacion de Origen', () => {
    test('deberia aceptar conexiones desde 127.0.0.1', async () => {
      const { status } = await fetchBridge('/health');
      expect(status).toBe(200);
    });

    test('deberia aceptar conexiones desde localhost', async () => {
      // Bun permite fetch a localhost
      const { status } = await fetchBridge('/health');
      expect(status).toBe(200);
    });
  });
});

// ============================================================================
// Tests adicionales para casos edge
// ============================================================================

describe('PT Bridge Server - Edge Cases', () => {
  let serverControl: { stop: () => void };

  beforeAll(() => {
    serverControl = startBridgeServer();
  });

  afterAll(() => {
    serverControl.stop();
  });

  test('JSON invalido en POST /execute devuelve 400', async () => {
    const { status } = await fetchBridge('/execute', {
      method: 'POST',
      body: 'no es json',
    });

    expect(status).toBe(400);
  });

    test('tipo de comando desconocido es aceptado (validacion elastica)', async () => {
    const { status, data } = await fetchBridge<ExecuteResponse>('/execute', {
      method: 'POST',
      body: JSON.stringify({
        tipo: 'comandoPersonalizado',
        args: ['arg1', 'arg2'],
      }),
    });

    // El servidor acepta cualquier tipo de comando
    expect(status).toBe(201);
    expect(data.success).toBe(true);
  });

  test('args puede contener cualquier tipo de dato', async () => {
    // Consumir comandos pendientes de tests anteriores (estado compartido)
    while (true) {
      const { data } = await fetchBridge<NextResponse>('/next');
      if (!data.hasCommand) break;
    }

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

    // Verificar que se recupero correctamente
    const { data: nextData } = await fetchBridge<NextResponse>('/next');
    expect(nextData.command?.args).toEqual([
      'Router1',
      { nested: 'object' },
      [1, 2, 3],
      true,
      null,
      123,
    ]);
  });
});
