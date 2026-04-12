import { ValueObject } from '../../shared/base/value-object.base.js';
import { DomainError } from '../../shared/errors/domain.error.js';

const COMMAND_ID_PATTERN = /^cmd-\d{13}-[a-zA-Z0-9]{6}$/;

export class CommandId extends ValueObject<string> {
  private readonly _timestamp: number;
  private readonly _random: string;

  private constructor(value: string, timestamp: number, random: string) {
    super(value);
    this._timestamp = timestamp;
    this._random = random;
  }

  static from(value: string): CommandId {
    if (!COMMAND_ID_PATTERN.test(value)) {
      throw DomainError.invalidValue(
        'ID de comando',
        value,
        'debe seguir el formato: cmd-<timestamp>-<aleatorio> (ej: cmd-1679875200000-a1b2c3)'
      );
    }
    const parts = value.split('-');
    const timestamp = parseInt(parts[1]!, 10);
    const random = parts[2]!;
    return new CommandId(value, timestamp, random);
  }

  static generate(): CommandId {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return CommandId.from(`cmd-${timestamp}-${random}`);
  }

  static tryFrom(value: string): CommandId | null {
    try {
      return CommandId.from(value);
    } catch {
      return null;
    }
  }

  static isValid(value: string): boolean {
    return CommandId.tryFrom(value) !== null;
  }

  get timestamp(): number {
    return this._timestamp;
  }

  get random(): string {
    return this._random;
  }

  get createdAt(): Date {
    return new Date(this._timestamp);
  }

  isNewerThan(other: CommandId): boolean {
    return this._timestamp > other._timestamp;
  }

  isOlderThan(other: CommandId): boolean {
    return this._timestamp < other._timestamp;
  }

  isWithin(timeWindowMs: number): boolean {
    return Date.now() - this._timestamp < timeWindowMs;
  }

  isExpired(ttlMs: number): boolean {
    return Date.now() - this._timestamp > ttlMs;
  }

  override equals(other: CommandId): boolean {
    return this._value === other._value;
  }

  override toString(): string {
    return this._value;
  }

  override toJSON(): string {
    return this._value;
  }
}

export function parseCommandId(value: string): CommandId {
  return CommandId.from(value);
}

export function isValidCommandId(value: string): boolean {
  return CommandId.isValid(value);
}

export function generateCommandId(): string {
  return CommandId.generate().value;
}
