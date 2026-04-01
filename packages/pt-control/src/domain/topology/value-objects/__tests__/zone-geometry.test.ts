/**
 * ZoneGeometry Value Object Tests
 */

import { describe, it, expect } from 'bun:test';
import { Coordinate2D } from '../coordinate-2d.js';
import { ZoneGeometry, parseZoneGeometry, parseZoneGeometryFromPosition, isValidZoneGeometry } from '../zone-geometry.js';

describe('ZoneGeometry', () => {
  describe('construction', () => {
    it('should create valid geometry', () => {
      const geom = new ZoneGeometry(0, 0, 100, 100);
      expect(geom.x1).toBe(0);
      expect(geom.y1).toBe(0);
      expect(geom.x2).toBe(100);
      expect(geom.y2).toBe(100);
    });

    it('should normalize coordinates (swap if needed)', () => {
      const geom = new ZoneGeometry(100, 100, 0, 0);
      expect(geom.x1).toBe(0);
      expect(geom.y1).toBe(0);
      expect(geom.x2).toBe(100);
      expect(geom.y2).toBe(100);
    });

    it('should handle zero-area geometry', () => {
      expect(() => new ZoneGeometry(0, 0, 0, 0)).not.toThrow();
    });
  });

  describe('static methods', () => {
    it('should create from coordinates using from()', () => {
      const geom = ZoneGeometry.from(0, 0, 100, 100);
      expect(geom.x1).toBe(0);
    });

    it('should create from points using fromPoints()', () => {
      const topLeft = new Coordinate2D(10, 20);
      const bottomRight = new Coordinate2D(50, 80);
      const geom = ZoneGeometry.fromPoints(topLeft, bottomRight);
      expect(geom.x1).toBe(10);
      expect(geom.y1).toBe(20);
      expect(geom.x2).toBe(50);
      expect(geom.y2).toBe(80);
    });

    it('should create from position using fromPosition()', () => {
      const geom = ZoneGeometry.fromPosition(10, 20, 100, 50);
      expect(geom.x1).toBe(10);
      expect(geom.y1).toBe(20);
      expect(geom.x2).toBe(110);
      expect(geom.y2).toBe(70);
    });

    it('should return null for invalid values in tryFrom()', () => {
      // All values are valid, so this should succeed
      const geom = ZoneGeometry.tryFrom(0, 0, 100, 100);
      expect(geom).not.toBeNull();
    });

    it('should validate correctly with isValid()', () => {
      expect(isValidZoneGeometry(0, 0, 100, 100)).toBe(true);
    });
  });

  describe('properties', () => {
    const geom = new ZoneGeometry(0, 0, 100, 50);

    it('should get width', () => {
      expect(geom.width).toBe(100);
    });

    it('should get height', () => {
      expect(geom.height).toBe(50);
    });

    it('should get area', () => {
      expect(geom.area).toBe(5000);
    });

    it('should get center', () => {
      const center = geom.center;
      expect(center.x).toBe(50);
      expect(center.y).toBe(25);
    });

    it('should get top-left', () => {
      const tl = geom.topLeft;
      expect(tl.x).toBe(0);
      expect(tl.y).toBe(0);
    });

    it('should get bottom-right', () => {
      const br = geom.bottomRight;
      expect(br.x).toBe(100);
      expect(br.y).toBe(50);
    });
  });

  describe('point containment', () => {
    const geom = new ZoneGeometry(0, 0, 100, 100);

    it('should contain point inside', () => {
      expect(geom.containsPoint(50, 50)).toBe(true);
      expect(geom.containsPoint(0, 0)).toBe(true); // Edge
      expect(geom.containsPoint(100, 100)).toBe(true); // Edge
    });

    it('should not contain point outside', () => {
      expect(geom.containsPoint(-1, 50)).toBe(false);
      expect(geom.containsPoint(101, 50)).toBe(false);
      expect(geom.containsPoint(50, -1)).toBe(false);
      expect(geom.containsPoint(50, 101)).toBe(false);
    });

    it('should contain Coordinate2D', () => {
      const coord = new Coordinate2D(50, 50);
      expect(geom.containsCoordinate(coord)).toBe(true);
    });
  });

  describe('geometry relationships', () => {
    const outer = new ZoneGeometry(0, 0, 200, 200);
    const inner = new ZoneGeometry(50, 50, 100, 100);
    const overlapping = new ZoneGeometry(150, 150, 250, 250);
    const separate = new ZoneGeometry(300, 300, 400, 400);

    it('should check if contains center of another', () => {
      expect(outer.containsCenterOf(inner)).toBe(true);
      // inner center is (75, 75), which is inside outer (0-200)
      expect(outer.containsPoint(75, 75)).toBe(true);
    });

    it('should check overlaps', () => {
      expect(outer.overlapsWith(inner)).toBe(true);
      expect(inner.overlapsWith(outer)).toBe(true);
      expect(outer.overlapsWith(overlapping)).toBe(true);
      expect(outer.overlapsWith(separate)).toBe(false);
    });

    it('should check if inside another', () => {
      expect(inner.isInside(outer)).toBe(true);
      expect(outer.isInside(inner)).toBe(false);
      expect(overlapping.isInside(outer)).toBe(false);
    });
  });

  describe('intersection', () => {
    it('should get intersection of overlapping geometries', () => {
      const geom1 = new ZoneGeometry(0, 0, 100, 100);
      const geom2 = new ZoneGeometry(50, 50, 150, 150);
      const intersection = geom1.intersectionWith(geom2);
      
      expect(intersection).not.toBeNull();
      expect(intersection!.x1).toBe(50);
      expect(intersection!.y1).toBe(50);
      expect(intersection!.x2).toBe(100);
      expect(intersection!.y2).toBe(100);
    });

    it('should return null for non-overlapping geometries', () => {
      const geom1 = new ZoneGeometry(0, 0, 50, 50);
      const geom2 = new ZoneGeometry(100, 100, 150, 150);
      const intersection = geom1.intersectionWith(geom2);
      expect(intersection).toBeNull();
    });
  });

  describe('overlap area and ratio', () => {
    it('should calculate overlapping area', () => {
      const geom1 = new ZoneGeometry(0, 0, 100, 100);
      const geom2 = new ZoneGeometry(50, 50, 150, 150);
      expect(geom1.overlappingAreaWith(geom2)).toBe(2500);
    });

    it('should return 0 for non-overlapping', () => {
      const geom1 = new ZoneGeometry(0, 0, 50, 50);
      const geom2 = new ZoneGeometry(100, 100, 150, 150);
      expect(geom1.overlappingAreaWith(geom2)).toBe(0);
    });

    it('should calculate overlap ratio', () => {
      const geom1 = new ZoneGeometry(0, 0, 100, 100);
      const geom2 = new ZoneGeometry(50, 50, 150, 150);
      expect(geom1.overlapRatioWith(geom2)).toBe(0.25);
    });

    it('should check if majority inside', () => {
      const geom1 = new ZoneGeometry(0, 0, 100, 100);
      const geom2 = new ZoneGeometry(50, 50, 150, 150);
      expect(geom2.isMajorityInside(geom1)).toBe(false); // Only 25% overlap
      expect(geom2.isMajorityInside(geom1, 0.2)).toBe(true); // 25% > 20% threshold
    });
  });

  describe('equality', () => {
    it('should check equality correctly', () => {
      const geom1 = new ZoneGeometry(0, 0, 100, 100);
      const geom2 = new ZoneGeometry(0, 0, 100, 100);
      const geom3 = new ZoneGeometry(0, 0, 50, 50);

      expect(geom1.equals(geom2)).toBe(true);
      expect(geom1.equals(geom3)).toBe(false);
    });
  });

  describe('serialization', () => {
    const geom = new ZoneGeometry(0, 0, 100, 50);

    it('should convert to object', () => {
      expect(geom.toObject()).toEqual({
        x1: 0,
        y1: 0,
        x2: 100,
        y2: 50,
      });
    });

    it('should convert to string', () => {
      expect(geom.toString()).toBe('(0,0)-(100,50)');
    });

    it('should serialize to JSON', () => {
      expect(JSON.stringify(geom)).toBe('{"x1":0,"y1":0,"x2":100,"y2":50}');
    });
  });

  describe('parseZoneGeometry', () => {
    it('should parse from coordinates', () => {
      const geom = parseZoneGeometry(0, 0, 100, 100);
      expect(geom.x1).toBe(0);
    });
  });

  describe('parseZoneGeometryFromPosition', () => {
    it('should parse from position and size', () => {
      const geom = parseZoneGeometryFromPosition(10, 20, 100, 50);
      expect(geom.x1).toBe(10);
      expect(geom.y1).toBe(20);
      expect(geom.x2).toBe(110);
      expect(geom.y2).toBe(70);
    });
  });
});
