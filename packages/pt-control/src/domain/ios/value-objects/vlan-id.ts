// ============================================================================
// VlanId Value Object
// ============================================================================

const MIN_VLAN_ID = 1;
const MAX_VLAN_ID = 4094;

/**
 * Represents a validated VLAN ID (1-4094)
 */
export class VlanId {
  public readonly value: number;

  constructor(value: number) {
    if (!Number.isInteger(value)) {
      throw new Error(`VLAN ID must be an integer, got: ${value}`);
    }
    if (value < MIN_VLAN_ID || value > MAX_VLAN_ID) {
      throw new Error(`VLAN ID must be between ${MIN_VLAN_ID} and ${MAX_VLAN_ID}, got: ${value}`);
    }
    this.value = value;
  }

  /**
   * Check if this is a reserved VLAN (VLAN 1 or VLAN 1002-1005)
   */
  get isReserved(): boolean {
    return this.value === 1 || (this.value >= 1002 && this.value <= 1005);
  }

  /**
   * Check if this is a normal VLAN (not reserved, not extended)
   */
  get isNormal(): boolean {
    return !this.isReserved && this.value <= 1000;
  }

  /**
   * Check if this is an extended VLAN (1006-4094)
   */
  get isExtended(): boolean {
    return this.value >= 1006;
  }

  /**
   * Check if this is the default VLAN
   */
  get isDefault(): boolean {
    return this.value === 1;
  }

  equals(other: VlanId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return String(this.value);
  }
}

/**
 * Create a VlanId from a number or string
 */
export function parseVlanId(value: number | string): VlanId {
  const num = typeof value === "string" ? parseInt(value, 10) : value;
  if (isNaN(num)) {
    throw new Error(`Invalid VLAN ID: "${value}" is not a number`);
  }
  return new VlanId(num);
}

/**
 * Check if a number is a valid VLAN ID without throwing
 */
export function isValidVlanId(value: number): boolean {
  return Number.isInteger(value) && value >= MIN_VLAN_ID && value <= MAX_VLAN_ID;
}
