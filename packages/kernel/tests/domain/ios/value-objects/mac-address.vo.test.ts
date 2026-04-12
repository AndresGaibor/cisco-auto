import { test, expect, describe } from 'bun:test';
import { MacAddress, MacFormat, parseMacAddress, isValidMacAddress } from '../../../../src/domain/ios/value-objects/mac-address.vo.js';

describe('MacAddress', () => {
  describe('constructor', () => {
    test('should create valid MAC addresses', () => {
      const mac = new MacAddress('AA:BB:CC:DD:EE:FF');
      expect(mac.value).toBe('AA:BB:CC:DD:EE:FF');
    });

    test('should accept different formats', () => {
      expect(() => new MacAddress('AABB.CCDD.EEFF')).not.toThrow(); // Cisco
      expect(() => new MacAddress('AA:BB:CC:DD:EE:FF')).not.toThrow(); // Colon
      expect(() => new MacAddress('AA-BB-CC-DD-EE-FF')).not.toThrow(); // Hyphen
      expect(() => new MacAddress('AABBCCDDEEFF')).not.toThrow(); // Bare
    });

    test('should normalize to uppercase', () => {
      const mac = new MacAddress('aa:bb:cc:dd:ee:ff');
      expect(mac.value).toBe('AA:BB:CC:DD:EE:FF');
    });

    test('should trim whitespace', () => {
      const mac = new MacAddress('  AA:BB:CC:DD:EE:FF  ');
      expect(mac.value).toBe('AA:BB:CC:DD:EE:FF');
    });

    test('should throw for invalid MAC addresses', () => {
      expect(() => new MacAddress('invalid')).toThrow('must be in Cisco');
      expect(() => new MacAddress('AA:BB:CC')).toThrow('must be in Cisco');
      expect(() => new MacAddress('AA:BB:CC:DD:EE:FF:GG')).toThrow('must be in Cisco');
    });
  });

  describe('format conversion', () => {
    const testMac = 'AA:BB:CC:DD:EE:FF';

    test('toCiscoFormat() should return Cisco format', () => {
      const mac = new MacAddress(testMac);
      expect(mac.toCiscoFormat()).toBe('AABB.CCDD.EEFF');
    });

    test('toColonFormat() should return colon format', () => {
      const mac = new MacAddress(testMac);
      expect(mac.toColonFormat()).toBe('AA:BB:CC:DD:EE:FF');
    });

    test('toHyphenFormat() should return hyphen format', () => {
      const mac = new MacAddress(testMac);
      expect(mac.toHyphenFormat()).toBe('AA-BB-CC-DD-EE-FF');
    });

    test('toBareFormat() should return bare format', () => {
      const mac = new MacAddress(testMac);
      expect(mac.toBareFormat()).toBe('AABBCCDDEEFF');
    });
  });

  describe('properties', () => {
    test('should return octets', () => {
      const mac = new MacAddress('AA:BB:CC:DD:EE:FF');
      expect(mac.octets).toEqual([170, 187, 204, 221, 238, 255]);
    });

    test('should return OUI', () => {
      const mac = new MacAddress('AA:BB:CC:DD:EE:FF');
      expect(mac.oui).toBe('AA:BB:CC');
    });

    test('should return NIC', () => {
      const mac = new MacAddress('AA:BB:CC:DD:EE:FF');
      expect(mac.nic).toBe('DD:EE:FF');
    });
  });

  describe('address classification', () => {
    test('should identify unicast addresses', () => {
      const mac = new MacAddress('00:BB:CC:DD:EE:FF'); // LSB of first octet is 0
      expect(mac.isUnicast).toBe(true);
    });

    test('should identify multicast addresses', () => {
      const mac = new MacAddress('01:BB:CC:DD:EE:FF'); // LSB of first octet is 1
      expect(mac.isMulticast).toBe(true);
    });

    test('should identify broadcast address', () => {
      const mac = new MacAddress('FF:FF:FF:FF:FF:FF');
      expect(mac.isBroadcast).toBe(true);
    });

    test('should identify locally administered addresses', () => {
      const mac = new MacAddress('02:BB:CC:DD:EE:FF'); // Second bit is 1
      expect(mac.isLocallyAdministered).toBe(true);
    });

    test('should identify universally administered addresses', () => {
      const mac = new MacAddress('00:BB:CC:DD:EE:FF'); // Second bit is 0
      expect(mac.isUniversal).toBe(true);
    });
  });

  describe('equality', () => {
    test('should compare MAC addresses for equality', () => {
      const mac1 = new MacAddress('AA:BB:CC:DD:EE:FF');
      const mac2 = new MacAddress('AABBCCDDEEFF');
      const mac3 = new MacAddress('11:BB:CC:DD:EE:FF');
      expect(mac1.equals(mac2)).toBe(true);
      expect(mac1.equals(mac3)).toBe(false);
    });
  });

  describe('serialization', () => {
    test('toJSON() should return string', () => {
      const mac = new MacAddress('AA:BB:CC:DD:EE:FF');
      expect(mac.toJSON()).toBe('AA:BB:CC:DD:EE:FF');
    });

    test('toString() should return string', () => {
      const mac = new MacAddress('AA:BB:CC:DD:EE:FF');
      expect(mac.toString()).toBe('AA:BB:CC:DD:EE:FF');
    });
  });
});

describe('parseMacAddress', () => {
  test('should parse valid MAC addresses', () => {
    const mac = parseMacAddress('AA:BB:CC:DD:EE:FF');
    expect(mac.value).toBe('AA:BB:CC:DD:EE:FF');
  });

test('should accept format parameter', () => {const mac = parseMacAddress('AABBCCDDEEFF', 'cisco');
      expect(mac.toCiscoFormat()).toBe('AABB.CCDD.EEFF');
    });
});

describe('isValidMacAddress', () => {
  test('should return true for valid MAC addresses', () => {
    expect(isValidMacAddress('AA:BB:CC:DD:EE:FF')).toBe(true);
    expect(isValidMacAddress('AABBCCDDEEFF')).toBe(true);
    expect(isValidMacAddress('AA-BB-CC-DD-EE-FF')).toBe(true);
  });

  test('should return false for invalid MAC addresses', () => {
    expect(isValidMacAddress('invalid')).toBe(false);
    expect(isValidMacAddress('AA:BB:CC')).toBe(false);
  });
});