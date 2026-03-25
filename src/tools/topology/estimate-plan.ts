/**
 * TOOL: pt_estimate_plan
 * 
 * Estima el tiempo, costo y complejidad de implementar una topología
 * de red basada en el conteo de dispositivos.
 */

import type { Tool, ToolInput, ToolResult } from '../../core/types/tool.ts';

/**
 * Tipo de complejidad based en cantidad de dispositivos
 */
export type Complexity = 'low' | 'medium' | 'high';

/**
 * Desglose de costo por tipo de dispositivo
 */
export interface CostBreakdown {
  item: string;
  time: number;
  cost: number;
}

/**
 * Resultado de la estimación del plan
 */
export interface EstimatePlanResult {
  estimatedTime: number;
  estimatedCost: number;
  complexity: Complexity;
  breakdown: CostBreakdown[];
}

/**
 * Entrada para la estimación
 */
export interface EstimatePlanInput {
  routerCount: number;
  switchCount: number;
  pcCount: number;
  serverCount: number;
  networkType?: string;
}

/**
 * Precios estimados por tipo de dispositivo (USD)
 */
const DEVICE_PRICES = {
  router: 4000,
  switch: 3000,
  pc: 1000,
  server: 5000
} as const;

/**
 * Tiempo de configuración por tipo de dispositivo (minutos)
 */
const TIME_PER_DEVICE = {
  router: 15,
  switch: 10,
  pc: 5,
  server: 10
} as const;

/**
 * Calcula la complejidad basada en el total de dispositivos
 */
function calculateComplexity(totalDevices: number): Complexity {
  if (totalDevices < 10) return 'low';
  if (totalDevices <= 20) return 'medium';
  return 'high';
}

/**
 * Calcula el costo total basado en los dispositivos
 */
function calculateCost(routerCount: number, switchCount: number, pcCount: number, serverCount: number): number {
  return (routerCount * DEVICE_PRICES.router) +
         (switchCount * DEVICE_PRICES.switch) +
         (pcCount * DEVICE_PRICES.pc) +
         (serverCount * DEVICE_PRICES.server);
}

/**
 * Calcula el tiempo total basado en los dispositivos
 */
function calculateTime(routerCount: number, switchCount: number, pcCount: number, serverCount: number): number {
  return (routerCount * TIME_PER_DEVICE.router) +
         (switchCount * TIME_PER_DEVICE.switch) +
         (pcCount * TIME_PER_DEVICE.pc) +
         (serverCount * TIME_PER_DEVICE.server);
}

/**
 * Genera el desglose de costos por dispositivo
 */
function generateBreakdown(routerCount: number, switchCount: number, pcCount: number, serverCount: number): CostBreakdown[] {
  const breakdown: CostBreakdown[] = [];

  if (routerCount > 0) {
    breakdown.push({
      item: `${routerCount} Router${routerCount > 1 ? 's' : ''}`,
      time: routerCount * TIME_PER_DEVICE.router,
      cost: routerCount * DEVICE_PRICES.router
    });
  }

  if (switchCount > 0) {
    breakdown.push({
      item: `${switchCount} Switch${switchCount > 1 ? 'es' : ''}`,
      time: switchCount * TIME_PER_DEVICE.switch,
      cost: switchCount * DEVICE_PRICES.switch
    });
  }

  if (pcCount > 0) {
    breakdown.push({
      item: `${pcCount} PC${pcCount > 1 ? 's' : ''}`,
      time: pcCount * TIME_PER_DEVICE.pc,
      cost: pcCount * DEVICE_PRICES.pc
    });
  }

  if (serverCount > 0) {
    breakdown.push({
      item: `${serverCount} Server${serverCount > 1 ? 's' : ''}`,
      time: serverCount * TIME_PER_DEVICE.server,
      cost: serverCount * DEVICE_PRICES.server
    });
  }

  return breakdown;
}

/**
 * Valida que los parámetros de entrada sean válidos
 */
function validateInput(input: EstimatePlanInput): { valid: boolean; error?: string } {
  if (input.routerCount < 0 || !Number.isInteger(input.routerCount)) {
    return { valid: false, error: 'routerCount debe ser un número entero no negativo' };
  }
  if (input.switchCount < 0 || !Number.isInteger(input.switchCount)) {
    return { valid: false, error: 'switchCount debe ser un número entero no negativo' };
  }
  if (input.pcCount < 0 || !Number.isInteger(input.pcCount)) {
    return { valid: false, error: 'pcCount debe ser un número entero no negativo' };
  }
  if (input.serverCount < 0 || !Number.isInteger(input.serverCount)) {
    return { valid: false, error: 'serverCount debe ser un número entero no negativo' };
  }
  return { valid: true };
}

export const ptEstimatePlanTool: Tool = {
  name: 'pt_estimate_plan',
  description: 'Estima tiempo, costo y complejidad para implementar una topología de red',
  longDescription: 'Calcula una estimación basada en la cantidad de dispositivos de cada tipo. Considera tiempo de configuración por dispositivo, costos de hardware y determina la complejidad del proyecto.',
  category: 'analysis',
  tags: ['estimation', 'planning', 'topology', 'cost', 'time'],
  inputSchema: {
    type: 'object',
    properties: {
      routerCount: {
        type: 'number',
        description: 'Cantidad de routers en la topología',
        minimum: 0
      },
      switchCount: {
        type: 'number',
        description: 'Cantidad de switches en la topología',
        minimum: 0
      },
      pcCount: {
        type: 'number',
        description: 'Cantidad de PCs en la topología',
        minimum: 0
      },
      serverCount: {
        type: 'number',
        description: 'Cantidad de servidores en la topología',
        minimum: 0
      },
      networkType: {
        type: 'string',
        description: 'Tipo de red (single_lan, multi_area, etc.)'
      }
    },
    required: ['routerCount', 'switchCount', 'pcCount', 'serverCount']
  },
  handler: async (input: ToolInput): Promise<ToolResult<EstimatePlanResult>> => {
    const { routerCount, switchCount, pcCount, serverCount, networkType } = input as unknown as EstimatePlanInput;

    // Validar entrada
    const validation = validateInput({ routerCount, switchCount, pcCount, serverCount });
    if (!validation.valid) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: validation.error || 'Parámetros de entrada inválidos'
        }
      };
    }

    // Calcular métricas
    const totalDevices = routerCount + switchCount + pcCount + serverCount;
    const estimatedTime = calculateTime(routerCount, switchCount, pcCount, serverCount);
    const estimatedCost = calculateCost(routerCount, switchCount, pcCount, serverCount);
    const complexity = calculateComplexity(totalDevices);
    const breakdown = generateBreakdown(routerCount, switchCount, pcCount, serverCount);

    return {
      success: true,
      data: {
        estimatedTime,
        estimatedCost,
        complexity,
        breakdown
      },
      metadata: {
        itemCount: totalDevices
      }
    };
  }
};
