// ============================================================================
// ZoneGeometry Value Object
// ============================================================================

import { Coordinate2D } from './coordinate-2d.js';

/**
 * Represents a validated zone/rectangle geometry
 * 
 * Normalized to always have x1 < x2 and y1 < y2 for consistent comparisons
 */
export class ZoneGeometry {
  public readonly x1: number;
  public readonly y1: number;
  public readonly x2: number;
  public readonly y2: number;

  constructor(x1: number, y1: number, x2: number, y2: number) {
    // Normalize: ensure x1 < x2 and y1 < y2
    this.x1 = Math.min(x1, x2);
    this.x2 = Math.max(x1, x2);
    this.y1 = Math.min(y1, y2);
    this.y2 = Math.max(y1, y2);
  }

  /**
   * Create from coordinates
   */
  static from(x1: number, y1: number, x2: number, y2: number): ZoneGeometry {
    return new ZoneGeometry(x1, y1, x2, y2);
  }

  /**
   * Create from two Coordinate2D points (top-left and bottom-right)
   */
  static fromPoints(topLeft: Coordinate2D, bottomRight: Coordinate2D): ZoneGeometry {
    return new ZoneGeometry(topLeft.x, topLeft.y, bottomRight.x, bottomRight.y);
  }

  /**
   * Create from position and size (x, y, width, height)
   */
  static fromPosition(x: number, y: number, width: number, height: number): ZoneGeometry {
    return new ZoneGeometry(x, y, x + width, y + height);
  }

  /**
   * Try to create ZoneGeometry, returns null if invalid
   */
  static tryFrom(x1: number, y1: number, x2: number, y2: number): ZoneGeometry | null {
    try {
      return new ZoneGeometry(x1, y1, x2, y2);
    } catch {
      return null;
    }
  }

  /**
   * Check if coordinates form valid geometry
   */
  static isValid(x1: number, y1: number, x2: number, y2: number): boolean {
    try {
      new ZoneGeometry(x1, y1, x2, y2);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get width of the zone
   */
  get width(): number {
    return this.x2 - this.x1;
  }

  /**
   * Get height of the zone
   */
  get height(): number {
    return this.y2 - this.y1;
  }

  /**
   * Get area of the zone
   */
  get area(): number {
    return this.width * this.height;
  }

  /**
   * Get center point
   */
  get center(): Coordinate2D {
    return new Coordinate2D(
      (this.x1 + this.x2) / 2,
      (this.y1 + this.y2) / 2
    );
  }

  /**
   * Get top-left corner
   */
  get topLeft(): Coordinate2D {
    return new Coordinate2D(this.x1, this.y1);
  }

  /**
   * Get bottom-right corner
   */
  get bottomRight(): Coordinate2D {
    return new Coordinate2D(this.x2, this.y2);
  }

  /**
   * Check if a point is inside this geometry
   */
  containsPoint(x: number, y: number): boolean {
    return x >= this.x1 && x <= this.x2 && y >= this.y1 && y <= this.y2;
  }

  /**
   * Check if a Coordinate2D is inside this geometry
   */
  containsCoordinate(coord: Coordinate2D): boolean {
    return this.containsPoint(coord.x, coord.y);
  }

  /**
   * Check if center point of another geometry is inside this one
   */
  containsCenterOf(other: ZoneGeometry): boolean {
    const center = other.center;
    return this.containsCoordinate(center);
  }

  /**
   * Check if this geometry overlaps with another
   */
  overlapsWith(other: ZoneGeometry): boolean {
    return !(
      this.x2 < other.x1 ||
      this.x1 > other.x2 ||
      this.y2 < other.y1 ||
      this.y1 > other.y2
    );
  }

  /**
   * Check if this geometry is completely inside another
   */
  isInside(other: ZoneGeometry): boolean {
    return (
      this.x1 >= other.x1 &&
      this.x2 <= other.x2 &&
      this.y1 >= other.y1 &&
      this.y2 <= other.y2
    );
  }

  /**
   * Get intersection with another geometry
   */
  intersectionWith(other: ZoneGeometry): ZoneGeometry | null {
    const x1 = Math.max(this.x1, other.x1);
    const y1 = Math.max(this.y1, other.y1);
    const x2 = Math.min(this.x2, other.x2);
    const y2 = Math.min(this.y2, other.y2);

    if (x1 >= x2 || y1 >= y2) {
      return null; // No intersection
    }

    return new ZoneGeometry(x1, y1, x2, y2);
  }

  /**
   * Get the overlapping area with another geometry
   */
  overlappingAreaWith(other: ZoneGeometry): number {
    const intersection = this.intersectionWith(other);
    return intersection ? intersection.area : 0;
  }

  /**
   * Get overlap ratio (0-1) with another geometry
   */
  overlapRatioWith(other: ZoneGeometry): number {
    if (this.area === 0) return 0;
    return this.overlappingAreaWith(other) / this.area;
  }

  /**
   * Check if majority of this geometry is inside another
   */
  isMajorityInside(other: ZoneGeometry, threshold: number = 0.5): boolean {
    return this.overlapRatioWith(other) >= threshold;
  }

  /**
   * Check equality with another ZoneGeometry
   */
  equals(other: ZoneGeometry): boolean {
    return (
      this.x1 === other.x1 &&
      this.y1 === other.y1 &&
      this.x2 === other.x2 &&
      this.y2 === other.y2
    );
  }

  /**
   * Get as object
   */
  toObject(): { x1: number; y1: number; x2: number; y2: number } {
    return {
      x1: this.x1,
      y1: this.y1,
      x2: this.x2,
      y2: this.y2,
    };
  }

  /**
   * String representation
   */
  toString(): string {
    return `(${this.x1},${this.y1})-(${this.x2},${this.y2})`;
  }

  /**
   * JSON serialization
   */
  toJSON(): { x1: number; y1: number; x2: number; y2: number } {
    return this.toObject();
  }
}

/**
 * Parse zone geometry from coordinates
 */
export function parseZoneGeometry(x1: number, y1: number, x2: number, y2: number): ZoneGeometry {
  return ZoneGeometry.from(x1, y1, x2, y2);
}

/**
 * Parse zone geometry from position and size
 */
export function parseZoneGeometryFromPosition(
  x: number,
  y: number,
  width: number,
  height: number
): ZoneGeometry {
  return ZoneGeometry.fromPosition(x, y, width, height);
}

/**
 * Check if coordinates form valid geometry
 */
export function isValidZoneGeometry(x1: number, y1: number, x2: number, y2: number): boolean {
  return ZoneGeometry.isValid(x1, y1, x2, y2);
}
