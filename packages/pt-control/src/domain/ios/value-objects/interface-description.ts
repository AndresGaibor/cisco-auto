// ============================================================================
// InterfaceDescription Value Object
// ============================================================================

/**
 * IOS interface description constraints:
 * - Maximum 240 characters
 * - No line breaks
 * - Should be a single line of text
 */
const MAX_DESCRIPTION_LENGTH = 240;
const DESCRIPTION_PATTERN = /^[^\r\n]+$/;

/**
 * Represents a validated IOS interface description
 */
export class InterfaceDescription {
  public readonly value: string;

  constructor(value: string) {
    const trimmed = value.trim();
    
    if (trimmed.length === 0) {
      throw new Error('Interface description cannot be empty');
    }
    
    if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
      throw new Error(
        `Interface description exceeds maximum length of ${MAX_DESCRIPTION_LENGTH} characters, got: ${trimmed.length}`
      );
    }
    
    if (!DESCRIPTION_PATTERN.test(trimmed)) {
      throw new Error('Interface description cannot contain line breaks');
    }
    
    this.value = trimmed;
  }

  static fromJSON(value: string): InterfaceDescription {
    return new InterfaceDescription(value);
  }

  toJSON(): string {
    return this.value;
  }

  get raw(): string {
    return this.value;
  }

  /**
   * Get the description formatted for IOS command
   */
  toCommand(): string {
    return `description ${this.value}`;
  }

  /**
   * Get the no form of the command
   */
  toNoCommand(): string {
    return 'no description';
  }

  /**
   * Check if description contains a specific pattern
   */
  contains(pattern: string): boolean {
    return this.value.toLowerCase().includes(pattern.toLowerCase());
  }

  /**
   * Get the first N characters (useful for truncation)
   */
  truncate(maxLength: number): string {
    if (maxLength <= 0) return '';
    return this.value.substring(0, Math.min(maxLength, this.value.length));
  }

  /**
   * Check if description is likely a connection description
   * (contains patterns like "to", "link", "conn", etc.)
   */
  get isConnectionDescription(): boolean {
    const patterns = ['to ', 'link', 'conn', '->', '=>', '---'];
    return patterns.some(p => this.contains(p));
  }

  /**
   * Check if description is likely a role description
   * (contains patterns like "server", "client", "gateway", etc.)
   */
  get isRoleDescription(): boolean {
    const patterns = ['server', 'client', 'gateway', 'router', 'switch', 'firewall', 'ap '];
    return patterns.some(p => this.contains(p));
  }

  /**
   * Check if description is likely a location description
   * (contains patterns like "floor", "room", "building", etc.)
   */
  get isLocationDescription(): boolean {
    const patterns = ['floor', 'room', 'building', 'wing', 'office', 'site'];
    return patterns.some(p => this.contains(p));
  }

  equals(other: InterfaceDescription): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

/**
 * Create an InterfaceDescription from a string, throwing if invalid
 */
export function parseInterfaceDescription(value: string): InterfaceDescription {
  return new InterfaceDescription(value);
}

/**
 * Check if a string is a valid interface description without throwing
 */
export function isValidInterfaceDescription(value: string): boolean {
  try {
    new InterfaceDescription(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create an optional InterfaceDescription (returns null for empty strings)
 */
export function parseOptionalInterfaceDescription(value: string | null | undefined): InterfaceDescription | null {
  if (!value || value.trim() === '') {
    return null;
  }
  return new InterfaceDescription(value);
}
