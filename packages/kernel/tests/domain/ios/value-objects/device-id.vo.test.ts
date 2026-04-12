import { test, expect, describe } from 'bun:test';
import { DeviceId, DeviceType } from '../../../../src/domain/ios/value-objects/device-id.vo.js';
import { DomainError } from '../../../../src/domain/shared/errors/domain.error.js';

describe('DeviceId', () => {
  describe('constructor', () => {
    test('should create valid DeviceId', () => {
      const id = new DeviceId('Router1');
      expect(id.value).toBe('Router1');
    });

    test('should allow hyphens', () => {
      const id = new DeviceId('My-Router-1');
      expect(id.value).toBe('My-Router-1');
    });

    test('should allow dots', () => {
      const id = new DeviceId('router.cisco.local');
      expect(id.value).toBe('router.cisco.local');
    });

    test('should trim whitespace', () => {
      const id = new DeviceId('  Router1  ');
      expect(id.value).toBe('Router1');
    });

    test('should reject empty string', () => {
      expect(() => new DeviceId('')).toThrow(DomainError);
    });

    test('should reject string longer than 63 chars', () => {
      expect(() => new DeviceId('a'.repeat(64))).toThrow(DomainError);
    });

    test('should reject name starting with hyphen', () => {
      expect(() => new DeviceId('-router1')).toThrow(DomainError);
    });

    test('should reject name ending with hyphen', () => {
      expect(() => new DeviceId('router1-')).toThrow(DomainError);
    });

    test('should reject name with special characters', () => {
      expect(() => new DeviceId('router@1')).toThrow(DomainError);
      expect(() => new DeviceId('router#1')).toThrow(DomainError);
      expect(() => new DeviceId('router 1')).toThrow(DomainError);
    });
  });

  describe('static methods', () => {
    test('from should create DeviceId', () => {
      const id = DeviceId.from('SW1');
      expect(id.value).toBe('SW1');
    });

    test('tryFrom should return DeviceId for valid name', () => {
      const id = DeviceId.tryFrom('Router1');
      expect(id).not.toBeNull();
      expect(id?.value).toBe('Router1');
    });

    test('tryFrom should return null for invalid name', () => {
      expect(DeviceId.tryFrom('')).toBeNull();
      expect(DeviceId.tryFrom('-bad')).toBeNull();
    });

    test('isValid should return true for valid names', () => {
      expect(DeviceId.isValid('Router1')).toBe(true);
      expect(DeviceId.isValid('SW-Core-1')).toBe(true);
    });

    test('isValid should return false for invalid names', () => {
      expect(DeviceId.isValid('')).toBe(false);
      expect(DeviceId.isValid('@router')).toBe(false);
    });
  });

  describe('equals', () => {
    test('should return true for same value', () => {
      const id1 = DeviceId.from('R1');
      const id2 = DeviceId.from('R1');
      expect(id1.equals(id2)).toBe(true);
    });

    test('should return false for different values', () => {
      const id1 = DeviceId.from('R1');
      const id2 = DeviceId.from('R2');
      expect(id1.equals(id2)).toBe(false);
    });

    test('should return false for null', () => {
      const id = DeviceId.from('R1');
      expect(id.equals(null as unknown as DeviceId)).toBe(false);
    });
  });

  describe('toJSON', () => {
    test('should return string value', () => {
      const id = DeviceId.from('Router1');
      expect(id.toJSON()).toBe('Router1');
    });
  });
});

describe('DeviceType', () => {
  test('should have expected device types', () => {
    expect(DeviceType.ROUTER).toBe('router');
    expect(DeviceType.SWITCH).toBe('switch');
    expect(DeviceType.FIREWALL).toBe('firewall');
    expect(DeviceType.SERVER).toBe('server');
    expect(DeviceType.PC).toBe('pc');
    expect(DeviceType.HUB).toBe('hub');
    expect(DeviceType.WIRELESS_ROUTER).toBe('wireless-router');
    expect(DeviceType.UNKNOWN).toBe('unknown');
  });
});
