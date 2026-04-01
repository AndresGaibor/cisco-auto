/**
 * DeviceId Value Object Tests
 */

import { describe, it, expect } from 'bun:test';
import { DeviceId, parseDeviceId, parseOptionalDeviceId, isValidDeviceId } from '../device-id.js';

describe('DeviceId', () => {
  describe('construction', () => {
    it('should create valid device IDs', () => {
      expect(() => new DeviceId('R1')).not.toThrow();
      expect(() => new DeviceId('Switch1')).not.toThrow();
      expect(() => new DeviceId('Core-Switch')).not.toThrow();
      expect(() => new DeviceId('Access_Point_1')).not.toThrow();
    });

    it('should trim whitespace', () => {
      const deviceId = new DeviceId('  R1  ');
      expect(deviceId.value).toBe('R1');
    });

    it('should reject empty device IDs', () => {
      expect(() => new DeviceId('')).toThrow('Device ID cannot be empty');
      expect(() => new DeviceId('   ')).toThrow('Device ID cannot be empty');
    });

    it('should reject device IDs starting with numbers', () => {
      expect(() => new DeviceId('1R')).toThrow();
    });

    it('should reject device IDs with spaces', () => {
      expect(() => new DeviceId('Router 1')).toThrow();
    });

    it('should reject device IDs with special characters', () => {
      expect(() => new DeviceId('Router@1')).toThrow();
      expect(() => new DeviceId('Router#1')).toThrow();
    });

    it('should reject device IDs longer than 63 characters', () => {
      expect(() => new DeviceId('A'.repeat(64))).toThrow();
    });

    it('should accept device IDs up to 63 characters', () => {
      expect(() => new DeviceId('A'.repeat(63))).not.toThrow();
    });
  });

  describe('static methods', () => {
    it('should create from string using from()', () => {
      const deviceId = DeviceId.from('R1');
      expect(deviceId.value).toBe('R1');
    });

    it('should return null for invalid values in tryFrom()', () => {
      expect(DeviceId.tryFrom('')).toBeNull();
      expect(DeviceId.tryFrom('1R')).toBeNull();
      expect(DeviceId.tryFrom('Router@1')).toBeNull();
    });

    it('should return DeviceId for valid values in tryFrom()', () => {
      const deviceId = DeviceId.tryFrom('R1');
      expect(deviceId).not.toBeNull();
      expect(deviceId!.value).toBe('R1');
    });

    it('should validate correctly with isValid()', () => {
      expect(isValidDeviceId('R1')).toBe(true);
      expect(isValidDeviceId('')).toBe(false);
      expect(isValidDeviceId('1R')).toBe(false);
    });
  });

  describe('properties', () => {
    it('should identify valid hostnames', () => {
      const deviceId = new DeviceId('R1');
      expect(deviceId.isValidHostname).toBe(true);
    });

    it('should generate hostname command', () => {
      const deviceId = new DeviceId('MyRouter');
      expect(deviceId.toHostnameCommand()).toBe('hostname MyRouter');
    });
  });

  describe('equality and comparison', () => {
    it('should check equality correctly', () => {
      const id1 = new DeviceId('R1');
      const id2 = new DeviceId('R1');
      const id3 = new DeviceId('R2');

      expect(id1.equals(id2)).toBe(true);
      expect(id1.equals(id3)).toBe(false);
    });

    it('should compare for sorting', () => {
      const id1 = new DeviceId('R1');
      const id2 = new DeviceId('R2');

      expect(id1.compareTo(id2)).toBeLessThan(0);
      expect(id2.compareTo(id1)).toBeGreaterThan(0);
      expect(id1.compareTo(id1)).toBe(0);
    });
  });

  describe('serialization', () => {
    it('should convert to string', () => {
      expect(new DeviceId('R1').toString()).toBe('R1');
    });

    it('should serialize to JSON', () => {
      expect(JSON.stringify(new DeviceId('R1'))).toBe('"R1"');
    });
  });

  describe('parseDeviceId', () => {
    it('should parse string', () => {
      const deviceId = parseDeviceId('R1');
      expect(deviceId.value).toBe('R1');
    });
  });

  describe('parseOptionalDeviceId', () => {
    it('should return undefined for null', () => {
      expect(parseOptionalDeviceId(null)).toBeUndefined();
    });

    it('should return undefined for undefined', () => {
      expect(parseOptionalDeviceId(undefined)).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(parseOptionalDeviceId('')).toBeUndefined();
    });

    it('should parse valid string', () => {
      expect(parseOptionalDeviceId('R1')!.value).toBe('R1');
    });
  });
});
