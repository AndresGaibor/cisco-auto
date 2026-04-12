import { ValueObject } from '../../shared/base/value-object.base.js';
import { DomainError } from '../../shared/errors/domain.error.js';

const ROUTE_TARGET_PATTERN = /^(\d+|\d+\.\d+\.\d+\.\d+):(\d+)$/;

export class RouteTarget extends ValueObject<string> {
  public readonly asn: string | number;
  public readonly id: number;

  private constructor(value: string, asn: string | number, id: number) {
    super(value);
    this.asn = asn;
    this.id = id;
  }

  static from(value: string): RouteTarget {
    const normalized = value.trim().toUpperCase();
    const match = normalized.match(ROUTE_TARGET_PATTERN);
    if (!match) {
      throw DomainError.invalidValue(
        'route target',
        value,
        'formato esperado: ASN:NN o IP:NN (ej: 65001:100, 192.168.1.1:100)'
      );
    }

    const asnPart = match[1]!;
    const idPart = parseInt(match[2]!, 10);

    const asn = /^\d+$/.test(asnPart) ? parseInt(asnPart, 10) : asnPart;

    return new RouteTarget(normalized, asn, idPart);
  }

  static tryFrom(value: string): RouteTarget | null {
    try {
      return RouteTarget.from(value);
    } catch {
      return null;
    }
  }

  static isValid(value: string): boolean {
    return RouteTarget.tryFrom(value) !== null;
  }

  get isIpAsn(): boolean {
    return typeof this.asn === 'string';
  }

  get is16BitAsn(): boolean {
    return typeof this.asn === 'number' && this.asn <= 65535;
  }

  get is32BitAsn(): boolean {
    return typeof this.asn === 'number' && this.asn > 65535;
  }

  toCiscoFormat(): string {
    if (typeof this.asn === 'number' && this.asn > 65535) {
      return `${this.asn}:${this.id}`;
    }
    return this._value;
  }

  override equals(other: RouteTarget): boolean {
    return this._value === other._value;
  }

  override toString(): string {
    return this._value;
  }

  override toJSON(): string {
    return this._value;
  }
}

export function parseRouteTarget(value: string): RouteTarget {
  return RouteTarget.from(value);
}

export function isValidRouteTarget(value: string): boolean {
  return RouteTarget.isValid(value);
}
