/**
 * Routing Validator - Validates routing configurations
 * Checks routing protocols, networks, metrics, and AS numbers
 */
import type { RoutingSpec } from '../canonical/device.spec';
import type { ValidationResult } from './validation-types';
export declare class RoutingValidator {
    validateRoutingSpec(routing: RoutingSpec): ValidationResult;
    private getActiveProtocol;
    private validateOSPF;
    private validateEIGRP;
    private validateBGP;
    private validateStaticRoute;
    private isValidProtocol;
    private isValidAreaId;
    private isValidAreaType;
    private isValidIpAddress;
    private isValidNetwork;
}
//# sourceMappingURL=routing-validator.d.ts.map