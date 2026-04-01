// ============================================================================
// CommandSeq Value Object - Sequence Numbers for FileBridgeV2
// ============================================================================

/**
 * Represents a validated sequence number for FileBridgeV2 commands
 * Sequence numbers are 12-digit zero-padded integers for proper file ordering
 */
export class CommandSeq {
  public readonly value: number;
  private readonly _padded: string;

  constructor(value: number) {
    if (!Number.isInteger(value)) {
      throw new Error(`Sequence number must be an integer, got: ${value}`);
    }
    if (value < 1) {
      throw new Error(`Sequence number must be >= 1, got: ${value}`);
    }
    if (value > 999_999_999_999) {
      throw new Error(`Sequence number exceeds maximum (12 digits), got: ${value}`);
    }
    this.value = value;
    this._padded = String(value).padStart(12, "0");
  }

  static fromJSON(value: number): CommandSeq {
    return new CommandSeq(value);
  }

  toJSON(): number {
    return this.value;
  }

  get raw(): number {
    return this.value;
  }

  /**
   * Get the zero-padded string representation (12 digits)
   */
  get padded(): string {
    return this._padded;
  }

  /**
   * Get the next sequence number
   */
  next(): CommandSeq {
    return new CommandSeq(this.value + 1);
  }

  /**
   * Get the previous sequence number (returns null if this is 1)
   */
  previous(): CommandSeq | null {
    if (this.value === 1) return null;
    return new CommandSeq(this.value - 1);
  }

  /**
   * Check if this sequence is before another
   */
  isBefore(other: CommandSeq): boolean {
    return this.value < other.value;
  }

  /**
   * Check if this sequence is after another
   */
  isAfter(other: CommandSeq): boolean {
    return this.value > other.value;
  }

  /**
   * Calculate the distance to another sequence
   */
  distanceTo(other: CommandSeq): number {
    return Math.abs(other.value - this.value);
  }

  /**
   * Check if this sequence is within a range of another
   */
  isWithinRange(other: CommandSeq, range: number): boolean {
    return this.distanceTo(other) <= range;
  }

  /**
   * Format for use in filename (padded)
   */
  toFileName(): string {
    return this._padded;
  }

  /**
   * Format for logging (unpadded number)
   */
  toString(): string {
    return String(this.value);
  }

  equals(other: CommandSeq): boolean {
    return this.value === other.value;
  }

  /**
   * Parse from a padded string (e.g., "000000000042")
   */
  static fromPadded(padded: string): CommandSeq {
    const num = parseInt(padded, 10);
    if (isNaN(num)) {
      throw new Error(`Invalid padded sequence: "${padded}"`);
    }
    return new CommandSeq(num);
  }

  /**
   * Parse from a command filename (e.g., "000000000042-configIos.json")
   */
  static fromFileName(filename: string): CommandSeq {
    const match = filename.match(/^(\d{12})-/);
    if (!match) {
      throw new Error(`Invalid command filename: "${filename}"`);
    }
    return CommandSeq.fromPadded(match[1]!);
  }
}

/**
 * Create a CommandSeq from a number, throwing if invalid
 */
export function parseCommandSeq(value: number): CommandSeq {
  return new CommandSeq(value);
}

/**
 * Check if a number is a valid sequence number without throwing
 */
export function isValidCommandSeq(value: number): boolean {
  try {
    new CommandSeq(value);
    return true;
  } catch {
    return false;
  }
}
