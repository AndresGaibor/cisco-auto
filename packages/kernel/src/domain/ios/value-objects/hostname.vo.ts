import { ValueObject } from '../../shared/base/value-object.base.js';
import { DomainError } from '../../shared/errors/domain.error.js';

const HOSTNAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9._-]{0,61}[a-zA-Z0-9]$/;
const SINGLE_CHAR_HOSTNAME_PATTERN = /^[a-zA-Z]$/;

export class Hostname extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static from(value: string): Hostname {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw DomainError.invalidValue('hostname', value, 'no puede estar vacío');
    }

    if (trimmed.length > 63) {
      throw DomainError.invalidValue('hostname', value, `excede la longitud máxima de 63 caracteres`);
    }

    if (!SINGLE_CHAR_HOSTNAME_PATTERN.test(trimmed) && !HOSTNAME_PATTERN.test(trimmed)) {
      throw DomainError.invalidValue(
        'hostname',
        value,
        'debe comenzar con una letra, contener solo caracteres alfanuméricos, guiones, guiones bajos o puntos, y no puede terminar con guión o punto'
      );
    }

    return new Hostname(trimmed);
  }

  static tryFrom(value: string): Hostname | null {
    try {
      return Hostname.from(value);
    } catch {
      return null;
    }
  }

  static isValid(value: string): boolean {
    return Hostname.tryFrom(value) !== null;
  }

  static fromOptional(value: string | null | undefined): Hostname | null {
    if (!value || value.trim() === '') {
      return null;
    }
    return Hostname.from(value);
  }

  get domain(): string | null {
    const parts = this._value.split('.');
    return parts.length > 1 ? parts.slice(1).join('.') : null;
  }

  get hostnameOnly(): string {
    return this._value.split('.')[0] ?? this._value;
  }

  get isFullyQualified(): boolean {
    return this._value.includes('.');
  }

  get isSimpleName(): boolean {
    return !this.isFullyQualified;
  }

  toCommand(): string {
    return `hostname ${this._value}`;
  }

  toNoCommand(): string {
    return 'no hostname';
  }

  toPrompt(mode: 'user-exec' | 'priv-exec' | 'config' = 'priv-exec'): string {
    const suffix = mode === 'user-exec' ? '>' : '#';
    return `${this._value}${suffix}`;
  }

  isSameDomain(other: Hostname): boolean {
    return this.domain === other.domain;
  }

  withDomain(domain: string): Hostname {
    if (this.isFullyQualified) {
      return this;
    }
    return Hostname.from(`${this._value}.${domain}`);
  }

  toDnsName(): string {
    return this._value.replace(/_/g, '-');
  }

  override equals(other: Hostname): boolean {
    return this._value.toLowerCase() === other._value.toLowerCase();
  }

  override toString(): string {
    return this._value;
  }

  override toJSON(): string {
    return this._value;
  }
}

export function parseHostname(value: string): Hostname {
  return Hostname.from(value);
}

export function isValidHostname(value: string): boolean {
  return Hostname.isValid(value);
}

export function parseOptionalHostname(value: string | null | undefined): Hostname | null {
  return Hostname.fromOptional(value);
}
