/**
 * TOOL: pt_estimate_plan
 *
 * Estima el tiempo, costo y complejidad de implementar una topología
 * de red basada en el conteo de dispositivos.
 */
import type { Tool } from '../..';
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
export declare const ptEstimatePlanTool: Tool;
//# sourceMappingURL=estimate-plan.d.ts.map