import { ValueObject } from '../../shared/base/value-object.base.js';
import { DomainError } from '../../shared/errors/domain.error.js';

const MIN_AD = 0;
const MAX_AD = 255;

export const WELL_KNOWN_AD = {
  CONNECTED: 0,
  STATIC: 1,
  EIGRP_SUMMARY: 5,
  BGP_EXTERNAL: 20,
  EIGRP_INTERNAL: 90,
  IGRP: 100,
  OSPF: 110,
  IS_IS: 115,
  RIP: 120,
  EIGRP_EXTERNAL: 170,
  BGP_LOCAL: 200,
  UNKNOWN: 254,
  UNREACHABLE: 255,
} as const;

export type WellKnownAdKey = keyof typeof WELL_KNOWN_AD;

export class AdministrativeDistance extends ValueObject<number> {
  private constructor(value: number) {
    super(value);
  }

  static from(value: number): AdministrativeDistance {
    if (!Number.isInteger(value)) {
      throw DomainError.invalidValue('distancia administrativa', value, 'debe ser un entero');
    }
    if (value < MIN_AD || value > MAX_AD) {
      throw DomainError.invalidValue('distancia administrativa', value, `debe estar entre ${MIN_AD} y ${MAX_AD}`);
    }
    return new AdministrativeDistance(value);
  }

  static tryFrom(value: number): AdministrativeDistance | null {
    try {
      return AdministrativeDistance.from(value);
    } catch {
      return null;
    }
  }

  static isValid(value: number): boolean {
    return AdministrativeDistance.tryFrom(value) !== null;
  }

  static fromProtocol(protocol: WellKnownAdKey): AdministrativeDistance {
    return AdministrativeDistance.from(WELL_KNOWN_AD[protocol]);
  }

  static forStatic(): AdministrativeDistance {
    return AdministrativeDistance.from(WELL_KNOWN_AD.STATIC);
  }

  static forOspf(): AdministrativeDistance {
    return AdministrativeDistance.from(WELL_KNOWN_AD.OSPF);
  }

  static forRip(): AdministrativeDistance {
    return AdministrativeDistance.from(WELL_KNOWN_AD.RIP);
  }

  static forEigrpInternal(): AdministrativeDistance {
    return AdministrativeDistance.from(WELL_KNOWN_AD.EIGRP_INTERNAL);
  }

  static forEigrpExternal(): AdministrativeDistance {
    return AdministrativeDistance.from(WELL_KNOWN_AD.EIGRP_EXTERNAL);
  }

  get protocolName(): string | null {
    for (const [key, value] of Object.entries(WELL_KNOWN_AD)) {
      if (value === this._value) {
        return this.formatKey(key);
      }
    }
    return null;
  }

  private formatKey(key: string): string {
    return key
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  }

  get isWellKnown(): boolean {
    return Object.values(WELL_KNOWN_AD).includes(this._value as never);
  }

  get isConnected(): boolean {
    return this._value === WELL_KNOWN_AD.CONNECTED;
  }

  get isStatic(): boolean {
    return this._value === WELL_KNOWN_AD.STATIC;
  }

  get isEigrp(): boolean {
    return (
      this._value === WELL_KNOWN_AD.EIGRP_INTERNAL ||
      this._value === WELL_KNOWN_AD.EIGRP_EXTERNAL ||
      this._value === WELL_KNOWN_AD.EIGRP_SUMMARY
    );
  }

  get isOspf(): boolean {
    return this._value === WELL_KNOWN_AD.OSPF;
  }

  get isBgp(): boolean {
    return (
      this._value === WELL_KNOWN_AD.BGP_EXTERNAL ||
      this._value === WELL_KNOWN_AD.BGP_LOCAL
    );
  }

  get isRip(): boolean {
    return this._value === WELL_KNOWN_AD.RIP;
  }

  get isUnreachable(): boolean {
    return this._value === WELL_KNOWN_AD.UNREACHABLE;
  }

  isMoreTrustedThan(other: AdministrativeDistance): boolean {
    return this._value < other._value;
  }

  isLessTrustedThan(other: AdministrativeDistance): boolean {
    return this._value > other._value;
  }

  override equals(other: AdministrativeDistance): boolean {
    return this._value === other._value;
  }

  override toString(): string {
    const protocol = this.protocolName;
    return protocol ? `${this._value} (${protocol})` : String(this._value);
  }

  override toJSON(): number {
    return this._value;
  }
}

export function parseAdministrativeDistance(value: number): AdministrativeDistance {
  return AdministrativeDistance.from(value);
}

export function isValidAdministrativeDistance(value: number): boolean {
  return AdministrativeDistance.isValid(value);
}
