#!/usr/bin/env bun
/**
 * Módulo de automatización del Bridge para Cisco Packet Tracer
 * =============================================================
 * Este script proporciona funciones de automatización que pueden
 * ser invocadas directamente por el agente de IA para ejecutar
 * acciones sin intervención manual del usuario.
 * 
 * Uso:
 *   bun run .iflow/skills/cisco-networking-assistant/scripts/bridge-automation.ts <comando> [args]
 * 
 * Comandos disponibles:
 *   status          - Verifica el estado actual del sistema
 *   start           - Inicia el bridge server
 *   ensure-running  - Inicia el bridge si no está corriendo
 *   install         - Instala el bridge en Packet Tracer
 *   ensure-all      - Flujo completo: inicia bridge + instala en PT
 *   health          - Health check rápido del bridge
 *   stop            - Detiene el bridge server
 */

import { $ } from 'bun';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ============================================================================
// Constantes
// ============================================================================

const BRIDGE_PORT = parseInt(process.env.BRIDGE_PORT || '54321');
const BRIDGE_URL = `http://127.0.0.1:${BRIDGE_PORT}`;
const HEALTH_URL = `${BRIDGE_URL}/health`;
const STATUS_URL = `${BRIDGE_URL}/status`;
const DEFAULT_TIMEOUT = 5000; // 5 segundos

// ============================================================================
//Tipos
// ============================================================================

interface BridgeStatus {
  running: boolean;
  port: number;
  version: string;
  uptime: number;
  uptimeFormatted: string;
}

interface PTStatus {
  installed: boolean;
  path: string | null;
  running: boolean;
  version: string | null;
}

interface ConnectionStatus {
  connected: boolean;
  lastPoll: string | null;
  queueSize: number;
}

interface SystemStatus {
  bridge: BridgeStatus;
  packetTracer: PTStatus;
  connection: ConnectionStatus;
  ready: boolean; // True si todo está listo para trabajar
  issues: string[]; // Lista de problemas detectados
  recommendations: string[]; // Acciones recomendadas
}

interface AutomationResult {
  success: boolean;
  message: string;
  data?: unknown;
  nextSteps?: string[];
}

// ============================================================================
// Funciones de Detección
// ============================================================================

/**
 * Detecta si el bridge server está corriendo
 */
async function detectBridgeRunning(): Promise<BridgeStatus> {
  try {
    const response = await fetch(HEALTH_URL, {
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT)
    });
    
    if (!response.ok) {
      return {
        running: false,
        port: BRIDGE_PORT,
        version: 'unknown',
        uptime: 0,
        uptimeFormatted: '0s'
      };
    }
    const health = await response.json() as { status: string; version: string; uptime?: { seconds: number; formatted: string } };
    
    // Obtener status detallado
    const statusResponse = await fetch(STATUS_URL, {
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT)
    });
    
    let port = BRIDGE_PORT;
    if (statusResponse.ok) {
      const status = await statusResponse.json() as { server?: { port?: number } };
      port = status.server?.port ?? BRIDGE_PORT;
    }
    
    return {
      running: health.status === 'ok',
      port,
      version: health.version || '1.0.0',
      uptime: health.uptime?.seconds || 0,
      uptimeFormatted: health.uptime?.formatted || '0s'
    };
  } catch {
    return {
      running: false,
      port: BRIDGE_PORT,
      version: 'unknown',
      uptime: 0,
      uptimeFormatted: '0s'
    };
  }
}

/**
 * Detecta si Packet Tracer está instalado
 * En macOS, Packet Tracer está en un directorio que contiene el .app:
 * /Applications/Cisco Packet Tracer 9.0.0/Cisco Packet Tracer 9.0.app
 */
async function detectPacketTracerInstalled(): Promise<PTStatus> {
  const platform = process.platform;
  let installed = false;
  let path: string | null = null;
  let version: string | null = null;
  
  try {
    if (platform === 'darwin') {
      const { stdout } = await execAsync('ls /Applications | grep -i "packet tracer" || ls /Applications | grep -i "cisco packet"');
      const lines = stdout.trim().split('\n').filter(line => line.length > 0);
      
      if (lines.length > 0) {
        const latestDir = lines.sort().pop() || lines[0];
        const baseDir = `/Applications/${latestDir}`;
        
        try {
          const { stdout: appList } = await execAsync(`ls "${baseDir}" | grep -i ".app$" | grep -i "packet" | head -1`);
          const appName = appList.trim();
          
          if (appName) {
            path = `${baseDir}/${appName}`;
          } else {
            path = baseDir;
          }
        } catch {
          path = baseDir;
        }
        
        installed = true;
        const versionMatch = latestDir.match(/(\d+\.\d+(?:\.\d+)?)/);
        version = versionMatch ? versionMatch[1] : null;
      }
    } else if (platform === 'win32') {
      const { stdout } = await execAsync('dir "C:\\Program Files\\Cisco Packet Tracer*" /b 2>nul');
      if (stdout.trim()) {
        installed = true;
        path = `C:\\Program Files\\${stdout.trim()}`;
        const versionMatch = stdout.match(/(\d+\.\d+(?:\.\d+)?)/);
        version = versionMatch ? versionMatch[1] : null;
      }
    } else {
      const { stdout } = await execAsync('ls /opt 2>/dev/null | grep -i packettracer');
      if (stdout.trim()) {
        installed = true;
        path = `/opt/${stdout.trim()}`;
        const versionMatch = stdout.match(/(\d+\.\d+(?:\.\d+)?)/);
        version = versionMatch ? versionMatch[1] : null;
      }
    }
  } catch {
    // No encontrado
  }
  
  return { installed, path, running: false, version };
}

/**
 * Detecta si Packet Tracer está ejecutándose
 */
async function detectPacketTracerRunning(): Promise<boolean> {
  try {
    const platform = process.platform;
    let cmd: string;
    
    if (platform === 'darwin') {
      cmd = 'ps aux | grep -i "Packet Tracer" | grep -v grep';
    } else if (platform === 'win32') {
      cmd = 'tasklist | findstr /i "PacketTracer"';
    } else {
      cmd = 'ps aux | grep -i packettracer | grep -v grep';
    }
    
    const { stdout } = await execAsync(cmd);
    return stdout.length > 0;
  } catch {
    return false;
  }
}

/**
 * Verifica la conexión entre el bridge y Packet Tracer
 */
async function detectConnectionStatus(): Promise<ConnectionStatus> {
  try {
    const response = await fetch(`${BRIDGE_URL}/next`, {
      method: 'GET',
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT)
    });
    
    if (response.ok) {
      const data = await response.json() as { hasCommand?: boolean };
      return {
        connected: true,
        lastPoll: new Date().toISOString(),
        queueSize: data.hasCommand ? 1 : 0
      };
    }
    
    return {
      connected: false,
      lastPoll: null,
      queueSize: 0
    };
  } catch {
    return {
      connected: false,
      lastPoll: null,
      queueSize: 0
    };
  }
}

// ============================================================================
// Funciones de Estado Completo
// ============================================================================

/**
 * Obtiene el estado completo del sistema
 */
async function getFullStatus(): Promise<SystemStatus> {
  const [bridge, ptInstalled, ptRunning, connection] = await Promise.all([
    detectBridgeRunning(),
    detectPacketTracerInstalled(),
    detectPacketTracerRunning(),
    detectConnectionStatus()
  ]);
  
  const ptStatus: PTStatus = {
    ...ptInstalled,
    running: ptRunning
  };
  
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  // Detectar problemas
  if (!bridge.running) {
    issues.push('Bridge server no está ejecutándose');
    recommendations.push('Ejecutar: bun run .iflow/skills/cisco-networking-assistant/scripts/bridge-automation.ts start');
  }
  
  if (!ptStatus.installed) {
    issues.push('Packet Tracer no está instalado');
    recommendations.push('Descargar desde: https://www.netacad.com/courses/packet-tracer');
  } else if (!ptStatus.running) {
    issues.push('Packet Tracer no está ejecutándose');
    recommendations.push('Abrir Packet Tracer manualmente o ejecutar flujo ensure-all');
  }
  
  if (bridge.running && ptStatus.running && !connection.connected) {
    issues.push('Bridge y PT ejecutándose pero sin conexión');
    recommendations.push('Ejecutar: bun run .iflow/skills/cisco-networking-assistant/scripts/bridge-automation.ts install');
  }
  
  const ready = bridge.running && ptStatus.installed && ptStatus.running && connection.connected;
  
  return {
    bridge,
    packetTracer: ptStatus,
    connection,
    ready,
    issues,
    recommendations
  };
}

// ============================================================================
// Funciones de Acción
// ============================================================================

/**
 * Inicia el bridge server
 */
async function startBridge(): Promise<AutomationResult> {
  console.log('🚀 Iniciando Bridge Server...');
  
  // Verificar si ya está corriendo
  const status = await detectBridgeRunning();
  if (status.running) {
    return {
      success: true,
      message: `Bridge server ya está ejecutándose en puerto ${status.port}`,
      data: status,
      nextSteps: ['Verificar estado: bun run ... bridge-automation.ts status']
    };
  }
  
  // Iniciar el server en segundo plano
  try {
    const { spawn } = await import('child_process');
    const child = spawn('bun', ['run', 'src/bridge/server.ts'], {
      detached: true,
      stdio: 'ignore',
      cwd: process.cwd()
    });
    
    child.unref();
    
    // Esperar a que esté listo
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verificar que inició correctamente
    const newStatus = await detectBridgeRunning();
    if (newStatus.running) {
      return {
        success: true,
        message: `Bridge server iniciado exitosamente en puerto ${newStatus.port}`,
        data: newStatus,
        nextSteps: [
          'Verificar estado: bun run ... bridge-automation.ts status',
          'Instalar en PT: bun run ... bridge-automation.ts install'
        ]
      };
    }
    
    return {
      success: false,
      message: 'El bridge server no respondió después de iniciar',
      nextSteps: [
        'Verificar puerto disponible: lsof -i :54321',
        'Revisar logs de error',
        'Intentar con puerto diferente: BRIDGE_PORT=54322 bun run ...'
      ]
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
    return {
      success: false,
      message: `Error al iniciar bridge: ${errorMsg}`,
      nextSteps: [
        'Verificar que Bun esté instalado',
        'Ejecutar manualmente: bun run src/bridge/server.ts'
      ]
    };
  }
}

/**
 * Instala el bridge en Packet Tracer (macOS)
 */
async function installBridge(): Promise<AutomationResult> {
  console.log('🔧 Instalando Bridge en Packet Tracer...');
  
  const platform = process.platform;
  
  // Verificar estado actual
  const status = await getFullStatus();
  
  if (!status.bridge.running) {
    return {
      success: false,
      message: 'Bridge server no está ejecutándose',
      nextSteps: [
        'Iniciar bridge primero: bun run ... bridge-automation.ts start',
        'Luego ejecutar: bun run ... bridge-automation.ts install'
      ]
    };
  }
  
  if (!status.packetTracer.installed) {
    return {
      success: false,
      message: 'Packet Tracer no está instalado',
      nextSteps: [
        'Descargar desde: https://www.netacad.com/courses/packet-tracer',
        'Instalar Packet Tracer',
        'Luego ejecutar: bun run ... bridge-automation.ts install'
      ]
    };
  }
  
  if (platform !== 'darwin') {
    return {
      success: false,
      message: `Instalación automática solo disponible en macOS. Sistema actual: ${platform}`,
      nextSteps: [
        'En Windows/Linux, seguir instalación manual',
        'Consultar: docs/bridge-api-contract.md'
      ]
    };
  }
  
  // Verificar versión mínima
  const versionNum = status.packetTracer.version ? parseFloat(status.packetTracer.version) : 0;
  if (versionNum < 8) {
    return {
      success: false,
      message: `Versión de Packet Tracer no soportada: ${status.packetTracer.version}`,
      nextSteps: [
        'Actualizar a Packet Tracer 8.0 o superior',
        'Descargar desde: https://www.netacad.com/courses/packet-tracer'
      ]
    };
  }
  
  // Verificar si PT está corriendo
  if (!status.packetTracer.running) {
    console.log('📡 Iniciando Packet Tracer...');
    const ptPath = status.packetTracer.path;
    if (ptPath) {
      try {
        await execAsync(`open "${ptPath}"`);
        console.log('   Esperando que Packet Tracer esté listo...');
        await new Promise(resolve => setTimeout(resolve, 15000));
      } catch (error) {
        return {
          success: false,
          message: 'No se pudo iniciar Packet Tracer automáticamente',
          nextSteps: [
            'Abrir Packet Tracer manualmente',
            'Luego ejecutar: bun run ... bridge-automation.ts install'
          ]
        };
      }
    }
  }
  
  // Ejecutar script de instalación
  const scriptPath = './scripts/install-bridge-macos.scpt';
  
  try {
    const scriptExists = await Bun.file(scriptPath).exists();
    if (!scriptExists) {
      return {
        success: false,
        message: `Script de instalación no encontrado: ${scriptPath}`,
        nextSteps: [
          'Verificar que el proyecto esté completo',
          'Reclonar el repositorio si es necesario'
        ]
      };
    }
    
    console.log('   Ejecutando script de automatización...');
    const { stderr } = await execAsync(`osascript "${scriptPath}"`, { timeout: 60000 });
    
    if (stderr && (stderr.includes('not allowed') || stderr.includes('permission'))) {
      return {
        success: false,
        message: 'Permisos de Accesibilidad Denegados',
        nextSteps: [
          'Ve a: System Preferences > Security & Privacy > Privacy > Accessibility',
          'Agrega Terminal (o tu app de terminal) a la lista',
          'Vuelve a ejecutar: bun run ... bridge-automation.ts install'
        ]
      };
    }
    
    // Verificar conexión después de instalar
    await new Promise(resolve => setTimeout(resolve, 2000));
    const newStatus = await getFullStatus();
    
    if (newStatus.connection.connected) {
      return {
        success: true,
        message: 'Bridge instalado exitosamente',
        data: newStatus,
        nextSteps: [
          'Verificar estado: bun run ... bridge-automation.ts status',
          'Usar el bridge para enviar comandos a Packet Tracer'
        ]
      };
    }
    
    return {
      success: false,
      message: 'Bridge instalado pero sin conexión detectada',
      nextSteps: [
        'Verificar que Packet Tracer esté respondiendo',
        'Eliminar script antiguo y reinstalar',
        'Consultar troubleshooting en docs/bridge-api-contract.md'
      ]
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
    return {
      success: false,
      message: `Error durante instalación: ${errorMsg}`,
      nextSteps: [
        'Verificar permisos de AppleScript',
        'Abrir Packet Tracer manualmente',
        'Reintentar la instalación'
      ]
    };
  }
}

/**
 * Asegura que el bridge esté corriendo (lo inicia si no lo está)
 */
async function ensureBridgeRunning(): Promise<AutomationResult> {
  console.log('🔍 Verificando estado del Bridge...');
  
  const status = await detectBridgeRunning();
  
  if (status.running) {
    return {
      success: true,
      message: `Bridge server ya está ejecutándose (puerto ${status.port}, uptime: ${status.uptimeFormatted})`,
      data: status
    };
  }
  
  console.log('   Bridge no está corriendo, iniciando...');
  return startBridge();
}

/**
 * Flujo completo: asegura que todo esté listo para trabajar
 */
async function ensureAll(): Promise<AutomationResult> {
  console.log('🎯 Verificando sistema completo...\n');
  
  // Paso 1: Verificar estado actual
  let status = await getFullStatus();
  
  console.log(`   Bridge: ${status.bridge.running ? '✅' : '❌'}`);
  console.log(`   Packet Tracer: ${status.packetTracer.installed ? (status.packetTracer.running ? '✅' : '⚠️  (no ejecutándose)') : '❌'}`);
  console.log(`   Conexión: ${status.connection.connected ? '✅' : '❌'}\n`);
  
  // Si todo está listo, retornar
  if (status.ready) {
    return {
      success: true,
      message: 'Sistema listo para trabajar',
      data: status,
      nextSteps: [
        'Usar el bridge para enviar comandos a Packet Tracer',
        'Ver documentación en docs/bridge-api-contract.md'
      ]
    };
  }
  
  // Paso 2: Asegurar que el bridge esté corriendo
  if (!status.bridge.running) {
    console.log('   Iniciando Bridge Server...');
    const result = await startBridge();
    if (!result.success) {
      return result;
    }
  }
  
  // Paso 3: Verificar Packet Tracer
  if (!status.packetTracer.installed) {
    return {
      success: false,
      message: 'Packet Tracer no está instalado',
      data: status,
      nextSteps: [
        'Descargar desde: https://www.netacad.com/courses/packet-tracer',
        'Instalar Packet Tracer',
        'Luego ejecutar: bun run ... bridge-automation.ts ensure-all'
      ]
    };
  }
  
  if (!status.packetTracer.running) {
    console.log('   Iniciando Packet Tracer...');
    const ptPath = status.packetTracer.path;
    if (ptPath) {
      try {
        await execAsync(`open "${ptPath}"`);
        console.log('   Esperando que Packet Tracer esté listo (15s)...');
        await new Promise(resolve => setTimeout(resolve, 15000));
      } catch (error) {
        return {
          success: false,
          message: 'No se pudo iniciar Packet Tracer automáticamente',
          nextSteps: [
            'Abrir Packet Tracer manualmente',
            'Luego ejecutar: bun run ... bridge-automation.ts ensure-all'
          ]
        };
      }
    }
  }
  
  // Paso 4: Instalar bridge en PT si no está conectado
  await new Promise(resolve => setTimeout(resolve, 2000));
  status = await getFullStatus();
  
  if (!status.connection.connected) {
    console.log('   Instalando Bridge en Packet Tracer...');
    const installResult = await installBridge();
    if (!installResult.success) {
      return installResult;
    }
  }
  
  // Paso 5: Verificación final
  await new Promise(resolve => setTimeout(resolve, 1000));
  status = await getFullStatus();
  
  if (status.ready) {
    return {
      success: true,
      message: '🎉 Sistema completamente configurado y listo para trabajar',
      data: status,
      nextSteps: [
        'Usar el bridge para enviar comandos a Packet Tracer',
        'Ver documentación en docs/bridge-api-contract.md'
      ]
    };
  }
  
  return {
    success: false,
    message: 'No se pudo completar la configuración automática',
    data: status,
    nextSteps: status.recommendations
  };
}

/**
 * Detiene el bridge server
 */
async function stopBridge(): Promise<AutomationResult> {
  console.log('🛑 Deteniendo Bridge Server...');
  
  const platform = process.platform;
  let cmd: string;
  
  if (platform === 'darwin' || platform === 'linux') {
    cmd = `lsof -ti:${BRIDGE_PORT} | xargs kill -9 2>/dev/null || echo "No process found"`;
  } else {
    cmd = `for /f "tokens=5" %a in ('netstat -ano ^| findstr :${BRIDGE_PORT} ^| findstr LISTENING') do taskkill /PID %a /F`;
  }
  
  try {
    await execAsync(cmd);
    
    // Verificar que se detuvo
    await new Promise(resolve => setTimeout(resolve, 500));
    const status = await detectBridgeRunning();
    
    if (!status.running) {
      return {
        success: true,
        message: 'Bridge server detenido exitosamente'
      };
    }
    
    return {
      success: false,
      message: 'El bridge server sigue ejecutándose después del comando de detención'
    };
  } catch (error) {
    // Si no hay proceso, consideraréxito
    return {
      success: true,
      message: 'Bridge server detenido (o no estaba ejecutándose)'
    };
  }
}

/**
 * Health check rápido
 */
async function healthCheck(): Promise<AutomationResult> {
  try {
    const response = await fetch(HEALTH_URL, {
      signal: AbortSignal.timeout(2000)
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        message: 'Bridge server responde correctamente',
        data
      };
    }
    
    return {
      success: false,
      message: `Bridge server respondió con estado: ${response.status}`
    };
  } catch {
    return {
      success: false,
      message: 'Bridge server no está responding',
      nextSteps: [
        'Iniciar bridge: bun run ... bridge-automation.ts start',
        'Verificar puerto: lsof -i :54321'
      ]
    };
  }
}

// ============================================================================
// CLI Principal
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'status';
  
  console.log('');
  
  let result: AutomationResult;
  
  switch (command) {
    case 'status':
      const status = await getFullStatus();
      console.log('📊 Estado del Sistema');
      console.log('=====================\n');
      console.log(`Bridge Server:`);
      console.log(`  Estado:     ${status.bridge.running ? '🟢 Ejecutándose' : '🔴 Detenido'}`);
      console.log(`  Puerto:     ${status.bridge.port}`);
      console.log(`  Versión:    ${status.bridge.version}`);
      console.log(`  Uptime:     ${status.bridge.uptimeFormatted}`);
      console.log('');
      console.log(`Packet Tracer:`);
      console.log(`  Instalado:  ${status.packetTracer.installed ? '✅' : '❌'}`);
      if (status.packetTracer.installed) {
        console.log(`  Ruta:       ${status.packetTracer.path}`);
        console.log(`  Versión:    ${status.packetTracer.version || 'desconocida'}`);
      }
      console.log(`  Ejecutando: ${status.packetTracer.running ? '✅ Sí' : '❌ No'}`);
      console.log('');
      console.log(`Conexión:`);
      console.log(`  Estado:     ${status.connection.connected ? '🟢 Conectado' : '🔴 Sin conexión'}`);
      console.log(`  Cola:       ${status.connection.queueSize} comandos`);
      console.log('');
      
      if (!status.ready && status.issues.length > 0) {
        console.log('⚠️  Problemas detectados:');
        status.issues.forEach(issue => console.log(`   - ${issue}`));
        console.log('');
        console.log('💡 Acciones recomendadas:');
        status.recommendations.forEach(rec => console.log(`   - ${rec}`));
        console.log('');
      }
      
      result = {
        success: status.ready,
        message: status.ready ? '✅ Sistema listo para trabajar' : '❌ Sistema no está listo',
        data: status
      };
      break;
      
    case 'start':
      result = await startBridge();
      break;
      
    case 'stop':
      result = await stopBridge();
      break;
      
    case 'ensure-running':
      result = await ensureBridgeRunning();
      break;
      
    case 'install':
      result = await installBridge();
      break;
      
    case 'ensure-all':
      result = await ensureAll();
      break;
      
    case 'health':
      result = await healthCheck();
      break;
      
    default:
      result = {
        success: false,
        message: `Comando desconocido: ${command}`,
        nextSteps: [
          'Comandos disponibles: status, start, stop, ensure-running, install, ensure-all, health'
        ]
      };
  }
  
  console.log(result.message);
  
  if (result.nextSteps && result.nextSteps.length > 0) {
    console.log('\nPróximos pasos:');
    result.nextSteps.forEach((step, i) => console.log(`  ${i + 1}. ${step}`));
  }
  
  console.log('');
  process.exit(result.success ? 0 : 1);
}

main().catch(console.error);