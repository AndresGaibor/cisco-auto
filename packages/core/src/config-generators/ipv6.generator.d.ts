/**
 * IPv6 GENERATOR
 *
 * Genera configuración de IPv6 para routers y switches
 */
import type { IPv6Spec } from '../canonical/protocol.spec';
export declare class IPv6Generator {
    /**
     * Genera configuración completa de IPv6
     */
    static generate(spec: IPv6Spec): string[];
    /**
     * Genera configuración de interfaz IPv6
     */
    private static generateInterface;
    /**
     * Genera ruta estática IPv6
     */
    private static generateStaticRoute;
    /**
     * Genera configuración RIPng
     */
    private static generateRIPng;
    /**
     * Genera configuración OSPFv3
     */
    private static generateOSPFv3;
    /**
     * Valida configuración IPv6
     */
    static validate(spec: IPv6Spec): {
        valid: boolean;
        errors: string[];
        warnings: string[];
    };
    /**
     * Genera ejemplo de configuración IPv6 básica
     */
    static generateBasicExample(): string;
    /**
     * Genera ejemplo con OSPFv3
     */
    static generateOSPFv3Example(): string;
    private static isValidIPv6;
    private static isValidIPv6Prefix;
    private static isValidIPv4;
}
export default IPv6Generator;
//# sourceMappingURL=ipv6.generator.d.ts.map