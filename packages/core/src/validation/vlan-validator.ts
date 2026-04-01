/**
 * VLAN Validator - Validates VLAN configurations
 * Checks VLAN IDs, names, ranges, and consistency
 */

import type { VLANSpec } from '../canonical/device.spec';
import { createError, createWarning, createValidationResult } from './validation-types';
import { ValidationCodes } from './validation-codes';
import type { ValidationResult } from './validation-types';

export class VlanValidator {
  private static readonly MIN_VLAN_ID = 1;
  private static readonly MAX_VLAN_ID = 4094;
  private static readonly RESERVED_VLANS = [0, 4095];

  validateVlan(vlan: VLANSpec): ValidationResult {
    const errors = [];
    const warnings = [];

    // Validate VLAN ID
    if (!this.isValidVlanId(vlan.id.value)) {
      errors.push(
        createError(
          ValidationCodes.VLAN_INVALID_ID,
          `Invalid VLAN ID: ${vlan.id.value}. Must be between ${VlanValidator.MIN_VLAN_ID} and ${VlanValidator.MAX_VLAN_ID}`,
          `vlans.${vlan.id.value}`
        )
      );
    }

    if (VlanValidator.RESERVED_VLANS.includes(vlan.id.value)) {
      warnings.push(
        createWarning(
          ValidationCodes.VLAN_INVALID_ID,
          `VLAN ${vlan.id.value} is reserved`,
          `vlans.${vlan.id.value}`
        )
      );
    }

    // Validate VLAN name (if value exists, though VlanName VO already validates)
    if (vlan.name && !this.isValidVlanName(vlan.name.value)) {
      errors.push(
        createError(
          ValidationCodes.VLAN_INVALID_NAME,
          `Invalid VLAN name: ${vlan.name.value}`,
          `vlans.${vlan.id.value}.name`
        )
      );
    }

    return createValidationResult(errors, warnings);
  }

  validateVlanRange(vlans: VLANSpec[]): ValidationResult {
    const errors = [];
    const seenIds = new Set<number>();

    for (const vlan of vlans) {
      // Check duplicates
      if (seenIds.has(vlan.id.value)) {
        errors.push(
          createError(
            ValidationCodes.VLAN_DUPLICATE,
            `Duplicate VLAN ID: ${vlan.id.value}`,
            `vlans.${vlan.id.value}`
          )
        );
      }
      seenIds.add(vlan.id.value);

      // Check ID range
      if (!this.isValidVlanId(vlan.id.value)) {
        errors.push(
          createError(
            ValidationCodes.VLAN_INVALID_ID,
            `VLAN ID out of range: ${vlan.id.value}`,
            `vlans.${vlan.id.value}`
          )
        );
      }
    }

    // Check total count
    if (vlans.length > 4094) {
      errors.push(
        createError(
          ValidationCodes.VLAN_RANGE_EXCEEDED,
          `Too many VLANs: ${vlans.length} (max 4094)`,
          'vlans'
        )
      );
    }

    return createValidationResult(errors);
  }

  private isValidVlanId(id: number): boolean {
    return Number.isInteger(id) && id >= VlanValidator.MIN_VLAN_ID && id <= VlanValidator.MAX_VLAN_ID;
  }

  private isValidVlanName(name: string): boolean {
    // VLAN names can be 1-32 alphanumeric characters, hyphens, underscores
    const pattern = /^[a-zA-Z0-9_-]{1,32}$/;
    return pattern.test(name);
  }
}
