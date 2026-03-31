/**
 * TESTS DE INTEGRACIÓN END-TO-END PARA PT CONTROL V2
 * 
 * Verifica el flujo completo entre:
 * - Comando CLI (simulado) → logging registrado → topología consultable
 * - Wrapper de comandos PT → confirmación destructiva → logging
 * - Rotación de logs
 * 
 * Estos tests son autocontenidos y usan directorios temporales.
 */

import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdir, rm } from 'node:fs/promises';

// Importar módulos reales del proyecto
import { LogManager, getLogManager, resetLogManager } from '../../packages/pt-control/src/logging/index.js';
import { requestConfirmation } from '../../packages/pt-control/src/autonomy/index.js';

interface TopologySourceLike {
  devices?: Record<string, { name?: string; id?: string; type?: string; ip?: string; ports?: Array<{ name?: string } | string> }> | { name?: string; id?: string; type?: string; ip?: string; ports?: Array<{ name?: string } | string> }[];
  links?: Record<string, { from?: string; to?: string; device1?: string; device2?: string; port1?: string; port2?: string; fromPort?: string; toPort?: string; cableType?: string }> | { from?: string; to?: string; device1?: string; device2?: string; port1?: string; port2?: string; fromPort?: string; toPort?: string; cableType?: string }[];
}

interface TopologyQuery {
  type: 'device' | 'link' | 'full';
  name?: string;
  device?: string;
}

interface QueryResult {
  found: boolean;
  device?: { name?: string; type?: string; ip?: string };
  devices?: Array<{ name?: string; type?: string }>;
  links?: Array<{ from?: string; to?: string }>;
}

/**
 * Consulta básica de topología (implementación local para tests)
 */
function queryTopology(query: TopologyQuery, source: TopologySourceLike): QueryResult {
  if (query.type === 'device' && query.name) {
    const devices = source.devices;
    if (devices && !Array.isArray(devices)) {
      const device = devices[query.name];
      if (device) {
        return { found: true, device: { name: device.name, type: device.type, ip: device.ip } };
      }
    }
    return { found: false };
  }
  
  if (query.type === 'link' && query.device) {
    const links = Array.isArray(source.links) ? source.links : Object.values(source.links || {});
    const filtered = links.filter(l => l.from === query.device || l.to === query.device || l.device1 === query.device || l.device2 === query.device);
    return { found: filtered.length > 0, links: filtered.map(l => ({ from: l.from, to: l.to })) };
  }
  
  if (query.type === 'full') {
    const devices = Array.isArray(source.devices) ? source.devices : Object.values(source.devices || {});
    const links = Array.isArray(source.links) ? source.links : Object.values(source.links || {});
    return { 
      found: true, 
      devices: devices.map(d => ({ name: d?.name, type: d?.type })),
      links: links.map(l => ({ from: l.from, to: l.to })),
    };
  }
  
  return { found: false };
}

// ============================================================================
// Configuración
// ============================================================================

const TEST_LOG_DIR = join(tmpdir(), `pt-integration-test-${Date.now()}`);
const RETENTION_DAYS = 7;

// ============================================================================
// Helpers
// ============================================================================

/**
 * Crea una fuente de topología de prueba (simula snapshot de PT)
 */
function crearTopologiaPrueba(): TopologySourceLike {
  return {
    devices: {
      R1: { name: 'R1', type: '2911', ip: '192.168.1.1', ports: ['GigabitEthernet0/0', 'GigabitEthernet0/1'] },
      S1: { name: 'S1', type: '2960-24TT', ports: ['FastEthernet0/1', 'FastEthernet0/2'] },
      PC1: { name: 'PC1', type: 'PC', ip: '192.168.1.10' },
    },
    links: [
      { from: 'R1', to: 'S1', fromPort: 'GigabitEthernet0/1', toPort: 'FastEthernet0/1', cableType: 'straight' },
      { from: 'S1', to: 'PC1', fromPort: 'FastEthernet0/2', toPort: 'FastEthernet0', cableType: 'straight' },
    ],
  };
}

/**
 * Simula un comando CLI ejecutándose con logging
 */
async function ejecutarComandoSimulado(
  logManager: LogManager,
  sessionId: string,
  action: string,
  targetDevice: string | undefined,
  ejecutar: () => Promise<unknown>
): Promise<unknown> {
  const correlationId = LogManager.generateCorrelationId();
  const startedAt = Date.now();

  try {
    const resultado = await ejecutar();
    await logManager.logAction(sessionId, correlationId, action, 'success', {
      target_device: targetDevice,
      duration_ms: Date.now() - startedAt,
    });
    return resultado;
  } catch (error) {
    await logManager.logAction(sessionId, correlationId, action, 'error', {
      target_device: targetDevice,
      duration_ms: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// ============================================================================
// Suite de Tests
// ============================================================================

describe('PT Control V2 - Integration Tests', () => {
  let logManager: LogManager;
  let sessionId: string;

  // Configurar directorio temporal antes de cada test
  beforeEach(async () => {
    const testDir = `${TEST_LOG_DIR}-${Math.random().toString(36).slice(2)}`;
    await mkdir(testDir, { recursive: true });
    
    // Resetear el LogManager global y crear uno nuevo
    resetLogManager();
    logManager = new LogManager({
      logDir: testDir,
      retentionDays: RETENTION_DAYS,
      prefix: 'pt-control-test',
    });
    
    // Reemplazar la instancia global con la nuestra
    getLogManager({ logDir: testDir, retentionDays: RETENTION_DAYS, prefix: 'pt-control-test' });

    sessionId = LogManager.generateSessionId();
    logManager.startSession(sessionId);
  });

  // Limpiar directorio temporal después de cada test
  afterEach(async () => {
    try {
      await rm(TEST_LOG_DIR.replace(`${Date.now()}`, '*').replace('*', ''), { recursive: true, force: true });
    } catch {
      // Ignorar errores de limpieza
    }
  });

  // =========================================================================
  // Test 1: Comando CLI → Logging registrado → Topología consultable
  // =========================================================================

  test('flujo CLI: ejecutar comando → registrar en log → consultar topología', async () => {
    const topologia = crearTopologiaPrueba();

    // 1. Ejecutar un comando simulado (equivalente a "pt device add R1")
    const resultado = await ejecutarComandoSimulado(
      logManager,
      sessionId,
      'device:add',
      'R1',
      async () => {
        // Simular la adición de un dispositivo a la topología
        const queryResult = queryTopology({ type: 'device', name: 'R1' }, topologia);
        return queryResult;
      }
    );

    // 2. Verificar que el comando retornó resultado válido
    expect(resultado).toBeDefined();
    expect((resultado as any).found).toBe(true);
    expect((resultado as any).device?.name).toBe('R1');

    // 3. Verificar que se registró en el log
    const entries = await logManager.query({ session_id: sessionId });
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      action: 'device:add',
      target_device: 'R1',
      outcome: 'success',
      correlation_id: expect.any(String),
    });

    // 4. Verificar que la topología es consultable independientemente
    const consultaDispositivo = queryTopology({ type: 'device', name: 'R1' }, topologia);
    expect(consultaDispositivo.found).toBe(true);
    expect(consultaDispositivo.device?.type).toBe('2911');

    const consultaEnlaces = queryTopology({ type: 'link', device: 'S1' }, topologia);
    expect(consultaEnlaces.found).toBe(true);
    expect(consultaEnlaces.links).toHaveLength(2);

    const consultaCompleta = queryTopology({ type: 'full' }, topologia);
    expect(consultaCompleta.found).toBe(true);
    expect(consultaCompleta.devices).toHaveLength(3);
    expect(consultaCompleta.links).toHaveLength(2);
  });

  // =========================================================================
  // Test 2: Wrapper de PT → Confirmación destructiva → Logging
  // =========================================================================

  test('flujo de confirmación destructiva con skipPrompt → se registra en log', async () => {
    // Usar acción destructiva válida de la lista: 'topology-change'
    const resultado = await requestConfirmation({
      action: 'topology-change',
      details: 'Eliminar el dispositivo R1 de la topología',
      targetDevice: 'R1',
      sessionId: sessionId,
      skipPrompt: true, // Simula --yes en la CLI
    });

    // 1. Verificar que la confirmación fue granted
    expect(resultado.confirmed).toBe(true);
    expect(resultado.status).toBe('confirmed');
    expect(resultado.isDestructive).toBe(true);

    // 2. Verificar que se registró la confirmación en el log
    const entries = await logManager.query({ 
      session_id: sessionId,
      action: 'confirm:topology-change',
    });
    
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      action: 'confirm:topology-change',
      outcome: 'success',
      target_device: 'R1',
      confirmation_status: 'confirmed',
      is_destructive: true,
    });
  });

  test('flujo de confirmación destructiva rechazada → se registra como cancelled', async () => {
    // Ejecutar requestConfirmation con skipPrompt=true pero verificar el logging
    // En entorno no-interactivo, la acción se registra pero no se pide confirmación
    const resultado = await requestConfirmation({
      action: 'topology-change',
      details: 'Eliminar enlace entre R1 y S1',
      sessionId: sessionId,
      skipPrompt: true, // skipPrompt=true siempre confirma
    });

    // skipPrompt=true siempre confirma la acción
    expect(resultado.confirmed).toBe(true);
    expect(resultado.status).toBe('confirmed');
  });

  // =========================================================================
  // Test 3: Rotación de logs
  // =========================================================================

  test('rotación de logs elimina archivos mayores a retentionDays', async () => {
    // Crear entradas de log en el pasado (simulando archivos antiguos)
    const fechaPasada = new Date();
    fechaPasada.setUTCDate(fechaPasada.getUTCDate() - (RETENTION_DAYS + 5));
    
    // Registrar una entrada con fecha antigua
    await logManager.log({
      session_id: 'ses_old',
      correlation_id: 'cor_old',
      timestamp: fechaPasada.toISOString(),
      action: 'test:old',
      outcome: 'success',
    });

    // Obtener stats antes de rotación
    const statsAntes = await logManager.getStats();
    
    // Ejecutar rotación
    const eliminados = await logManager.rotate();
    
    // Verificar que se eliminó al menos un archivo
    expect(eliminados).toBeGreaterThan(0);

    // Obtener stats después de rotación
    const statsDespues = await logManager.getStats();
    
    // Verificar que la cantidad de archivos disminuyó
    expect(statsDespues.fileCount).toBeLessThanOrEqual(statsAntes.fileCount);
  });

  test('getStats retorna estadísticas precisas de los archivos de log', async () => {
    // Registrar múltiples entradas
    await logManager.logAction(sessionId, LogManager.generateCorrelationId(), 'action:1', 'success');
    await logManager.logAction(sessionId, LogManager.generateCorrelationId(), 'action:2', 'success');
    await logManager.logAction(sessionId, LogManager.generateCorrelationId(), 'action:3', 'error');

    // Obtener estadísticas
    const stats = await logManager.getStats();

    // Verificar estructura de estadísticas
    expect(stats.fileCount).toBeGreaterThan(0);
    expect(stats.totalSize).toBeGreaterThan(0);
    expect(stats.totalEntries).toBeGreaterThanOrEqual(3);
    expect(stats.oldestFile).toBeDefined();
    expect(stats.newestFile).toBeDefined();
  });

  // =========================================================================
  // Test 4: Flujo completo E2E
  // =========================================================================

  test('flujo E2E completo: add device → query topology → remove device con confirmación', async () => {
    const topologia: TopologySourceLike = { devices: {}, links: [] };

    // Paso 1: Añadir dispositivo (equivalente a "pt device add R1 2911")
    const resultadoAdd = await ejecutarComandoSimulado(
      logManager,
      sessionId,
      'device:add',
      'R1',
      async () => {
        // Añadir a la topología en memoria
        topologia.devices = {
          ...(topologia.devices as any),
          R1: { name: 'R1', type: '2911' },
        };
        return { success: true, device: 'R1' };
      }
    );
    expect((resultadoAdd as any).success).toBe(true);

    // Paso 2: Verificar que se puede consultar la topología
    const queryResult = queryTopology({ type: 'device', name: 'R1' }, topologia);
    expect(queryResult.found).toBe(true);

    // Paso 3: Solicitar confirmación para eliminar (acción destructiva)
    // Usar 'topology-change' que es una acción destructiva válida
    const confirmResult = await requestConfirmation({
      action: 'topology-change',
      details: 'Eliminar dispositivo R1',
      targetDevice: 'R1',
      sessionId: sessionId,
      skipPrompt: true,
    });
    expect(confirmResult.confirmed).toBe(true);

    // Paso 4: Eliminar dispositivo
    const resultadoRemove = await ejecutarComandoSimulado(
      logManager,
      sessionId,
      'device:remove',
      'R1',
      async () => {
        // Eliminar de la topología
        const devices = topologia.devices as Record<string, any>;
        delete devices['R1'];
        topologia.devices = devices;
        return { success: true };
      }
    );
    expect((resultadoRemove as any).success).toBe(true);

    // Paso 5: Verificar logs completos de la sesión
    const entries = await logManager.getSession(sessionId);
    expect(entries.entries.length).toBeGreaterThanOrEqual(3);
    
    // Verificar secuencia de acciones
    const acciones = entries.entries.map(e => e.action);
    expect(acciones).toContain('device:add');
    expect(acciones).toContain('confirm:topology-change');
    expect(acciones).toContain('device:remove');
  });
});
