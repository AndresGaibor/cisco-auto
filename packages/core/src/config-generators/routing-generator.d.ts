import type { RoutingSpec } from '../canonical/device.spec.ts';
export declare class RoutingGenerator {
    /**
     * Valida formato de router ID (debe ser IP válida)
     */
    private static isValidRouterId;
    /**
     * Valida configuración de routing
     */
    static validate(routing: RoutingSpec): {
        valid: boolean;
        errors: string[];
        warnings: string[];
    };
    static generateRouting(routing: RoutingSpec): string[];
    private static generateOSPF;
    private static generateEIGRP;
    private static generateRIP;
    private static generateBGP;
}
//# sourceMappingURL=routing-generator.d.ts.map