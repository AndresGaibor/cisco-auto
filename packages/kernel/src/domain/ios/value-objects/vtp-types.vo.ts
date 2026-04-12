import { ValueObject } from '../../shared/base/value-object.base.js';
import { DomainError } from '../../shared/errors/domain.error.js';

export type VtpModeType = 'server' | 'client' | 'transparent' | 'off';
const VALID_VTP_MODES: VtpModeType[] = ['server', 'client', 'transparent', 'off'];

export class VtpMode extends ValueObject<VtpModeType> {
  private constructor(value: VtpModeType) {
    super(value);
  }

  static from(value: VtpModeType): VtpMode {
    if (!VALID_VTP_MODES.includes(value)) {
      throw DomainError.invalidValue('modo VTP', value, `debe ser uno de: ${VALID_VTP_MODES.join(', ')}`);
    }
    return new VtpMode(value);
  }

  static tryFrom(value: string): VtpMode | null {
    try {
      return VtpMode.from(value as VtpModeType);
    } catch {
      return null;
    }
  }

  static isValid(value: string): boolean {
    return VALID_VTP_MODES.includes(value as VtpModeType);
  }

  get isServer(): boolean {
    return this._value === 'server';
  }

  get isClient(): boolean {
    return this._value === 'client';
  }

  get isTransparent(): boolean {
    return this._value === 'transparent';
  }

  get isOff(): boolean {
    return this._value === 'off';
  }

  get canModifyVlans(): boolean {
    return this._value === 'server' || this._value === 'transparent';
  }

  override equals(other: VtpMode): boolean {
    return this._value === other._value;
  }

  override toString(): string {
    return this._value;
  }

  override toJSON(): VtpModeType {
    return this._value;
  }
}

export type VtpVersionType = 1 | 2 | 3;
const VALID_VTP_VERSIONS: VtpVersionType[] = [1, 2, 3];

export class VtpVersion extends ValueObject<VtpVersionType> {
  private constructor(value: VtpVersionType) {
    super(value);
  }

  static from(value: VtpVersionType): VtpVersion {
    if (!VALID_VTP_VERSIONS.includes(value)) {
      throw DomainError.invalidValue('versión VTP', value, 'debe ser 1, 2 o 3');
    }
    return new VtpVersion(value);
  }

  static tryFrom(value: number): VtpVersion | null {
    try {
      return VtpVersion.from(value as VtpVersionType);
    } catch {
      return null;
    }
  }

  static isValid(value: number): boolean {
    return VALID_VTP_VERSIONS.includes(value as VtpVersionType);
  }

  override equals(other: VtpVersion): boolean {
    return this._value === other._value;
  }

  override toString(): string {
    return String(this._value);
  }

  override toJSON(): VtpVersionType {
    return this._value;
  }
}

const MAX_DOMAIN_LENGTH = 32;
const DOMAIN_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$|^[a-zA-Z0-9]$/;

export class VtpDomain extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static from(value: string): VtpDomain {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw DomainError.invalidValue('dominio VTP', value, 'no puede estar vacío');
    }

    if (trimmed.length > MAX_DOMAIN_LENGTH) {
      throw DomainError.invalidValue('dominio VTP', value, `excede la longitud máxima de ${MAX_DOMAIN_LENGTH} caracteres`);
    }

    if (!DOMAIN_PATTERN.test(trimmed)) {
      throw DomainError.invalidValue(
        'dominio VTP',
        value,
        'debe comenzar con alfanumérico y contener solo caracteres alfanuméricos, guiones o guiones bajos'
      );
    }

    return new VtpDomain(trimmed);
  }

  static tryFrom(value: string): VtpDomain | null {
    try {
      return VtpDomain.from(value);
    } catch {
      return null;
    }
  }

  static isValid(value: string): boolean {
    return VtpDomain.tryFrom(value) !== null;
  }

  override equals(other: VtpDomain): boolean {
    return this._value === other._value;
  }

  override toString(): string {
    return this._value;
  }

  override toJSON(): string {
    return this._value;
  }
}

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 32;
const PASSWORD_PATTERN = /^[a-zA-Z0-9_-]+$/;

export class VtpPassword extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static from(value: string): VtpPassword {
    if (value.length < MIN_PASSWORD_LENGTH) {
      throw DomainError.invalidValue('contraseña VTP', value, `debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`);
    }

    if (value.length > MAX_PASSWORD_LENGTH) {
      throw DomainError.invalidValue('contraseña VTP', value, `excede la longitud máxima de ${MAX_PASSWORD_LENGTH} caracteres`);
    }

    if (!PASSWORD_PATTERN.test(value)) {
      throw DomainError.invalidValue(
        'contraseña VTP',
        value,
        'debe contener solo caracteres alfanuméricos, guiones o guiones bajos'
      );
    }

    return new VtpPassword(value);
  }

  static fromOptional(value: string | null | undefined): VtpPassword | undefined {
    if (!value || value.trim() === '') {
      return undefined;
    }
    return VtpPassword.from(value);
  }

  static tryFrom(value: string): VtpPassword | null {
    try {
      return VtpPassword.from(value);
    } catch {
      return null;
    }
  }

  static isValid(value: string): boolean {
    return VtpPassword.tryFrom(value) !== null;
  }

  override equals(other: VtpPassword): boolean {
    return this._value === other._value;
  }

  override toString(): string {
    return this._value;
  }

  override toJSON(): string {
    return this._value;
  }
}

export function parseVtpMode(value: VtpModeType): VtpMode {
  return VtpMode.from(value);
}

export function parseVtpVersion(value: VtpVersionType): VtpVersion {
  return VtpVersion.from(value);
}

export function parseVtpDomain(value: string): VtpDomain {
  return VtpDomain.from(value);
}

export function parseOptionalVtpPassword(value: string | null | undefined): VtpPassword | undefined {
  return VtpPassword.fromOptional(value);
}
