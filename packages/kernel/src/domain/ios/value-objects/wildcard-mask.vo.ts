import { ValueObject } from '../../shared/base/value-object.base.js';
import { DomainError } from '../../shared/errors/domain.error.js';
import { CidrPrefix } from './cidr-prefix.vo.js';

export class WildcardMask extends ValueObject<string> {
  private readonly _octets: readonly [number, number, number, number];

  private constructor(value: string, octets: [number, number, number, number]) {
    super(value);
    this._octets = octets;
  }

  static from(value: string): WildcardMask {
    return new WildcardMask(value, WildcardMask.parseAndValidate(value));
  }

  static tryFrom(value: string): WildcardMask | null {
    try {
      return WildcardMask.from(value);
    } catch {
      return null;
    }
  }

  static isValid(value: string): boolean {
    return WildcardMask.tryFrom(value) !== null;
  }

  static fromCidr(cidr: number | CidrPrefix): WildcardMask {
    const prefix = cidr instanceof CidrPrefix ? cidr : new CidrPrefix(cidr);
    const subnetMaskInt = prefix.value === 0 ? 0 : (~0 << (32 - prefix.value)) >>> 0;
    const wildcardInt = ~subnetMaskInt >>> 0;

    const octets: [number, number, number, number] = [
      (wildcardInt >>> 24) & 255,
      (wildcardInt >>> 16) & 255,
      (wildcardInt >>> 8) & 255,
      wildcardInt & 255,
    ];

    return new WildcardMask(octets.join('.'), octets);
  }

  static fromSubnetMask(mask: string): WildcardMask {
    const octets: [number, number, number, number] = [0, 0, 0, 0];
    const parts = mask.split('.');
    for (let i = 0; i < 4; i++) {
      octets[i] = 255 - parseInt(parts[i]!, 10);
    }
    return new WildcardMask(octets.join('.'), octets);
  }

  private static parseAndValidate(value: string): [number, number, number, number] {
    const normalized = value.trim();
    const parts = normalized.split('.');
    if (parts.length !== 4) {
      throw DomainError.invalidValue('máscara wildcard', value, 'se esperan 4 octetos separados por puntos');
    }

    const octets: [number, number, number, number] = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
      const num = parseInt(parts[i]!, 10);
      if (isNaN(num) || num < 0 || num > 255) {
        throw DomainError.invalidValue('máscara wildcard', value, `el octeto ${i + 1} debe ser 0-255`);
      }
      if (!WildcardMask.isValidWildcardOctet(num)) {
        throw DomainError.invalidValue('octeto wildcard', num, 'debe ser un valor válido (0, 1, 3, 7, 15, 31, 63, 127, 255)');
      }
      octets[i] = num;
    }

    return octets;
  }

  private static isValidWildcardOctet(value: number): boolean {
    if (value === 0) return true;
    const incremented = value + 1;
    return (incremented & (incremented - 1)) === 0;
  }

  get octets(): readonly [number, number, number, number] {
    return this._octets;
  }

  get raw(): string {
    return this._value;
  }

  toSubnetMask(): string {
    return this._octets.map((o) => 255 - o).join('.');
  }

  toCidrPrefix(): CidrPrefix {
    const subnetMaskInt = ~this.toInt() >>> 0;
    let cidr = 0;
    for (let i = 31; i >= 0; i--) {
      if ((subnetMaskInt & (1 << i)) !== 0) {
        cidr++;
      } else {
        break;
      }
    }
    return new CidrPrefix(cidr);
  }

  toInt(): number {
    return (
      (this._octets[0] << 24) |
      (this._octets[1] << 16) |
      (this._octets[2] << 8) |
      this._octets[3]
    ) >>> 0;
  }

  get wildcardBits(): number {
    return 32 - this.toCidrPrefix().value;
  }

  get isHost(): boolean {
    return this._value === '0.0.0.0';
  }

  get isAny(): boolean {
    return this._value === '255.255.255.255';
  }

  get isClassful(): boolean {
    return (
      this._value === '0.0.0.0' ||
      this._value === '0.0.0.255' ||
      this._value === '0.0.255.255' ||
      this._value === '0.255.255.255' ||
      this._value === '255.255.255.255'
    );
  }

  toOspfNetworkStatement(ip: string): string {
    return `network ${ip} ${this._value}`;
  }

  toAclFormat(): string {
    return this._value;
  }

  override equals(other: WildcardMask): boolean {
    return this._value === other._value;
  }

  override toString(): string {
    return this._value;
  }

  override toJSON(): string {
    return this._value;
  }
}

export function parseWildcardMask(value: string): WildcardMask {
  return WildcardMask.from(value);
}

export function isValidWildcardMask(value: string): boolean {
  return WildcardMask.isValid(value);
}
