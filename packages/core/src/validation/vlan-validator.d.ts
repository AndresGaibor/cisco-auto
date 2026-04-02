/**
 * VLAN Validator - Validates VLAN configurations
 * Checks VLAN IDs, names, ranges, and consistency
 */
import type { VLANSpec } from '../canonical/device.spec';
import type { ValidationResult } from './validation-types';
export declare class VlanValidator {
    private static readonly MIN_VLAN_ID;
    private static readonly MAX_VLAN_ID;
    private static readonly RESERVED_VLANS;
    validateVlan(vlan: VLANSpec): ValidationResult;
    validateVlanRange(vlans: VLANSpec[]): ValidationResult;
    private isValidVlanId;
    private isValidVlanName;
}
//# sourceMappingURL=vlan-validator.d.ts.map