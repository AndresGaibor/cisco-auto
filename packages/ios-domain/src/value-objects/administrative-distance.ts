// ============================================================================
// AdministrativeDistance Value Object
// ============================================================================

/**
 * Administrative Distance (AD) ranges:
 * - 0: Connected interface (most trusted)
 * - 1: Static route
 * - 90: EIGRP internal
 * - 100: IGRP
 * - 110: OSPF
 * - 120: RIP
 * - 170: EIGRP external
 * - 254: Other
 * - 255: Unreachable (least trusted)
 */
const MIN_AD = 0;
const MAX_AD = 255;

// Well-known administrative distances
export const WELL_KNOWN_AD = {
  CONNECTED: 0,
  STATIC: 1,
  EIGRP_SUMMARY: 5,
  BGP_EXTERNAL: 20,
  EIGRP_INTERNAL: 90,
  IGRP: 100,
  OSPF: 110,
  IS_IS: 115,
  RIP: 120,
  EIGRP_EXTERNAL: 170,
  BGP_LOCAL: 200,
  UNKNOWN: 254,
  UNREACHABLE: 255,
} as const;

export type WellKnownAdKey = keyof typeof WELL_KNOWN_AD;

/**
 * Represents a validated Administrative Distance value
 */
export class AdministrativeDistance {
  public readonly value: number;

  constructor(value: number) {
    if (!Number.isInteger(value)) {
      throw new Error(`Administrative Distance must be an integer, got: ${value}`);
    }
    if (value < MIN_AD || value > MAX_AD) {
      throw new Error(`Administrative Distance must be between ${MIN_AD} and ${MAX_AD}, got: ${value}`);
    }
    this.value = value;
  }

  static fromJSON(value: number): AdministrativeDistance {
    return new AdministrativeDistance(value);
  }

  toJSON(): number {
    return this.value;
  }

  get raw(): number {
    return this.value;
  }

  /**
   * Get the protocol name for well-known AD values
   */
  get protocolName(): string | null {
    for (const [key, value] of Object.entries(WELL_KNOWN_AD)) {
      if (value === this.value) {
        return this.formatKey(key);
      }
    }
    return null;
  }

  private formatKey(key: string): string {
    return key
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Check if this is a well-known AD value
   */
  get isWellKnown(): boolean {
    return Object.values(WELL_KNOWN_AD).includes(this.value as never);
  }

  /**
   * Check if this represents a connected route
   */
  get isConnected(): boolean {
    return this.value === WELL_KNOWN_AD.CONNECTED;
  }

  /**
   * Check if this represents a static route
   */
  get isStatic(): boolean {
    return this.value === WELL_KNOWN_AD.STATIC;
  }

  /**
   * Check if this represents an EIGRP route (internal or external)
   */
  get isEigrp(): boolean {
    return (
      this.value === WELL_KNOWN_AD.EIGRP_INTERNAL ||
      this.value === WELL_KNOWN_AD.EIGRP_EXTERNAL ||
      this.value === WELL_KNOWN_AD.EIGRP_SUMMARY
    );
  }

  /**
   * Check if this represents an OSPF route
   */
  get isOspf(): boolean {
    return this.value === WELL_KNOWN_AD.OSPF;
  }

  /**
   * Check if this represents a BGP route
   */
  get isBgp(): boolean {
    return (
      this.value === WELL_KNOWN_AD.BGP_EXTERNAL ||
      this.value === WELL_KNOWN_AD.BGP_LOCAL
    );
  }

  /**
   * Check if this represents a RIP route
   */
  get isRip(): boolean {
    return this.value === WELL_KNOWN_AD.RIP;
  }

  /**
   * Check if this route is unreachable
   */
  get isUnreachable(): boolean {
    return this.value === WELL_KNOWN_AD.UNREACHABLE;
  }

  /**
   * Compare with another AD - returns true if this is more trusted (lower AD)
   */
  isMoreTrustedThan(other: AdministrativeDistance): boolean {
    return this.value < other.value;
  }

  /**
   * Compare with another AD - returns true if this is less trusted (higher AD)
   */
  isLessTrustedThan(other: AdministrativeDistance): boolean {
    return this.value > other.value;
  }

  /**
   * Create from a well-known protocol name
   */
  static fromProtocol(protocol: WellKnownAdKey): AdministrativeDistance {
    return new AdministrativeDistance(WELL_KNOWN_AD[protocol]);
  }

  /**
   * Create a static route AD
   */
  static forStatic(): AdministrativeDistance {
    return new AdministrativeDistance(WELL_KNOWN_AD.STATIC);
  }

  /**
   * Create an OSPF route AD
   */
  static forOspf(): AdministrativeDistance {
    return new AdministrativeDistance(WELL_KNOWN_AD.OSPF);
  }

  /**
   * Create a RIP route AD
   */
  static forRip(): AdministrativeDistance {
    return new AdministrativeDistance(WELL_KNOWN_AD.RIP);
  }

  /**
   * Create an EIGRP internal route AD
   */
  static forEigrpInternal(): AdministrativeDistance {
    return new AdministrativeDistance(WELL_KNOWN_AD.EIGRP_INTERNAL);
  }

  /**
   * Create an EIGRP external route AD
   */
  static forEigrpExternal(): AdministrativeDistance {
    return new AdministrativeDistance(WELL_KNOWN_AD.EIGRP_EXTERNAL);
  }

  equals(other: AdministrativeDistance): boolean {
    return this.value === other.value;
  }

  toString(): string {
    const protocol = this.protocolName;
    return protocol ? `${this.value} (${protocol})` : String(this.value);
  }
}

/**
 * Create an AdministrativeDistance from a number, throwing if invalid
 */
export function parseAdministrativeDistance(value: number): AdministrativeDistance {
  return new AdministrativeDistance(value);
}

/**
 * Check if a number is a valid administrative distance without throwing
 */
export function isValidAdministrativeDistance(value: number): boolean {
  try {
    new AdministrativeDistance(value);
    return true;
  } catch {
    return false;
  }
}
