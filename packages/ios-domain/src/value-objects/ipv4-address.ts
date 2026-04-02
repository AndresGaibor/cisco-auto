// ============================================================================
// Ipv4Address Value Object
// ============================================================================

/**
 * Represents a validated IPv4 address
 */
export class Ipv4Address {
  public readonly value: string;
  private readonly _octets: readonly [number, number, number, number];

  constructor(value: string) {
    const normalized = value.trim();
    const octets = this.parseAndValidate(normalized);
    this.value = normalized;
    this._octets = octets;
  }

  static fromJSON(value: string): Ipv4Address {
    return new Ipv4Address(value);
  }

  toJSON(): string {
    return this.value;
  }

  get raw(): string {
    return this.value;
  }

  private parseAndValidate(value: string): [number, number, number, number] {
    const parts = value.split(".");
    if (parts.length !== 4) {
      throw new Error(`Invalid IPv4 address: "${value}". Expected 4 octets separated by dots.`);
    }

    const octets: [number, number, number, number] = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
      const num = parseInt(parts[i]!, 10);
      if (isNaN(num) || num < 0 || num > 255 || String(num) !== parts[i]) {
        throw new Error(`Invalid IPv4 address: "${value}". Octet ${i + 1} must be 0-255.`);
      }
      octets[i] = num;
    }

    return octets;
  }

  /**
   * Get the octets as an array
   */
  get octets(): readonly [number, number, number, number] {
    return this._octets;
  }

  /**
   * Get the address as a 32-bit integer
   */
  toInt(): number {
    return ((this._octets[0] << 24) | (this._octets[1] << 16) | (this._octets[2] << 8) | this._octets[3]) >>> 0;
  }

  /**
   * Check if this is a private address (RFC 1918)
   */
  get isPrivate(): boolean {
    const [a, b] = this._octets;
    // 10.0.0.0/8
    if (a === 10) return true;
    // 172.16.0.0/12
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.168.0.0/16
    if (a === 192 && b === 168) return true;
    return false;
  }

  /**
   * Check if this is a loopback address (127.0.0.0/8)
   */
  get isLoopback(): boolean {
    return this._octets[0] === 127;
  }

  /**
   * Check if this is an APIPA address (169.254.0.0/16)
   */
  get isApipa(): boolean {
    return this._octets[0] === 169 && this._octets[1] === 254;
  }

  /**
   * Check if this is a multicast address (224.0.0.0/4)
   */
  get isMulticast(): boolean {
    return this._octets[0] >= 224 && this._octets[0] <= 239;
  }

  /**
   * Check if this is a broadcast address (255.255.255.255)
   */
  get isBroadcast(): boolean {
    return this._octets[0] === 255 && this._octets[1] === 255 && this._octets[2] === 255 && this._octets[3] === 255;
  }

  /**
   * Check if this is an unicast address (not broadcast, not multicast, not reserved)
   */
  get isUnicast(): boolean {
    return !this.isBroadcast && !this.isMulticast && !this.isLoopback && !this.isApipa;
  }

  /**
   * Check if this is a link-local address
   */
  get isLinkLocal(): boolean {
    const [a, b] = this._octets;
    return (a === 169 && b === 254) || (a === 255 && b === 255 && this._octets[2] === 255 && this._octets[3] === 255);
  }

  /**
   * Get the subnet address for a given CIDR prefix length
   */
  getSubnetAddress(prefixLength: number): Ipv4Address {
    if (prefixLength < 0 || prefixLength > 32) {
      throw new Error(`Invalid prefix length: ${prefixLength}`);
    }
    const mask = prefixLength === 0 ? 0 : (~0 << (32 - prefixLength)) >>> 0;
    const addrInt = this.toInt() & mask;
    return new Ipv4Address(
      `${(addrInt >>> 24) & 255}.${(addrInt >>> 16) & 255}.${(addrInt >>> 8) & 255}.${addrInt & 255}`
    );
  }

  equals(other: Ipv4Address): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

/**
 * Create an Ipv4Address, throwing if invalid
 */
export function parseIpv4Address(value: string): Ipv4Address {
  return new Ipv4Address(value);
}

/**
 * Check if a string is a valid IPv4 address without throwing
 */
export function isValidIpv4Address(value: string): boolean {
  try {
    new Ipv4Address(value);
    return true;
  } catch {
    return false;
  }
}
