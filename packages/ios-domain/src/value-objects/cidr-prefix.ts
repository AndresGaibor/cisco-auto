// ============================================================================
// CidrPrefix Value Object
// ============================================================================

/**
 * Represents a validated CIDR prefix length (0-32 for IPv4)
 */
export class CidrPrefix {
  public readonly value: number;

  constructor(value: number) {
    if (!Number.isInteger(value)) {
      throw new Error(`CIDR prefix must be an integer, got: ${value}`);
    }
    if (value < 0 || value > 32) {
      throw new Error(`CIDR prefix must be between 0 and 32, got: ${value}`);
    }
    this.value = value;
  }

  static fromJSON(value: number): CidrPrefix {
    return new CidrPrefix(value);
  }

  toJSON(): number {
    return this.value;
  }

  get raw(): number {
    return this.value;
  }

  /**
   * Get the subnet mask as dotted decimal notation
   */
  toSubnetMask(): string {
    const mask = this.value === 0 ? 0 : (~0 << (32 - this.value)) >>> 0;
    return `${(mask >>> 24) & 255}.${(mask >>> 16) & 255}.${(mask >>> 8) & 255}.${mask & 255}`;
  }

  /**
   * Get the wildcard mask (inverse of subnet mask)
   */
  toWildcardMask(): string {
    const subnetMask = this.toSubnetMask();
    return subnetMask.split('.').map(octet => String(255 - parseInt(octet, 10))).join('.');
  }

  /**
   * Get the number of usable hosts (2^(32-prefix) - 2)
   */
  get usableHosts(): number {
    if (this.value === 32) return 1;
    if (this.value === 31) return 2; // Point-to-point link
    return Math.pow(2, 32 - this.value) - 2;
  }

  /**
   * Get the total number of addresses (2^(32-prefix))
   */
  get totalAddresses(): number {
    return Math.pow(2, 32 - this.value);
  }

  /**
   * Check if this is a valid host prefix (/30 or larger)
   */
  get isValidForHosts(): boolean {
    return this.value >= 8 && this.value <= 30;
  }

  /**
   * Check if this is a point-to-point prefix (/31)
   */
  get isPointToPoint(): boolean {
    return this.value === 31;
  }

  /**
   * Check if this is a loopback prefix (/32)
   */
  get isLoopback(): boolean {
    return this.value === 32;
  }

  /**
   * Check if this prefix can contain another prefix
   */
  canContain(other: CidrPrefix): boolean {
    return this.value < other.value;
  }

  equals(other: CidrPrefix): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return `/${this.value}`;
  }
}

/**
 * Create a CidrPrefix from a number, throwing if invalid
 */
export function parseCidrPrefix(value: number): CidrPrefix {
  return new CidrPrefix(value);
}

/**
 * Check if a number is a valid CIDR prefix without throwing
 */
export function isValidCidrPrefix(value: number): boolean {
  try {
    new CidrPrefix(value);
    return true;
  } catch {
    return false;
  }
}
