/**
 * ETHERCHANNEL GENERATOR
 *
 * Genera configuración de EtherChannel (LACP, PAgP, Static)
 */
import type { EtherChannelSpec } from '../canonical/protocol.spec';
export declare class EtherChannelGenerator {
    /**
     * Genera configuración de múltiples EtherChannels
     */
    static generate(channels: EtherChannelSpec[]): string[];
    /**
     * Genera configuración de un EtherChannel
     */
    private static generateChannel;
    /**
     * Obtiene el comando de modo correcto según protocolo
     */
    private static getModeCommand;
    /**
     * Genera configuración de ejemplo LACP
     */
    static generateLACPExample(): string;
    /**
     * Genera configuración de ejemplo PAgP
     */
    static generatePAgPExample(): string;
    /**
     * Genera configuración de ejemplo static (sin protocolo)
     */
    static generateStaticExample(): string;
    /**
     * Valida configuración de EtherChannel
     */
    static validate(spec: EtherChannelSpec): {
        valid: boolean;
        errors: string[];
        warnings: string[];
    };
    /**
     * Valida compatibilidad entre dos EtherChannels que se conectan
     */
    static validateCompatibility(channel1: EtherChannelSpec, channel2: EtherChannelSpec): {
        compatible: boolean;
        issues: string[];
    };
}
export default EtherChannelGenerator;
//# sourceMappingURL=etherchannel.generator.d.ts.map