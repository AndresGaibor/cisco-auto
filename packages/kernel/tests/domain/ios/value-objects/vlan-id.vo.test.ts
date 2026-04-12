import { test, expect, describe } from 'bun:test';
import { VlanId, VlanType, MIN_VLAN_ID, MAX_VLAN_ID, parseVlanId, parseOptionalVlanId, isValidVlanId } from '../../../../src/domain/ios/value-objects/vlan-id.vo.js';

describe('VlanId', () => {
  describe('constructor', () => {
    test('should create VlanId with valid values', () => {
      const vlan = new VlanId(1);
      expect(vlan.value).toBe(1);
      expect(vlan.type).toBe(VlanType.DEFAULT);
    });

    test('should classify DEFAULT VLAN (VLAN 1)', () => {
      const vlan = new VlanId(1);
      expect(vlan.type).toBe(VlanType.DEFAULT);
      expect(vlan.isDefault).toBe(true);
      expect(vlan.isConfigurable).toBe(false);
    });

    test('should classify NORMAL VLANs (2-1001)', () => {
      const vlan = new VlanId(100);
      expect(vlan.type).toBe(VlanType.NORMAL);
      expect(vlan.isNormal).toBe(true);
      expect(vlan.isConfigurable).toBe(true);
    });

    test('should classify RESERVED VLANs (1002-1005)', () => {
      const vlan = new VlanId(1002);
      expect(vlan.type).toBe(VlanType.RESERVED);
      expect(vlan.isReserved).toBe(true);
    });

    test('should classify EXTENDED VLANs (1006-4094)', () => {
      const vlan = new VlanId(2000);
      expect(vlan.type).toBe(VlanType.EXTENDED);
      expect(vlan.isExtended).toBe(true);
      expect(vlan.isConfigurable).toBe(true);
    });

    test('should throw for non-integer values', () => {
      expect(() => new VlanId(1.5)).toThrow('must be an integer');
    });

    test('should throw for values below MIN_VLAN_ID', () => {
      expect(() => new VlanId(0)).toThrow(`must be between ${MIN_VLAN_ID} and ${MAX_VLAN_ID}`);
    });

    test('should throw for values above MAX_VLAN_ID', () => {
      expect(() => new VlanId(4095)).toThrow(`must be between ${MIN_VLAN_ID} and ${MAX_VLAN_ID}`);
    });
  });

  describe('static methods', () => {
    test('from() should create VlanId from number', () => {
      const vlan = VlanId.from(100);
      expect(vlan.value).toBe(100);
    });

    test('fromString() should create VlanId from string', () => {
      const vlan = VlanId.fromString('100');
      expect(vlan.value).toBe(100);
    });

    test('fromString() should throw for invalid string', () => {
      expect(() => VlanId.fromString('invalid')).toThrow('is not a valid number');
    });

    test('tryFrom() should return VlanId for valid values', () => {
      const vlan = VlanId.tryFrom(100);
      expect(vlan).not.toBeNull();
      expect(vlan?.value).toBe(100);
    });

    test('tryFrom() should return null for invalid values', () => {
      expect(VlanId.tryFrom(0)).toBeNull();
      expect(VlanId.tryFrom(5000)).toBeNull();
      expect(VlanId.tryFrom('invalid')).toBeNull();
    });

    test('isValid() should return true for valid values', () => {
      expect(VlanId.isValid(1)).toBe(true);
      expect(VlanId.isValid(100)).toBe(true);
      expect(VlanId.isValid(4094)).toBe(true);
    });

    test('isValid() should return false for invalid values', () => {
      expect(VlanId.isValid(0)).toBe(false);
      expect(VlanId.isValid(4095)).toBe(false);
      expect(VlanId.isValid('invalid')).toBe(false);
    });
  });

  describe('equality and comparison', () => {
    test('equals() should return true for same values', () => {
      const vlan1 = new VlanId(100);
      const vlan2 = new VlanId(100);
      expect(vlan1.equals(vlan2)).toBe(true);
    });

    test('equals() should return false for different values', () => {
      const vlan1 = new VlanId(100);
      const vlan2 = new VlanId(200);
      expect(vlan1.equals(vlan2)).toBe(false);
    });

    test('compareTo() should compare VLAN IDs correctly', () => {
      const vlan1 = new VlanId(100);
      const vlan2 = new VlanId(200);
      expect(vlan1.compareTo(vlan2)).toBeLessThan(0);
      expect(vlan2.compareTo(vlan1)).toBeGreaterThan(0);
    });
  });

  describe('serialization', () => {
    test('toNumber() should return numeric value', () => {
      const vlan = new VlanId(100);
      expect(vlan.toNumber()).toBe(100);
    });

    test('toString() should return string representation', () => {
      const vlan = new VlanId(100);
      expect(vlan.toString()).toBe('100');
    });

    test('toJSON() should return number for JSON serialization', () => {
      const vlan = new VlanId(100);
      expect(vlan.toJSON()).toBe(100);
    });
  });
});

describe('parseVlanId', () => {
  test('should parse number value', () => {
    const vlan = parseVlanId(100);
    expect(vlan.value).toBe(100);
  });

  test('should parse string value', () => {
    const vlan = parseVlanId('100');
    expect(vlan.value).toBe(100);
  });
});

describe('parseOptionalVlanId', () => {
  test('should return undefined for null', () => {
    expect(parseOptionalVlanId(null)).toBeUndefined();
  });

  test('should return undefined for undefined', () => {
    expect(parseOptionalVlanId(undefined)).toBeUndefined();
  });

  test('should return VlanId for valid values', () => {
    const vlan = parseOptionalVlanId(100);
    expect(vlan?.value).toBe(100);
  });
});

describe('isValidVlanId', () => {
  test('should return true for valid VLAN IDs', () => {
    expect(isValidVlanId(1)).toBe(true);
    expect(isValidVlanId(100)).toBe(true);
    expect(isValidVlanId('100')).toBe(true);
  });

  test('should return false for invalid VLAN IDs', () => {
    expect(isValidVlanId(0)).toBe(false);
    expect(isValidVlanId(4095)).toBe(false);
    expect(isValidVlanId('invalid')).toBe(false);
  });
});