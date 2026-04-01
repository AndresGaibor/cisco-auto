// ============================================================================
// SpanningTreePriority VO - STP Bridge/Port Priority
// ============================================================================

/**
 * Valid STP priority values (must be multiples of 4096)
 */
const VALID_PRIORITIES = [
  0, 4096, 8192, 12288, 16384, 20488, 24576, 28672,
  32768, 36864, 40960, 45056, 49152, 53248, 57344, 61440,
] as const;

export type ValidPriority = typeof VALID_PRIORITIES[number];

/**
 * Represents a validated Spanning Tree priority value
 * 
 * STP priorities must be multiples of 4096 (0-61440).
 * Lower values have higher priority in STP elections.
 */
export class SpanningTreePriority {
  public readonly value: number;

  constructor(value: number) {
    if (!Number.isInteger(value)) {
      throw new Error(`STP priority must be an integer, got: ${value}`);
    }
    if (!VALID_PRIORITIES.includes(value as ValidPriority)) {
      throw new Error(
        `STP priority must be a multiple of 4096 (0-61440), got: ${value}. ` +
        `Valid values: ${VALID_PRIORITIES.join(', ')}`
      );
    }
    this.value = value;
  }

  static fromJSON(value: number): SpanningTreePriority {
    return new SpanningTreePriority(value);
  }

  toJSON(): number {
    return this.value;
  }

  get raw(): number {
    return this.value;
  }

  /**
   * Check if this is the root bridge priority (lowest possible)
   */
  get isRootPriority(): boolean {
    return this.value === 0;
  }

  /**
   * Check if this is a secondary root priority (commonly used for backup root)
   */
  get isSecondaryRootPriority(): boolean {
    return this.value === 4096;
  }

  /**
   * Check if this is the default priority
   */
  get isDefault(): boolean {
    return this.value === 32768;
  }

  /**
   * Check if this priority would make the bridge more likely to be root
   */
  get isHighPriority(): boolean {
    return this.value < 32768;
  }

  /**
   * Check if this priority would make the bridge less likely to be root
   */
  get isLowPriority(): boolean {
    return this.value > 32768;
  }

  /**
   * Compare with another priority (returns negative if this has higher priority,
   * 0 if equal, positive if this has lower priority)
   * Note: Lower STP priority value = higher priority in elections
   */
  compare(other: SpanningTreePriority): number {
    return this.value - other.value;
  }

  /**
   * Check if this has higher priority than another (lower value wins)
   */
  isHigherPriorityThan(other: SpanningTreePriority): boolean {
    return this.value < other.value;
  }

  /**
   * Check if this has lower priority than another (higher value loses)
   */
  isLowerPriorityThan(other: SpanningTreePriority): boolean {
    return this.value > other.value;
  }

  /**
   * Get the next higher priority (lower value, closer to root)
   * Returns null if already at highest priority (0)
   */
  getNextHigherPriority(): SpanningTreePriority | null {
    const currentIndex = VALID_PRIORITIES.indexOf(this.value as ValidPriority);
    if (currentIndex <= 0) {
      return null;
    }
    return new SpanningTreePriority(VALID_PRIORITIES[currentIndex - 1]!);
  }

  /**
   * Get the next lower priority (higher value, further from root)
   * Returns null if already at lowest priority (61440)
   */
  getNextLowerPriority(): SpanningTreePriority | null {
    const currentIndex = VALID_PRIORITIES.indexOf(this.value as ValidPriority);
    if (currentIndex >= VALID_PRIORITIES.length - 1) {
      return null;
    }
    return new SpanningTreePriority(VALID_PRIORITIES[currentIndex + 1]!);
  }

  /**
   * Standard priority presets for common STP configurations
   */
  static presets(): {
    root: SpanningTreePriority;
    secondaryRoot: SpanningTreePriority;
    default: SpanningTreePriority;
    distribution: SpanningTreePriority;
    access: SpanningTreePriority;
  } {
    return {
      /**
       * Root bridge - highest priority (lowest value)
       */
      root: new SpanningTreePriority(0),
      /**
       * Secondary/backup root bridge
       */
      secondaryRoot: new SpanningTreePriority(4096),
      /**
       * Default STP priority
       */
      default: new SpanningTreePriority(32768),
      /**
       * Distribution layer switches
       */
      distribution: new SpanningTreePriority(24576),
      /**
       * Access layer switches - lowest priority (highest value)
       */
      access: new SpanningTreePriority(61440),
    };
  }

  equals(other: SpanningTreePriority): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return String(this.value);
  }
}

/**
 * Create a SpanningTreePriority, throwing if invalid
 */
export function parseSpanningTreePriority(value: number): SpanningTreePriority {
  return new SpanningTreePriority(value);
}

/**
 * Check if a number is a valid STP priority without throwing
 */
export function isValidSpanningTreePriority(value: number): boolean {
  try {
    new SpanningTreePriority(value);
    return true;
  } catch {
    return false;
  }
}
