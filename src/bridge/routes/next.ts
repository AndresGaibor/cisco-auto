/**
 * Ruta GET /next para el Bridge Server
 * Retorna el siguiente comando en cola (polling de PT)
 */

import type { ComandoPT } from '../server.ts';

// ============================================================================
// Tipos
// ============================================================================

/**
 * Respuesta del endpoint /next
 */
export interface NextResponse {
  hasCommand: boolean;
  command: ComandoPT | null;
}

// ============================================================================
// Utilidades (duplicadas para independencia del módulo)
// ============================================================================

/**
 * Headers CORS para Packet Tracer WebView
 */
function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': 'http://localhost/*',
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
 * Respuesta JSON helper
 */
function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: jsonHeaders()
  });
}

// Estado compartido con server.ts
let colaComandos: { dequeue(): ComandoPT | null; cleanup(): void } | null = null;

export function setCommandQueue(
  queue: { dequeue(): ComandoPT | null; cleanup(): void }
): void {
  colaComandos = queue;
}

function getQueue() {
  if (!colaComandos) {
    throw new Error('CommandQueue no configurada. Llama a setCommandQueue() primero.');
  }
  return colaComandos;
}

// ============================================================================
// Handler
// ============================================================================

/**
 * Handler GET /next
 * Retorna el siguiente comando en cola y lo remueve
 * Si no hay comandos, retorna { hasCommand: false, command: null }
 */
export function handleNext(): Response {
  const queue = getQueue();
  const command = queue.dequeue();

  // Limpiar memoria periódicamente
  queue.cleanup();

  const response: NextResponse = {
    hasCommand: command !== null,
    command
  };

  return jsonResponse(response);
}
