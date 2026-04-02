// ============================================================================
// SubnetMask Value Object
// ============================================================================

import { CidrPrefix } from "./cidr-prefix.js";

// All valid subnet masks in dotted decimal notation
const VALID_MASKS = [
  "0.0.0.0",
  "128.0.0.0", "192.0.0.0", "224.0.0.0", "240.0.0.0",
  "248.0.0.0", "252.0.0.0", "254.0.0.0", "255.0.0.0",
  "255.128.0.0", "255.192.0.0", "255.224.0.0", "255.240.0.0",
  "255.248.0.0", "255.252.0.0", "255.254.0.0", "255.255.0.0",
  "255.255.128.0", "255.255.192.0", "255.255.224.0", "255.255.240.0",
  "255.255.248.0", "255.255.252.0", "255.255.254.0", "255.255.255.0",
  "255.255.255.128", "255.255.255.192", "255.255.255.224", "255.255.255.240",
  "255.255.255.248", "255.255.255.252", "255.255.255.254", "255.255.255.255",
] as const;

/**
 * Represents a validated subnet mask
 */
export class SubnetMask {
  public readonly value: string;
  private readonly _cidrPrefix: CidrPrefix;

  constructor(value: string) {
    const normalized = value.trim();
    if (!VALID_MASKS.includes(normalized as typeof VALID_MASKS[number])) {
      throw new Error(`Invalid subnet mask: "${value}". Must be a valid mask like 255.255.255.0`);
    }
    this.value = normalized;
    this._cidrPrefix = new CidrPrefix(this.calculateCidr(normalized));
  }

  static fromJSON(value: string): SubnetMask {
    return new SubnetMask(value);
  }

  toJSON(): string {
    return this.value;
  }

  get raw(): string {
    return this.value;
  }

  /**
   * Get the CIDR prefix as a value object
   */
  get cidrPrefix(): CidrPrefix {
    return this._cidrPrefix;
  }

  /**
   * Get the CIDR prefix length (0-32)
   */
  get cidr(): number {
    return this._cidrPrefix.value;
  }

  /**
   * Create from CIDR notation (e.g., 24 for 255.255.255.0)
   */
  static fromCidr(cidr: number): SubnetMask {
    const prefix = new CidrPrefix(cidr);
    if (prefix.value === 0) return new SubnetMask("0.0.0.0");
    const mask = (~0 << (32 - prefix.value)) >>> 0;
    const dotted = `${(mask >>> 24) & 255}.${(mask >>> 16) & 255}.${(mask >>> 8) & 255}.${mask & 255}`;
    return new SubnetMask(dotted);
  }

  private calculateCidr(mask: string): number {
    const parts = mask.split(".").map((p) => parseInt(p, 10));
    let cidr = 0;
    for (const part of parts) {
      cidr += part.toString(2).replace(/0/g, "").length;
    }
    return cidr;
  }

  /**
   * Get the wildcard mask (inverse of the subnet mask)
   */
  get wildcardMask(): string {
    const parts = this.value.split(".").map((p) => 255 - parseInt(p, 10));
    return parts.join(".");
  }

  /**
   * Get the number of usable hosts in the subnet
   */
  get usableHosts(): number {
    return this._cidrPrefix.usableHosts;
  }

  /**
   * Get the total number of addresses in the subnet
   */
  get totalAddresses(): number {
    return this._cidrPrefix.totalAddresses;
  }

  /**
   * Check if this is a valid mask for hosts (not /31 or /32)
   */
  get isValidForHosts(): boolean {
    return this._cidrPrefix.isValidForHosts;
  }

  /**
   * Check if this is a point-to-point mask (/31)
   */
  get isPointToPoint(): boolean {
    return this._cidrPrefix.isPointToPoint;
  }

  /**
   * Check if this is a loopback mask (/32)
   */
  get isLoopback(): boolean {
    return this._cidrPrefix.isLoopback;
  }

  equals(other: SubnetMask): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  /**
   * Return CIDR notation (e.g., "/24")
   */
  toCidrString(): string {
    return this._cidrPrefix.toString();
  }
}

/**
 * Create a SubnetMask, throwing if invalid
 */
export function parseSubnetMask(value: string): SubnetMask {
  return new SubnetMask(value);
}

/**
 * Check if a string is a valid subnet mask without throwing
 */
export function isValidSubnetMask(value: string): boolean {
  try {
    new SubnetMask(value);
    return true;
  } catch {
    return false;
  }
}
