import { ValueObject } from '../../shared/base/value-object.base.js';
import { DomainError } from '../../shared/errors/domain.error.js';

const MAX_DESCRIPTION_LENGTH = 240;
const DESCRIPTION_PATTERN = /^[^\r\n]+$/;

export class InterfaceDescription extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static from(value: string): InterfaceDescription {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw DomainError.invalidValue('descripción de interfaz', value, 'no puede estar vacía');
    }

    if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
      throw DomainError.invalidValue(
        'descripción de interfaz',
        value,
        `excede la longitud máxima de ${MAX_DESCRIPTION_LENGTH} caracteres`
      );
    }

    if (!DESCRIPTION_PATTERN.test(trimmed)) {
      throw DomainError.invalidValue('descripción de interfaz', value, 'no puede contener saltos de línea');
    }

    return new InterfaceDescription(trimmed);
  }

  static tryFrom(value: string): InterfaceDescription | null {
    try {
      return InterfaceDescription.from(value);
    } catch {
      return null;
    }
  }

  static isValid(value: string): boolean {
    return InterfaceDescription.tryFrom(value) !== null;
  }

  static fromOptional(value: string | null | undefined): InterfaceDescription | null {
    if (!value || value.trim() === '') {
      return null;
    }
    return InterfaceDescription.from(value);
  }

  get raw(): string {
    return this._value;
  }

  toCommand(): string {
    return `description ${this._value}`;
  }

  toNoCommand(): string {
    return 'no description';
  }

  contains(pattern: string): boolean {
    return this._value.toLowerCase().includes(pattern.toLowerCase());
  }

  truncate(maxLength: number): string {
    if (maxLength <= 0) return '';
    return this._value.substring(0, Math.min(maxLength, this._value.length));
  }

  get isConnectionDescription(): boolean {
    const patterns = ['to ', 'link', 'conn', '->', '=>', '---'];
    return patterns.some(p => this.contains(p));
  }

  get isRoleDescription(): boolean {
    const patterns = ['server', 'client', 'gateway', 'router', 'switch', 'firewall', 'ap '];
    return patterns.some(p => this.contains(p));
  }

  get isLocationDescription(): boolean {
    const patterns = ['floor', 'room', 'building', 'wing', 'office', 'site'];
    return patterns.some(p => this.contains(p));
  }

  override equals(other: InterfaceDescription): boolean {
    return this._value === other._value;
  }

  override toString(): string {
    return this._value;
  }

  override toJSON(): string {
    return this._value;
  }
}

export function parseInterfaceDescription(value: string): InterfaceDescription {
  return InterfaceDescription.from(value);
}

export function isValidInterfaceDescription(value: string): boolean {
  return InterfaceDescription.isValid(value);
}

export function parseOptionalInterfaceDescription(value: string | null | undefined): InterfaceDescription | null {
  return InterfaceDescription.fromOptional(value);
}
