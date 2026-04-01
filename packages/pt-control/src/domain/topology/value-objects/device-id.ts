// ============================================================================
// DeviceId Value Object
// ============================================================================

/**
 * Pattern for valid device IDs:
 * - Alphanumeric characters, hyphens, and underscores only
 * - Must start with a letter
 * - 1-63 characters (IOS hostname limit)
 * - No spaces or special characters
 */
const DEVICE_ID_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]{0,62}$/;

/**
 * Represents a validated device identifier for topology state
 * 
 * Used in VirtualTopology, DeviceState, and related types to ensure
 * device names are valid IOS hostnames at construction time.
 */
export class DeviceId {
  public readonly value: string;

  constructor(value: string) {
    const trimmed = value.trim();
    
    if (trimmed.length === 0) {
      throw new Error('Device ID cannot be empty');
    }
    
    if (!DEVICE_ID_PATTERN.test(trimmed)) {
      throw new Error(
        `Invalid device ID: "${value}". Must start with a letter, contain only alphanumeric characters, hyphens, or underscores, and be 1-63 characters long.`
      );
    }
    
    this.value = trimmed;
  }

  /**
   * Create DeviceId from a string
   */
  static from(value: string): DeviceId {
    return new DeviceId(value);
  }

  /**
   * Try to create DeviceId, returns null if invalid
   */
  static tryFrom(value: string): DeviceId | null {
    try {
      return new DeviceId(value);
    } catch {
      return null;
    }
  }

  /**
   * Check if a string is a valid device ID without throwing
   */
  static isValid(value: string): boolean {
    try {
      new DeviceId(value);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if the ID is a valid IOS hostname format
   */
  get isValidHostname(): boolean {
    return DEVICE_ID_PATTERN.test(this.value);
  }

  /**
   * Get the ID as a valid IOS hostname command
   */
  toHostnameCommand(): string {
    return `hostname ${this.value}`;
  }

  /**
   * Check equality with another DeviceId
   */
  equals(other: DeviceId): boolean {
    return this.value === other.value;
  }

  /**
   * Compare for sorting (alphabetical)
   */
  compareTo(other: DeviceId): number {
    return this.value.localeCompare(other.value);
  }

  /**
   * String representation
   */
  toString(): string {
    return this.value;
  }

  /**
   * JSON serialization
   */
  toJSON(): string {
    return this.value;
  }
}

/**
 * Parse a device ID from a string
 */
export function parseDeviceId(value: string): DeviceId {
  return DeviceId.from(value);
}

/**
 * Parse optional device ID (returns undefined for null/undefined)
 */
export function parseOptionalDeviceId(value: string | null | undefined): DeviceId | undefined {
  if (value === null || value === undefined || value.trim() === '') {
    return undefined;
  }
  return DeviceId.from(value);
}

/**
 * Check if a string is a valid device ID
 */
export function isValidDeviceId(value: string): boolean {
  return DeviceId.isValid(value);
}
