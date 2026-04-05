#!/usr/bin/env bun
/**
 * Comando doctor - Diagnóstico del sistema PT
 * Valida el estado del entorno de desarrollo y runtime.
 */

import { Command } from 'commander';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { getDefaultDevDir, getLogsDir, getHistoryDir, getResultsDir } from '../system/paths.ts';
import type { VerificationCheck } from '../contracts/cli-result.ts';
import type { CliResult } from '../contracts/cli-result.ts';
import { createPTController } from '@cisco-auto/pt-control';

interface DoctorCheckResult {
  name: string;
  ok: boolean;
  message: string;
  details?: string;
}

interface DoctorOptions {
  verbose: boolean;
  json: boolean;
}

export function createDoctorCommand(): Command {
  return new Command('doctor')
    .description('Diagnóstico del sistema - verifica el entorno de PT')
    .option('-v, --verbose', 'Salida detallada', false)
    .option('--json', 'Salida en JSON', false)
    .action(async (options: DoctorOptions) => {
      await runDiagnostics(options.verbose, options.json);
    });
}

async function runDiagnostics(verbose: boolean, jsonOutput: boolean): Promise<void> {
  const checks: DoctorCheckResult[] = [];
  const ptDevDir = process.env.PT_DEV_DIR ?? getDefaultDevDir();

  console.log('\n🩺 Ejecutando diagnóstico del sistema...\n');

  checks.push(checkPtDevDirectory(ptDevDir, verbose));
  
  const logsDir = getLogsDir();
  checks.push(checkLogDirectory(logsDir, verbose));
  
  const historyDir = getHistoryDir();
  checks.push(checkHistoryDirectory(historyDir, verbose));
  
  const resultsDir = getResultsDir();
  checks.push(checkResultsDirectory(resultsDir, verbose));
  
  checks.push(checkRuntimeFiles(ptDevDir, verbose));
  
  // Prefer bridge/controller for heartbeat and live status (Phase 5)
  {
    const controller = createPTController({ devDir: ptDevDir });
    try {
      await controller.start();
      const hb = controller.getHeartbeat();
      const hbHealth = controller.getHeartbeatHealth();
      const systemCtx = controller.getSystemContext();

      checks.push({
        name: 'heartbeat-present',
        ok: hb !== null,
        message: hb ? `Heartbeat encontrado` : 'Archivo heartbeat.json no encontrado',
        details: verbose ? JSON.stringify(hb, null, 2) : undefined,
      });

      checks.push({
        name: 'heartbeat-health',
        ok: hbHealth.state === 'ok',
        message: `Heartbeat estado: ${hbHealth.state}${hbHealth.ageMs ? ` (${hbHealth.ageMs}ms)` : ''}`,
        details: verbose ? JSON.stringify(hbHealth, null, 2) : undefined,
      });

      checks.push({
        name: 'bridge-status',
        ok: systemCtx.bridgeReady,
        message: `Bridge ready: ${systemCtx.bridgeReady ? 'yes' : 'no'}`,
        details: verbose ? JSON.stringify(systemCtx, null, 2) : undefined,
      });

      checks.push({
        name: 'topology-materialized',
        ok: systemCtx.topologyMaterialized,
        message: systemCtx.topologyMaterialized ? 'Topología materializada' : 'Topología no materializada',
        details: verbose ? `devices: ${systemCtx.deviceCount}, links: ${systemCtx.linkCount}` : undefined,
      });
    } catch (err) {
      checks.push({
        name: 'bridge-connect',
        ok: false,
        message: 'No se pudo inicializar el controller/bridge',
        details: String(err),
      });
    } finally {
      try { await controller.stop(); } catch {}
    }
  }

  if (jsonOutput) {
    const result: CliResult = {
      schemaVersion: '1.0',
      ok: checks.every(c => c.ok),
      action: 'doctor',
      data: {
        checks: checks.map(c => ({
          name: c.name,
          ok: c.ok,
          message: c.message,
          details: c.details,
        })),
      },
      verification: {
        verified: checks.every(c => c.ok),
        checks: checks.map(c => ({
          name: c.name,
          ok: c.ok,
          details: { message: c.message, details: c.details },
        })),
      },
    };
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log('═'.repeat(60));
  console.log('RESULTADOS DEL DIAGNÓSTICO');
  console.log('═'.repeat(60));
  console.log('');

  let passedCount = 0;
  let failedCount = 0;

  for (const check of checks) {
    const icon = check.ok ? '✅' : '❌';
    const status = check.ok ? 'PASS' : 'FAIL';
    
    console.log(`${icon} [${status}] ${check.name}`);
    console.log(`   ${check.message}`);
    
    if (verbose && check.details) {
      console.log(`   Details: ${check.details}`);
    }
    console.log('');

    if (check.ok) {
      passedCount++;
    } else {
      failedCount++;
    }
  }

  console.log('═'.repeat(60));
  console.log(`Resumen: ${passedCount} passed, ${failedCount} failed`);
  console.log('═'.repeat(60));
  console.log('');

  if (failedCount > 0) {
    console.log('💡 Recomendaciones:');
    console.log('   - Ejecuta "pt build" para desplegar archivos a ~/pt-dev/');
    console.log('   - Asegúrate de que Packet Tracer esté ejecutándose');
    console.log('   - Carga ~/pt-dev/main.js en Packet Tracer');
    console.log('   - Revisa "pt logs errors" para errores recientes');
  } else {
    console.log('✅ El sistema está listo para usar.');
  }
  console.log('');
}

function checkPtDevDirectory(ptDevDir: string, verbose: boolean): DoctorCheckResult {
  const name = 'pt-dev-accessible';
  
  if (!existsSync(ptDevDir)) {
    return {
      name,
      ok: false,
      message: `El directorio ${ptDevDir} no existe`,
      details: 'Ejecuta "pt build" para crear el directorio y desplegar archivos',
    };
  }

  try {
    statSync(ptDevDir);
    return {
      name,
      ok: true,
      message: `Directorio pt-dev accesible: ${ptDevDir}`,
      details: verbose ? `Modo: ${statSync(ptDevDir).mode.toString(8)}` : undefined,
    };
  } catch (e) {
    return {
      name,
      ok: false,
      message: `No se puede acceder a ${ptDevDir}`,
      details: String(e),
    };
  }
}

function checkLogDirectory(logsDir: string, verbose: boolean): DoctorCheckResult {
  const name = 'logs-writable';
  
  if (!existsSync(logsDir)) {
    try {
      require('node:fs').mkdirSync(logsDir, { recursive: true });
      return {
        name,
        ok: true,
        message: `Directorio de logs creado: ${logsDir}`,
      };
    } catch (e) {
      return {
        name,
        ok: false,
        message: `No se pudo crear el directorio de logs`,
        details: String(e),
      };
    }
  }

  return {
    name,
    ok: true,
    message: `Directorio de logs accesible: ${logsDir}`,
    details: verbose ? `${readdirSync(logsDir).length} archivos` : undefined,
  };
}

function checkHistoryDirectory(historyDir: string, verbose: boolean): DoctorCheckResult {
  const name = 'history-writable';
  
  if (!existsSync(historyDir)) {
    try {
      require('node:fs').mkdirSync(historyDir, { recursive: true });
      return {
        name,
        ok: true,
        message: `Directorio de historial creado: ${historyDir}`,
      };
    } catch (e) {
      return {
        name,
        ok: false,
        message: `No se pudo crear el directorio de historial`,
        details: String(e),
      };
    }
  }

  return {
    name,
    ok: true,
    message: `Directorio de historial accesible: ${historyDir}`,
    details: verbose ? `${readdirSync(historyDir).length} archivos` : undefined,
  };
}

function checkResultsDirectory(resultsDir: string, verbose: boolean): DoctorCheckResult {
  const name = 'results-writable';
  
  if (!existsSync(resultsDir)) {
    try {
      require('node:fs').mkdirSync(resultsDir, { recursive: true });
      return {
        name,
        ok: true,
        message: `Directorio de resultados creado: ${resultsDir}`,
      };
    } catch (e) {
      return {
        name,
        ok: false,
        message: `No se pudo crear el directorio de resultados`,
        details: String(e),
      };
    }
  }

  return {
    name,
    ok: true,
    message: `Directorio de resultados accesible: ${resultsDir}`,
    details: verbose ? `${readdirSync(resultsDir).length} archivos` : undefined,
  };
}

function checkRuntimeFiles(ptDevDir: string, verbose: boolean): DoctorCheckResult {
  const name = 'runtime-present';
  
  const mainJs = join(ptDevDir, 'main');
  const runtimeJs = join(ptDevDir, 'runtime');
  
  const files: string[] = [];
  if (existsSync(mainJs)) files.push('main');
  if (existsSync(runtimeJs)) files.push('runtime');
  
  if (files.length === 0) {
    return {
      name,
      ok: false,
      message: 'Archivos de runtime no encontrados',
      details: 'Ejecuta "pt build" para generar los archivos',
    };
  }

  return {
    name,
    ok: true,
    message: `Archivos de runtime presentes: ${files.join(', ')}`,
    details: verbose ? `Ruta: ${ptDevDir}` : undefined,
  };
}

function checkHeartbeat(ptDevDir: string, verbose: boolean): DoctorCheckResult {
  const name = 'heartbeat-present';
  
  const heartbeatPath = join(ptDevDir, 'heartbeat.json');
  
  if (!existsSync(heartbeatPath)) {
    return {
      name,
      ok: false,
      message: 'Archivo heartbeat.json no encontrado',
      details: 'El runtime de PT debe crear este archivo',
    };
  }

  try {
    const content = readFileSync(heartbeatPath, 'utf-8');
    const heartbeat = JSON.parse(content);
    const timestamp = heartbeat.timestamp ?? heartbeat.lastSeen;
    
    if (!timestamp) {
      return {
        name,
        ok: false,
        message: 'Heartbeat sin timestamp',
        details: 'El archivo existe pero no tiene información de tiempo',
      };
    }

    return {
      name,
      ok: true,
      message: `Heartbeat encontrado: ${timestamp}`,
      details: verbose ? JSON.stringify(heartbeat, null, 2) : undefined,
    };
  } catch (e) {
    return {
      name,
      ok: false,
      message: 'No se pudo leer el heartbeat',
      details: String(e),
    };
  }
}

function checkPacketTracerStatus(ptDevDir: string, verbose: boolean): DoctorCheckResult {
  const name = 'heartbeat-fresh';
  
  const heartbeatPath = join(ptDevDir, 'heartbeat.json');
  
  if (!existsSync(heartbeatPath)) {
    return {
      name,
      ok: false,
      message: 'No se puede verificar estado de PT',
      details: 'Heartbeat no existe - Packet Tracer puede no estar ejecutándose',
    };
  }

  try {
    const content = readFileSync(heartbeatPath, 'utf-8');
    const heartbeat = JSON.parse(content);
    const timestamp = heartbeat.timestamp ?? heartbeat.lastSeen;
    
    if (!timestamp) {
      return {
        name,
        ok: false,
        message: 'Heartbeat sin timestamp válido',
        details: 'No se puede determinar la frescura',
      };
    }

    const heartbeatTime = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - heartbeatTime.getTime();
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec > 60) {
      return {
        name,
        ok: false,
        message: `Heartbeat stale: hace ${diffSec}s`,
        details: 'Packet Tracer puede no estar activo',
      };
    }

    return {
      name,
      ok: true,
      message: `Packet Tracer activo (heartbeat hace ${diffSec}s)`,
    };
  } catch (e) {
    return {
      name,
      ok: false,
      message: 'Error al verificar estado de Packet Tracer',
      details: String(e),
    };
  }
}