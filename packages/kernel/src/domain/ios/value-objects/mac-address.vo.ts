import { ValueObject } from '../../shared/base/value-object.base.js';
import { DomainError } from '../../shared/errors/domain.error.js';

/**
 * Patrones para direcciones MAC válidas:
 * - Formato Cisco: AAAA.BBBB.CCCC (12 dígitos hex en grupos de 4, separados por punto)
 * - Formato estándar: AA:BB:CC:DD:EE:FF (separado por dos puntos)
 * - Formato Windows: AA-BB-CC-DD-EE-FF (separado por guión)
 * - Sin separador: AABBCCDDEEFF (12 dígitos hex consecutivos)
 */
const MAC_PATTERNS = {
  cisco: /^([0-9A-Fa-f]{4})\.([0-9A-Fa-f]{4})\.([0-9A-Fa-f]{4})$/,
  colon: /^([0-9A-Fa-f]{2}):([0-9A-Fa-f]{2}):([0-9A-Fa-f]{2}):([0-9A-Fa-f]{2}):([0-9A-Fa-f]{2}):([0-9A-Fa-f]{2})$/,
  hyphen: /^([0-9A-Fa-f]{2})-([0-9A-Fa-f]{2})-([0-9A-Fa-f]{2})-([0-9A-Fa-f]{2})-([0-9A-Fa-f]{2})-([0-9A-Fa-f]{2})$/,
  bare: /^[0-9A-Fa-f]{12}$/,
};

/**
 * Formatos de dirección MAC
 */
export type MacFormat = 'cisco' | 'colon' | 'hyphen' | 'bare';

/**
 * Value Object que representa una dirección MAC validada con normalización de formato
 */
export class MacAddress extends ValueObject<string> {
  private readonly _octets: readonly number[];
  private readonly _format: MacFormat;

  constructor(value: string, format: MacFormat = 'colon') {
    const trimmed = value.trim().toUpperCase();
    const parsed = MacAddress.parseAndValidate(trimmed);
    
    if (!parsed) {
      throw DomainError.invalidValue(
        'MAC address',
        value,
        'must be in Cisco (AAAA.BBBB.CCCC), colon (AA:BB:CC:DD:EE:FF), hyphen (AA-BB-CC-DD-EE-FF), or bare (AABBCCDDEEFF) format'
      );
    }

    super(trimmed);
    this._octets = parsed.octets;
    this._format = format;
    this._value = this.formatAs(trimmed, parsed.detectedFormat);
  }

  /**
   * Crea desde JSON
   */
  static fromJSON(value: string): MacAddress {
    return new MacAddress(value);
  }

  /**
   * Serialización JSON
   */
  override toJSON(): string {
    return this.toString();
  }

  /**
   * Obtiene el valor raw
   */
  get raw(): string {
    return this._value;
  }

  /**
   * Obtiene la dirección MAC como array de octetos
   */
  get octets(): readonly number[] {
    return this._octets;
  }

  /**
   * Obtiene el formato detectado
   */
  get detectedFormat(): MacFormat {
    return this._format;
  }

  /**
   * Parsea y valida la dirección MAC
   */
  private static parseAndValidate(value: string): { octets: number[]; detectedFormat: MacFormat } | null {
    // Try Cisco format
    let match = value.match(MAC_PATTERNS.cisco);
    if (match) {
      const hex = `${match[1] ?? ""}${match[2] ?? ""}${match[3] ?? ""}`;
      return { octets: MacAddress.hexToOctets(hex), detectedFormat: 'cisco' };
    }

    // Try colon format
    match = value.match(MAC_PATTERNS.colon);
    if (match) {
      const hex = match.slice(1).join('');
      return { octets: MacAddress.hexToOctets(hex), detectedFormat: 'colon' };
    }

    // Try hyphen format
    match = value.match(MAC_PATTERNS.hyphen);
    if (match) {
      const hex = match.slice(1).join('');
      return { octets: MacAddress.hexToOctets(hex), detectedFormat: 'hyphen' };
    }

    // Try bare format
    match = value.match(MAC_PATTERNS.bare);
    if (match) {
      return { octets: MacAddress.hexToOctets(value), detectedFormat: 'bare' };
    }

    return null;
  }

  /**
   * Convierte hex a octetos
   */
  private static hexToOctets(hex: string): number[] {
    const octets: number[] = [];
    for (let i = 0; i < hex.length; i += 2) {
      octets.push(parseInt(hex.substring(i, i + 2), 16));
    }
    return octets;
  }

  /**
   * Formatea según el formato especificado
   */
  private formatAs(value: string, format: MacFormat): string {
    const hex = value.replace(/[^0-9A-F]/g, '');
    
    switch (format) {
      case 'cisco':
        return `${hex.substring(0, 4)}.${hex.substring(4, 8)}.${hex.substring(8, 12)}`;
      case 'colon':
        return hex.match(/.{2}/g)?.join(':') ?? '';
      case 'hyphen':
        return hex.match(/.{2}/g)?.join('-') ?? '';
      case 'bare':
        return hex;
      default:
        return value;
    }
  }

  /**
   * Formatea como estilo Cisco (AAAA.BBBB.CCCC)
   */
  toCiscoFormat(): string {
    const hex = this._octets.map(o => o.toString(16).padStart(2, '0').toUpperCase()).join('');
    return `${hex.substring(0, 4)}.${hex.substring(4, 8)}.${hex.substring(8, 12)}`;
  }

  /**
   * Formatea como estándar con dos puntos (AA:BB:CC:DD:EE:FF)
   */
  toColonFormat(): string {
    return this._octets.map(o => o.toString(16).padStart(2, '0').toUpperCase()).join(':');
  }

  /**
   * Formatea con guiones (AA-BB-CC-DD-EE-FF)
   */
  toHyphenFormat(): string {
    return this._octets.map(o => o.toString(16).padStart(2, '0').toUpperCase()).join('-');
  }

  /**
   * Formatea como hex sin separador (AABBCCDDEEFF)
   */
  toBareFormat(): string {
    return this._octets.map(o => o.toString(16).padStart(2, '0').toUpperCase()).join('');
  }

  /**
   * Obtiene el OUI (Organizationally Unique Identifier) - primeros 3 octetos
   */
  get oui(): string {
    return this._octets.slice(0, 3).map(o => o.toString(16).padStart(2, '0').toUpperCase()).join(':');
  }

  /**
   * Obtiene el NIC (Network Interface Controller) identifier - últimos 3 octetos
   */
  get nic(): string {
    return this._octets.slice(3).map(o => o.toString(16).padStart(2, '0').toUpperCase()).join(':');
  }

  /**
   * Verifica si es una dirección unicast (LSB del primer octeto es 0)
   */
  get isUnicast(): boolean {
    return (this._octets[0]! & 0x01) === 0;
  }

  /**
   * Verifica si es una dirección multicast (LSB del primer octeto es 1)
   */
  get isMulticast(): boolean {
    return (this._octets[0]! & 0x01) === 1;
  }

  /**
   * Verifica si es una dirección broadcast (FF:FF:FF:FF:FF:FF)
   */
  get isBroadcast(): boolean {
    return this._octets.every(o => o === 0xFF);
  }

  /**
   * Verifica si es una dirección administrada localmente (segundo bit del primer octeto es 1)
   */
  get isLocallyAdministered(): boolean {
    return (this._octets[0]! & 0x02) === 0x02;
  }

  /**
   * Verifica si es una dirección administrada universalmente (segundo bit del primer octeto es 0)
   */
  get isUniversal(): boolean {
    return (this._octets[0]! & 0x02) === 0;
  }

  /**
   * Comparación de igualdad
   */
  override equals(other: MacAddress): boolean {
    return this._octets.every((octet, i) => octet === other._octets[i]);
  }

  /**
   * Representación string
   */
  override toString(): string {
    return this._value;
  }
}

/**
 * Crea una MacAddress desde string, lanzando error si es inválida
 */
export function parseMacAddress(value: string, format?: MacFormat): MacAddress {
  return new MacAddress(value, format);
}

/**
 * Verifica si un string es una dirección MAC válida sin lanzar error
 */
export function isValidMacAddress(value: string): boolean {
  try {
    new MacAddress(value);
    return true;
  } catch {
    return false;
  }
}