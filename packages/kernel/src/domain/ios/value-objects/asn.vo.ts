import { ValueObject } from '../../shared/base/value-object.base.js';
import { DomainError } from '../../shared/errors/domain.error.js';

const MIN_2BYTE_ASN = 0;
const MAX_2BYTE_ASN = 65535;
const MIN_4BYTE_ASN = 0;
const MAX_4BYTE_ASN = 4294967295;
const MIN_PRIVATE_2BYTE = 64512;
const MAX_PRIVATE_2BYTE = 65535;
const MIN_PRIVATE_4BYTE = 4200000000;
const MAX_PRIVATE_4BYTE = 4294967295;

export class Asn extends ValueObject<number> {
  private constructor(value: number) {
    super(value);
  }

  static from(value: number): Asn {
    return Asn.create4Byte(value);
  }

  static tryFrom(value: number | string): Asn | null {
    try {
      return Asn.from(typeof value === 'string' ? parseInt(value, 10) : value);
    } catch {
      return null;
    }
  }

  static isValid(value: number | string): boolean {
    return Asn.tryFrom(value) !== null;
  }

  static create2Byte(value: number): Asn {
    if (!Number.isInteger(value)) {
      throw DomainError.invalidValue('ASN', value, 'debe ser un entero');
    }
    if (value < MIN_2BYTE_ASN || value > MAX_2BYTE_ASN) {
      throw DomainError.invalidValue('ASN', value, `debe estar entre ${MIN_2BYTE_ASN} y ${MAX_2BYTE_ASN}`);
    }
    return new Asn(value);
  }

  static create4Byte(value: number): Asn {
    if (!Number.isInteger(value)) {
      throw DomainError.invalidValue('ASN', value, 'debe ser un entero');
    }
    if (value < MIN_4BYTE_ASN || value > MAX_4BYTE_ASN) {
      throw DomainError.invalidValue('ASN', value, `debe estar entre ${MIN_4BYTE_ASN} y ${MAX_4BYTE_ASN}`);
    }
    return new Asn(value);
  }

  get is2Byte(): boolean {
    return this._value <= MAX_2BYTE_ASN;
  }

  get is4Byte(): boolean {
    return this._value > MAX_2BYTE_ASN;
  }

  get isPrivate(): boolean {
    if (this.is2Byte) {
      return this._value >= MIN_PRIVATE_2BYTE && this._value <= MAX_PRIVATE_2BYTE;
    }
    return this._value >= MIN_PRIVATE_4BYTE && this._value <= MAX_PRIVATE_4BYTE;
  }

  get isPublic(): boolean {
    return !this.isPrivate;
  }

  get isReserved(): boolean {
    return this._value === 0 || this._value === 65535;
  }

  toDotNotation(): string {
    if (this.is2Byte) {
      return String(this._value);
    }
    const high = Math.floor(this._value / 65536);
    const low = this._value % 65536;
    return `${high}.${low}`;
  }

  toAsplain(): string {
    return String(this._value);
  }

  override equals(other: Asn): boolean {
    return this._value === other._value;
  }

  override toString(): string {
    return String(this._value);
  }

  override toJSON(): number {
    return this._value;
  }
}

export function parseAsn(value: string | number): Asn {
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  if (isNaN(num)) {
    throw DomainError.invalidValue('ASN', value, 'no es un número válido');
  }
  return Asn.create4Byte(num);
}

export function isValidAsn(value: number | string): boolean {
  try {
    parseAsn(value);
    return true;
  } catch {
    return false;
  }
}
