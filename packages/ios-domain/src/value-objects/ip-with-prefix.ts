// ============================================================================
// IpWithPrefix Value Object (IP + CIDR)
// ============================================================================

import { Ipv4Address } from "./ipv4-address.js";
import { CidrPrefix } from "./cidr-prefix.js";
import { SubnetMask } from "./subnet-mask.js";
import { WildcardMask } from "./wildcard-mask.js";

/**
 * Represents an IPv4 address with CIDR prefix (e.g., 192.168.1.0/24)
 * This is the canonical representation for network prefixes in IOS
 */
export class IpWithPrefix {
  public readonly ip: Ipv4Address;
  public readonly prefix: CidrPrefix;

  constructor(ip: string | Ipv4Address, prefix: number | CidrPrefix) {
    this.ip = ip instanceof Ipv4Address ? ip : new Ipv4Address(ip);
    this.prefix =
      prefix instanceof CidrPrefix ? prefix : new CidrPrefix(prefix);
  }

  static fromJSON(value: string): IpWithPrefix {
    return parseIpWithPrefix(value);
  }

  toJSON(): string {
    return this.toString();
  }

  /**
   * Parse from CIDR notation string (e.g., "192.168.1.0/24")
   */
  static fromCidrNotation(cidrNotation: string): IpWithPrefix {
    return parseIpWithPrefix(cidrNotation);
  }

  /**
   * Parse from IP and subnet mask (e.g., "192.168.1.0", "255.255.255.0")
   */
  static fromIpAndMask(ip: string, mask: string | SubnetMask): IpWithPrefix {
    const ipv4 = new Ipv4Address(ip);
    const subnetMask =
      mask instanceof SubnetMask ? mask : new SubnetMask(mask);
    return new IpWithPrefix(ipv4, subnetMask.cidrPrefix);
  }

  get raw(): string {
    return this.toString();
  }

  /**
   * Get the network address (IP ANDed with subnet mask)
   */
  get networkAddress(): Ipv4Address {
    const ipInt = this.ip.toInt();
    const maskInt = (~0 << (32 - this.prefix.value)) >>> 0;
    const networkInt = (ipInt & maskInt) >>> 0;

    return new Ipv4Address(
      `${(networkInt >>> 24) & 255}.${(networkInt >>> 16) & 255}.${(networkInt >>> 8) & 255}.${networkInt & 255}`
    );
  }

  /**
   * Get the broadcast address
   */
  get broadcastAddress(): Ipv4Address {
    const networkInt = this.networkAddress.toInt();
    const hostBits = 32 - this.prefix.value;
    const broadcastInt = networkInt | ((1 << hostBits) - 1);

    return new Ipv4Address(
      `${(broadcastInt >>> 24) & 255}.${(broadcastInt >>> 16) & 255}.${(broadcastInt >>> 8) & 255}.${broadcastInt & 255}`
    );
  }

  /**
   * Get the first usable host address (network + 1)
   */
  get firstUsableHost(): Ipv4Address | null {
    if (this.prefix.value >= 31) return null; // /31 or /32 has no usable hosts
    const networkInt = this.networkAddress.toInt();
    const firstHostInt = (networkInt + 1) >>> 0;

    return new Ipv4Address(
      `${(firstHostInt >>> 24) & 255}.${(firstHostInt >>> 16) & 255}.${(firstHostInt >>> 8) & 255}.${firstHostInt & 255}`
    );
  }

  /**
   * Get the last usable host address (broadcast - 1)
   */
  get lastUsableHost(): Ipv4Address | null {
    if (this.prefix.value >= 31) return null;
    const broadcastInt = this.broadcastAddress.toInt();
    const lastHostInt = (broadcastInt - 1) >>> 0;

    return new Ipv4Address(
      `${(lastHostInt >>> 24) & 255}.${(lastHostInt >>> 16) & 255}.${(lastHostInt >>> 8) & 255}.${lastHostInt & 255}`
    );
  }

  /**
   * Get the subnet mask
   */
  get subnetMask(): SubnetMask {
    return SubnetMask.fromCidr(this.prefix.value);
  }

  /**
   * Get the wildcard mask
   */
  get wildcardMask(): WildcardMask {
    return WildcardMask.fromCidr(this.prefix);
  }

  /**
   * Get the number of usable hosts
   */
  get usableHosts(): number {
    return this.prefix.usableHosts;
  }

  /**
   * Get the total number of addresses
   */
  get totalAddresses(): number {
    return this.prefix.totalAddresses;
  }

  /**
   * Check if an IP is within this network
   */
  contains(ip: string | Ipv4Address): boolean {
    const ipAddr = ip instanceof Ipv4Address ? ip : new Ipv4Address(ip);
    const networkInt = this.networkAddress.toInt();
    const broadcastInt = this.broadcastAddress.toInt();
    const ipInt = ipAddr.toInt();

    return ipInt >= networkInt && ipInt <= broadcastInt;
  }

  /**
   * Check if this network contains another network
   */
  containsNetwork(other: IpWithPrefix): boolean {
    if (this.prefix.value > other.prefix.value) {
      return false; // This network is smaller
    }
    return (
      this.contains(other.networkAddress) &&
      this.contains(other.broadcastAddress)
    );
  }

  /**
   * Check if this network overlaps with another
   */
  overlapsWith(other: IpWithPrefix): boolean {
    return this.contains(other.networkAddress) || other.contains(this.networkAddress);
  }

  /**
   * Check if this is a default route (0.0.0.0/0)
   */
  get isDefaultRoute(): boolean {
    return this.prefix.value === 0;
  }

  /**
   * Check if this is a host route (/32)
   */
  get isHostRoute(): boolean {
    return this.prefix.value === 32;
  }

  /**
   * Check if this is a point-to-point link (/31)
   */
  get isPointToPoint(): boolean {
    return this.prefix.value === 31;
  }

  /**
   * Get the CIDR notation string
   */
  toCidrNotation(): string {
    return `${this.ip.value}/${this.prefix.value}`;
  }

  /**
   * Get the IOS format for network statements (IP wildcard)
   */
  toOspfFormat(): string {
    return `${this.networkAddress.value} ${this.wildcardMask.value}`;
  }

  /**
   * Get the IOS format for static routes
   */
  toStaticRouteFormat(): string {
    if (this.isHostRoute) {
      return this.ip.value;
    }
    return `${this.networkAddress.value} ${this.subnetMask.value}`;
  }

  equals(other: IpWithPrefix): boolean {
    return (
      this.ip.equals(other.ip) && this.prefix.equals(other.prefix)
    );
  }

  toString(): string {
    return this.toCidrNotation();
  }
}

/**
 * Parse an IP with prefix from CIDR notation
 */
export function parseIpWithPrefix(value: string): IpWithPrefix {
  const parts = value.split("/");
  if (parts.length !== 2) {
    throw new Error(
      `Invalid CIDR notation: "${value}". Expected format: IP/prefix (e.g., 192.168.1.0/24)`
    );
  }

  const ip = new Ipv4Address(parts[0]!);
  const prefix = parseInt(parts[1]!, 10);

  if (isNaN(prefix)) {
    throw new Error(`Invalid prefix length: "${parts[1]}"`);
  }

  return new IpWithPrefix(ip, prefix);
}

/**
 * Check if a string is a valid IP with prefix without throwing
 */
export function isValidIpWithPrefix(value: string): boolean {
  try {
    parseIpWithPrefix(value);
    return true;
  } catch {
    return false;
  }
}
