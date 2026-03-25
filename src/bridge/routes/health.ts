/**
 * Rutas de health check y status para el Bridge Server
 * Proporciona endpoints de diagnóstico y información del sistema
 */

import type { HealthResponse } from '../server.ts';

// ============================================================================
// Estado del servidor (module-level para tracking de uptime)
// ============================================================================

// Timestamp de inicio del servidor (se actualiza al iniciar)
let serverStartTime: number = Date.now();

/**
 * Resetea el tiempo de inicio (útil para testing o restart)
 */
export function resetServerStartTime(): void {
  serverStartTime = Date.now();
}

/**
 * Obtiene el tiempo de inicio actual
 */
export function getServerStartTime(): number {
  return serverStartTime;
}

// ============================================================================
// Tipos de respuesta
// ============================================================================

/**
 * Respuesta detallada del health check
 */
export interface DetailedHealthResponse {
  status: 'ok' | 'degraded' | 'error';
  version: string;
  timestamp: string;
  uptime: {
    seconds: number;
    formatted: string;
  };
  connection: {
    type: 'localhost';
    port: number;
    secure: boolean;
  };
  endpoints: {
    health: string;
    status: string;
    next: string;
    execute: string;
  };
}

/**
 * Respuesta del endpoint /status
 */
export interface BridgeStatusResponse {
  bridge: {
    name: string;
    version: string;
    status: 'running' | 'stopped';
  };
  server: {
    host: string;
    port: number;
    startedAt: string;
    uptime: string;
    uptimeSeconds: number;
  };
  connection: {
    type: string;
    allowedOrigins: string[];
    maxQueueSize: number;
  };
  features: {
    cors: boolean;
    commandQueue: boolean;
    polling: boolean;
  };
}

// ============================================================================
// Utilidades
// ============================================================================

/**
 * Formatea uptime en formato legible
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * Headers estándar para respuestas JSON
 */
function jsonHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': 'http://localhost/*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}

/**
 * Crea una respuesta JSON
 */
function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: jsonHeaders()
  });
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * Handler GET /health
 * Health check básico con información de uptime
 */
export function handleHealth(): Response {
  const uptimeSeconds = Math.floor((Date.now() - serverStartTime) / 1000);

  const response: DetailedHealthResponse = {
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: {
      seconds: uptimeSeconds,
      formatted: formatUptime(uptimeSeconds)
    },
    connection: {
      type: 'localhost',
      port: 54321,
      secure: false
    },
    endpoints: {
      health: 'GET /health',
      status: 'GET /status',
      next: 'GET /next',
      execute: 'POST /execute'
    }
  };

  return jsonResponse(response);
}

/**
 * Handler GET /status
 * Status detallado del bridge
 */
export function handleStatus(): Response {
  const uptimeSeconds = Math.floor((Date.now() - serverStartTime) / 1000);
  const startedAt = new Date(serverStartTime).toISOString();

  const response: BridgeStatusResponse = {
    bridge: {
      name: 'cisco-auto-bridge',
      version: '1.0.0',
      status: 'running'
    },
    server: {
      host: '127.0.0.1',
      port: 54321,
      startedAt,
      uptime: formatUptime(uptimeSeconds),
      uptimeSeconds
    },
    connection: {
      type: 'HTTP',
      allowedOrigins: ['http://localhost/*', 'http://127.0.0.1/*'],
      maxQueueSize: 100
    },
    features: {
      cors: true,
      commandQueue: true,
      polling: true
    }
  };

  return jsonResponse(response);
}