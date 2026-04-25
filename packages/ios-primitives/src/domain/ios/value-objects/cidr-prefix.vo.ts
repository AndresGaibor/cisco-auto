import { ValueObject } from '../../shared/base/value-object.base.js';
import { DomainError } from '../../shared/errors/domain.error.js';

/**
 * Value Object que representa un prefijo CIDR validado (0-32 para IPv4)
 */
export class CidrPrefix extends ValueObject<number> {
  constructor(value: number) {
    super(value);
    
    if (!Number.isInteger(value)) {
      throw DomainError.invalidValue('CIDR prefix', value, 'must be an integer');
    }
    if (value < 0 || value > 32) {
      throw DomainError.invalidValue('CIDR prefix', value, 'must be between 0 and 32');
    }
  }

  /**
   * Crea desde JSON
   */
  static fromJSON(value: number): CidrPrefix {
    return new CidrPrefix(value);
  }

  /**
   * Obtiene el valor numérico
   */
  get raw(): number {
    return this._value;
  }

  /**
   * Convierte a máscara de subred en notación decimal punteada
   */
  toSubnetMask(): string {
    const mask = this._value === 0 ? 0 : (~0 << (32 - this._value)) >>> 0;
    return `${(mask >>> 24) & 255}.${(mask >>> 16) & 255}.${(mask >>> 8) & 255}.${mask & 255}`;
  }

  /**
   * Obtiene la máscara wildcard (inversa de la máscara de subred)
   */
  toWildcardMask(): string {
    const subnetMask = this.toSubnetMask();
    return subnetMask.split('.').map(octet => String(255 - parseInt(octet, 10))).join('.');
  }

  /**
   * Obtiene el número de hosts utilizables (2^(32-prefix) - 2)
   */
  get usableHosts(): number {
    if (this._value === 32) return 1;
    if (this._value === 31) return 2; // Point-to-point link
    return Math.pow(2, 32 - this._value) - 2;
  }

  /**
   * Obtiene el número total de direcciones (2^(32-prefix))
   */
  get totalAddresses(): number {
    return Math.pow(2, 32 - this._value);
  }

  /**
   * Verifica si es un prefijo válido para hosts (/30 o mayor)
   */
  get isValidForHosts(): boolean {
    return this._value >= 8 && this._value <= 30;
  }

  /**
   * Verifica si es un prefijo point-to-point (/31)
   */
  get isPointToPoint(): boolean {
    return this._value === 31;
  }

  /**
   * Verifica si es un prefijo loopback (/32)
   */
  get isLoopback(): boolean {
    return this._value === 32;
  }

  /**
   * Verifica si este prefijo puede contener otro prefijo
   */
  canContain(other: CidrPrefix): boolean {
    return this._value < other._value;
  }

  /**
   * Comparación de igualdad
   */
  override equals(other: CidrPrefix): boolean {
    return this._value === other._value;
  }

  /**
   * Representación string en formato CIDR
   */
  override toString(): string {
    return `/${this._value}`;
  }

  /**
   * Serialización JSON
   */
  override toJSON(): number {
    return this._value;
  }
}

/**
 * Crea un CidrPrefix desde un número
 */
export function parseCidrPrefix(value: number): CidrPrefix {
  return new CidrPrefix(value);
}

/**
 * Verifica si un número es un prefijo CIDR válido sin lanzar error
 */
export function isValidCidrPrefix(value: number): boolean {
  try {
    new CidrPrefix(value);
    return true;
  } catch {
    return false;
  }
}