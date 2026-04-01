/**
 * VlanRange Value Object Tests
 */

import { describe, it, expect } from 'bun:test';
import { VlanId } from '../../src/value-objects/vlan-id.js';
import { VlanRange, parseVlanRange, isValidVlanRange } from '../../src/value-objects/vlan-range.js';

describe('VlanRange', () => {
  describe('construction', () => {
    it('should create from array of numbers', () => {
      const range = new VlanRange([10, 20, 30]);
      expect(range.vlans.length).toBe(3);
      expect(range.toNumbers()).toEqual([10, 20, 30]);
    });

    it('should create from array of strings', () => {
      const range = new VlanRange(['10', '20', '30']);
      expect(range.toNumbers()).toEqual([10, 20, 30]);
    });

    it('should create from array of VlanId objects', () => {
      const vlans = [new VlanId(10), new VlanId(20), new VlanId(30)];
      const range = new VlanRange(vlans);
      expect(range.toNumbers()).toEqual([10, 20, 30]);
    });

    it('should create from mixed array', () => {
      const range = new VlanRange([10, '20', new VlanId(30)]);
      expect(range.toNumbers()).toEqual([10, 20, 30]);
    });

    it('should reject empty arrays', () => {
      expect(() => new VlanRange([])).toThrow('VlanRange requires at least one VLAN ID');
    });

    it('should reject invalid VLAN IDs', () => {
      expect(() => new VlanRange([0])).toThrow();
      expect(() => new VlanRange([5000])).toThrow();
    });
  });

  describe('sorting and deduplication', () => {
    it('should sort by default', () => {
      const range = new VlanRange([30, 10, 20]);
      expect(range.toNumbers()).toEqual([10, 20, 30]);
      expect(range.sorted).toBe(true);
    });

    it('should disable sorting', () => {
      const range = new VlanRange([30, 10, 20], { sort: false });
      expect(range.toNumbers()).toEqual([30, 10, 20]);
      expect(range.sorted).toBe(false);
    });

    it('should deduplicate by default', () => {
      const range = new VlanRange([10, 20, 10, 30, 20]);
      expect(range.toNumbers()).toEqual([10, 20, 30]);
      expect(range.unique).toBe(true);
    });

    it('should disable deduplication', () => {
      const range = new VlanRange([10, 20, 10], { unique: false, sort: false });
      expect(range.toNumbers()).toEqual([10, 20, 10]);
      expect(range.unique).toBe(false);
    });
  });

  describe('fromString', () => {
    it('should parse single VLAN ID', () => {
      const range = VlanRange.fromString('10');
      expect(range.toNumbers()).toEqual([10]);
    });

    it('should parse comma-separated list', () => {
      const range = VlanRange.fromString('10,20,30');
      expect(range.toNumbers()).toEqual([10, 20, 30]);
    });

    it('should parse ranges', () => {
      const range = VlanRange.fromString('10-20');
      expect(range.toNumbers()).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    });

    it('should parse mixed format', () => {
      const range = VlanRange.fromString('10,20-30,40');
      expect(range.toNumbers()).toEqual([10, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 40]);
    });

    it('should handle spaces', () => {
      const range = VlanRange.fromString('10, 20 , 30');
      expect(range.toNumbers()).toEqual([10, 20, 30]);
    });

    it('should reject invalid ranges', () => {
      expect(() => VlanRange.fromString('20-10')).toThrow();
    });

    it('should reject invalid VLAN IDs in string', () => {
      expect(() => VlanRange.fromString('abc')).toThrow();
      expect(() => VlanRange.fromString('0')).toThrow();
    });
  });

  describe('tryFrom', () => {
    it('should return null for invalid input', () => {
      expect(VlanRange.tryFrom([])).toBeNull();
      expect(VlanRange.tryFrom([0])).toBeNull();
      expect(VlanRange.tryFrom('20-10')).toBeNull();
    });

    it('should return VlanRange for valid input', () => {
      const range = VlanRange.tryFrom([10, 20, 30]);
      expect(range).not.toBeNull();
      expect(range!.toNumbers()).toEqual([10, 20, 30]);
    });
  });

  describe('contains', () => {
    it('should check if contains VLAN ID', () => {
      const range = new VlanRange([10, 20, 30]);
      expect(range.contains(10)).toBe(true);
      expect(range.contains(15)).toBe(false);
    });

    it('should check if contains VlanId', () => {
      const range = new VlanRange([10, 20, 30]);
      expect(range.contains(new VlanId(10))).toBe(true);
      expect(range.contains(new VlanId(15))).toBe(false);
    });

    it('should check if contains all from another range', () => {
      const range1 = new VlanRange([10, 20, 30, 40]);
      const range2 = new VlanRange([10, 20]);
      const range3 = new VlanRange([10, 50]);

      expect(range1.containsAll(range2)).toBe(true);
      expect(range1.containsAll(range3)).toBe(false);
    });
  });

  describe('add and remove', () => {
    it('should add VLAN ID', () => {
      const range = new VlanRange([10, 20]);
      const newRange = range.add(30);
      expect(range.toNumbers()).toEqual([10, 20]); // Original unchanged
      expect(newRange.toNumbers()).toEqual([10, 20, 30]);
    });

    it('should remove VLAN ID', () => {
      const range = new VlanRange([10, 20, 30]);
      const newRange = range.remove(20);
      expect(range.toNumbers()).toEqual([10, 20, 30]); // Original unchanged
      expect(newRange.toNumbers()).toEqual([10, 30]);
    });

    it('should throw when removing last VLAN', () => {
      const range = new VlanRange([10]);
      expect(() => range.remove(10)).toThrow('Cannot remove all VLANs from VlanRange');
    });
  });

  describe('properties', () => {
    it('should return size', () => {
      expect(new VlanRange([10, 20, 30]).size).toBe(3);
    });

    it('should return min', () => {
      expect(new VlanRange([30, 10, 20]).min).toBe(10);
    });

    it('should return max', () => {
      expect(new VlanRange([30, 10, 20]).max).toBe(30);
    });
  });

  describe('toCompressedString', () => {
    it('should compress consecutive VLANs', () => {
      const range = new VlanRange([1, 2, 3, 4, 5, 10, 20, 21, 22, 30]);
      expect(range.toCompressedString()).toBe('1-5,10,20-22,30');
    });

    it('should return single VLANs without range', () => {
      const range = new VlanRange([10, 20, 30]);
      expect(range.toCompressedString()).toBe('10,20,30');
    });

    it('should return empty string for empty range', () => {
      // This case shouldn't happen due to constructor validation
      // But testing edge case
      const range = new VlanRange([10]);
      expect(range.toCompressedString()).toBe('10');
    });
  });

  describe('equality', () => {
    it('should check equality correctly', () => {
      const range1 = new VlanRange([10, 20, 30]);
      const range2 = new VlanRange([10, 20, 30]);
      const range3 = new VlanRange([10, 20]);

      expect(range1.equals(range2)).toBe(true);
      expect(range1.equals(range3)).toBe(false);
    });
  });

  describe('serialization', () => {
    it('should convert to string', () => {
      const range = new VlanRange([10, 20, 30]);
      expect(range.toString()).toBe('10,20,30');
    });

    it('should serialize to JSON', () => {
      const range = new VlanRange([10, 20, 30]);
      expect(JSON.stringify(range)).toBe('[10,20,30]');
    });
  });

  describe('iteration', () => {
    it('should be iterable', () => {
      const range = new VlanRange([10, 20, 30]);
      const values = [...range].map(v => v.value);
      expect(values).toEqual([10, 20, 30]);
    });
  });

  describe('parseVlanRange', () => {
    it('should parse array', () => {
      const range = parseVlanRange([10, 20, 30]);
      expect(range.toNumbers()).toEqual([10, 20, 30]);
    });

    it('should parse string', () => {
      const range = parseVlanRange('10,20-30');
      expect(range.toNumbers()).toEqual([10, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30]);
    });
  });

  describe('isValidVlanRange', () => {
    it('should validate array', () => {
      expect(isValidVlanRange([10, 20, 30])).toBe(true);
      expect(isValidVlanRange([0])).toBe(false);
    });

    it('should validate string', () => {
      expect(isValidVlanRange('10,20-30')).toBe(true);
      expect(isValidVlanRange('20-10')).toBe(false);
    });
  });
});
