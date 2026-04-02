/**
 * ADVANCED ROUTING GENERATOR
 *
 * Genera configuración de RIP, BGP y protocolos adicionales
 */
import type { RIPSpec, BGPSpec } from '../canonical/protocol.spec';
export declare class AdvancedRoutingGenerator {
    /**
     * Genera configuración de RIP
     */
    static generateRIP(spec: RIPSpec): string[];
    /**
     * Genera configuración de BGP
     */
    static generateBGP(spec: BGPSpec): string[];
    /**
     * Genera configuración de vecino BGP
     */
    private static generateBGPNeighbor;
    /**
     * Valida configuración RIP
     */
    static validateRIP(spec: RIPSpec): {
        valid: boolean;
        errors: string[];
        warnings: string[];
    };
    /**
     * Valida configuración BGP
     */
    static validateBGP(spec: BGPSpec): {
        valid: boolean;
        errors: string[];
        warnings: string[];
    };
    /**
     * Genera ejemplo de RIP
     */
    static generateRIPExample(): string;
    /**
     * Genera ejemplo de eBGP
     */
    static generateEBGPExample(): string;
    private static isValidIPv4;
    private static isValidNetwork;
}
export default AdvancedRoutingGenerator;
//# sourceMappingURL=advanced-routing.generator.d.ts.map