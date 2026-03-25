/**
 * TOOL: pt_bridge_status
 * 
 * Verifica el estado del bridge HTTP de Packet Tracer.
 */

import type { Tool, ToolInput, ToolResult } from '../../core/types/tool.ts';

// =============================================================================
// TIPOS DE SALIDA
// =============================================================================

/**
 * Resultado del estado del bridge
 */
export interface BridgeStatusResult {
  /** Indica si el bridge está conectado y respondiendo */
  connected: boolean;
  
  /** Versión del bridge (si está disponible) */
  version?: string;
  
  /** Uptime del bridge en segundos (si está disponible) */
  uptime?: number;
  
  /** Último error encontrado (si existe) */
  lastError?: string;
}

// =============================================================================
// CONSTANTES
// =============================================================================

/** URL por defecto del bridge */
const DEFAULT_BRIDGE_URL = 'http://localhost:54321';

/** Endpoint de salud del bridge */
const HEALTH_ENDPOINT = '/health';

/** Timeout para la petición en ms */
const REQUEST_TIMEOUT = 5000;

// =============================================================================
// FUNCIÓN PRINCIPAL
// =============================================================================

/**
 * Verifica el estado del bridge HTTP de Packet Tracer.
 * 
 * @param bridgeUrl - URL del bridge (por defecto http://localhost:54321)
 * @returns Resultado con estado de conexión e información del bridge
 */
export async function checkBridgeStatus(bridgeUrl: string = DEFAULT_BRIDGE_URL): Promise<BridgeStatusResult> {
  const result: BridgeStatusResult = {
    connected: false
  };

  try {
    // Construir URL del endpoint de salud
    const healthUrl = `${bridgeUrl.replace(/\/$/, '')}${HEALTH_ENDPOINT}`;
    
    // Realizar petición HTTP con timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // Verificar si la respuesta es exitosa
    if (!response.ok) {
      result.lastError = `HTTP ${response.status}: ${response.statusText}`;
      return result;
    }

    // Parsear respuesta JSON
    const data = await response.json() as {
      version?: string;
      uptime?: number;
      status?: string;
      connected?: boolean;
      error?: string;
    };

    // Verificar estado de la respuesta
    if (data.connected === false || data.status === 'error') {
      result.connected = false;
      result.lastError = data.error || 'Bridge respondió con estado de error';
      return result;
    }

    // Extraer información del bridge
    result.connected = true;
    result.version = data.version;
    result.uptime = data.uptime;

    return result;

  } catch (error) {
    // Clasificar el error
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        result.lastError = `Timeout conectando a ${bridgeUrl} (${REQUEST_TIMEOUT}ms)`;
      } else if (error.message.includes('fetch') || error.message.includes('network')) {
        result.lastError = `Error de red: ${error.message}`;
      } else {
        result.lastError = error.message;
      }
    } else {
      result.lastError = 'Error desconocido al verificar el bridge';
    }

    result.connected = false;
    return result;
  }
}

// =============================================================================
// TOOL DEFINITION
// =============================================================================

export const ptBridgeStatusTool: Tool = {
  name: 'pt_bridge_status',
  description: 'Verifica el estado del bridge HTTP de Packet Tracer',
  longDescription: 'Consulta el endpoint /health del bridge HTTP de Packet Tracer para determinar si está corriendo y obtener información como versión y uptime.',
  category: 'deploy',
  tags: ['bridge', 'health', 'status', 'packet-tracer', 'deploy'],
  inputSchema: {
    type: 'object',
    properties: {
      bridgeUrl: {
        type: 'string',
        description: 'URL del bridge HTTP de Packet Tracer',
        default: DEFAULT_BRIDGE_URL,
        pattern: '^https?://.*$'
      }
    },
    required: []
  },
  handler: async (input: ToolInput): Promise<ToolResult<BridgeStatusResult>> => {
    // Obtener URL del bridge (usar default si no se provee)
    const bridgeUrl = (input.bridgeUrl as string) || DEFAULT_BRIDGE_URL;

    // Validar formato de URL
    if (!bridgeUrl.startsWith('http://') && !bridgeUrl.startsWith('https://')) {
      return {
        success: false,
        error: {
          code: 'INVALID_URL',
          message: 'La URL del bridge debe comenzar con http:// o https://'
        }
      };
    }

    try {
      // Verificar estado del bridge
      const status = await checkBridgeStatus(bridgeUrl);

      return {
        success: true,
        data: status
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CHECK_FAILED',
          message: `Error al verificar el bridge: ${(error as Error).message}`
        }
      };
    }
  }
};
