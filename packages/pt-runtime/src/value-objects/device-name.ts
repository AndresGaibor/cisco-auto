// ============================================================================
// DeviceName Value Object - Validates Packet Tracer device names
// ============================================================================

/**
 * Device name constraints for Packet Tracer
 */
const MAX_DEVICE_NAME_LENGTH = 63;
const DEVICE_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9\-_]*$/;

/**
 * Represents a validated Packet Tracer device name
 * 
 * Rules:
 * - Must start with a letter
 * - Can contain letters, numbers, hyphens, and underscores
 * - Maximum 63 characters (PT limitation)
 * - Cannot contain spaces or special characters
 */
export class DeviceName {
  public readonly value: string;

  constructor(value: string) {
    const trimmed = value.trim();
    
    if (!trimmed) {
      throw new Error("Device name cannot be empty");
    }
    
    if (trimmed.length > MAX_DEVICE_NAME_LENGTH) {
      throw new Error(
        `Device name too long: ${trimmed.length} characters. Maximum is ${MAX_DEVICE_NAME_LENGTH}.`
      );
    }
    
    if (!DEVICE_NAME_PATTERN.test(trimmed)) {
      throw new Error(
        `Invalid device name: "${trimmed}". Must start with a letter and contain only letters, numbers, hyphens, or underscores.`
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
   * Check if this is a default PT name (e.g., "Router0", "Switch1")
   */
  get isDefaultName(): boolean {
    const defaultPatterns = [
      /^Router\d+$/i,
      /^Switch\d+$/i,
      /^PC\d+$/i,
      /^Server\d+$/i,
      /^Laptop\d+$/i,
      /^Hub\d+$/i,
    ];
    
    return defaultPatterns.some(pattern => pattern.test(this.value));
  }

  /**
   * Check if this is a custom name (user-defined)
   */
  get isCustomName(): boolean {
    return !this.isDefaultName;
  }

  /**
   * Get the device type prefix from the name
   */
  get deviceTypePrefix(): string | null {
    const match = this.value.match(/^[a-zA-Z]+/);
    return match ? match[0] : null;
  }

  /**
   * Get the numeric suffix from the name
   */
  get numericSuffix(): number | null {
    const match = this.value.match(/\d+$/);
    return match ? parseInt(match[0], 10) : null;
  }

  /**
   * Check if name follows common naming convention (e.g., "R1", "SW1", "PC1")
   */
  get followsNamingConvention(): boolean {
    const conventionPatterns = [
      /^R\d+$/i,           // Router shorthand
      /^SW\d+$/i,          // Switch shorthand
      /^RW\d+$/i,          // Wireless router
      /^PC\d+$/i,          // PC
      /^SRV\d+$/i,         // Server shorthand
      /^L\d+$/i,           // Laptop shorthand
      /^AP\d+$/i,          // Access point
      /^FW\d+$/i,          // Firewall
      /^ISP\d+$/i,         // ISP
    ];
    
    return conventionPatterns.some(pattern => pattern.test(this.value));
  }

  /**
   * Create a device name with a counter suffix
   */
  static withCounter(prefix: string, counter: number): DeviceName {
    return new DeviceName(`${prefix}${counter}`);
  }

  equals(other: DeviceName): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

/**
 * Create a DeviceName, throwing if invalid
 */
export function parseDeviceName(value: string): DeviceName {
  return new DeviceName(value);
}

/**
 * Create a DeviceName or return null if invalid
 */
export function tryParseDeviceName(value: string): DeviceName | null {
  try {
    return new DeviceName(value);
  } catch {
    return null;
  }
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
