// ============================================================================
// Hostname Value Object
// ============================================================================

/**
 * IOS hostname constraints:
 * - 1-63 characters
 * - Alphanumeric, hyphens, underscores, and dots allowed
 * - Must start with a letter
 * - Cannot end with hyphen or dot
 * - No spaces or special characters
 */
const HOSTNAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9._-]{0,61}[a-zA-Z0-9]$/;
const SINGLE_CHAR_HOSTNAME_PATTERN = /^[a-zA-Z]$/;

/**
 * Represents a validated IOS hostname
 */
export class Hostname {
  public readonly value: string;

  constructor(value: string) {
    const trimmed = value.trim();
    
    if (trimmed.length === 0) {
      throw new Error('Hostname cannot be empty');
    }
    
    if (trimmed.length > 63) {
      throw new Error(`Hostname exceeds maximum length of 63 characters, got: ${trimmed.length}`);
    }
    
    if (!SINGLE_CHAR_HOSTNAME_PATTERN.test(trimmed) && !HOSTNAME_PATTERN.test(trimmed)) {
      throw new Error(
        `Invalid hostname: "${value}". Must start with a letter, contain only alphanumeric characters, ` +
        'hyphens, underscores, or dots, and cannot end with hyphen or dot.'
      );
    }
    
    this.value = trimmed;
  }

  static fromJSON(value: string): Hostname {
    return new Hostname(value);
  }

  toJSON(): string {
    return this.value;
  }

  get raw(): string {
    return this.value;
  }

  /**
   * Get the hostname formatted for IOS command
   */
  toCommand(): string {
    return `hostname ${this.value}`;
  }

  /**
   * Get the no form of the command (resets to default)
   */
  toNoCommand(): string {
    return 'no hostname';
  }

  /**
   * Get the domain part of the hostname (after first dot)
   */
  get domain(): string | null {
    const parts = this.value.split('.');
    return parts.length > 1 ? parts.slice(1).join('.') : null;
  }

  /**
   * Get the hostname without domain (before first dot)
   */
  get hostnameOnly(): string {
    return this.value.split('.')[0] ?? this.value;
  }

  /**
   * Check if hostname is fully qualified (contains domain)
   */
  get isFullyQualified(): boolean {
    return this.value.includes('.');
  }

  /**
   * Check if hostname is a simple name (no domain)
   */
  get isSimpleName(): boolean {
    return !this.isFullyQualified;
  }

  /**
   * Get the IOS prompt that would be displayed with this hostname
   */
  toPrompt(mode: 'user-exec' | 'priv-exec' | 'config' = 'priv-exec'): string {
    const suffix = mode === 'user-exec' ? '>' : '#';
    return `${this.value}${suffix}`;
  }

  /**
   * Check if this hostname is in the same domain as another
   */
  isSameDomain(other: Hostname): boolean {
    return this.domain === other.domain;
  }

  /**
   * Create a fully qualified hostname by appending a domain
   */
  withDomain(domain: string): Hostname {
    if (this.isFullyQualified) {
      return this; // Already has domain
    }
    return new Hostname(`${this.value}.${domain}`);
  }

  /**
   * Get the hostname as a valid DNS name
   */
  toDnsName(): string {
    // Replace underscores with hyphens for DNS compatibility
    return this.value.replace(/_/g, '-');
  }

  equals(other: Hostname): boolean {
    return this.value.toLowerCase() === other.value.toLowerCase();
  }

  toString(): string {
    return this.value;
  }
}

/**
 * Create a Hostname from a string, throwing if invalid
 */
export function parseHostname(value: string): Hostname {
  return new Hostname(value);
}

/**
 * Check if a string is a valid hostname without throwing
 */
export function isValidHostname(value: string): boolean {
  try {
    new Hostname(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create an optional Hostname (returns null for empty strings)
 */
export function parseOptionalHostname(value: string | null | undefined): Hostname | null {
  if (!value || value.trim() === '') {
    return null;
  }
  return new Hostname(value);
}
