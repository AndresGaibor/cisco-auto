import { ValueObject } from '../../shared/base/value-object.base.js';
import { DomainError } from '../../shared/errors/domain.error.js';

const DEVICE_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]{0,62}$/;

/**
 * Value Object para el nombre de un dispositivo de red.
 *
 * Valida que el nombre cumpla el patrón de IOS: comenzar con letra,
 * contener solo alfanuméricos, guiones o guiones bajos, y tener 1-63 caracteres.
 * Ejemplos válidos: "R1", "SW-Core-01", "Router_Primary".
 *
 * @param value - String del nombre de dispositivo
 * @throws DomainError si el formato es inválido
 */
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

/**
 * Crea un DeviceName desde un string, lanzando error si es inválido.
 * Wrapper sobre DeviceName.from().
 * @param value - String a parsear
 * @returns DeviceName válido
 * @throws DomainError si el formato no es válido
 */
export function parseDeviceName(value: string): DeviceName {
  return DeviceName.from(value);
}

/**
 * Verifica si un string es un nombre de dispositivo válido sin lanzar.
 * @param value - String a validar
 * @returns true si es válido, false en caso contrario
 */
export function isValidDeviceName(value: string): boolean {
  return DeviceName.isValid(value);
}
