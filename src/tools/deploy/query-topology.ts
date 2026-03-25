/**
 * TOOL: pt_query_topology
 * 
 * Consulta la topología actual de Packet Tracer via el bridge HTTP.
 */

import type { Tool, ToolInput, ToolResult } from '../../core/types/tool.ts';

// =============================================================================
// TIPOS DE SALIDA
// =============================================================================

/**
 * Dispositivo consultado del bridge de Packet Tracer
 */
export interface QueriedDevice {
  /** ID único del dispositivo */
  id: string;
  
  /** Nombre del dispositivo */
  name: string;
  
  /** Tipo de dispositivo */
  type: 'router' | 'switch' | 'multilayer-switch' | 'pc' | 'server' | 'unknown';
  
  /** Estado actual (up/down) */
  status: 'up' | 'down' | 'unknown';
  
  /** IP configurada (si tiene) */
  ip?: string;
  
  /** Modelo (opcional) */
  model?: string;
}

/**
 * Enlace consultado del bridge de Packet Tracer
 */
export interface QueriedLink {
  /** Dispositivo origen */
  from: string;
  
  /** Dispositivo destino */
  to: string;
  
  /** Estado de la conexión */
  status: 'connected' | 'disconnected' | 'unknown';
  
  /** Tipo de cable */
  cableType: 'straight-through' | 'crossover' | 'fiber' | 'serial' | 'console' | 'auto' | 'unknown';
  
  /** Puerto origen (opcional) */
  fromPort?: string;
  
  /** Puerto destino (opcional) */
  toPort?: string;
}

/**
 * Resultado de consultar la topología
 */
export interface TopologyQueryResult {
  /** Lista de dispositivos encontrados */
  devices: QueriedDevice[];
  
  /** Lista de enlaces encontrados */
  links: QueriedLink[];
  
  /** Timestamp de la consulta */
  timestamp: string;
}

// =============================================================================
// CONSTANTES
// =============================================================================

/** URL por defecto del bridge de Packet Tracer */
const DEFAULT_BRIDGE_URL = 'http://localhost:54321';

// =============================================================================
// TOOL DEFINITION
// =============================================================================

export const ptQueryTopologyTool: Tool = {
  name: 'pt_query_topology',
  description: 'Consulta la topología actual de Packet Tracer via el bridge HTTP',
  longDescription: 'Se conecta al bridge de Packet Tracer y obtiene la lista de dispositivos y enlaces actualmente presentes en la topología, incluyendo su estado de conexión.',
  category: 'deploy',
  tags: ['topology', 'query', 'deploy', 'bridge', 'packet-tracer'],
  inputSchema: {
    type: 'object',
    properties: {
      bridgeUrl: {
        type: 'string',
        description: 'URL del bridge de Packet Tracer',
        default: DEFAULT_BRIDGE_URL
      }
    }
  },
  handler: async (input: ToolInput): Promise<ToolResult<TopologyQueryResult>> => {
    const inputBridgeUrl = input.bridgeUrl as string | undefined;
    
    // Solo usar default si no se proveebridgeUrl (undefined), no si es empty string
    const bridgeUrl = inputBridgeUrl !== undefined ? inputBridgeUrl : DEFAULT_BRIDGE_URL;

    // Validar URL del bridge (solo si se proveyó explícitamente y está vacía)
    if (inputBridgeUrl !== undefined && (!bridgeUrl || typeof bridgeUrl !== 'string' || bridgeUrl.trim() === '')) {
      return {
        success: false,
        error: {
          code: 'INVALID_BRIDGE_URL',
          message: 'Se requiere una URL válida para el bridge de Packet Tracer'
        }
      };
    }

    try {
      // Consultar la topología al bridge
      const response = await fetch(`${bridgeUrl}/topology`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(10000) // 10s timeout
      });

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: 'BRIDGE_ERROR',
            message: `Error del bridge: ${response.status} ${response.statusText}`
          }
        };
      }

      // Parsear la respuesta
      const data = await response.json() as {
        devices?: unknown[];
        links?: unknown[];
      };

      // Transformar dispositivos
      const devices: QueriedDevice[] = (data.devices || []).map((d: unknown) => {
        const device = d as Record<string, unknown>;
        return {
          id: String(device.id || device.name || 'unknown'),
          name: String(device.name || device.id || 'Unknown'),
          type: mapDeviceType(String(device.type || 'unknown')),
          status: mapDeviceStatus(String(device.status || 'unknown')),
          ip: device.ip ? String(device.ip) : undefined,
          model: device.model ? String(device.model) : undefined
        };
      });

      // Transformar enlaces
      const links: QueriedLink[] = (data.links || []).map((l: unknown) => {
        const link = l as Record<string, unknown>;
        return {
          from: String(link.from || link.deviceA || link.source || 'unknown'),
          to: String(link.to || link.deviceB || link.target || 'unknown'),
          status: mapLinkStatus(String(link.status || 'unknown')),
          cableType: mapCableType(String(link.cableType || link.type || 'unknown')),
          fromPort: link.fromPort ? String(link.fromPort) : undefined,
          toPort: link.toPort ? String(link.toPort) : undefined
        };
      });

      return {
        success: true,
        data: {
          devices,
          links,
          timestamp: new Date().toISOString()
        },
        metadata: {
          itemCount: devices.length + links.length
        }
      };

    } catch (err) {
      const error = err as Error;
      
      // Manejar errores de conexión
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        return {
          success: false,
          error: {
            code: 'TIMEOUT',
            message: `Timeout al conectar con el bridge: ${bridgeUrl}`
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'CONNECTION_ERROR',
          message: `Error al conectar con el bridge: ${error.message}`
        }
      };
    }
  }
};

// =============================================================================
// FUNCIONES DE MAPEO
// =============================================================================

/**
 * Mapea el tipo de dispositivo del bridge al tipo interno
 */
function mapDeviceType(type: string): QueriedDevice['type'] {
  const normalized = type.toLowerCase();
  
  if (normalized.includes('router')) return 'router';
  if (normalized.includes('switch') && normalized.includes('multi')) return 'multilayer-switch';
  if (normalized.includes('switch')) return 'switch';
  if (normalized.includes('pc')) return 'pc';
  if (normalized.includes('server')) return 'server';
  
  return 'unknown';
}

/**
 * Mapea el estado del dispositivo
 */
function mapDeviceStatus(status: string): QueriedDevice['status'] {
  const normalized = status.toLowerCase();
  
  if (normalized === 'up' || normalized === 'active' || normalized === 'online') return 'up';
  if (normalized === 'down' || normalized === 'inactive' || normalized === 'offline') return 'down';
  
  return 'unknown';
}

/**
 * Mapea el estado del enlace
 */
function mapLinkStatus(status: string): QueriedLink['status'] {
  const normalized = status.toLowerCase();
  
  if (normalized === 'connected' || normalized === 'up' || normalized === 'active') return 'connected';
  if (normalized === 'disconnected' || normalized === 'down' || normalized === 'inactive') return 'disconnected';
  
  return 'unknown';
}

/**
 * Mapea el tipo de cable
 */
function mapCableType(cableType: string): QueriedLink['cableType'] {
  const normalized = cableType.toLowerCase();
  
  if (normalized.includes('straight') || normalized.includes('straight-through')) return 'straight-through';
  if (normalized.includes('cross')) return 'crossover';
  if (normalized.includes('fiber')) return 'fiber';
  if (normalized.includes('serial')) return 'serial';
  if (normalized.includes('console')) return 'console';
  if (normalized.includes('auto')) return 'auto';
  
  return 'unknown';
}
