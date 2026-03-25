import { serve } from 'bun';
import { exec } from 'child_process';
import { handleHealth, handleStatus, resetServerStartTime } from './routes/health.ts';
import { handleNext, setCommandQueue as setNextQueue } from './routes/next.ts';
import { handleExecute, setCommandQueue as setExecuteQueue } from './routes/execute.ts';
import { handleClient } from './routes/client.ts';

/**
 * Puerto por defecto del bridge server
 */
const DEFAULT_PORT = 54321;

// ============================================================================
// Tipos
// ============================================================================

/**
 * Comando para ejecutar en Packet Tracer
 */
export interface ComandoPT {
  id: string;
  tipo: 'agregarDispositivo' | 'conectar' | 'configurar' | 'eliminarDispositivo';
  args: unknown[];
  timestamp: number;
}

/**
 * Respuesta del health check
 */
export interface HealthResponse {
  status: 'ok' | 'error';
  version: string;
  timestamp: string;
}

/**
 * Respuesta del endpoint /next
 */
export interface NextResponse {
  hasCommand: boolean;
  command: ComandoPT | null;
}

/**
 * Respuesta del endpoint /execute
 */
export interface ExecuteResponse {
  success: boolean;
  commandId: string;
  message: string;
}

// ============================================================================
// Cola de comandos en memoria
// ============================================================================

/**
 * Cola FIFO de comandos para Packet Tracer
 */
class CommandQueue {
  private cola: ComandoPT[] = [];
  private processedIds: Set<string> = new Set();

  /**
   * Agrega un comando a la cola
   */
  enqueue(comando: ComandoPT): void {
    this.cola.push(comando);
  }

  /**
   * Obtiene y remueve el siguiente comando de la cola
   */
  dequeue(): ComandoPT | null {
    while (this.cola.length > 0) {
      const comando = this.cola.shift()!;
      // No devolver comandos ya procesados
      if (!this.processedIds.has(comando.id)) {
        this.processedIds.add(comando.id);
        return comando;
      }
    }
    return null;
  }

  /**
   * Verifica si hay comandos pendientes
   */
  hasPending(): boolean {
    return this.cola.length > 0;
  }

  /**
   * Obtiene el siguiente comando sin removerlo (peek)
   */
  peek(): ComandoPT | null {
    return this.cola[0] || null;
  }

  /**
   * Limpia comandos procesados antiguos (mantener memoria limitada)
   */
  cleanup(): void {
    // Mantener solo los últimos 100 IDs procesados
    if (this.processedIds.size > 100) {
      const idsArray = Array.from(this.processedIds);
      this.processedIds = new Set(idsArray.slice(-50));
    }
  }
}

// Instancia global de la cola
const commandQueue = new CommandQueue();

// ============================================================================
// Utilidades
// ============================================================================

/**
 * Genera un ID único para comandos
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Headers CORS para Packet Tracer WebView
 */
function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}

/**
 * Headers estándar para respuestas JSON
 */
function jsonHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...corsHeaders()
  };
}

/**
 * Verifica si la solicitud viene de localhost
 */
function isLocalhost(req: Request): boolean {
  const localhostPatterns = [
    '127.0.0.1',
    '::1',
    '::ffff:127.0.0.1'
  ];
  
  const host = req.headers.get('host') || '';
  const remoteAddr = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') ||
                     '127.0.0.1';
  
  // Verificar host header
  if (host.startsWith('127.0.0.1') || host.startsWith('localhost')) {
    return true;
  }
  
  // Verificar IP directa
  if (localhostPatterns.some(p => remoteAddr.includes(p))) {
    return true;
  }
  
  return false;
}

/**
 * Respuesta JSON helper
 */
function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: jsonHeaders()
  });
}

/**
 * Respuesta de error
 */
function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

// ============================================================================
// Handlers de rutas
// ============================================================================

/**
 * Handler OPTIONS (CORS preflight)
 */
async function handleOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: corsHeaders()
  });
}

// ============================================================================
// Servidor principal
// ============================================================================

export function startBridgeServer(): { stop: () => void } {
  const PUERTO = parseInt(process.env.BRIDGE_PORT || '54321');
  const HOST = '127.0.0.1';
  
  console.log(`🔌 Bridge server iniciando en http://${HOST}:${PUERTO}`);
  console.log('   - Solo acepta conexiones desde localhost');
  console.log('   - Endpoints: /health, /next, /execute, /bridge-client.js');
  
  setNextQueue(commandQueue);
  setExecuteQueue(commandQueue);
  
  let server;
  try {
    server = serve({
      port: PUERTO,
      hostname: HOST,
      
      async fetch(req: Request): Promise<Response> {
        const url = new URL(req.url);
        const pathname = url.pathname;
        const method = req.method;
        
        resetServerStartTime();
        
        if (method === 'OPTIONS') {
          return handleOptions();
        }
        
        if (!isLocalhost(req)) {
          console.warn(`⚠️  Conexión rechazada desde origen no local: ${req.headers.get('host')}`);
          return errorResponse('Acceso denegado: solo conexiones localhost', 403);
        }
        
        try {
          switch (`${method} ${pathname}`) {
            case 'GET /health':
              return handleHealth();
              
            case 'GET /status':
              return handleStatus();
              
            case 'GET /next':
              return handleNext();
              
            case 'POST /execute':
              return await handleExecute(req);
              
            case 'GET /bridge-client.js':
              return handleClient();
              
            default:
              return errorResponse('Endpoint no encontrado', 404);
          }
        } catch (error) {
          console.error('💥 Error en handler:', error);
          return errorResponse('Error interno del servidor', 500);
        }
      }
    });
  } catch (error) {
    const err = error as { code?: string; message?: string };
    if (err.code === 'EADDRINUSE' || err.message?.includes('address already in use')) {
      mostrarErrorConflictoPuerto(PUERTO, null);
      process.exit(1);
    }
    throw error;
  }
  
  console.log(`✅ Bridge server corriendo en http://${HOST}:${PUERTO}`);
  
  return {
    stop: () => {
      server.stop();
      console.log('🛑 Bridge server detenido');
    }
  };
}

async function isPortAvailable(port: number): Promise<boolean> {
  try {
    const connection = await fetch(`http://127.0.0.1:${port}/health`, {
      signal: AbortSignal.timeout(1000)
    });
    return false;
  } catch {
    return true;
  }
}

function getProcessUsingPort(port: number): Promise<string | null> {
  const platform = process.platform;
  let cmd = '';
  
  if (platform === 'darwin' || platform === 'linux') {
    cmd = `lsof -i :${port} -ti 2>/dev/null | head -1`;
  } else if (platform === 'win32') {
    cmd = `netstat -ano | findstr :${port} | findstr LISTENING`;
  }
  
  return new Promise((resolve) => {
    if (!cmd) {
      resolve(null);
      return;
    }
    exec(cmd, (error, stdout) => {
      if (error || !stdout.trim()) {
        resolve(null);
        return;
      }
      resolve(stdout.trim());
    });
  });
}

function mostrarErrorConflictoPuerto(puerto: number, pid: string | null): void {
  console.error(`\n❌ Error: El puerto ${puerto} ya está en uso`);
  console.error('   Otro proceso está escuchando en este puerto.');
  console.error('');
  console.error('💡 Solución:');
  
  if (pid) {
    console.error(`   1. Identifica el proceso: kill -9 ${pid}`);
    console.error('   2. O usa un puerto diferente:');
    console.error(`      BRIDGE_PORT=54322 bun run src/bridge/server.ts`);
  } else {
    console.error('   1. Verifica qué proceso está usando el puerto');
    console.error(`   2. Usa un puerto diferente: BRIDGE_PORT=54322`);
  }
  console.error('');
}

export const VERSION = '1.0.0';

// Ejecutar si es el módulo principal
if (import.meta.main) {
  startBridgeServer();
}
