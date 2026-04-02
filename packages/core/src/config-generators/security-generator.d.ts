import type { ACLSpec, NATSpec, SecuritySpec } from '../canonical/device.spec.ts';
export declare class SecurityGenerator {
    /**
     * Generate ACL commands from canonical ACLSpec
     * Supports both numbered and named ACLs with correct Cisco syntax
     */
    static generateACLs(acls: ACLSpec[]): string[];
    /**
     * Infer ACL type from rules - extended if has protocol or ports
     */
    private static inferACLType;
    /**
     * Build a single ACL rule command
     */
    private static buildACLRule;
    /**
     * Generate NAT commands from canonical NATSpec
     */
    static generateNAT(nat: NATSpec): string[];
    /**
     * Generate security commands (ACLs + NAT) from SecuritySpec
     */
    static generateSecurity(security: SecuritySpec): string[];
}
//# sourceMappingURL=security-generator.d.ts.map