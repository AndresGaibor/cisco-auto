import { ValueObject } from '../../shared/base/value-object.base.js';
import { DomainError } from '../../shared/errors/domain.error.js';

const MIN_LEASE_SECONDS = 60;
const MAX_LEASE_SECONDS = 365 * 24 * 60 * 60;

export class LeaseTime extends ValueObject<number> {
  public readonly days: number;
  public readonly hours: number;
  public readonly minutes: number;

  private constructor(days: number, hours: number, minutes: number, totalSeconds: number) {
    super(totalSeconds);
    this.days = days;
    this.hours = hours;
    this.minutes = minutes;
  }

  static from(days: number, hours: number = 0, minutes: number = 0): LeaseTime {
    const totalSeconds = LeaseTime.toSeconds(days, hours, minutes);

    if (totalSeconds < MIN_LEASE_SECONDS) {
      throw DomainError.invalidValue('tiempo de lease', `${days}d ${hours}h ${minutes}m`, `debe ser al menos 1 minuto, obtenido ${totalSeconds} segundos`);
    }
    if (totalSeconds > MAX_LEASE_SECONDS) {
      throw DomainError.invalidValue(
        'tiempo de lease',
        `${days}d ${hours}h ${minutes}m`,
        `debe ser como máximo 365 días`
      );
    }

    return new LeaseTime(days, hours, minutes, totalSeconds);
  }

  static fromSeconds(totalSeconds: number): LeaseTime {
    if (totalSeconds < MIN_LEASE_SECONDS || totalSeconds > MAX_LEASE_SECONDS) {
      throw DomainError.invalidValue(
        'tiempo de lease en segundos',
        totalSeconds,
        `debe estar entre ${MIN_LEASE_SECONDS} y ${MAX_LEASE_SECONDS} segundos`
      );
    }

    const days = Math.floor(totalSeconds / (24 * 60 * 60));
    const remaining = totalSeconds % (24 * 60 * 60);
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);

    return new LeaseTime(days, hours, minutes, totalSeconds);
  }

  static tryFrom(days: number, hours: number = 0, minutes: number = 0): LeaseTime | null {
    try {
      return LeaseTime.from(days, hours, minutes);
    } catch {
      return null;
    }
  }

  static isValid(days: number, hours: number = 0, minutes: number = 0): boolean {
    return LeaseTime.tryFrom(days, hours, minutes) !== null;
  }

  static standardEnterprise(days: number = 3): LeaseTime {
    return LeaseTime.from(days);
  }

  private static toSeconds(days: number, hours: number, minutes: number): number {
    return days * 24 * 60 * 60 + hours * 60 * 60 + minutes * 60;
  }

  get totalSeconds(): number {
    return this._value;
  }

  get totalMinutes(): number {
    return this.totalSeconds / 60;
  }

  get totalHours(): number {
    return this.totalSeconds / 3600;
  }

  get totalDays(): number {
    return this.totalSeconds / (24 * 60 * 60);
  }

  get isInfinite(): boolean {
    return this.days === 0 && this.hours === 0 && this.minutes === 0;
  }

  get isShort(): boolean {
    return this.totalHours < 1;
  }

  get isMedium(): boolean {
    return this.totalHours >= 1 && this.totalHours < 24;
  }

  get isLong(): boolean {
    return this.totalDays >= 1;
  }

  get isStandardEnterprise(): boolean {
    return this.totalDays >= 1 && this.totalDays <= 7;
  }

  toCiscoFormat(): string {
    if (this.isInfinite) {
      return 'infinite';
    }
    if (this.minutes > 0) {
      return `${this.days} ${this.hours} ${this.minutes}`;
    }
    if (this.hours > 0) {
      return `${this.days} ${this.hours}`;
    }
    return `${this.days}`;
  }

  toHumanReadable(): string {
    if (this.isInfinite) {
      return 'infinite';
    }

    const parts: string[] = [];
    if (this.days > 0) {
      parts.push(`${this.days} day${this.days !== 1 ? 's' : ''}`);
    }
    if (this.hours > 0) {
      parts.push(`${this.hours} hour${this.hours !== 1 ? 's' : ''}`);
    }
    if (this.minutes > 0) {
      parts.push(`${this.minutes} minute${this.minutes !== 1 ? 's' : ''}`);
    }

    return parts.join(', ') || '0 minutes';
  }

  add(days: number = 0, hours: number = 0, minutes: number = 0): LeaseTime {
    return LeaseTime.from(
      this.days + days,
      this.hours + hours,
      this.minutes + minutes
    );
  }

  compare(other: LeaseTime): number {
    return this.totalSeconds - other.totalSeconds;
  }

  override equals(other: LeaseTime): boolean {
    return this.totalSeconds === other.totalSeconds;
  }

  override toString(): string {
    return this.toHumanReadable();
  }

  override toJSON(): { days: number; hours: number; minutes: number } {
    return {
      days: this.days,
      hours: this.hours,
      minutes: this.minutes,
    };
  }
}

export function parseLeaseTime(days: number, hours?: number, minutes?: number): LeaseTime {
  return LeaseTime.from(days, hours ?? 0, minutes ?? 0);
}

export function isValidLeaseTime(days: number, hours: number = 0, minutes: number = 0): boolean {
  return LeaseTime.isValid(days, hours, minutes);
}
