/**
 * TOPOLOGY VISUALIZER
 * Genera representaciones visuales de topologías de red
 */
import type { LabSpec } from '../canonical/index.ts';
export interface VisualizationOptions {
    showIPs?: boolean;
    showPorts?: boolean;
    showCables?: boolean;
    maxWidth?: number;
}
/**
 * Genera una visualización ASCII de la topología
 */
export declare function visualizeTopology(lab: LabSpec, options?: VisualizationOptions): string;
/**
 * Genera un diagrama en formato Mermaid
 */
export declare function generateMermaidDiagram(lab: LabSpec): string;
/**
 * Genera una matriz de adyacencia
 */
export declare function generateAdjacencyMatrix(lab: LabSpec): string;
/**
 * Analiza la topología y retorna estadísticas
 */
export declare function analyzeTopology(lab: LabSpec): {
    deviceCount: number;
    connectionCount: number;
    density: number;
    connectedComponents: number;
    avgConnections: number;
    deviceTypeDistribution: Record<string, number>;
};
//# sourceMappingURL=visualizer.d.ts.map