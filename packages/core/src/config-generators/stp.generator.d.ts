/**
 * STP (Spanning Tree Protocol) GENERATOR
 *
 * Genera configuración de Spanning Tree para switches Cisco
 */
import type { STPSpec } from '../canonical/protocol.spec';
export declare class STPGenerator {
    /**
     * Genera configuración completa de STP
     */
    static generate(spec: STPSpec): string[];
    /**
     * Genera comando de modo STP
     */
    private static generateMode;
    /**
     * Genera configuración STP por VLAN
     */
    private static generateVlanConfig;
    /**
     * Genera configuración STP de interfaz
     */
    private static generateInterfaceConfig;
    /**
     * Genera configuración de ejemplo para switch core
     */
    static generateCoreExample(): string;
    /**
     * Genera configuración de ejemplo para switch access
     */
    static generateAccessExample(): string;
    /**
     * Valida configuración STP
     */
    static validate(spec: STPSpec): {
        valid: boolean;
        errors: string[];
        warnings: string[];
    };
}
export default STPGenerator;
//# sourceMappingURL=stp.generator.d.ts.map