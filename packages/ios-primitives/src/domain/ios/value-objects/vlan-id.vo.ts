import { ValueObject } from '../../shared/base/value-object.base.js';
import { DomainError } from '../../shared/errors/domain.error.js';

/**
 * Constantes para validación de VLAN ID según IEEE 802.1Q
 */
export const MIN_VLAN_ID = 1;
export const MAX_VLAN_ID = 4094;

/**
 * Tipos de VLAN según IEEE 802.1Q
 */
export enum VlanType {
  /** VLAN por defecto - no puede eliminarse */
  DEFAULT = 'default',
  /** Rango normal de VLANs (2-1001) - pueden crearse/eliminarse */
  NORMAL = 'normal',
  /** VLANs reservadas (1002-1005) - legacy FDDI/Token Ring */
  RESERVED = 'reserved',
  /** Rango extendido de VLANs (1006-4094) - características limitadas */
  EXTENDED = 'extended',
}

/**
 * Value Object que representa un VLAN ID validado (1-4094)
 * 
 * Garantiza que los IDs de VLAN son válidos en tiempo de construcción,
 * previniendo errores en tiempo de ejecución.
 */
export class VlanId extends ValueObject<number> {
  public readonly type: VlanType;

  constructor(value: number) {
    super(value);
    
    if (!Number.isInteger(value)) {
      throw DomainError.invalidValue('VLAN ID', value, 'must be an integer');
    }
    if (value < MIN_VLAN_ID || value > MAX_VLAN_ID) {
      throw DomainError.invalidValue('VLAN ID', value,`must be between ${MIN_VLAN_ID} and ${MAX_VLAN_ID}`);
    }
    
    this.type = this.classifyVlan(value);
  }

  /**
   * Clasifica la VLAN según IEEE 802.1Q
   */
  private classifyVlan(value: number): VlanType {
    if (value === 1) return VlanType.DEFAULT;
    if (value >= 2 && value <= 1001) return VlanType.NORMAL;
    if (value >= 1002 && value <= 1005) return VlanType.RESERVED;
    return VlanType.EXTENDED;
  }

  /**
   * Crea un VlanId desde un número
   */
  static from(value: number): VlanId {
    return new VlanId(value);
  }

  /**
   * Crea un VlanId desde un string (parsea el número)
   */
  static fromString(value: string): VlanId {
    const num = parseInt(value, 10);
    if (isNaN(num)) {
      throw DomainError.invalidValue('VLAN ID', value, 'is not a valid number');
    }
    return new VlanId(num);
  }

  /**
   * Intenta crear un VlanId, retorna null si es inválido
   */
  static tryFrom(value: number | string): VlanId | null {
    try {
      return typeof value === 'string'
        ? VlanId.fromString(value)
        : VlanId.from(value);
    } catch {
      return null;
    }
  }

  /**
   * Verifica si un número/string es un VLAN ID válido sin lanzar error
   */
  static isValid(value: number | string): boolean {
    try {
      typeof value === 'string'
        ? VlanId.fromString(value)
        : VlanId.from(value);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Verifica si es la VLAN por defecto (VLAN 1)
   */
  get isDefault(): boolean {
    return this.type === VlanType.DEFAULT;
  }

  /**
   * Verifica si es una VLAN normal (2-1001)
   */
  get isNormal(): boolean {
    return this.type === VlanType.NORMAL;
  }

  /**
   * Verifica si es una VLAN reservada (1002-1005)
   */
  get isReserved(): boolean {
    return this.type === VlanType.RESERVED;
  }

  /**
   * Verifica si es una VLAN extendida (1006-4094)
   */
  get isExtended(): boolean {
    return this.type === VlanType.EXTENDED;
  }

  /**
   * Verifica si la VLAN puede crearse/eliminarse (normal y extendida)
   */
  get isConfigurable(): boolean {
    return this.type === VlanType.NORMAL || this.type === VlanType.EXTENDED;
  }

  /**
   * Compara con otro VlanId para ordenamiento
   */
  compareTo(other: VlanId): number {
    return this._value - other._value;
  }

  /**
   * Obtiene el valor numérico
   */
  toNumber(): number {
    return this._value;
  }

  /**
   * Representación como string
   */
  override toString(): string {
    return String(this._value);
  }

  /**
   * Serialización JSON
   */
  override toJSON(): number {
    return this._value;
  }
}

/**
 * Parsea un VLAN ID desde número o string
 */
export function parseVlanId(value: number | string): VlanId {
  return typeof value === 'string'
    ? VlanId.fromString(value)
    : VlanId.from(value);
}

/**
 * Parsea un VLAN ID opcional (retorna undefined para null/undefined)
 */
export function parseOptionalVlanId(value: number | string | null | undefined): VlanId | undefined {
  if (value === null || value === undefined) return undefined;
  return typeof value === 'string'
    ? VlanId.fromString(value)
    : VlanId.from(value);
}

/**
 * Verifica si un valor es un VLAN ID válido
 */
export function isValidVlanId(value: number | string): boolean {
  return VlanId.isValid(value);
}