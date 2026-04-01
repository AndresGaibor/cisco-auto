// ============================================================================
// LeaseTime Value Object
// ============================================================================

const MIN_LEASE_SECONDS = 60; // 1 minute minimum
const MAX_LEASE_SECONDS = 365 * 24 * 60 * 60; // 365 days maximum

/**
 * Represents a validated DHCP lease time
 * 
 * Cisco IOS DHCP lease format: lease {days} {hours} {minutes}
 * Minimum: 1 minute, Maximum: 365 days
 */
export class LeaseTime {
  public readonly days: number;
  public readonly hours: number;
  public readonly minutes: number;

  constructor(days: number, hours: number = 0, minutes: number = 0) {
    const totalSeconds = this.toSeconds(days, hours, minutes);
    
    if (totalSeconds < MIN_LEASE_SECONDS) {
      throw new Error(`Lease time must be at least 1 minute, got ${totalSeconds} seconds`);
    }
    if (totalSeconds > MAX_LEASE_SECONDS) {
      throw new Error(`Lease time must be at most 365 days, got ${days} days, ${hours} hours, ${minutes} minutes`);
    }

    this.days = days;
    this.hours = hours;
    this.minutes = minutes;
  }

  static fromJSON(value: { days: number; hours?: number; minutes?: number }): LeaseTime {
    return new LeaseTime(value.days, value.hours ?? 0, value.minutes ?? 0);
  }

  toJSON(): { days: number; hours: number; minutes: number } {
    return {
      days: this.days,
      hours: this.hours,
      minutes: this.minutes,
    };
  }

  private toSeconds(days: number, hours: number, minutes: number): number {
    return days * 24 * 60 * 60 + hours * 60 * 60 + minutes * 60;
  }

  /**
   * Get the total lease time in seconds
   */
  get totalSeconds(): number {
    return this.toSeconds(this.days, this.hours, this.minutes);
  }

  /**
   * Get the total lease time in minutes
   */
  get totalMinutes(): number {
    return this.totalSeconds / 60;
  }

  /**
   * Get the total lease time in hours (fractional)
   */
  get totalHours(): number {
    return this.totalSeconds / 3600;
  }

  /**
   * Get the total lease time in days (fractional)
   */
  get totalDays(): number {
    return this.totalSeconds / (24 * 60 * 60);
  }

  /**
   * Check if this is an infinite lease (special case: 0 0 0 or very long)
   */
  get isInfinite(): boolean {
    return this.days === 0 && this.hours === 0 && this.minutes === 0;
  }

  /**
   * Check if this is a short lease (< 1 hour)
   */
  get isShort(): boolean {
    return this.totalHours < 1;
  }

  /**
   * Check if this is a medium lease (1-24 hours)
   */
  get isMedium(): boolean {
    return this.totalHours >= 1 && this.totalHours < 24;
  }

  /**
   * Check if this is a long lease (>= 1 day)
   */
  get isLong(): boolean {
    return this.totalDays >= 1;
  }

  /**
   * Check if this is a standard enterprise lease (1-7 days)
   */
  get isStandardEnterprise(): boolean {
    return this.totalDays >= 1 && this.totalDays <= 7;
  }

  /**
   * Format as Cisco IOS CLI command argument
   * e.g., "3 0" for 3 days, 0 hours
   */
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

  /**
   * Format as human-readable string
   */
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

  /**
   * Add time to this lease, returning a new LeaseTime
   */
  add(days: number = 0, hours: number = 0, minutes: number = 0): LeaseTime {
    return new LeaseTime(
      this.days + days,
      this.hours + hours,
      this.minutes + minutes
    );
  }

  /**
   * Compare with another LeaseTime (returns negative if this < other, 0 if equal, positive if this > other)
   */
  compare(other: LeaseTime): number {
    return this.totalSeconds - other.totalSeconds;
  }

  equals(other: LeaseTime): boolean {
    return this.totalSeconds === other.totalSeconds;
  }

  toString(): string {
    return this.toHumanReadable();
  }
}

/**
 * Create a LeaseTime from days/hours/minutes, throwing if invalid
 */
export function parseLeaseTime(days: number, hours?: number, minutes?: number): LeaseTime {
  return new LeaseTime(days, hours ?? 0, minutes ?? 0);
}

/**
 * Create a LeaseTime from total seconds, throwing if invalid
 */
export function fromSeconds(totalSeconds: number): LeaseTime {
  if (totalSeconds < MIN_LEASE_SECONDS || totalSeconds > MAX_LEASE_SECONDS) {
    throw new Error(`Lease time must be between ${MIN_LEASE_SECONDS} and ${MAX_LEASE_SECONDS} seconds`);
  }
  
  const days = Math.floor(totalSeconds / (24 * 60 * 60));
  const remaining = totalSeconds % (24 * 60 * 60);
  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  
  return new LeaseTime(days, hours, minutes);
}

/**
 * Create a standard enterprise lease time (e.g., 3 days, 7 days)
 */
export function standardEnterpriseLease(days: number = 3): LeaseTime {
  return new LeaseTime(days);
}

/**
 * Check if the given values form a valid LeaseTime without throwing
 */
export function isValidLeaseTime(days: number, hours: number = 0, minutes: number = 0): boolean {
  try {
    new LeaseTime(days, hours, minutes);
    return true;
  } catch {
    return false;
  }
}
