/**
 * Ruta POST /result para el Bridge Server
 * Recibe resultados de comandos ejecutados en Packet Tracer
 */

import type { BridgeResult } from './handlers.ts';

// ============================================================================
// Estado
// ============================================================================

// Mapa de resultados pendientes (commandId -> resultado)
const pendingResults = new Map<string, BridgeResult>();

// Callbacks para notificar cuando llega un resultado
const resultCallbacks = new Map<string, (result: BridgeResult) => void>();

// ============================================================================
// Funciones de gestión
// ============================================================================

/**
 * Registra un callback para ser llamado cuando llegue el resultado
 */
export function onResult(id: string, callback: (result: BridgeResult) => void): void {
  resultCallbacks.set(id, callback);
  
  // Si ya tenemos el resultado, llamar inmediatamente
  const existing = pendingResults.get(id);
  if (existing) {
    callback(existing);
    pendingResults.delete(id);
    resultCallbacks.delete(id);
  }
}

/**
 * Espera un resultado con timeout
 */
export function waitForResult(id: string, timeoutMs = 5000): Promise<BridgeResult> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      resultCallbacks.delete(id);
      reject(new Error(`Timeout esperando resultado para comando ${id}`));
    }, timeoutMs);
    
    onResult(id, (result) => {
      clearTimeout(timeout);
      resolve(result);
    });
  });
}

/**
 * Obtiene un resultado pendiente (sin esperar)
 */
export function getResult(id: string): BridgeResult | null {
  const result = pendingResults.get(id);
  if (result) {
    pendingResults.delete(id);
  }
  return result || null;
}

/**
 * Limpia resultados antiguos
 */
export function cleanupResults(): void {
  const now = Date.now();
  for (const [id, result] of pendingResults) {
    // Eliminar resultados más antiguos de 30 segundos
    // El ID contiene timestamp, extraerlo
    const timestampMatch = id.match(/^(\d+)/);
    if (timestampMatch) {
      const timestamp = parseInt(timestampMatch[1]!, 10);
      if (now - timestamp > 30000) {
        pendingResults.delete(id);
        resultCallbacks.delete(id);
      }
    }
  }
}

// ============================================================================
// Utilidades
// ============================================================================

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
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
 * Handler POST /result
 * Recibe resultados de comandos ejecutados en PT
 * 
 * Body esperado:
 * {
 *   id: string,        // ID del comando original
 *   ok: boolean,       // Si fue exitoso
 *   message: string,   // Mensaje de resultado
 *   data?: unknown     // Datos adicionales
 * }
 */
export async function handleResult(req: Request): Promise<Response> {
  try {
    const body = await req.json() as Partial<BridgeResult>;
    
    if (!body.id) {
      return errorResponse('Falta campo requerido: id', 400);
    }
    
    const result: BridgeResult = {
      id: body.id,
      ok: body.ok ?? false,
      message: body.message || '',
      data: body.data
    };
    
    // Verificar si hay un callback esperando
    const callback = resultCallbacks.get(result.id);
    if (callback) {
      callback(result);
      resultCallbacks.delete(result.id);
    } else {
      // Guardar para consulta posterior
      pendingResults.set(result.id, result);
    }
    
    // Limpiar periódicamente
    cleanupResults();
    
    console.log(`[Bridge] Resultado recibido: ${result.id} -> ${result.ok ? 'OK' : 'ERROR'}`);
    
    return jsonResponse({ 
      success: true, 
      received: result.id 
    });
    
  } catch (error) {
    console.error('[Bridge] Error procesando resultado:', error);
    return errorResponse('JSON inválido en el body', 400);
  }
}

/**
 * Handler GET /result/:id
 * Permite consultar un resultado pendiente
 */
export function handleGetResult(req: Request): Response {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  
  if (!id) {
    return errorResponse('Falta parámetro: id', 400);
  }
  
  const result = getResult(id);
  
  if (!result) {
    return jsonResponse({ 
      found: false, 
      message: 'Resultado no encontrado o ya consumido' 
    }, 404);
  }
  
  return jsonResponse({
    found: true,
    result
  });
}
