import { ValueObject } from '../../shared/base/value-object.base.js';
import { DomainError } from '../../shared/errors/domain.error.js';

/**
 * Patrones válidos para nombres de dispositivos Cisco IOS.
 * Solo permite alfanuméricos, guiones y puntos.
 */
const DEVICE_NAME_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9.\-]*[a-zA-Z0-9])?$/;

/**
 * Tipos de dispositivo de red soportados
 */
export enum DeviceType {
  ROUTER = 'router',
  SWITCH = 'switch',
  FIREWALL = 'firewall',
  SERVER = 'server',
  PC = 'pc',
  HUB = 'hub',
  WIRELESS_ROUTER = 'wireless-router',
  UNKNOWN = 'unknown',
}

/**
 * Value Object que representa el identificador único de un dispositivo.
 *
 * Valida que el nombre:
 * - No esté vacío
 * - No exceda 63 caracteres (límite DNS)
 * - Contenga solo caracteres alfanuméricos, guiones y puntos
 * - No comience ni termine con guión
 */
export class DeviceId extends ValueObject<string> {
  constructor(value: string) {
    super(value);
    const normalized = value.trim();
    this.validate(normalized);
    this._value = normalized;
  }

  /**
   * Crea un DeviceId desde string
   */
  static from(value: string): DeviceId {
    return new DeviceId(value);
  }

  /**
   * Intenta crear un DeviceId, retorna null si es inválido
   */
  static tryFrom(value: string): DeviceId | null {
    try {
      return new DeviceId(value);
    } catch {
      return null;
    }
  }

  /**
   * Verifica si un string es un DeviceId válido
   */
  static isValid(value: string): boolean {
    return DeviceId.tryFrom(value) !== null;
  }

  /**
   * Valida el formato del nombre de dispositivo
   */
  private validate(name: string): void {
    if (!name) {
      throw DomainError.invalidValue('DeviceId', '', 'name cannot be empty');
    }
    if (name.length > 63) {
      throw DomainError.invalidValue('DeviceId', name, 'name cannot exceed 63 characters');
    }
    if (!DEVICE_NAME_REGEX.test(name)) {
      throw DomainError.invalidValue(
        'DeviceId',
        name,
        'name must be alphanumeric, may contain hyphens and dots, cannot start or end with hyphen'
      );
    }
  }

  /**
   * Serialización JSON
   */
  override toJSON(): string {
    return this._value;
  }

  /**
   * Comparación de igualdad
   */
  override equals(other: DeviceId): boolean {
    if (other === null || other === undefined) return false;
    return this._value === other._value;
  }
}
