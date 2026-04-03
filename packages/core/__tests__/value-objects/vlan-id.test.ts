/**
 * VlanId Value Object Tests
 */

import { describe, it, expect } from 'bun:test';
import { VlanId, VlanType, parseVlanId, isValidVlanId, parseOptionalVlanId } from '../../src/value-objects/vlan-id';

describe('VlanId', () => {
  describe('construction', () => {
    it('should create valid VLAN IDs', () => {
      expect(() => new VlanId(1)).not.toThrow();
      expect(() => new VlanId(10)).not.toThrow();
      expect(() => new VlanId(100)).not.toThrow();
      expect(() => new VlanId(1000)).not.toThrow();
      expect(() => new VlanId(4094)).not.toThrow();
    });

    it('should reject VLAN ID 0', () => {
      expect(() => new VlanId(0)).toThrow('VLAN ID must be between 1 and 4094');
    });

    it('should reject VLAN ID > 4094', () => {
      expect(() => new VlanId(4095)).toThrow('VLAN ID must be between 1 and 4094');
      expect(() => new VlanId(5000)).toThrow('VLAN ID must be between 1 and 4094');
    });

    it('should reject non-integer values', () => {
      expect(() => new VlanId(10.5)).toThrow('VLAN ID must be an integer');
      expect(() => new VlanId(NaN)).toThrow('VLAN ID must be an integer');
    });

    it('should reject negative values', () => {
      expect(() => new VlanId(-1)).toThrow('VLAN ID must be between 1 and 4094');
    });
  });

  describe('static methods', () => {
    it('should create from number using from()', () => {
      const vlan = VlanId.from(10);
      expect(vlan.value).toBe(10);
    });

    it('should create from string using fromString()', () => {
      const vlan = VlanId.fromString('10');
      expect(vlan.value).toBe(10);
    });

    it('should reject invalid string in fromString()', () => {
      expect(() => VlanId.fromString('abc')).toThrow();
    });

    it('should return null for invalid values in tryFrom()', () => {
      expect(VlanId.tryFrom(0)).toBeNull();
      expect(VlanId.tryFrom(5000)).toBeNull();
      expect(VlanId.tryFrom('abc')).toBeNull();
    });

    it('should return VlanId for valid values in tryFrom()', () => {
      const vlan = VlanId.tryFrom(10);
      expect(vlan).not.toBeNull();
      expect(vlan!.value).toBe(10);
    });

    it('should validate correctly with isValid()', () => {
      expect(VlanId.isValid(10)).toBe(true);
      expect(VlanId.isValid(0)).toBe(false);
      expect(VlanId.isValid(5000)).toBe(false);
      expect(VlanId.isValid('10')).toBe(true);
      expect(VlanId.isValid('abc')).toBe(false);
    });
  });

  describe('VLAN classification', () => {
    it('should classify VLAN 1 as DEFAULT', () => {
      const vlan = new VlanId(1);
      expect(vlan.type).toBe(VlanType.DEFAULT);
      expect(vlan.isDefault).toBe(true);
      expect(vlan.isReserved).toBe(false);
    });

    it('should classify VLANs 2-1001 as NORMAL', () => {
      expect(new VlanId(2).type).toBe(VlanType.NORMAL);
      expect(new VlanId(100).type).toBe(VlanType.NORMAL);
      expect(new VlanId(1000).type).toBe(VlanType.NORMAL);
      expect(new VlanId(1001).type).toBe(VlanType.NORMAL);
    });

    it('should classify VLANs 1002-1005 as RESERVED', () => {
      expect(new VlanId(1002).type).toBe(VlanType.RESERVED);
      expect(new VlanId(1003).type).toBe(VlanType.RESERVED);
      expect(new VlanId(1005).type).toBe(VlanType.RESERVED);
    });

    it('should classify VLANs 1006-4094 as EXTENDED', () => {
      expect(new VlanId(1006).type).toBe(VlanType.EXTENDED);
      expect(new VlanId(2000).type).toBe(VlanType.EXTENDED);
      expect(new VlanId(4094).type).toBe(VlanType.EXTENDED);
    });
  });

  describe('type guards', () => {
    it('should identify reserved VLANs', () => {
      expect(new VlanId(1).isReserved).toBe(false); // DEFAULT, not RESERVED
      expect(new VlanId(1002).isReserved).toBe(true);
      expect(new VlanId(1005).isReserved).toBe(true);
      expect(new VlanId(10).isReserved).toBe(false);
    });

    it('should identify normal VLANs', () => {
      expect(new VlanId(10).isNormal).toBe(true);
      expect(new VlanId(1).isNormal).toBe(false);
      expect(new VlanId(1002).isNormal).toBe(false);
      expect(new VlanId(2000).isNormal).toBe(false);
    });

    it('should identify extended VLANs', () => {
      expect(new VlanId(2000).isExtended).toBe(true);
      expect(new VlanId(4094).isExtended).toBe(true);
      expect(new VlanId(100).isExtended).toBe(false);
    });

    it('should identify configurable VLANs', () => {
      expect(new VlanId(10).isConfigurable).toBe(true);
      expect(new VlanId(2000).isConfigurable).toBe(true);
      expect(new VlanId(1).isConfigurable).toBe(false);
      expect(new VlanId(1002).isConfigurable).toBe(false);
    });
  });

  describe('equality and comparison', () => {
    it('should check equality correctly', () => {
      const vlan1 = new VlanId(10);
      const vlan2 = new VlanId(10);
      const vlan3 = new VlanId(20);

      expect(vlan1.equals(vlan2)).toBe(true);
      expect(vlan1.equals(vlan3)).toBe(false);
    });

    it('should compare for sorting', () => {
      expect(new VlanId(10).compareTo(new VlanId(20))).toBe(-10);
      expect(new VlanId(20).compareTo(new VlanId(10))).toBe(10);
      expect(new VlanId(10).compareTo(new VlanId(10))).toBe(0);
    });
  });

  describe('serialization', () => {
    it('should convert to number', () => {
      expect(new VlanId(10).toNumber()).toBe(10);
    });

    it('should convert to string', () => {
      expect(new VlanId(10).toString()).toBe('10');
    });

    it('should serialize to JSON', () => {
      expect(JSON.stringify(new VlanId(10))).toBe('10');
    });
  });

  describe('parseVlanId', () => {
    it('should parse number', () => {
      const vlan = parseVlanId(10);
      expect(vlan.value).toBe(10);
    });

    it('should parse string', () => {
      const vlan = parseVlanId('10');
      expect(vlan.value).toBe(10);
    });
  });

  describe('parseOptionalVlanId', () => {
    it('should return undefined for null', () => {
      expect(parseOptionalVlanId(null)).toBeUndefined();
    });

    it('should return undefined for undefined', () => {
      expect(parseOptionalVlanId(undefined)).toBeUndefined();
    });

    it('should parse number', () => {
      expect(parseOptionalVlanId(10)!.value).toBe(10);
    });

    it('should parse string', () => {
      expect(parseOptionalVlanId('10')!.value).toBe(10);
    });
  });

  describe('isValidVlanId', () => {
    it('should return true for valid VLAN IDs', () => {
      expect(isValidVlanId(10)).toBe(true);
      expect(isValidVlanId('10')).toBe(true);
    });

    it('should return false for invalid VLAN IDs', () => {
      expect(isValidVlanId(0)).toBe(false);
      expect(isValidVlanId(5000)).toBe(false);
      expect(isValidVlanId('abc')).toBe(false);
    });
  });
});
