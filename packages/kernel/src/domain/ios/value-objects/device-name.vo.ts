import { ValueObject } from '../../shared/base/value-object.base.js';
import { DomainError } from '../../shared/errors/domain.error.js';

const DEVICE_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]{0,62}$/;

export class DeviceName extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static from(value: string): DeviceName {
    const trimmed = value.trim();
    if (!DEVICE_NAME_PATTERN.test(trimmed)) {
      throw DomainError.invalidValue(
        'nombre de dispositivo',
        value,
        'debe comenzar con una letra, contener solo caracteres alfanuméricos, guiones o guiones bajos, y tener 1-63 caracteres'
      );
    }
    return new DeviceName(trimmed);
  }

  static tryFrom(value: string): DeviceName | null {
    try {
      return DeviceName.from(value);
    } catch {
      return null;
    }
  }

  static isValid(value: string): boolean {
    return DeviceName.tryFrom(value) !== null;
  }

  get raw(): string {
    return this._value;
  }

  get isValidHostname(): boolean {
    return DEVICE_NAME_PATTERN.test(this._value);
  }

  toHostnameCommand(): string {
    return `hostname ${this._value}`;
  }

  override equals(other: DeviceName): boolean {
    return this._value === other._value;
  }

  override toString(): string {
    return this._value;
  }

  override toJSON(): string {
    return this._value;
  }
}

export function parseDeviceName(value: string): DeviceName {
  return DeviceName.from(value);
}

export function isValidDeviceName(value: string): boolean {
  return DeviceName.isValid(value);
}
