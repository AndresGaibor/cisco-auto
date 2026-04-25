import { ValueObject } from '../../shared/base/value-object.base.js';
import { DomainError } from '../../shared/errors/domain.error.js';

const VALID_PRIORITIES = [
  0, 4096, 8192, 12288, 16384, 20488, 24576, 28672,
  32768, 36864, 40960, 45056, 49152, 53248, 57344, 61440,
] as const;

export type ValidPriority = typeof VALID_PRIORITIES[number];

export class SpanningTreePriority extends ValueObject<number> {
  private constructor(value: number) {
    super(value);
  }

  static from(value: number): SpanningTreePriority {
    if (!Number.isInteger(value)) {
      throw DomainError.invalidValue('prioridad STP', value, 'debe ser un entero');
    }
    if (!VALID_PRIORITIES.includes(value as ValidPriority)) {
      throw DomainError.invalidValue(
        'prioridad STP',
        value,
        `debe ser múltiplo de 4096 (0-61440). Valores válidos: ${VALID_PRIORITIES.join(', ')}`
      );
    }
    return new SpanningTreePriority(value);
  }

  static tryFrom(value: number): SpanningTreePriority | null {
    try {
      return SpanningTreePriority.from(value);
    } catch {
      return null;
    }
  }

  static isValid(value: number): boolean {
    return SpanningTreePriority.tryFrom(value) !== null;
  }

  get isRootPriority(): boolean {
    return this._value === 0;
  }

  get isSecondaryRootPriority(): boolean {
    return this._value === 4096;
  }

  get isDefault(): boolean {
    return this._value === 32768;
  }

  get isHighPriority(): boolean {
    return this._value < 32768;
  }

  get isLowPriority(): boolean {
    return this._value > 32768;
  }

  compare(other: SpanningTreePriority): number {
    return this._value - other._value;
  }

  isHigherPriorityThan(other: SpanningTreePriority): boolean {
    return this._value < other._value;
  }

  isLowerPriorityThan(other: SpanningTreePriority): boolean {
    return this._value > other._value;
  }

  getNextHigherPriority(): SpanningTreePriority | null {
    const currentIndex = VALID_PRIORITIES.indexOf(this._value as ValidPriority);
    if (currentIndex <= 0) {
      return null;
    }
    return SpanningTreePriority.from(VALID_PRIORITIES[currentIndex - 1]!);
  }

  getNextLowerPriority(): SpanningTreePriority | null {
    const currentIndex = VALID_PRIORITIES.indexOf(this._value as ValidPriority);
    if (currentIndex >= VALID_PRIORITIES.length - 1) {
      return null;
    }
    return SpanningTreePriority.from(VALID_PRIORITIES[currentIndex + 1]!);
  }

  static presets(): {
    root: SpanningTreePriority;
    secondaryRoot: SpanningTreePriority;
    default: SpanningTreePriority;
    distribution: SpanningTreePriority;
    access: SpanningTreePriority;
  } {
    return {
      root: SpanningTreePriority.from(0),
      secondaryRoot: SpanningTreePriority.from(4096),
      default: SpanningTreePriority.from(32768),
      distribution: SpanningTreePriority.from(24576),
      access: SpanningTreePriority.from(61440),
    };
  }

  override equals(other: SpanningTreePriority): boolean {
    return this._value === other._value;
  }

  override toString(): string {
    return String(this._value);
  }

  override toJSON(): number {
    return this._value;
  }
}

export function parseSpanningTreePriority(value: number): SpanningTreePriority {
  return SpanningTreePriority.from(value);
}

export function isValidSpanningTreePriority(value: number): boolean {
  return SpanningTreePriority.isValid(value);
}
