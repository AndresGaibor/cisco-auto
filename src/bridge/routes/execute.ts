/**
 * Ruta POST /execute para el Bridge Server
 * Encola comandos para que PT los ejecute
 */

import type { ComandoPT } from '../server.ts';
import { writeCommandFile } from '../file-bridge.ts';

// ============================================================================
// Tipos
// ============================================================================

/**
 * Body request para /execute
 */
export interface ExecuteRequest {
  tipo: 'agregarDispositivo' | 'conectar' | 'configurar' | 'eliminarDispositivo';
  args: unknown[];
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
// Estado compartido
// ============================================================================

let colaComandos: { enqueue(comando: ComandoPT): void } | null = null;

export function setCommandQueue(
  queue: { enqueue(comando: ComandoPT): void }
): void {
  colaComandos = queue;
}

function getQueue() {
  if (!colaComandos) {
    throw new Error('CommandQueue no configurada');
  }
  return colaComandos;
}

// ============================================================================
// Utilidades
// ============================================================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': 'http://localhost/*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}

function jsonHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...corsHeaders()
  };
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: jsonHeaders()
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

// ============================================================================
// Handler
// ============================================================================

/**
 * Handler POST /execute
 * Acepta { tipo, args } y encola el comando
 */
export async function handleExecute(req: Request): Promise<Response> {
  try {
    const body = await req.json() as Partial<ExecuteRequest>;

    if (!body.tipo || !body.args) {
      return errorResponse('Falta campo requerido: tipo o args', 400);
    }

    const comando: ComandoPT = {
      id: generateId(),
      tipo: body.tipo,
      args: body.args,
      timestamp: Date.now()
    };

    getQueue().enqueue(comando);
    writeCommandFile(comando);

    const response: ExecuteResponse = {
      success: true,
      commandId: comando.id,
      message: `Comando encolado: ${comando.tipo}`
    };

    return jsonResponse(response, 201);

  } catch {
    return errorResponse('JSON inválido en el body', 400);
  }
}
