/**
 * VTP (VLAN Trunk Protocol) Value Objects
 *
 * Represents validated VTP configuration parameters:
 * - VtpMode: server, client, transparent, off
 * - VtpVersion: 1, 2, 3
 * - VtpDomain: Domain name (1-32 chars, alphanumeric)
 * - VtpPassword: Password (8-32 chars, optional)
 */

// =============================================================================
// VTP Mode
// =============================================================================

export type VtpModeType = 'server' | 'client' | 'transparent' | 'off';

export class VtpMode {
  public readonly value: VtpModeType;

  constructor(value: VtpModeType) {
    const validModes: VtpModeType[] = ['server', 'client', 'transparent', 'off'];
    if (!validModes.includes(value)) {
      throw new Error(
        `Invalid VTP mode "${value}". Must be one of: ${validModes.join(', ')}`
      );
    }
    this.value = value;
  }

  static from(value: VtpModeType): VtpMode {
    return new VtpMode(value);
  }

  static tryFrom(value: string): VtpMode | null {
    try {
      return new VtpMode(value as VtpModeType);
    } catch {
      return null;
    }
  }

  static isValid(value: string): boolean {
    const validModes: VtpModeType[] = ['server', 'client', 'transparent', 'off'];
    return validModes.includes(value as VtpModeType);
  }

  get isServer(): boolean {
    return this.value === 'server';
  }

  get isClient(): boolean {
    return this.value === 'client';
  }

  get isTransparent(): boolean {
    return this.value === 'transparent';
  }

  get isOff(): boolean {
    return this.value === 'off';
  }

  /**
   * Check if this mode can create/modify VLANs
   */
  get canModifyVlans(): boolean {
    return this.value === 'server' || this.value === 'transparent';
  }

  equals(other: VtpMode): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  toJSON(): VtpModeType {
    return this.value;
  }
}

// =============================================================================
// VTP Version
// =============================================================================

export type VtpVersionType = 1 | 2 | 3;

export class VtpVersion {
  public readonly value: VtpVersionType;

  constructor(value: number) {
    if (![1, 2, 3].includes(value)) {
      throw new Error(`Invalid VTP version ${value}. Must be 1, 2, or 3`);
    }
    this.value = value as VtpVersionType;
  }

  static from(value: VtpVersionType): VtpVersion {
    return new VtpVersion(value);
  }

  static tryFrom(value: number): VtpVersion | null {
    try {
      return new VtpVersion(value);
    } catch {
      return null;
    }
  }

  static isValid(value: number): boolean {
    return [1, 2, 3].includes(value);
  }

  equals(other: VtpVersion): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return String(this.value);
  }

  toJSON(): VtpVersionType {
    return this.value;
  }
}

// =============================================================================
// VTP Domain
// =============================================================================

const MAX_DOMAIN_LENGTH = 32;
const DOMAIN_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$|^[a-zA-Z0-9]$/;

export class VtpDomain {
  public readonly value: string;

  constructor(value: string) {
    if (typeof value !== 'string') {
      throw new Error(`VTP domain must be a string, got: ${typeof value}`);
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw new Error('VTP domain cannot be empty');
    }

    if (trimmed.length > MAX_DOMAIN_LENGTH) {
      throw new Error(
        `VTP domain "${trimmed}" exceeds maximum length of ${MAX_DOMAIN_LENGTH} characters`
      );
    }

    if (!DOMAIN_PATTERN.test(trimmed)) {
      throw new Error(
        `Invalid VTP domain "${trimmed}": must start with alphanumeric and contain only alphanumeric characters, hyphens, or underscores`
      );
    }

    this.value = trimmed;
  }

  static from(value: string): VtpDomain {
    return new VtpDomain(value);
  }

  static tryFrom(value: string): VtpDomain | null {
    try {
      return new VtpDomain(value);
    } catch {
      return null;
    }
  }

  static isValid(value: string): boolean {
    try {
      VtpDomain.from(value);
      return true;
    } catch {
      return false;
    }
  }

  equals(other: VtpDomain): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  toJSON(): string {
    return this.value;
  }
}

// =============================================================================
// VTP Password (optional)
// =============================================================================

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 32;
const PASSWORD_PATTERN = /^[a-zA-Z0-9_-]+$/;

export class VtpPassword {
  public readonly value: string;

  constructor(value: string) {
    if (typeof value !== 'string') {
      throw new Error(`VTP password must be a string, got: ${typeof value}`);
    }

    if (value.length < MIN_PASSWORD_LENGTH) {
      throw new Error(
        `VTP password must be at least ${MIN_PASSWORD_LENGTH} characters, got ${value.length}`
      );
    }

    if (value.length > MAX_PASSWORD_LENGTH) {
      throw new Error(
        `VTP password exceeds maximum length of ${MAX_PASSWORD_LENGTH} characters`
      );
    }

    if (!PASSWORD_PATTERN.test(value)) {
      throw new Error(
        `Invalid VTP password: must contain only alphanumeric characters, hyphens, or underscores`
      );
    }

    this.value = value;
  }

  static from(value: string): VtpPassword {
    return new VtpPassword(value);
  }

  static fromOptional(value: string | null | undefined): VtpPassword | undefined {
    if (!value || value.trim() === '') {
      return undefined;
    }
    return new VtpPassword(value);
  }

  static tryFrom(value: string): VtpPassword | null {
    try {
      return new VtpPassword(value);
    } catch {
      return null;
    }
  }

  static isValid(value: string): boolean {
    try {
      VtpPassword.from(value);
      return true;
    } catch {
      return false;
    }
  }

  equals(other: VtpPassword): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  toJSON(): string {
    return this.value;
  }
}

// =============================================================================
// Helper functions
// =============================================================================

export function parseVtpMode(value: VtpModeType): VtpMode {
  return VtpMode.from(value);
}

export function parseVtpVersion(value: VtpVersionType): VtpVersion {
  return VtpVersion.from(value);
}

export function parseVtpDomain(value: string): VtpDomain {
  return VtpDomain.from(value);
}

export function parseOptionalVtpPassword(
  value: string | null | undefined
): VtpPassword | undefined {
  return VtpPassword.fromOptional(value);
}
