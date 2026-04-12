import { ValueObject } from '../../shared/base/value-object.base.js';
import { DomainError } from '../../shared/errors/domain.error.js';

/**
 * Patrón para nombres de interfaces Cisco IOS
 * Ejemplos válidos: GigabitEthernet0/0, FastEthernet0/1, VLAN100, Serial0/0/0
 */
const INTERFACE_NAME_PATTERN = /^[A-Za-z]+\d+(\/\d+)*(\.\d+)?$/;

/**
 * Value Object que representa un nombre de interfaz Cisco IOS validado
 * 
 * Ejemplos: GigabitEthernet0/0, FastEthernet0/1, VLAN100, Serial0/0/0
 */
export class InterfaceName extends ValueObject<string> {
  constructor(value: string) {
    super(value);
    const normalized = value.trim();
    if (!normalized) {
      throw DomainError.invalidValue('Interface name', value, 'cannot be empty');
    }
    if (!INTERFACE_NAME_PATTERN.test(normalized)) {
      throw DomainError.invalidValue(
        'Interface name',
        value,
        'expected format: GigabitEthernet0/0, FastEthernet0/1, VLAN100, etc.'
      );
    }
    this._value = normalized;
  }

  /**
   * Crea desde JSON
   */
  static fromJSON(value: string): InterfaceName {
    return new InterfaceName(value);
  }

  /**
   * Serialización JSON
   */
  override toJSON(): string {
    return this._value;
  }

  /**
   * Obtiene el valor raw
   */
  get raw(): string {
    return this._value;
  }

  /**
   * Obtiene la forma corta del nombre de interfaz (ej: Gi0/0 en vez de GigabitEthernet0/0)
   */
  get shortForm(): string {
    const abbreviations: Record<string, string> = {
      GigabitEthernet: "Gi",
      FastEthernet: "Fa",
      Ethernet: "Et",
      Serial: "Se",
      Loopback: "Lo",
      Vlan: "Vl",
      VLAN: "Vl",
      PortChannel: "Po",
      Tunnel: "Tu",
    };

    for (const [full, abbrev] of Object.entries(abbreviations)) {
      if (this._value.startsWith(full)) {
        return this._value.replace(full, abbrev);
      }
    }
    return this._value;
  }

  /**
   * Verifica si es una subinterfaz (ej: GigabitEthernet0/0.100)
   */
  get isSubinterface(): boolean {
    return this._value.includes(".");
  }

  /**
   * Obtiene la interfaz padre para una subinterfaz
   */
  get parentInterface(): InterfaceName | null {
    if (!this.isSubinterface) return null;
    const parent = this._value.split(".")[0]!;
    return new InterfaceName(parent);
  }

  /**
   * Comparación de igualdad
   */
  override equals(other: InterfaceName): boolean {
    return this._value === other._value;
  }

  /**
   * Representación string
   */
  override toString(): string {
    return this._value;
  }
}

/**
 * Parsea un nombre de interfaz, lanzando error si es inválido
 */
export function parseInterfaceName(value: string): InterfaceName {
  return new InterfaceName(value);
}

/**
 * Parsea un nombre de interfaz opcional (retorna undefined para null/undefined)
 */
export function parseOptionalInterfaceName(value: string | null | undefined): InterfaceName | undefined {
  if (value === null || value === undefined) return undefined;
  return new InterfaceName(value);
}

/**
 * Verifica si un string es un nombre de interfaz válido sin lanzar error
 */
export function isValidInterfaceName(value: string): boolean {
  try {
    new InterfaceName(value);
    return true;
  } catch {
    return false;
  }
}