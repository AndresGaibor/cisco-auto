/**
 * Network Validator - Validates network configurations
 * Checks subnets, IP ranges, overlaps, and connectivity
 */
import type { ValidationResult } from './validation-types';
export declare class NetworkValidator {
    validateSubnet(subnet: string): ValidationResult;
    validateSubnets(subnets: string[]): ValidationResult;
    validateIpInSubnet(ip: string, subnet: string): ValidationResult;
    validateNetworkSize(subnet: string, minHosts: number): ValidationResult;
    private isValidCIDR;
    private isValidIpAddress;
    private parseSubnet;
    private ipToNumber;
    private subnetsOverlap;
    private ipInSubnet;
}
//# sourceMappingURL=network-validator.d.ts.map