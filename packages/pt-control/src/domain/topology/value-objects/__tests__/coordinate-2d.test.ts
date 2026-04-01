/**
 * Coordinate2D Value Object Tests
 */

import { describe, it, expect } from 'bun:test';
import { Coordinate2D, parseCoordinate2D, parseCoordinate2DObject, isValidCoordinate2D } from '../coordinate-2d.js';

describe('Coordinate2D', () => {
  describe('construction', () => {
    it('should create valid coordinates', () => {
      expect(() => new Coordinate2D(0, 0)).not.toThrow();
      expect(() => new Coordinate2D(100, 200)).not.toThrow();
      expect(() => new Coordinate2D(-50.5, 75.25)).not.toThrow();
    });

    it('should round to 2 decimal places', () => {
      const coord = new Coordinate2D(100.123456, 200.987654);
      expect(coord.x).toBe(100.12);
      expect(coord.y).toBe(200.99);
    });

    it('should reject non-finite numbers', () => {
      expect(() => new Coordinate2D(Infinity, 0)).toThrow();
      expect(() => new Coordinate2D(NaN, 0)).toThrow();
    });

    it('should reject coordinates out of range', () => {
      expect(() => new Coordinate2D(-100001, 0)).toThrow();
      expect(() => new Coordinate2D(100001, 0)).toThrow();
      expect(() => new Coordinate2D(0, -100001)).toThrow();
      expect(() => new Coordinate2D(0, 100001)).toThrow();
    });

    it('should accept coordinates at range limits', () => {
      expect(() => new Coordinate2D(-100000, -100000)).not.toThrow();
      expect(() => new Coordinate2D(100000, 100000)).not.toThrow();
    });
  });

  describe('static methods', () => {
    it('should create from x and y using from()', () => {
      const coord = Coordinate2D.from(100, 200);
      expect(coord.x).toBe(100);
      expect(coord.y).toBe(200);
    });

    it('should create from object using fromObject()', () => {
      const coord = Coordinate2D.fromObject({ x: 100, y: 200 });
      expect(coord.x).toBe(100);
      expect(coord.y).toBe(200);
    });

    it('should return null for invalid values in tryFrom()', () => {
      expect(Coordinate2D.tryFrom(Infinity, 0)).toBeNull();
      expect(Coordinate2D.tryFrom(-100001, 0)).toBeNull();
    });

    it('should return null for invalid object in tryFromObject()', () => {
      expect(Coordinate2D.tryFromObject({ x: Infinity, y: 0 })).toBeNull();
    });

    it('should validate correctly with isValid()', () => {
      expect(isValidCoordinate2D(100, 200)).toBe(true);
      expect(isValidCoordinate2D(Infinity, 0)).toBe(false);
      expect(isValidCoordinate2D(-100001, 0)).toBe(false);
    });
  });

  describe('vector operations', () => {
    it('should add coordinates', () => {
      const c1 = new Coordinate2D(10, 20);
      const c2 = new Coordinate2D(5, 3);
      const result = c1.add(c2);
      expect(result.x).toBe(15);
      expect(result.y).toBe(23);
    });

    it('should subtract coordinates', () => {
      const c1 = new Coordinate2D(10, 20);
      const c2 = new Coordinate2D(5, 3);
      const result = c1.subtract(c2);
      expect(result.x).toBe(5);
      expect(result.y).toBe(17);
    });

    it('should scale coordinates', () => {
      const coord = new Coordinate2D(10, 20);
      const result = coord.scale(2);
      expect(result.x).toBe(20);
      expect(result.y).toBe(40);
    });
  });

  describe('distance calculations', () => {
    it('should calculate distance to another coordinate', () => {
      const c1 = new Coordinate2D(0, 0);
      const c2 = new Coordinate2D(3, 4);
      expect(c1.distanceTo(c2)).toBe(5);
    });

    it('should calculate squared distance', () => {
      const c1 = new Coordinate2D(0, 0);
      const c2 = new Coordinate2D(3, 4);
      expect(c1.distanceSquaredTo(c2)).toBe(25);
    });

    it('should return 0 distance for same point', () => {
      const c1 = new Coordinate2D(10, 20);
      const c2 = new Coordinate2D(10, 20);
      expect(c1.distanceTo(c2)).toBe(0);
    });
  });

  describe('equality and bounds', () => {
    it('should check equality correctly', () => {
      const c1 = new Coordinate2D(10, 20);
      const c2 = new Coordinate2D(10, 20);
      const c3 = new Coordinate2D(10, 21);

      expect(c1.equals(c2)).toBe(true);
      expect(c1.equals(c3)).toBe(false);
    });

    it('should check if within bounds', () => {
      const coord = new Coordinate2D(50, 50);
      expect(coord.isWithinBounds(0, 0, 100, 100)).toBe(true);
      expect(coord.isWithinBounds(60, 0, 100, 100)).toBe(false);
    });
  });

  describe('midpoint', () => {
    it('should calculate midpoint', () => {
      const c1 = new Coordinate2D(0, 0);
      const c2 = new Coordinate2D(10, 10);
      const midpoint = c1.midpoint(c2);
      expect(midpoint.x).toBe(5);
      expect(midpoint.y).toBe(5);
    });
  });

  describe('serialization', () => {
    it('should convert to string', () => {
      const coord = new Coordinate2D(100, 200);
      expect(coord.toString()).toBe('(100, 200)');
    });

    it('should convert to object', () => {
      const coord = new Coordinate2D(100, 200);
      expect(coord.toObject()).toEqual({ x: 100, y: 200 });
    });

    it('should serialize to JSON', () => {
      const coord = new Coordinate2D(100, 200);
      expect(JSON.stringify(coord)).toBe('{"x":100,"y":200}');
    });
  });

  describe('parseCoordinate2D', () => {
    it('should parse from x and y', () => {
      const coord = parseCoordinate2D(100, 200);
      expect(coord.x).toBe(100);
      expect(coord.y).toBe(200);
    });
  });

  describe('parseCoordinate2DObject', () => {
    it('should parse from object', () => {
      const coord = parseCoordinate2DObject({ x: 100, y: 200 });
      expect(coord.x).toBe(100);
      expect(coord.y).toBe(200);
    });
  });
});
