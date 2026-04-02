/**
 * VLAN Name Value Object
 *
 * Represents a validated VLAN name according to Cisco IOS specifications:
 * - Maximum 32 characters
 * - Alphanumeric characters, hyphens, underscores allowed
 * - Cannot start with a number
 * - Cannot contain spaces or special characters
 */

const MAX_VLAN_NAME_LENGTH = 32;
const VLAN_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]*$|^[a-zA-Z]$/;

export class VlanName {
  public readonly value: string;
  public readonly truncated: boolean;

  constructor(value: string) {
    if (typeof value !== 'string') {
      throw new Error(`VLAN name must be a string, got: ${typeof value}`);
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw new Error('VLAN name cannot be empty');
    }

    // Check if name needs truncation
    this.truncated = trimmed.length > MAX_VLAN_NAME_LENGTH;

    // Truncate if necessary (IOS behavior)
    const truncatedValue = trimmed.slice(0, MAX_VLAN_NAME_LENGTH);

    // Validate characters
    if (!VLAN_NAME_PATTERN.test(truncatedValue)) {
      throw new Error(
        `Invalid VLAN name "${truncatedValue}": must start with a letter and contain only alphanumeric characters, hyphens, or underscores`
      );
    }

    this.value = truncatedValue;
  }

  /**
   * Create VlanName from a string
   */
  static from(value: string): VlanName {
    return new VlanName(value);
  }

  /**
   * Try to create VlanName, returns null if invalid
   */
  static tryFrom(value: string): VlanName | null {
    try {
      return VlanName.from(value);
    } catch {
      return null;
    }
  }

  /**
   * Create optional VlanName (returns undefined for empty/null/undefined)
   */
  static fromOptional(value: string | null | undefined): VlanName | undefined {
    if (!value || value.trim() === '') {
      return undefined;
    }
    return VlanName.from(value);
  }

  /**
   * Check if a string is a valid VLAN name
   */
  static isValid(value: string): boolean {
    try {
      VlanName.from(value);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if name was truncated
   */
  get wasTruncated(): boolean {
    return this.truncated;
  }

  /**
   * Get the original length before truncation
   */
  get originalLength(): number {
    // We don't store original length, but this indicates potential truncation
    return this.truncated ? MAX_VLAN_NAME_LENGTH : this.value.length;
  }

  /**
   * Check equality with another VlanName
   */
  equals(other: VlanName): boolean {
    return this.value === other.value;
  }

  /**
   * String representation
   */
  toString(): string {
    return this.value;
  }

  /**
   * JSON serialization
   */
  toJSON(): string {
    return this.value;
  }
}

/**
 * Parse a VLAN name from a string
 */
export function parseVlanName(value: string): VlanName {
  return VlanName.from(value);
}

/**
 * Parse optional VLAN name (returns undefined for empty values)
 */
export function parseOptionalVlanName(
  value: string | null | undefined
): VlanName | undefined {
  return VlanName.fromOptional(value);
}

/**
 * Check if a string is a valid VLAN name
 */
export function isValidVlanName(value: string): boolean {
  return VlanName.isValid(value);
}
