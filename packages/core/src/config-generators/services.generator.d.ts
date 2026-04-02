/**
 * SERVICES GENERATOR
 *
 * Genera configuración de servicios IOS (DHCP, NTP, SNMP, Syslog)
 */
import type { DHCPServerSpec, NTPSpec, SNMPSpec, SyslogSpec, HTTPSpec, FTPSpec } from '../canonical/protocol.spec';
import type { ServicesSpec } from '../canonical/device.spec.js';
export declare class ServicesGenerator {
    /**
     * Genera configuración de DHCP Server en router/switch
     */
    static generateDHCP(specs: DHCPServerSpec[]): string[];
    /**
     * Genera un pool DHCP individual
     */
    private static generateDHCPPool;
    /**
     * Genera configuración de NTP
     */
    static generateNTP(spec: NTPSpec): string[];
    /**
     * Genera configuración de SNMP
     */
    static generateSNMP(spec: SNMPSpec): string[];
    /**
     * Genera configuración de Syslog
     */
    static generateSyslog(spec: SyslogSpec): string[];
    /**
     * Convierte severidad textual a número
     */
    private static severityToNum;
    /**
     * Genera configuración de HTTP Server (en router/switch)
     */
    static generateHTTP(spec: HTTPSpec): string[];
    /**
     * Genera configuración de FTP Server (en router/switch)
     */
    static generateFTP(spec: FTPSpec): string[];
    /**
     * Valida configuración DHCP
     */
    static validateDHCP(spec: DHCPServerSpec): {
        valid: boolean;
        errors: string[];
        warnings: string[];
    };
    /**
     * Valida configuración NTP
     */
    static validateNTP(spec: NTPSpec): {
        valid: boolean;
        errors: string[];
        warnings: string[];
    };
    /**
     * Genera ejemplo de DHCP
     */
    static generateDHCPExample(): string;
    /**
     * Genera ejemplo de NTP
     */
    static generateNTPExample(): string;
    private static isValidIP;
    private static isValidNetwork;
    private static isValidMask;
    private static isValidHostname;
    /**
     * Generate all services from canonical ServicesSpec (protocol.spec version)
     */
    static generateServices(spec: ServicesSpec): string[];
}
export default ServicesGenerator;
//# sourceMappingURL=services.generator.d.ts.map