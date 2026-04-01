// ============================================================================
// WildcardMask Value Object
// ============================================================================

import { CidrPrefix } from "./cidr-prefix.js";

/**
 * Represents a validated wildcard mask (inverse of subnet mask)
 * Used in OSPF network statements, ACLs, and other Cisco IOS features
 */
export class WildcardMask {
  public readonly value: string;
  private readonly _octets: readonly [number, number, number, number];

  constructor(value: string) {
    const normalized = value.trim();
    const octets = this.parseAndValidate(normalized);
    this.value = normalized;
    this._octets = octets;
  }

  static fromJSON(value: string): WildcardMask {
    return new WildcardMask(value);
  }

  toJSON(): string {
    return this.value;
  }

  get raw(): string {
    return this.value;
  }

  /**
   * Get the octets as an array
   */
  get octets(): readonly [number, number, number, number] {
    return this._octets;
  }

  private parseAndValidate(value: string): [number, number, number, number] {
    const parts = value.split(".");
    if (parts.length !== 4) {
      throw new Error(
        `Invalid wildcard mask: "${value}". Expected 4 octets separated by dots.`
      );
    }

    const octets: [number, number, number, number] = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
      const num = parseInt(parts[i]!, 10);
      if (isNaN(num) || num < 0 || num > 255) {
        throw new Error(
          `Invalid wildcard mask: "${value}". Octet ${i + 1} must be 0-255.`
        );
      }
      // Validate that the octet is a valid wildcard value (contiguous bits)
      if (!this.isValidWildcardOctet(num)) {
        throw new Error(
          `Invalid wildcard mask octet: ${num}. Must be a valid wildcard value (0, 1, 3, 7, 15, 31, 63, 127, 255).`
        );
      }
      octets[i] = num;
    }

    return octets;
  }

  /**
   * Check if an octet is a valid wildcard value
   * Valid values: 0, 1, 3, 7, 15, 31, 63, 127, 255 (contiguous 1s from LSB)
   */
  private isValidWildcardOctet(value: number): boolean {
    // A valid wildcard octet has contiguous 1s starting from LSB
    // This means (value + 1) must be a power of 2, or value must be 0
    if (value === 0) return true;
    const incremented = value + 1;
    return (incremented & (incremented - 1)) === 0;
  }

  /**
   * Create from CIDR prefix length
   */
  static fromCidr(cidr: number | CidrPrefix): WildcardMask {
    const prefix = cidr instanceof CidrPrefix ? cidr : new CidrPrefix(cidr);
    const subnetMaskInt = prefix.value === 0 ? 0 : (~0 << (32 - prefix.value)) >>> 0;
    const wildcardInt = ~subnetMaskInt >>> 0;

    const octets = [
      (wildcardInt >>> 24) & 255,
      (wildcardInt >>> 16) & 255,
      (wildcardInt >>> 8) & 255,
      wildcardInt & 255,
    ];

    return new WildcardMask(octets.join("."));
  }

  /**
   * Create from subnet mask (inverse)
   */
  static fromSubnetMask(mask: string): WildcardMask {
    const octets = mask.split(".").map((o) => 255 - parseInt(o, 10));
    return new WildcardMask(octets.join("."));
  }

  /**
   * Get the equivalent subnet mask
   */
  toSubnetMask(): string {
    return this._octets.map((o) => 255 - o).join(".");
  }

  /**
   * Get the equivalent CIDR prefix length
   */
  toCidrPrefix(): CidrPrefix {
    const subnetMaskInt = ~this.toInt() >>> 0;
    let cidr = 0;
    for (let i = 31; i >= 0; i--) {
      if ((subnetMaskInt & (1 << i)) !== 0) {
        cidr++;
      } else {
        break;
      }
    }
    return new CidrPrefix(cidr);
  }

  /**
   * Get the wildcard mask as a 32-bit integer
   */
  toInt(): number {
    return (
      (this._octets[0] << 24) |
      (this._octets[1] << 16) |
      (this._octets[2] << 8) |
      this._octets[3]
    ) >>> 0;
  }

  /**
   * Get the number of wildcard bits (bits that can vary)
   */
  get wildcardBits(): number {
    return 32 - this.toCidrPrefix().value;
  }

  /**
   * Check if this is a host mask (0.0.0.0 - exact match)
   */
  get isHost(): boolean {
    return this.value === "0.0.0.0";
  }

  /**
   * Check if this is an any mask (255.255.255.255 - match all)
   */
  get isAny(): boolean {
    return this.value === "255.255.255.255";
  }

  /**
   * Check if this is a standard classful mask
   */
  get isClassful(): boolean {
    return (
      this.value === "0.0.0.0" || // /32
      this.value === "0.0.0.255" || // /24
      this.value === "0.0.255.255" || // /16
      this.value === "0.255.255.255" || // /8
      this.value === "255.255.255.255" // /0
    );
  }

  /**
   * Get the OSPF network statement format
   */
  toOspfNetworkStatement(ip: string): string {
    return `network ${ip} ${this.value}`;
  }

  /**
   * Get the ACL wildcard mask format
   */
  toAclFormat(): string {
    return this.value;
  }

  equals(other: WildcardMask): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

/**
 * Create a WildcardMask from a string, throwing if invalid
 */
export function parseWildcardMask(value: string): WildcardMask {
  return new WildcardMask(value);
}

/**
 * Check if a string is a valid wildcard mask without throwing
 */
export function isValidWildcardMask(value: string): boolean {
  try {
    new WildcardMask(value);
    return true;
  } catch {
    return false;
  }
}
