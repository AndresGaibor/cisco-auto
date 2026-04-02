/**
 * DEVICE CATALOG SCHEMA
 *
 * Define la estructura para el catálogo de dispositivos de Packet Tracer.
 * Cada entrada describe un modelo específico con sus capacidades y puertos.
 */
// =============================================================================
// PORT UTILITIES
// =============================================================================
/**
 * Genera lista de puertos a partir de una definición
 */
export function generatePorts(definition) {
    const ports = [];
    const [start, end] = definition.range;
    for (let i = start; i <= end; i++) {
        ports.push(`${definition.type}${definition.module}/${i}`);
    }
    return ports;
}
/**
 * Obtiene la velocidad formateada
 */
export function formatSpeed(speedMbps) {
    if (speedMbps >= 1000) {
        return `${speedMbps / 1000}Gbps`;
    }
    return `${speedMbps}Mbps`;
}
/**
 * Obtiene el número total de puertos
 */
export function getTotalPorts(ports) {
    return ports.reduce((sum, p) => {
        const [start, end] = p.range;
        return sum + (end - start + 1);
    }, 0);
}
//# sourceMappingURL=schema.js.map