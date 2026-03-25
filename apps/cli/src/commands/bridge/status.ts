import { Command } from 'commander';

interface BridgeStatusResponse {
  bridge: { name: string; version: string; status: 'running' | 'stopped' };
  server: { host: string; port: number; startedAt: string; uptime: string; uptimeSeconds: number };
  connection: { type: string; allowedOrigins: string[]; maxQueueSize: number };
  features: { cors: boolean; commandQueue: boolean; polling: boolean };
}

interface HealthResponse {
  status: 'ok' | 'error';
  version: string;
  timestamp: string;
  uptime: { seconds: number; formatted: string };
}

interface PTConnectionStatus {
  connected: boolean;
  lastPoll: string | null;
  queueSize: number;
}

interface PTStatus {
  installed: boolean;
  path: string | null;
  running: boolean;
  version: string | null;
}

interface BridgeStatus {
  running: boolean;
  port: number;
  version: string;
  uptime: number;
  uptimeFormatted: string;
}

interface StatusOutput {
  bridge: BridgeStatus;
  packetTracer: PTStatus;
  connection: PTConnectionStatus;
}

async function detectarPacketTracerInstalado(): Promise<{ instalado: boolean; ruta: string | null; version: string | null }> {
  try {
    const { readdirSync } = await import('fs');
    const ApplicationsPath = '/Applications';
    const entradas = readdirSync(ApplicationsPath);
    
    const packetTracerDir = entradas.find(e => e.startsWith('Cisco Packet Tracer') && e.endsWith('.app'));
    
    if (!packetTracerDir) {
      return { instalado: false, ruta: null, version: null };
    }
    
    const ruta = `${ApplicationsPath}/${packetTracerDir}`;
    const match = packetTracerDir.match(/(\d+\.\d+(?:\.\d+)?)/);
    const version = match ? (match[1] ?? null) : null;
    
    return { instalado: true, ruta, version };
  } catch {
    return { instalado: false, ruta: null, version: null };
  }
}

async function detectarPacketTracerEjecutando(): Promise<boolean> {
  try {
    const { execSync } = await import('child_process');
    const resultado = execSync('ps aux | grep -i "packet tracer" | grep -v grep', { encoding: 'utf-8' });
    return resultado.includes('Packet Tracer') || resultado.includes('packettracer');
  } catch {
    return false;
  }
}

async function obtenerEstadoConexion(): Promise<PTConnectionStatus> {
  try {
    const response = await fetch('http://127.0.0.1:54321/next', { 
      method: 'GET',
      signal: AbortSignal.timeout(2000)
    });
    
    if (response.ok) {
      const data = await response.json() as { hasCommand: boolean };
      return {
        connected: true,
        lastPoll: new Date().toISOString(),
        queueSize: data.hasCommand ? 1 : 0
      };
    }
    
    return { connected: false, lastPoll: null, queueSize: 0 };
  } catch {
    return { connected: false, lastPoll: null, queueSize: 0 };
  }
}

async function obtenerEstadoBridge(): Promise<{ ok: boolean; status?: BridgeStatus; error?: string }> {
  try {
    const healthResponse = await fetch('http://127.0.0.1:54321/health', {
      signal: AbortSignal.timeout(2000)
    });
    
    if (!healthResponse.ok) {
      return { ok: false, error: 'Bridge no responde correctamente' };
    }
    
    const healthData = await healthResponse.json() as HealthResponse;
    
    const statusResponse = await fetch('http://127.0.0.1:54321/status', {
      signal: AbortSignal.timeout(2000)
    });
    
    if (!statusResponse.ok) {
      return { ok: false, error: 'No se pudo obtener status detallado' };
    }
    
    const statusData = await statusResponse.json() as BridgeStatusResponse;
    
    return {
      ok: true,
      status: {
        running: healthData.status === 'ok',
        port: statusData.server.port,
        version: healthData.version,
        uptime: healthData.uptime.seconds,
        uptimeFormatted: healthData.uptime.formatted
      }
    };
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error desconocido';
    return { ok: false, error: `Bridge server no está ejecutándose: ${mensaje}` };
  }
}

async function obtenerEstadoCompleto(): Promise<StatusOutput> {
  const [bridgeEstado, ptInstalado, ptEjecutando, conexionEstado] = await Promise.all([
    obtenerEstadoBridge(),
    detectarPacketTracerInstalado(),
    detectarPacketTracerEjecutando(),
    obtenerEstadoConexion()
  ]);
  
  return {
    bridge: bridgeEstado.ok && bridgeEstado.status
      ? bridgeEstado.status
      : { running: false, port: 54321, version: 'desconocida', uptime: 0, uptimeFormatted: '0s' },
    packetTracer: {
      installed: ptInstalado.instalado,
      path: ptInstalado.ruta,
      running: ptEjecutando,
      version: ptInstalado.version
    },
    connection: conexionEstado
  };
}

function formatearSalidaTexto(estado: StatusOutput): void {
  console.log('\n🔌 Bridge Server Status');
  console.log('========================');
  
  if (estado.bridge.running) {
    console.log(`Estado:     🟢 Ejecutando`);
    console.log(`Puerto:     ${estado.bridge.port}`);
    console.log(`Versión:    ${estado.bridge.version}`);
    console.log(`Uptime:     ${estado.bridge.uptimeFormatted}`);
  } else {
    console.log('Estado:     🔴 Detenido');
    console.log('\n   Ejecuta: cisco-auto bridge start');
  }
  
  console.log('');
  console.log('📦 Packet Tracer');
  console.log('=================');
  
  if (estado.packetTracer.installed) {
    console.log(`Instalado:  ✅ ${estado.packetTracer.path}`);
    console.log(`Ejecutando: ${estado.packetTracer.running ? '✅ Sí' : '❌ No'}`);
    console.log(`Versión:    ${estado.packetTracer.version || 'desconocida'}`);
  } else {
    console.log('Instalado:  ❌ No');
    console.log('\n   Packet Tracer no está instalado.');
    console.log('   Descárgalo desde netacad.com');
  }
  
  console.log('');
  console.log('🔗 Conexión');
  console.log('===========');
  
  if (estado.bridge.running && estado.packetTracer.running) {
    console.log(`Estado:     ${estado.connection.connected ? '🟢 Conectado' : '🟡 Sin conexión'}`);
    console.log(`Comandos en cola: ${estado.connection.queueSize}`);
  } else if (!estado.bridge.running) {
    console.log('Estado:     🔴 Bridge detenido');
  } else {
    console.log('Estado:     🟡 PT no está ejecutándose');
  }
  
  console.log('');
}

function formatearSalidaJson(estado: StatusOutput): void {
  const output = {
    bridge: {
      running: estado.bridge.running,
      port: estado.bridge.port,
      version: estado.bridge.version,
      uptime: estado.bridge.uptime
    },
    packetTracer: {
      installed: estado.packetTracer.installed,
      path: estado.packetTracer.path,
      running: estado.packetTracer.running,
      version: estado.packetTracer.version
    },
    connection: {
      connected: estado.connection.connected,
      lastPoll: estado.connection.lastPoll,
      queueSize: estado.connection.queueSize
    }
  };
  
  console.log(JSON.stringify(output, null, 2));
}

export function createStatusCommand(): Command {
  return new Command('status')
    .description('Muestra el estado del bridge server y Packet Tracer')
    .option('--json-output', 'Salida en formato JSON', false)
    .action(async (options) => {
      const estado = await obtenerEstadoCompleto();
      
      if (options.jsonOutput) {
        formatearSalidaJson(estado);
      } else {
        formatearSalidaTexto(estado);
      }
      
      if (!estado.bridge.running) {
        process.exit(1);
      }
      
      process.exit(0);
    });
}
