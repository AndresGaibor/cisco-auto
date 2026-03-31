// ============================================================================
// RouteTarget Value Object
// ============================================================================

// Format: ASN:NN or IP:NN (for BGP route targets)
const ROUTE_TARGET_PATTERN = /^(\d+|\d+\.\d+\.\d+\.\d+):(\d+)$/;

/**
 * Represents a BGP Route Target (RT) in AS:NN or IP:NN format
 * Used for VPNv4 route distinguishers and VRF route targets
 */
export class RouteTarget {
  public readonly value: string;
  public readonly asn: string | number;
  public readonly id: number;

  constructor(value: string) {
    const normalized = value.trim().toUpperCase();
    const match = normalized.match(ROUTE_TARGET_PATTERN);
    if (!match) {
      throw new Error(`Invalid route target: "${value}". Expected format: ASN:NN or IP:NN (e.g., 65001:100, 192.168.1.1:100)`);
    }

    const asnPart = match[1]!;
    const idPart = parseInt(match[2]!, 10);

    // Validate ASN part
    const asn = /^\d+$/.test(asnPart) ? parseInt(asnPart, 10) : asnPart;

    this.value = normalized;
    this.asn = asn;
    this.id = idPart;
  }

  static fromJSON(value: string): RouteTarget {
    return new RouteTarget(value);
  }

  toJSON(): string {
    return this.value;
  }

  get raw(): string {
    return this.value;
  }

  /**
   * Check if the ASN part is an IP address (four-octet format)
   */
  get isIpAsn(): boolean {
    return typeof this.asn === "string";
  }

  /**
   * Check if the ASN part is a 16-bit ASN (0-65535)
   */
  get is16BitAsn(): boolean {
    return typeof this.asn === "number" && this.asn <= 65535;
  }

  /**
   * Check if the ASN part is a 32-bit AS (16-bit AS with extension)
   */
  get is32BitAsn(): boolean {
    return typeof this.asn === "number" && this.asn > 65535;
  }

  /**
   * Format as Cisco-style BGP AS:NN notation
   */
  toCiscoFormat(): string {
    if (typeof this.asn === "number" && this.asn > 65535) {
      // 32-bit AS needs AS:NN format (no dot notation in Cisco)
      return `${this.asn}:${this.id}`;
    }
    return this.value;
  }

  equals(other: RouteTarget): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

/**
 * Create a RouteTarget, throwing if invalid
 */
export function parseRouteTarget(value: string): RouteTarget {
  return new RouteTarget(value);
}

/**
 * Check if a string is a valid route target without throwing
 */
export function isValidRouteTarget(value: string): boolean {
  try {
    new RouteTarget(value);
    return true;
  } catch {
    return false;
  }
}
