import { test, expect, describe } from 'bun:test';
import { Ipv4Address, SubnetMask, parseIpv4Address, isValidIpv4Address, parseSubnetMask, isValidSubnetMask } from '../../../../src/domain/ios/value-objects/ipv4-address.vo.js';
import { CidrPrefix, parseCidrPrefix, isValidCidrPrefix } from '../../../../src/domain/ios/value-objects/cidr-prefix.vo.js';

describe('Ipv4Address', () => {
  describe('constructor', () => {
    test('should create valid IPv4 address', () => {
      const ip = new Ipv4Address('192.168.1.1');
      expect(ip.value).toBe('192.168.1.1');
      expect(ip.octets).toEqual([192, 168, 1, 1]);
    });

    test('should trim whitespace', () => {
      const ip = new Ipv4Address('  192.168.1.1  ');
      expect(ip.value).toBe('192.168.1.1');
    });

    test('should throw for invalid formats', () => {
      expect(() => new Ipv4Address('192.168.1')).toThrow('expected 4 octets');
      expect(() => new Ipv4Address('192.168.1.1.1')).toThrow('expected 4 octets');
      expect(() => new Ipv4Address('192.168.1.256')).toThrow('must be 0-255');
      expect(() => new Ipv4Address('192.168.1.-1')).toThrow('must be 0-255');
      expect(() => new Ipv4Address('192.168.1.abc')).toThrow('must be 0-255');
    });
  });

  describe('address classification', () => {
    test('should identify private addresses', () => {
      expect(new Ipv4Address('10.0.0.1').isPrivate).toBe(true);
      expect(new Ipv4Address('172.16.0.1').isPrivate).toBe(true);
      expect(new Ipv4Address('192.168.1.1').isPrivate).toBe(true);
      expect(new Ipv4Address('8.8.8.8').isPrivate).toBe(false);
    });

    test('should identify loopback addresses', () => {
      expect(new Ipv4Address('127.0.0.1').isLoopback).toBe(true);
      expect(new Ipv4Address('127.255.255.255').isLoopback).toBe(true);
      expect(new Ipv4Address('128.0.0.1').isLoopback).toBe(false);
    });

    test('should identify APIPA addresses', () => {
      expect(new Ipv4Address('169.254.1.1').isApipa).toBe(true);
      expect(new Ipv4Address('169.253.1.1').isApipa).toBe(false);
    });

    test('should identify multicast addresses', () => {
      expect(new Ipv4Address('224.0.0.1').isMulticast).toBe(true);
      expect(new Ipv4Address('239.255.255.255').isMulticast).toBe(true);
      expect(new Ipv4Address('223.255.255.255').isMulticast).toBe(false);
    });

    test('should identify broadcast address', () => {
      expect(new Ipv4Address('255.255.255.255').isBroadcast).toBe(true);
      expect(new Ipv4Address('255.255.255.254').isBroadcast).toBe(false);
    });

    test('should identify unicast addresses', () => {
      expect(new Ipv4Address('192.168.1.1').isUnicast).toBe(true);
      expect(new Ipv4Address('127.0.0.1').isUnicast).toBe(false);
      expect(new Ipv4Address('224.0.0.1').isUnicast).toBe(false);
    });
  });

  describe('methods', () => {
    test('toInt() should convert to 32-bit integer', () => {
      const ip = new Ipv4Address('192.168.1.1');
      expect(ip.toInt()).toBe(3232235777);
    });

    test('getSubnetAddress() should calculate network address', () => {
      const ip = new Ipv4Address('192.168.1.100');
      const subnet = ip.getSubnetAddress(24);
      expect(subnet.value).toBe('192.168.1.0');
    });

    test('equals() should compare addresses', () => {
      const ip1 = new Ipv4Address('192.168.1.1');
      const ip2 = new Ipv4Address('192.168.1.1');
      const ip3 = new Ipv4Address('192.168.1.2');
      expect(ip1.equals(ip2)).toBe(true);
      expect(ip1.equals(ip3)).toBe(false);
    });
  });
});

describe('SubnetMask', () => {
  describe('constructor', () => {
    test('should create valid subnet masks', () => {
      const mask = new SubnetMask('255.255.255.0');
      expect(mask.value).toBe('255.255.255.0');
      expect(mask.cidr).toBe(24);
    });

    test('should throw for invalid masks', () => {
      expect(() => new SubnetMask('255.255.255.1')).toThrow('must be a valid mask');
      expect(() => new SubnetMask('192.168.1.0')).toThrow('must be a valid mask');
    });
  });

  describe('fromCidr', () => {
    test('should create mask from CIDR prefix', () => {
      expect(SubnetMask.fromCidr(24).value).toBe('255.255.255.0');
      expect(SubnetMask.fromCidr(16).value).toBe('255.255.0.0');
      expect(SubnetMask.fromCidr(8).value).toBe('255.0.0.0');
      expect(SubnetMask.fromCidr(0).value).toBe('0.0.0.0');
    });
  });

  describe('properties', () => {
    test('should calculate wildcard mask', () => {
      const mask = new SubnetMask('255.255.255.0');
      expect(mask.wildcardMask).toBe('0.0.0.255');
    });

    test('should calculate usable hosts', () => {
      expect(new SubnetMask('255.255.255.0').usableHosts).toBe(254);
      expect(new SubnetMask('255.255.255.252').usableHosts).toBe(2);
      expect(new SubnetMask('255.255.255.255').usableHosts).toBe(1);
    });

    test('should calculate total addresses', () => {
      expect(new SubnetMask('255.255.255.0').totalAddresses).toBe(256);
      expect(new SubnetMask('255.255.0.0').totalAddresses).toBe(65536);
    });

    test('should identify point-to-point mask', () => {
      expect(new SubnetMask('255.255.255.254').isPointToPoint).toBe(true);
      expect(new SubnetMask('255.255.255.0').isPointToPoint).toBe(false);
    });

    test('should identify loopback mask', () => {
      expect(new SubnetMask('255.255.255.255').isLoopback).toBe(true);
      expect(new SubnetMask('255.255.255.0').isLoopback).toBe(false);
    });
  });

  describe('toCidrString', () => {
    test('should return CIDR notation', () => {
      expect(new SubnetMask('255.255.255.0').toCidrString()).toBe('/24');
    });
  });
});

describe('CidrPrefix', () => {
  describe('constructor', () => {
    test('should create valid CIDR prefixes', () => {
      const prefix = new CidrPrefix(24);
      expect(prefix.value).toBe(24);
    });

    test('should throw for invalid values', () => {
      expect(() => new CidrPrefix(-1)).toThrow('must be between 0 and 32');
      expect(() => new CidrPrefix(33)).toThrow('must be between 0 and 32');
      expect(() => new CidrPrefix(1.5)).toThrow('must be an integer');
    });
  });

  describe('methods', () => {
    test('toSubnetMask() should convert to dotted decimal', () => {
      expect(new CidrPrefix(24).toSubnetMask()).toBe('255.255.255.0');
      expect(new CidrPrefix(16).toSubnetMask()).toBe('255.255.0.0');
      expect(new CidrPrefix(0).toSubnetMask()).toBe('0.0.0.0');
    });

    test('toWildcardMask() should calculate wildcard', () => {
      expect(new CidrPrefix(24).toWildcardMask()).toBe('0.0.0.255');
      expect(new CidrPrefix(16).toWildcardMask()).toBe('0.0.255.255');
    });

    test('canContain() should compare prefixes', () => {
      expect(new CidrPrefix(16).canContain(new CidrPrefix(24))).toBe(true);
      expect(new CidrPrefix(24).canContain(new CidrPrefix(16))).toBe(false);
    });
  });

  describe('properties', () => {
    test('should calculate usable hosts', () => {
      expect(new CidrPrefix(24).usableHosts).toBe(254);
      expect(new CidrPrefix(30).usableHosts).toBe(2);
      expect(new CidrPrefix(31).usableHosts).toBe(2);
      expect(new CidrPrefix(32).usableHosts).toBe(1);
    });

    test('should identify valid host prefixes', () => {
      expect(new CidrPrefix(24).isValidForHosts).toBe(true);
      expect(new CidrPrefix(32).isValidForHosts).toBe(false);
      expect(new CidrPrefix(7).isValidForHosts).toBe(false);
    });
  });
});

describe('parse functions', () => {
  test('parseIpv4Address should parse valid addresses', () => {
    const ip = parseIpv4Address('192.168.1.1');
    expect(ip.value).toBe('192.168.1.1');
  });

  test('isValidIpv4Address should validate correctly', () => {
    expect(isValidIpv4Address('192.168.1.1')).toBe(true);
    expect(isValidIpv4Address('invalid')).toBe(false);
  });

  test('parseSubnetMask should parse valid masks', () => {
    const mask = parseSubnetMask('255.255.255.0');
    expect(mask.value).toBe('255.255.255.0');
  });

  test('isValidSubnetMask should validate correctly', () => {
    expect(isValidSubnetMask('255.255.255.0')).toBe(true);
    expect(isValidSubnetMask('255.255.255.1')).toBe(false);
  });

  test('parseCidrPrefix should parse valid prefixes', () => {
    const prefix = parseCidrPrefix(24);
    expect(prefix.value).toBe(24);
  });

  test('isValidCidrPrefix should validate correctly', () => {
    expect(isValidCidrPrefix(24)).toBe(true);
    expect(isValidCidrPrefix(33)).toBe(false);
  });
});