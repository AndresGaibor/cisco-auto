/**
 * TOOL: pt_live_deploy
 * 
 * Despliega configuraciones de dispositivos a Packet Tracer via bridge HTTP.
 */

import type {
  Tool,
  ToolInput,
  ToolResult,
  TopologyPlan,
  DevicePlan
} from '@cisco-auto/core';

// ============================================================================
// TIPOS DE SALIDA
// ============================================================================

/**
 * Dispositivo desplegado exitosamente
 */
export interface DeployedDevice {
  /** ID del dispositivo */
  deviceId: string;
  
  /** Nombre del dispositivo */
  deviceName: string;
  
  /** Tipo de dispositivo */
  deviceType: 'router' | 'switch' | 'multilayer-switch' | 'pc' | 'server';
  
  /** Estado del despliegue */
  status: 'success' | 'warning';
  
  /** Mensaje de estado */
  message: string;
  
  /** Timestamp del despliegue */
  deployedAt: number;
  
  /** ID del comando en el bridge */
  commandId?: string;
}

/**
 * Dispositivo que falló en desplegar
 */
export interface FailedDevice {
  /** ID del dispositivo */
  deviceId: string;
  
  /** Nombre del dispositivo */
  deviceName: string;
  
  /** Tipo de dispositivo */
  deviceType: 'router' | 'switch' | 'multilayer-switch' | 'pc' | 'server';
  
  /** Estado del error */
  status: 'failed';
  
  /** Mensaje de error */
  error: string;
  
  /** Código de error */
  errorCode: string;
  
  /** Timestamp del intento */
  attemptedAt: number;
}

/**
 * Resumen del despliegue
 */
export interface DeploySummary {
  /** Total de dispositivos procesados */
  total: number;
  
  /** Total desplegados exitosamente */
  success: number;
  
  /** Total fallidos */
  failed: number;
  
  /** Total con warnings */
  warnings: number;
  
  /** Duración total en milisegundos */
  duration: number;
  
  /** Timestamp de inicio */
  startedAt: number;
  
  /** Timestamp de fin */
  completedAt: number;
  
  /** Modo dry-run */
  dryRun: boolean;
}

// ============================================================================
// CLIENTE DEL BRIDGE
// ============================================================================

/**
 * Respuesta del endpoint /execute del bridge
 */
interface BridgeExecuteResponse {
  success: boolean;
  commandId: string;
  message: string;
}

/**
 * Cliente HTTP para el bridge de Packet Tracer
 */
class BridgeHTTPClient {
  private baseUrl: string;
  
  constructor(bridgeUrl: string) {
    this.baseUrl = bridgeUrl.replace(/\/$/, '');
  }
  
  /**
   * Verifica si el bridge está disponible
   */
  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000); // 1 segundo timeout
      
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }
  
  /**
   * Envía un comando al bridge para ejecutar en Packet Tracer
   */
  async executeCommand(
    tipo: string,
    args: unknown[]
  ): Promise<BridgeExecuteResponse> {
    const response = await fetch(`${this.baseUrl}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo, args })
    });
    
    if (!response.ok) {
      throw new Error(`Bridge error: ${response.status} ${response.statusText}`);
    }
    
    return response.json() as Promise<BridgeExecuteResponse>;
  }
}

// ============================================================================
// FUNCIONES DE GENERACIÓN DE COMANDOS
// ============================================================================

/**
 * Genera el comando de configuración para un dispositivo
 */
function generateDeviceCommand(device: DevicePlan): { tipo: string; args: unknown[] } {
  // Determinar el tipo de comando según el tipo de dispositivo
  const tipo = 'configurar';
  
  // Preparar argumentos con la información del dispositivo
  const args: unknown[] = [
    {
      deviceId: device.id,
      deviceName: device.name,
      deviceType: device.model.type,
      interfaces: device.interfaces.filter(i => i.configured).map(i => ({
        name: i.name,
        ip: i.ip,
        subnetMask: i.subnetMask,
        vlan: i.vlan
      })),
      vlans: device.vlans,
      routing: device.routing,
      dhcp: device.dhcp,
      credentials: device.credentials
    }
  ];
  
  return { tipo, args };
}

// ============================================================================
// HANDLER PRINCIPAL
// ============================================================================

/**
 * Despliega un dispositivo individual
 */
async function deployDevice(
  client: BridgeHTTPClient,
  device: DevicePlan,
  dryRun: boolean
): Promise<DeployedDevice | FailedDevice> {
  const startTime = Date.now();
  
  if (dryRun) {
    // Simular despliegue en modo dry-run
    return {
      deviceId: device.id,
      deviceName: device.name,
      deviceType: device.model.type as DeployedDevice['deviceType'],
      status: 'success',
      message: `[DRY-RUN] Simulado despliegue de ${device.name}`,
      deployedAt: Date.now()
    };
  }
  
  try {
    const command = generateDeviceCommand(device);
    const result = await client.executeCommand(command.tipo, command.args);
    
    return {
      deviceId: device.id,
      deviceName: device.name,
      deviceType: device.model.type as DeployedDevice['deviceType'],
      status: result.success ? 'success' : 'warning',
      message: result.message,
      deployedAt: Date.now(),
      commandId: result.commandId
    };
  } catch (err) {
    return {
      deviceId: device.id,
      deviceName: device.name,
      deviceType: device.model.type as FailedDevice['deviceType'],
      status: 'failed',
      error: (err as Error).message,
      errorCode: 'DEPLOY_ERROR',
      attemptedAt: Date.now()
    };
  }
}

// ============================================================================
// TOOL DEFINITION
// ============================================================================

/**
 * Tool para desplegar configuraciones a Packet Tracer via bridge HTTP
 */
export const ptLiveDeployTool: Tool = {
  name: 'pt_live_deploy',
  description: 'Despliega configuraciones de dispositivos a Packet Tracer via bridge HTTP',
  longDescription: `Despliega las configuraciones de un TopologyPlan a dispositivos reales en Packet Tracer 
mediante el bridge HTTP. Soporta modo dry-run para simular el despliegue sin enviar comandos reales.

El bridge HTTP debe estar corriendo en el puerto 54321 (o la URL especificada en bridgeUrl).
Cada dispositivo se despliega secuencialmente con tracking de progreso.`,
  category: 'deploy',
  tags: ['deploy', 'live', 'packet-tracer', 'bridge', 'http'],
  inputSchema: {
    type: 'object',
    properties: {
      plan: {
        type: 'object',
        description: 'Plan de topología con los dispositivos a desplegar'
      },
      bridgeUrl: {
        type: 'string',
        description: 'URL del bridge HTTP de Packet Tracer',
        default: 'http://localhost:54321'
      },
      dryRun: {
        type: 'boolean',
        description: 'Si es true, solo simula el despliegue sin enviar comandos reales',
        default: false
      }
    },
    required: ['plan']
  },
  handler: async (
    input: ToolInput
  ): Promise<ToolResult<{ deployed: DeployedDevice[]; failed: FailedDevice[]; summary: DeploySummary }>> => {
    const plan = input.plan as TopologyPlan;
    const bridgeUrl = (input.bridgeUrl as string) || 'http://localhost:54321';
    const dryRun = (input.dryRun as boolean) || false;
    
    const startTime = Date.now();
    
    // Validación de entrada
    if (!plan || typeof plan !== 'object') {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Se requiere un plan de topología válido'
        }
      };
    }
    
    if (!plan.devices || !Array.isArray(plan.devices)) {
      return {
        success: false,
        error: {
          code: 'INVALID_STRUCTURE',
          message: 'El plan debe contener un array de devices'
        }
      };
    }
    
    if (plan.devices.length === 0) {
      return {
        success: false,
        error: {
          code: 'EMPTY_PLAN',
          message: 'El plan no contiene dispositivos para desplegar'
        }
      };
    }
    
    // Crear cliente del bridge (solo si no es dry-run)
    const client = dryRun ? null : new BridgeHTTPClient(bridgeUrl);
    
    // Verificar disponibilidad del bridge si no es dry-run
    if (!dryRun && client) {
      const available = await client.isAvailable();
      if (!available) {
        return {
          success: false,
          error: {
            code: 'BRIDGE_UNAVAILABLE',
            message: `El bridge HTTP no está disponible en ${bridgeUrl}`,
            suggestions: [
              'Verifica que el bridge server esté corriendo',
              'Ejecuta: bun run src/bridge/server',
              'Verifica que Packet Tracer esté abierto'
            ]
          }
        };
      }
    }
    
    // Desplegar dispositivos secuencialmente con progreso
    const deployed: DeployedDevice[] = [];
    const failed: FailedDevice[] = [];
    
    for (const device of plan.devices) {
      const result = await deployDevice(client!, device, dryRun);
      
      if (result.status === 'failed') {
        failed.push(result as FailedDevice);
      } else {
        deployed.push(result as DeployedDevice);
      }
    }
    
    const endTime = Date.now();
    
    // Generar resumen
    const summary: DeploySummary = {
      total: plan.devices.length,
      success: deployed.length,
      failed: failed.length,
      warnings: deployed.filter(d => d.status === 'warning').length,
      duration: endTime - startTime,
      startedAt: startTime,
      completedAt: endTime,
      dryRun
    };
    
    return {
      success: true,
      data: { deployed, failed, summary },
      metadata: {
        duration: summary.duration,
        itemCount: plan.devices.length,
        extras: {
          dryRun,
          bridgeUrl
        }
      }
    };
  }
};
