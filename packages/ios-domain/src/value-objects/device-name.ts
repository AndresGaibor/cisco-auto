// ============================================================================
// DeviceName Value Object
// ============================================================================

/**
 * Pattern for valid device names:
 * - Alphanumeric characters, hyphens, and underscores only
 * - Must start with a letter
 * - 1-63 characters (IOS hostname limit)
 */
const DEVICE_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]{0,62}$/;

/**
 * Represents a validated IOS device name
 */
export class DeviceName {
  public readonly value: string;

  constructor(value: string) {
    const trimmed = value.trim();
    if (!DEVICE_NAME_PATTERN.test(trimmed)) {
      throw new Error(
        `Invalid device name: "${value}". Must start with a letter, contain only alphanumeric characters, hyphens, or underscores, and be 1-63 characters long.`
      );
    }
    this.value = trimmed;
  }

  static fromJSON(value: string): DeviceName {
    return new DeviceName(value);
  }

  toJSON(): string {
    return this.value;
  }

  get raw(): string {
    return this.value;
  }

  /**
   * Check if the name is a valid hostname format
   */
  get isValidHostname(): boolean {
    return DEVICE_NAME_PATTERN.test(this.value);
  }

  /**
   * Get the name as a valid IOS hostname command
   */
  toHostnameCommand(): string {
    return `hostname ${this.value}`;
  }

  equals(other: DeviceName): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

/**
 * Create a DeviceName from a string, throwing if invalid
 */
export function parseDeviceName(value: string): DeviceName {
  return new DeviceName(value);
}

/**
 * Check if a string is a valid device name without throwing
 */
export function isValidDeviceName(value: string): boolean {
  try {
    new DeviceName(value);
    return true;
  } catch {
    return false;
  }
}
