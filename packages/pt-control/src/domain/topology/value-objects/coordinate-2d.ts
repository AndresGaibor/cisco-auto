// ============================================================================
// Coordinate2D Value Object
// ============================================================================

/**
 * Canvas coordinate bounds for Packet Tracer
 * PT canvas typically uses coordinates in range -10000 to 10000
 */
const MIN_COORDINATE = -100000;
const MAX_COORDINATE = 100000;

/**
 * Represents a validated 2D coordinate for device positioning
 * 
 * Used for tracking device positions on the PT canvas, zone boundaries,
 * and spatial relationships in VirtualTopology.
 */
export class Coordinate2D {
  public readonly x: number;
  public readonly y: number;

  constructor(x: number, y: number) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error('Coordinates must be finite numbers');
    }

    if (x < MIN_COORDINATE || x > MAX_COORDINATE) {
      throw new Error(
        `X coordinate ${x} out of range [${MIN_COORDINATE}, ${MAX_COORDINATE}]`
      );
    }

    if (y < MIN_COORDINATE || y > MAX_COORDINATE) {
      throw new Error(
        `Y coordinate ${y} out of range [${MIN_COORDINATE}, ${MAX_COORDINATE}]`
      );
    }

    this.x = Math.round(x * 100) / 100; // Round to 2 decimal places
    this.y = Math.round(y * 100) / 100;
  }

  /**
   * Create Coordinate2D from x and y
   */
  static from(x: number, y: number): Coordinate2D {
    return new Coordinate2D(x, y);
  }

  /**
   * Create from object with x and y properties
   */
  static fromObject(point: { x: number; y: number }): Coordinate2D {
    return new Coordinate2D(point.x, point.y);
  }

  /**
   * Try to create Coordinate2D, returns null if invalid
   */
  static tryFrom(x: number, y: number): Coordinate2D | null {
    try {
      return new Coordinate2D(x, y);
    } catch {
      return null;
    }
  }

  /**
   * Try to create from object, returns null if invalid
   */
  static tryFromObject(point: { x: number; y: number }): Coordinate2D | null {
    try {
      return new Coordinate2D(point.x, point.y);
    } catch {
      return null;
    }
  }

  /**
   * Check if coordinates are valid
   */
  static isValid(x: number, y: number): boolean {
    try {
      new Coordinate2D(x, y);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Add another coordinate to this one (vector addition)
   */
  add(other: Coordinate2D): Coordinate2D {
    return new Coordinate2D(this.x + other.x, this.y + other.y);
  }

  /**
   * Subtract another coordinate from this one (vector subtraction)
   */
  subtract(other: Coordinate2D): Coordinate2D {
    return new Coordinate2D(this.x - other.x, this.y - other.y);
  }

  /**
   * Scale the coordinate by a factor
   */
  scale(factor: number): Coordinate2D {
    return new Coordinate2D(this.x * factor, this.y * factor);
  }

  /**
   * Calculate distance to another coordinate
   */
  distanceTo(other: Coordinate2D): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate squared distance (faster, no sqrt)
   */
  distanceSquaredTo(other: Coordinate2D): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return dx * dx + dy * dy;
  }

  /**
   * Check if this coordinate equals another
   */
  equals(other: Coordinate2D): boolean {
    return this.x === other.x && this.y === other.y;
  }

  /**
   * Check if coordinate is within bounds
   */
  isWithinBounds(minX: number, minY: number, maxX: number, maxY: number): boolean {
    return this.x >= minX && this.x <= maxX && this.y >= minY && this.y <= maxY;
  }

  /**
   * Get midpoint between this and another coordinate
   */
  midpoint(other: Coordinate2D): Coordinate2D {
    return new Coordinate2D((this.x + other.x) / 2, (this.y + other.y) / 2);
  }

  /**
   * Get coordinate as object
   */
  toObject(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  /**
   * String representation
   */
  toString(): string {
    return `(${this.x}, ${this.y})`;
  }

  /**
   * JSON serialization
   */
  toJSON(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }
}

/**
 * Parse a 2D coordinate from x and y
 */
export function parseCoordinate2D(x: number, y: number): Coordinate2D {
  return Coordinate2D.from(x, y);
}

/**
 * Parse a 2D coordinate from object
 */
export function parseCoordinate2DObject(point: { x: number; y: number }): Coordinate2D {
  return Coordinate2D.fromObject(point);
}

/**
 * Check if coordinates are valid
 */
export function isValidCoordinate2D(x: number, y: number): boolean {
  return Coordinate2D.isValid(x, y);
}
