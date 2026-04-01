// ============================================================================
// CommandId Value Object - Unique Command Identifiers
// ============================================================================

import { randomUUID } from "node:crypto";

/**
 * Pattern for valid command IDs:
 * - UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 * - Used for correlating commands with results in FileBridgeV2
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Represents a validated command ID (UUID v4)
 */
export class CommandId {
  public readonly value: string;

  constructor(value: string) {
    const trimmed = value.trim();
    if (!UUID_PATTERN.test(trimmed)) {
      throw new Error(
        `Invalid command ID: "${value}". Must be a valid UUID v4 format.`
      );
    }
    this.value = trimmed.toLowerCase();
  }

  /**
   * Generate a new unique command ID (UUID v4)
   */
  static generate(): CommandId {
    return new CommandId(randomUUID());
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
   * Get the short form (first 8 characters)
   */
  get short(): string {
    return this.value.substring(0, 8);
  }

  /**
   * Get the timestamp component (characters 14-18, indicates UUID v4)
   */
  get version(): number {
    return parseInt(this.value.charAt(14), 10);
  }

  /**
   * Get the variant (characters 19-20, indicates RFC 4122)
   */
  get variant(): string {
    const variantChar = this.value.charAt(19);
    if (["8", "9", "a", "b"].includes(variantChar)) {
      return "RFC4122";
    }
    return "unknown";
  }

  /**
   * Check if this is a valid UUID v4
   */
  get isValid(): boolean {
    return UUID_PATTERN.test(this.value);
  }

  /**
   * Check if this ID is nil (all zeros)
   */
  get isNil(): boolean {
    return this.value === "00000000-0000-4000-8000-000000000000";
  }

  /**
   * Compare with another command ID
   */
  equals(other: CommandId): boolean {
    return this.value === other.value;
  }

  /**
   * Get a string representation
   */
  toString(): string {
    return this.value;
  }

  /**
   * Get the result filename for this command ID
   */
  toResultFileName(): string {
    return `${this.value}.json`;
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
