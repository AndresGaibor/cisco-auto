// ============================================================================
// AutonomousSystemNumber Value Object
// ============================================================================

/**
 * ASN ranges:
 * - 2-byte ASN: 0-65535 (0-64511 public, 64512-65535 private)
 * - 4-byte ASN: 0-4294967295 (0-65535 compatible, 65536-4294967295 new)
 */
const MIN_2BYTE_ASN = 0;
const MAX_2BYTE_ASN = 65535;
const MIN_4BYTE_ASN = 0;
const MAX_4BYTE_ASN = 4294967295;
const MIN_PRIVATE_2BYTE = 64512;
const MAX_PRIVATE_2BYTE = 65535;
const MIN_PRIVATE_4BYTE = 4200000000;
const MAX_PRIVATE_4BYTE = 4294967295;

/**
 * Represents a validated Autonomous System Number (ASN)
 */
export class AutonomousSystemNumber {
  public readonly value: number;

  constructor(value: number, format: '2-byte' | '4-byte' = '4-byte') {
    if (!Number.isInteger(value)) {
      throw new Error(`ASN must be an integer, got: ${value}`);
    }

    const max = format === '2-byte' ? MAX_2BYTE_ASN : MAX_4BYTE_ASN;
    if (value < MIN_4BYTE_ASN || value > max) {
      throw new Error(`ASN must be between 0 and ${max}, got: ${value}`);
    }

    this.value = value;
  }

  static fromJSON(value: number): AutonomousSystemNumber {
    return new AutonomousSystemNumber(value);
  }

  toJSON(): number {
    return this.value;
  }

  get raw(): number {
    return this.value;
  }

  /**
   * Check if this is a 2-byte ASN (0-65535)
   */
  get is2Byte(): boolean {
    return this.value <= MAX_2BYTE_ASN;
  }

  /**
   * Check if this is a 4-byte ASN (65536-4294967295)
   */
  get is4Byte(): boolean {
    return this.value > MAX_2BYTE_ASN;
  }

  /**
   * Check if this is a private ASN
   */
  get isPrivate(): boolean {
    if (this.is2Byte) {
      return this.value >= MIN_PRIVATE_2BYTE && this.value <= MAX_PRIVATE_2BYTE;
    }
    return this.value >= MIN_PRIVATE_4BYTE && this.value <= MAX_PRIVATE_4BYTE;
  }

  /**
   * Check if this is a public ASN
   */
  get isPublic(): boolean {
    return !this.isPrivate;
  }

  /**
   * Check if this is a reserved ASN (0 or 65535)
   */
  get isReserved(): boolean {
    return this.value === 0 || this.value === 65535;
  }

  /**
   * Get the ASN in dot notation for 4-byte ASNs (e.g., 1.0 for 65536)
   */
  toDotNotation(): string {
    if (this.is2Byte) {
      return String(this.value);
    }
    const high = Math.floor(this.value / 65536);
    const low = this.value % 65536;
    return `${high}.${low}`;
  }

  /**
   * Get the ASN in asplain notation (simple decimal)
   */
  toAsplain(): string {
    return String(this.value);
  }

  /**
   * Create a 2-byte ASN
   */
  static create2Byte(value: number): AutonomousSystemNumber {
    return new AutonomousSystemNumber(value, '2-byte');
  }

  /**
   * Create a 4-byte ASN
   */
  static create4Byte(value: number): AutonomousSystemNumber {
    return new AutonomousSystemNumber(value, '4-byte');
  }

  equals(other: AutonomousSystemNumber): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return String(this.value);
  }
}

/**
 * Parse ASN from string or number
 */
export function parseAsn(value: string | number): AutonomousSystemNumber {
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  if (isNaN(num)) {
    throw new Error(`Invalid ASN: "${value}" is not a number`);
  }
  return new AutonomousSystemNumber(num);
}

/**
 * Check if a value is a valid ASN without throwing
 */
export function isValidAsn(value: number | string): boolean {
  try {
    parseAsn(value);
    return true;
  } catch {
    return false;
  }
}
