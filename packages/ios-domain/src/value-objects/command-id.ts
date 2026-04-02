// ============================================================================
// CommandId Value Object
// ============================================================================

/**
 * Pattern for valid command IDs:
 * - Format: cmd-<timestamp>-<random>
 * - Timestamp: milliseconds since epoch (13 digits)
 * - Random: 6 alphanumeric characters
 * - Example: cmd-1679875200000-a1b2c3
 */
const COMMAND_ID_PATTERN = /^cmd-\d{13}-[a-zA-Z0-9]{6}$/;

/**
 * Represents a validated command ID with timestamp and uniqueness
 */
export class CommandId {
  public readonly value: string;
  private readonly _timestamp: number;
  private readonly _random: string;

  constructor(value: string) {
    if (!COMMAND_ID_PATTERN.test(value)) {
      throw new Error(
        `Invalid command ID: "${value}". Must follow format: cmd-<timestamp>-<random> (e.g., cmd-1679875200000-a1b2c3)`
      );
    }
    this.value = value;
    const parts = value.split('-');
    this._timestamp = parseInt(parts[1]!, 10);
    this._random = parts[2]!;
  }

  /**
   * Create a new unique command ID
   */
  static generate(): CommandId {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return new CommandId(`cmd-${timestamp}-${random}`);
  }

  static fromJSON(value: string): CommandId {
    return new CommandId(value);
  }

  toJSON(): string {
    return this.value;
  }

  get raw(): string {
    return this.value;
  }

  /**
   * Get the timestamp when this ID was generated
   */
  get timestamp(): number {
    return this._timestamp;
  }

  /**
   * Get the random suffix
   */
  get random(): string {
    return this._random;
  }

  /**
   * Get the creation date
   */
  get createdAt(): Date {
    return new Date(this._timestamp);
  }

  /**
   * Check if this ID is newer than another
   */
  isNewerThan(other: CommandId): boolean {
    return this._timestamp > other._timestamp;
  }

  /**
   * Check if this ID is older than another
   */
  isOlderThan(other: CommandId): boolean {
    return this._timestamp < other._timestamp;
  }

  /**
   * Check if this ID was created within a time window
   */
  isWithin(timeWindowMs: number): boolean {
    return Date.now() - this._timestamp < timeWindowMs;
  }

  /**
   * Check if this ID is expired based on a TTL
   */
  isExpired(ttlMs: number): boolean {
    return Date.now() - this._timestamp > ttlMs;
  }

  equals(other: CommandId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

/**
 * Create a CommandId from a string, throwing if invalid
 */
export function parseCommandId(value: string): CommandId {
  return new CommandId(value);
}

/**
 * Check if a string is a valid command ID without throwing
 */
export function isValidCommandId(value: string): boolean {
  try {
    new CommandId(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a new unique command ID
 */
export function generateCommandId(): string {
  return CommandId.generate().value;
}
