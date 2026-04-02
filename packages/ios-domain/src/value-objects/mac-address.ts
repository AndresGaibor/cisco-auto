// ============================================================================
// MacAddress Value Object
// ============================================================================

/**
 * Patterns for valid MAC addresses:
 * - Cisco format: AAAA.BBBB.CCCC (12 hex digits in groups of 4, dot-separated)
 * - Standard format: AA:BB:CC:DD:EE:FF (colon-separated)
 * - Windows format: AA-BB-CC-DD-EE-FF (hyphen-separated)
 * - No separator: AABBCCDDEEFF (12 consecutive hex digits)
 */
const MAC_PATTERNS = {
  cisco: /^([0-9A-Fa-f]{4})\.([0-9A-Fa-f]{4})\.([0-9A-Fa-f]{4})$/,
  colon: /^([0-9A-Fa-f]{2}):([0-9A-Fa-f]{2}):([0-9A-Fa-f]{2}):([0-9A-Fa-f]{2}):([0-9A-Fa-f]{2}):([0-9A-Fa-f]{2})$/,
  hyphen: /^([0-9A-Fa-f]{2})-([0-9A-Fa-f]{2})-([0-9A-Fa-f]{2})-([0-9A-Fa-f]{2})-([0-9A-Fa-f]{2})-([0-9A-Fa-f]{2})$/,
  bare: /^[0-9A-Fa-f]{12}$/,
};

export type MacFormat = 'cisco' | 'colon' | 'hyphen' | 'bare';

/**
 * Represents a validated MAC address with format normalization
 */
export class MacAddress {
  public readonly value: string;
  private readonly _octets: readonly number[];
  private readonly _format: MacFormat;

  constructor(value: string, format: MacFormat = 'colon') {
    const trimmed = value.trim().toUpperCase();
    const parsed = this.parseAndValidate(trimmed);
    
    if (!parsed) {
      throw new Error(
        `Invalid MAC address: "${value}". Must be in Cisco (AAAA.BBBB.CCCC), colon (AA:BB:CC:DD:EE:FF), ` +
        `hyphen (AA-BB-CC-DD-EE-FF), or bare (AABBCCDDEEFF) format.`
      );
    }

    this._octets = parsed.octets;
    this._format = format;
    this.value = this.formatAs(trimmed, parsed.detectedFormat);
  }

  static fromJSON(value: string): MacAddress {
    return new MacAddress(value);
  }

  toJSON(): string {
    return this.toString();
  }

  get raw(): string {
    return this.value;
  }

  /**
   * Get the MAC address as an array of octets
   */
  get octets(): readonly number[] {
    return this._octets;
  }

  /**
   * Get the detected format
   */
  get detectedFormat(): MacFormat {
    return this._format;
  }

  private parseAndValidate(value: string): { octets: number[]; detectedFormat: MacFormat } | null {
    // Try Cisco format
    let match = value.match(MAC_PATTERNS.cisco);
    if (match) {
      const hex = `${match[1] ?? ""}${match[2] ?? ""}${match[3] ?? ""}`;
      return { octets: this.hexToOctets(hex), detectedFormat: 'cisco' };
    }

    // Try colon format
    match = value.match(MAC_PATTERNS.colon);
    if (match) {
      const hex = match.slice(1).join('');
      return { octets: this.hexToOctets(hex), detectedFormat: 'colon' };
    }

    // Try hyphen format
    match = value.match(MAC_PATTERNS.hyphen);
    if (match) {
      const hex = match.slice(1).join('');
      return { octets: this.hexToOctets(hex), detectedFormat: 'hyphen' };
    }

    // Try bare format
    match = value.match(MAC_PATTERNS.bare);
    if (match) {
      return { octets: this.hexToOctets(value), detectedFormat: 'bare' };
    }

    return null;
  }

  private hexToOctets(hex: string): number[] {
    const octets: number[] = [];
    for (let i = 0; i < hex.length; i += 2) {
      octets.push(parseInt(hex.substring(i, i + 2), 16));
    }
    return octets;
  }

  private formatAs(value: string, format: MacFormat): string {
    const hex = value.replace(/[^0-9A-F]/g, '');
    
    switch (format) {
      case 'cisco':
        return `${hex.substring(0, 4)}.${hex.substring(4, 8)}.${hex.substring(8, 12)}`;
      case 'colon':
        return hex.match(/.{2}/g)?.join(':') ?? '';
      case 'hyphen':
        return hex.match(/.{2}/g)?.join('-') ?? '';
      case 'bare':
        return hex;
      default:
        return value;
    }
  }

  /**
   * Format as Cisco style (AAAA.BBBB.CCCC)
   */
  toCiscoFormat(): string {
    const hex = this._octets.map(o => o.toString(16).padStart(2, '0').toUpperCase()).join('');
    return `${hex.substring(0, 4)}.${hex.substring(4, 8)}.${hex.substring(8, 12)}`;
  }

  /**
   * Format as standard colon-separated (AA:BB:CC:DD:EE:FF)
   */
  toColonFormat(): string {
    return this._octets.map(o => o.toString(16).padStart(2, '0').toUpperCase()).join(':');
  }

  /**
   * Format as hyphen-separated (AA-BB-CC-DD-EE-FF)
   */
  toHyphenFormat(): string {
    return this._octets.map(o => o.toString(16).padStart(2, '0').toUpperCase()).join('-');
  }

  /**
   * Format as bare hex (AABBCCDDEEFF)
   */
  toBareFormat(): string {
    return this._octets.map(o => o.toString(16).padStart(2, '0').toUpperCase()).join('');
  }

  /**
   * Get the OUI (Organizationally Unique Identifier) - first 3 octets
   */
  get oui(): string {
    return this._octets.slice(0, 3).map(o => o.toString(16).padStart(2, '0').toUpperCase()).join(':');
  }

  /**
   * Get the NIC (Network Interface Controller) identifier - last 3 octets
   */
  get nic(): string {
    return this._octets.slice(3).map(o => o.toString(16).padStart(2, '0').toUpperCase()).join(':');
  }

  /**
   * Check if this is a unicast address (LSB of first octet is 0)
   */
  get isUnicast(): boolean {
    return (this._octets[0]! & 0x01) === 0;
  }

  /**
   * Check if this is a multicast address (LSB of first octet is 1)
   */
  get isMulticast(): boolean {
    return (this._octets[0]! & 0x01) === 1;
  }

  /**
   * Check if this is a broadcast address (FF:FF:FF:FF:FF:FF)
   */
  get isBroadcast(): boolean {
    return this._octets.every(o => o === 0xFF);
  }

  /**
   * Check if this is a locally administered address (second bit of first octet is 1)
   */
  get isLocallyAdministered(): boolean {
    return (this._octets[0]! & 0x02) === 0x02;
  }

  /**
   * Check if this is a universally administered address (second bit of first octet is 0)
   */
  get isUniversal(): boolean {
    return (this._octets[0]! & 0x02) === 0;
  }

  equals(other: MacAddress): boolean {
    return this._octets.every((octet, i) => octet === other._octets[i]);
  }

  toString(): string {
    return this.value;
  }
}

/**
 * Create a MacAddress from a string, throwing if invalid
 */
export function parseMacAddress(value: string, format?: MacFormat): MacAddress {
  return new MacAddress(value, format);
}

/**
 * Check if a string is a valid MAC address without throwing
 */
export function isValidMacAddress(value: string): boolean {
  try {
    new MacAddress(value);
    return true;
  } catch {
    return false;
  }
}
