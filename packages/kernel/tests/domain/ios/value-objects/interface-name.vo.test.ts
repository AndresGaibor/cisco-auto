import { test, expect, describe } from 'bun:test';
import { InterfaceName, parseInterfaceName, parseOptionalInterfaceName, isValidInterfaceName } from '../../../../src/domain/ios/value-objects/interface-name.vo.js';

describe('InterfaceName', () => {
  describe('constructor', () => {
    test('should create valid interface names', () => {
      const iface = new InterfaceName('GigabitEthernet0/0');
      expect(iface.value).toBe('GigabitEthernet0/0');
    });

    test('should accept various interface formats', () => {
      expect(() => new InterfaceName('GigabitEthernet0/0')).not.toThrow();
      expect(() => new InterfaceName('FastEthernet0/1')).not.toThrow();
      expect(() => new InterfaceName('VLAN100')).not.toThrow();
      expect(() => new InterfaceName('Serial0/0/0')).not.toThrow();
      expect(() => new InterfaceName('GigabitEthernet0/0.100')).not.toThrow();
      expect(() => new InterfaceName('Loopback0')).not.toThrow();
      expect(() => new InterfaceName('PortChannel1')).not.toThrow();
    });

    test('should trim whitespace', () => {
      const iface = new InterfaceName('  GigabitEthernet0/0  ');
      expect(iface.value).toBe('GigabitEthernet0/0');
    });

    test('should throw for empty string', () => {
      expect(() => new InterfaceName('')).toThrow('cannot be empty');
      expect(() => new InterfaceName('   ')).toThrow('cannot be empty');
    });

    test('should throw for invalid formats', () => {
      expect(() => new InterfaceName('invalid')).toThrow('expected format');
      expect(() => new InterfaceName('GigabitEthernet')).toThrow('expected format');
      expect(() => new InterfaceName('0/0')).toThrow('expected format');
    });
  });

  describe('shortForm', () => {
    test('should return abbreviated interface names', () => {
      expect(new InterfaceName('GigabitEthernet0/0').shortForm).toBe('Gi0/0');
      expect(new InterfaceName('FastEthernet0/1').shortForm).toBe('Fa0/1');
      expect(new InterfaceName('Ethernet0/0').shortForm).toBe('Et0/0');
      expect(new InterfaceName('Serial0/0/0').shortForm).toBe('Se0/0/0');
      expect(new InterfaceName('Loopback0').shortForm).toBe('Lo0');
      expect(new InterfaceName('VLAN100').shortForm).toBe('Vl100');
      expect(new InterfaceName('PortChannel1').shortForm).toBe('Po1');
    });

    test('should return original for unknown interface types', () => {
      expect(new InterfaceName('Custom0').shortForm).toBe('Custom0');
    });
  });

  describe('subinterface', () => {
    test('should identify subinterfaces', () => {
      expect(new InterfaceName('GigabitEthernet0/0.100').isSubinterface).toBe(true);
      expect(new InterfaceName('GigabitEthernet0/0').isSubinterface).toBe(false);
    });

    test('should get parent interface', () => {
      const subif = new InterfaceName('GigabitEthernet0/0.100');
      const parent = subif.parentInterface;
      expect(parent).not.toBeNull();
      expect(parent?.value).toBe('GigabitEthernet0/0');
    });

    test('should return null for non-subinterfaces', () => {
      const iface = new InterfaceName('GigabitEthernet0/0');
      expect(iface.parentInterface).toBeNull();
    });
  });

  describe('equality', () => {
    test('should compare interfaces for equality', () => {
      const iface1 = new InterfaceName('GigabitEthernet0/0');
      const iface2 = new InterfaceName('GigabitEthernet0/0');
      const iface3 = new InterfaceName('GigabitEthernet0/1');
      expect(iface1.equals(iface2)).toBe(true);
      expect(iface1.equals(iface3)).toBe(false);
    });
  });

  describe('serialization', () => {
    test('toJSON() should return string', () => {
      const iface = new InterfaceName('GigabitEthernet0/0');
      expect(iface.toJSON()).toBe('GigabitEthernet0/0');
    });

    test('toString() should return string', () => {
      const iface = new InterfaceName('GigabitEthernet0/0');
      expect(iface.toString()).toBe('GigabitEthernet0/0');
    });
  });
});

describe('parseInterfaceName', () => {
  test('should parse valid interface names', () => {
    const iface = parseInterfaceName('GigabitEthernet0/0');
    expect(iface.value).toBe('GigabitEthernet0/0');
  });

  test('should throw for invalid interface names', () => {
    expect(() => parseInterfaceName('invalid')).toThrow();
  });
});

describe('parseOptionalInterfaceName', () => {
  test('should return undefined for null', () => {
    expect(parseOptionalInterfaceName(null)).toBeUndefined();
  });

  test('should return undefined for undefined', () => {
    expect(parseOptionalInterfaceName(undefined)).toBeUndefined();
  });

  test('should return InterfaceName for valid values', () => {
    const iface = parseOptionalInterfaceName('GigabitEthernet0/0');
    expect(iface?.value).toBe('GigabitEthernet0/0');
  });
});

describe('isValidInterfaceName', () => {
  test('should return true for valid interface names', () => {
    expect(isValidInterfaceName('GigabitEthernet0/0')).toBe(true);
    expect(isValidInterfaceName('FastEthernet0/1')).toBe(true);
    expect(isValidInterfaceName('VLAN100')).toBe(true);
  });

  test('should return false for invalid interface names', () => {
    expect(isValidInterfaceName('invalid')).toBe(false);
    expect(isValidInterfaceName('')).toBe(false);
  });
});