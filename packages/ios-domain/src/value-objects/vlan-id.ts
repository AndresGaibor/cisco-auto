/**
 * VLAN ID Value Object
 *
 * Represents a validated VLAN ID (1-4094)
 * Ensures VLAN IDs are valid at construction time, preventing runtime errors
 */

const MIN_VLAN_ID = 1;
const MAX_VLAN_ID = 4094;

/**
 * VLAN ID types according to IEEE 802.1Q standard
 */
export enum VlanType {
  /** Default VLAN - cannot be deleted */
  DEFAULT = 'default',
  /** Normal range VLANs (2-1001) - can be created/deleted */
  NORMAL = 'normal',
  /** Reserved VLANs (1002-1005) - legacy FDDI/Token Ring */
  RESERVED = 'reserved',
  /** Extended range VLANs (1006-4094) - limited features */
  EXTENDED = 'extended',
}

export class VlanId {
  public readonly value: number;
  public readonly type: VlanType;

  constructor(value: number) {
    if (!Number.isInteger(value)) {
      throw new Error(`VLAN ID must be an integer, got: ${value}`);
    }
    if (value < MIN_VLAN_ID || value > MAX_VLAN_ID) {
      throw new Error(
        `VLAN ID must be between ${MIN_VLAN_ID} and ${MAX_VLAN_ID}, got: ${value}`
      );
    }
    this.value = value;
    this.type = this.classifyVlan(value);
  }

  /**
   * Classify VLAN ID according to IEEE 802.1Q
   */
  private classifyVlan(value: number): VlanType {
    if (value === 1) return VlanType.DEFAULT;
    if (value >= 2 && value <= 1001) return VlanType.NORMAL;
    if (value >= 1002 && value <= 1005) return VlanType.RESERVED;
    return VlanType.EXTENDED;
  }

  /**
   * Create VlanId from a number
   */
  static from(value: number): VlanId {
    return new VlanId(value);
  }

  /**
   * Create VlanId from a string (parses the number)
   */
  static fromString(value: string): VlanId {
    const num = parseInt(value, 10);
    if (isNaN(num)) {
      throw new Error(`Invalid VLAN ID: "${value}" is not a number`);
    }
    return new VlanId(num);
  }

  /**
   * Try to create VlanId, returns null if invalid
   */
  static tryFrom(value: number | string): VlanId | null {
    try {
      return typeof value === 'string'
        ? VlanId.fromString(value)
        : VlanId.from(value);
    } catch {
      return null;
    }
  }

  /**
   * Check if a number is a valid VLAN ID without throwing
   */
  static isValid(value: number | string): boolean {
    try {
      typeof value === 'string'
        ? VlanId.fromString(value)
        : VlanId.from(value);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if this is the default VLAN (VLAN 1)
   */
  get isDefault(): boolean {
    return this.type === VlanType.DEFAULT;
  }

  /**
   * Check if this is a normal VLAN (2-1001)
   */
  get isNormal(): boolean {
    return this.type === VlanType.NORMAL;
  }

  /**
   * Check if this is a reserved VLAN (1002-1005)
   */
  get isReserved(): boolean {
    return this.type === VlanType.RESERVED;
  }

  /**
   * Check if this is an extended VLAN (1006-4094)
   */
  get isExtended(): boolean {
    return this.type === VlanType.EXTENDED;
  }

  /**
   * Check if this VLAN can be created/deleted (normal and extended)
   */
  get isConfigurable(): boolean {
    return this.type === VlanType.NORMAL || this.type === VlanType.EXTENDED;
  }

  /**
   * Check equality with another VlanId
   */
  equals(other: VlanId): boolean {
    return this.value === other.value;
  }

  /**
   * Compare with another VlanId for sorting
   */
  compareTo(other: VlanId): number {
    return this.value - other.value;
  }

  /**
   * Get raw number value
   */
  toNumber(): number {
    return this.value;
  }

  /**
   * String representation
   */
  toString(): string {
    return String(this.value);
  }

  /**
   * JSON serialization
   */
  toJSON(): number {
    return this.value;
  }
}

/**
 * Parse a VLAN ID from number or string
 */
export function parseVlanId(value: number | string): VlanId {
  return typeof value === 'string'
    ? VlanId.fromString(value)
    : VlanId.from(value);
}

/**
 * Parse optional VLAN ID (returns undefined for null/undefined)
 */
export function parseOptionalVlanId(value: number | string | null | undefined): VlanId | undefined {
  if (value === null || value === undefined) return undefined;
  return typeof value === 'string'
    ? VlanId.fromString(value)
    : VlanId.from(value);
}

/**
 * Check if a value is a valid VLAN ID
 */
export function isValidVlanId(value: number | string): boolean {
  return VlanId.isValid(value);
}
