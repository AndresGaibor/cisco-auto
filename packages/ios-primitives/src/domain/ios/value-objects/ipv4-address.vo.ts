import { ValueObject } from '../../shared/base/value-object.base.js';
import { DomainError } from '../../shared/errors/domain.error.js';
import { CidrPrefix } from './cidr-prefix.vo.js';

/**
 * Value Object que representa una dirección IPv4 validada
 */
export class Ipv4Address extends ValueObject<string> {
  private readonly _octets: readonly [number, number, number, number];

  constructor(value: string) {
    const normalized = value.trim();
    super(normalized);
    const octets = this.parseAndValidate(normalized);
    this._octets = octets;
  }

  /**
   * Crea desde JSON
   */
  static fromJSON(value: string): Ipv4Address {
    return new Ipv4Address(value);
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
   * Parsea y valida la dirección
   */
  private parseAndValidate(value: string): [number, number, number, number] {
    const parts = value.split(".");
    if (parts.length !== 4) {
      throw DomainError.invalidValue('IPv4 address', value, 'expected 4 octets separated by dots');
    }

    const octets: [number, number, number, number] = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
      const num = parseInt(parts[i]!, 10);
      if (isNaN(num) || num < 0 || num > 255 || String(num) !== parts[i]) {
        throw DomainError.invalidValue('IPv4 address', value, `octet ${i + 1} must be 0-255`);
      }
      octets[i] = num;
    }

    return octets;
  }

  /**
   * Obtiene los octetos como array
   */
  get octets(): readonly [number, number, number, number] {
    return this._octets;
  }

  /**
   * Convierte la dirección a entero de 32 bits
   */
  toInt(): number {
    return ((this._octets[0] << 24) | (this._octets[1] << 16) | (this._octets[2] << 8) | this._octets[3]) >>> 0;
  }

  /**
   * Verifica si es una dirección privada (RFC 1918)
   */
  get isPrivate(): boolean {
    const [a, b] = this._octets;
    // 10.0.0.0/8
    if (a === 10) return true;
    // 172.16.0.0/12
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.168.0.0/16
    if (a === 192 && b === 168) return true;
    return false;
  }

  /**
   * Verifica si es una dirección loopback (127.0.0.0/8)
   */
  get isLoopback(): boolean {
    return this._octets[0] === 127;
  }

  /**
   * Verifica si es una dirección APIPA (169.254.0.0/16)
   */
  get isApipa(): boolean {
    return this._octets[0] === 169 && this._octets[1] === 254;
  }

  /**
   * Verifica si es una dirección multicast (224.0.0.0/4)
   */
  get isMulticast(): boolean {
    return this._octets[0] >= 224 && this._octets[0] <= 239;
  }

  /**
   * Verifica si es una dirección broadcast (255.255.255.255)
   */
  get isBroadcast(): boolean {
    return this._octets[0] === 255 && this._octets[1] === 255 && this._octets[2] === 255 && this._octets[3] === 255;
  }

  /**
   * Verifica si es una dirección unicast (no broadcast, no multicast, no reservada)
   */
  get isUnicast(): boolean {
    return !this.isBroadcast && !this.isMulticast && !this.isLoopback && !this.isApipa;
  }

  /**
   * Verifica si es una dirección link-local
   */
  get isLinkLocal(): boolean {
    const [a, b] = this._octets;
    return (a === 169 && b === 254) || (a === 255 && b === 255 && this._octets[2] === 255 && this._octets[3] === 255);
  }

  /**
   * Obtiene la dirección de subred para un prefijo CIDR dado
   */
  getSubnetAddress(prefixLength: number): Ipv4Address {
    if (prefixLength < 0 || prefixLength > 32) {
      throw DomainError.invalidValue('prefix length', prefixLength, 'must be 0-32');
    }
    const mask = prefixLength === 0 ? 0 : (~0 << (32 - prefixLength)) >>> 0;
    const addrInt = this.toInt() & mask;
    return new Ipv4Address(
      `${(addrInt >>> 24) & 255}.${(addrInt >>> 16) & 255}.${(addrInt >>> 8) & 255}.${addrInt & 255}`
    );
  }

  /**
   * Comparación de igualdad
   */
  override equals(other: Ipv4Address): boolean {
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
 * Todas las máscaras de subred válidas en notación decimal punteada
 */
const VALID_MASKS = [
  "0.0.0.0",
  "128.0.0.0", "192.0.0.0", "224.0.0.0", "240.0.0.0",
  "248.0.0.0", "252.0.0.0", "254.0.0.0", "255.0.0.0",
  "255.128.0.0", "255.192.0.0", "255.224.0.0", "255.240.0.0",
  "255.248.0.0", "255.252.0.0", "255.254.0.0", "255.255.0.0",
  "255.255.128.0", "255.255.192.0", "255.255.224.0", "255.255.240.0",
  "255.255.248.0", "255.255.252.0", "255.255.254.0", "255.255.255.0",
  "255.255.255.128", "255.255.255.192", "255.255.255.224", "255.255.255.240",
  "255.255.255.248", "255.255.255.252", "255.255.255.254", "255.255.255.255",
] as const;

/**
 * Value Object que representa una máscara de subred validada
 */
export class SubnetMask extends ValueObject<string> {
  private readonly _cidrPrefix: CidrPrefix;

  constructor(value: string) {
    const normalized = value.trim();
    if (!VALID_MASKS.includes(normalized as typeof VALID_MASKS[number])) {
      throw DomainError.invalidValue('subnet mask', value, 'must be a valid mask like 255.255.255.0');
    }
    super(normalized);
    this._cidrPrefix = new CidrPrefix(this.calculateCidr(normalized));
  }

  /**
   * Crea desde JSON
   */
  static fromJSON(value: string): SubnetMask {
    return new SubnetMask(value);
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
   * Obtiene el prefijo CIDR como value object
   */
  get cidrPrefix(): CidrPrefix {
    return this._cidrPrefix;
  }

  /**
   * Obtiene la longitud del prefijo CIDR (0-32)
   */
  get cidr(): number {
    return this._cidrPrefix.value;
  }

  /**
   * Crea desde notación CIDR (ej: 24 para 255.255.255.0)
   */
  static fromCidr(cidr: number): SubnetMask {
    const prefix = new CidrPrefix(cidr);
    if (prefix.value === 0) return new SubnetMask("0.0.0.0");
    const mask = (~0 << (32 - prefix.value)) >>> 0;
    const dotted = `${(mask >>> 24) & 255}.${(mask >>> 16) & 255}.${(mask >>> 8) & 255}.${mask & 255}`;
    return new SubnetMask(dotted);
  }

  /**
   * Calcula el CIDR desde la máscara
   */
  private calculateCidr(mask: string): number {
    const parts = mask.split(".").map((p) => parseInt(p, 10));
    let cidr = 0;
    for (const part of parts) {
      cidr += part.toString(2).replace(/0/g, "").length;
    }
    return cidr;
  }

  /**
   * Obtiene la máscara wildcard (inversa de la máscara de subred)
   */
  get wildcardMask(): string {
    const parts = this._value.split(".").map((p) => 255 - parseInt(p, 10));
    return parts.join(".");
  }

  /**
   * Obtiene el número de hosts utilizables en la subred
   */
  get usableHosts(): number {
    return this._cidrPrefix.usableHosts;
  }

  /**
   * Obtiene el número total de direcciones en la subred
   */
  get totalAddresses(): number {
    return this._cidrPrefix.totalAddresses;
  }

  /**
   * Verifica si es una máscara válida para hosts (no /31 o /32)
   */
  get isValidForHosts(): boolean {
    return this._cidrPrefix.isValidForHosts;
  }

  /**
   * Verifica si es una máscara point-to-point (/31)
   */
  get isPointToPoint(): boolean {
    return this._cidrPrefix.isPointToPoint;
  }

  /**
   * Verifica si es una máscara loopback (/32)
   */
  get isLoopback(): boolean {
    return this._cidrPrefix.isLoopback;
  }

  /**
   * Comparación de igualdad
   */
  override equals(other: SubnetMask): boolean {
    return this._value === other._value;
  }

  /**
   * Representación string
   */
  override toString(): string {
    return this._value;
  }

  /**
   * Representación en formato CIDR (ej: "/24")
   */
  toCidrString(): string {
    return this._cidrPrefix.toString();
  }
}

/**
 * Crea una Ipv4Address, lanzando error si es inválida
 */
export function parseIpv4Address(value: string): Ipv4Address {
  return new Ipv4Address(value);
}

/**
 * Verifica si un string es una dirección IPv4 válida sin lanzar error
 */
export function isValidIpv4Address(value: string): boolean {
  try {
    new Ipv4Address(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Crea una SubnetMask, lanzando error si es inválida
 */
export function parseSubnetMask(value: string): SubnetMask {
  return new SubnetMask(value);
}

/**
 * Verifica si un string es una máscara de subred válida sin lanzar error
 */
export function isValidSubnetMask(value: string): boolean {
  try {
    new SubnetMask(value);
    return true;
  } catch {
    return false;
  }
}