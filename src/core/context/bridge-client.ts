/**
 * Cliente HTTP para comunicarse con Packet Tracer via Bridge
 * Proporciona métodos para enviar comandos y hacer polling
 */

import type {
  BridgeCommand,
  BridgeExecuteResponse,
  BridgeNextResponse
} from './types.ts';

// ============================================================================
// Constantes
// ============================================================================

const DEFAULT_BRIDGE_URL = 'http://127.0.0.1:54321';
const DEFAULT_TIMEOUT = 5000;

// ============================================================================
// Interfaz del cliente
// ============================================================================

/**
 * Cliente del bridge para comunicación con Packet Tracer
 */
export interface BridgeClient {
  /**
   * URL base del bridge
   */
  url: string;

  /**
   * Verifica si el bridge está disponible
   */
  isConnected(): Promise<boolean>;

  /**
   * Envía un comando al bridge para ejecutar en Packet Tracer
   */
  execute(command: BridgeCommand): Promise<BridgeExecuteResponse>;

  /**
   * Obtiene el siguiente comando pendiente (polling)
   */
  getNext(): Promise<BridgeNextResponse>;

  /**
   * Hace health check del bridge
   */
  health(): Promise<{ status: string; version: string; timestamp: string }>;
}

// ============================================================================
// Implementación
// ============================================================================

export class HttpBridgeClient implements BridgeClient {
  url: string;
  private timeout: number;

  constructor(url: string = DEFAULT_BRIDGE_URL, timeout: number = DEFAULT_TIMEOUT) {
    this.url = url;
    this.timeout = timeout;
  }

  async isConnected(): Promise<boolean> {
    try {
      const response = await fetch(`${this.url}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(this.timeout)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async execute(command: BridgeCommand): Promise<BridgeExecuteResponse> {
    const response = await fetch(`${this.url}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tipo: command.tipo,
        args: command.args
      }),
      signal: AbortSignal.timeout(this.timeout)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Bridge execute failed: ${response.status} ${error}`);
    }

    return response.json() as Promise<BridgeExecuteResponse>;
  }

  async getNext(): Promise<BridgeNextResponse> {
    const response = await fetch(`${this.url}/next`, {
      method: 'GET',
      signal: AbortSignal.timeout(this.timeout)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Bridge getNext failed: ${response.status} ${error}`);
    }

    return response.json() as Promise<BridgeNextResponse>;
  }

  async health(): Promise<{ status: string; version: string; timestamp: string }> {
    const response = await fetch(`${this.url}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(this.timeout)
    });

    if (!response.ok) {
      throw new Error(`Bridge health check failed: ${response.status}`);
    }

    return response.json() as Promise<{ status: string; version: string; timestamp: string }>;
  }
}

/**
 * Crea un cliente de bridge con la URL del config
 */
export function createBridgeClient(
  port?: number,
  timeout?: number
): HttpBridgeClient {
  const url = port ? `http://127.0.0.1:${port}` : DEFAULT_BRIDGE_URL;
  return new HttpBridgeClient(url, timeout);
}

/**
 * Cliente stub que siempre indica que no hay conexión
 */
export class NoOpBridgeClient implements BridgeClient {
  url = 'no-op';

  async isConnected(): Promise<boolean> {
    return false;
  }

  async execute(): Promise<BridgeExecuteResponse> {
    throw new Error('Bridge no disponible (modo offline)');
  }

  async getNext(): Promise<BridgeNextResponse> {
    return { hasCommand: false, command: null };
  }

  async health(): Promise<{ status: string; version: string; timestamp: string }> {
    return { status: 'offline', version: '0.0.0', timestamp: new Date().toISOString() };
  }
}
