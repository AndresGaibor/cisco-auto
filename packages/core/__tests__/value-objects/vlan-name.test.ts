/**
 * VlanName Value Object Tests
 */

import { describe, it, expect } from 'bun:test';
import { VlanName, parseVlanName, parseOptionalVlanName, isValidVlanName } from '../../src/value-objects/vlan-name';

describe('VlanName', () => {
  describe('construction', () => {
    it('should create valid VLAN names', () => {
      const name = new VlanName('Engineering');
      expect(name.value).toBe('Engineering');
    });

    it('should trim whitespace', () => {
      const name = new VlanName('  Engineering  ');
      expect(name.value).toBe('Engineering');
    });

    it('should truncate names longer than 32 characters', () => {
      const longName = 'A'.repeat(50);
      const name = new VlanName(longName);
      expect(name.value.length).toBe(32);
      expect(name.value).toBe('A'.repeat(32));
      expect(name.truncated).toBe(true);
    });

    it('should accept names with hyphens and underscores', () => {
      expect(new VlanName('VLAN-10').value).toBe('VLAN-10');
      expect(new VlanName('Engineering_Floor').value).toBe('Engineering_Floor');
    });

    it('should accept single character names', () => {
      expect(new VlanName('A').value).toBe('A');
    });
  });

  describe('validation', () => {
    it('should reject empty names', () => {
      expect(() => new VlanName('')).toThrow('VLAN name cannot be empty');
    });

    it('should reject whitespace-only names', () => {
      expect(() => new VlanName('   ')).toThrow('VLAN name cannot be empty');
    });

    it('should reject names starting with numbers', () => {
      expect(() => new VlanName('10VLAN')).toThrow();
    });

    it('should reject names with spaces', () => {
      expect(() => new VlanName('VLAN 10')).toThrow();
    });

    it('should reject names with special characters', () => {
      expect(() => new VlanName('VLAN@10')).toThrow();
      expect(() => new VlanName('VLAN#10')).toThrow();
      expect(() => new VlanName('VLAN$10')).toThrow();
    });
  });

  describe('static methods', () => {
    it('should create from string using from()', () => {
      const name = VlanName.from('Engineering');
      expect(name.value).toBe('Engineering');
    });

    it('should return null for invalid values in tryFrom()', () => {
      expect(VlanName.tryFrom('')).toBeNull();
      expect(VlanName.tryFrom('10VLAN')).toBeNull();
      expect(VlanName.tryFrom('VLAN@10')).toBeNull();
    });

    it('should return VlanName for valid values in tryFrom()', () => {
      const name = VlanName.tryFrom('Engineering');
      expect(name).not.toBeNull();
      expect(name!.value).toBe('Engineering');
    });

    it('should return undefined for empty/null in fromOptional()', () => {
      expect(VlanName.fromOptional('')).toBeUndefined();
      expect(VlanName.fromOptional(null)).toBeUndefined();
      expect(VlanName.fromOptional(undefined)).toBeUndefined();
      expect(VlanName.fromOptional('   ')).toBeUndefined();
    });

    it('should create from valid string in fromOptional()', () => {
      const name = VlanName.fromOptional('Engineering');
      expect(name).not.toBeUndefined();
      expect(name!.value).toBe('Engineering');
    });

    it('should validate correctly with isValid()', () => {
      expect(isValidVlanName('Engineering')).toBe(true);
      expect(isValidVlanName('')).toBe(false);
      expect(isValidVlanName('10VLAN')).toBe(false);
      expect(isValidVlanName('VLAN@10')).toBe(false);
    });
  });

  describe('equality', () => {
    it('should check equality correctly', () => {
      const name1 = new VlanName('Engineering');
      const name2 = new VlanName('Engineering');
      const name3 = new VlanName('Sales');

      expect(name1.equals(name2)).toBe(true);
      expect(name1.equals(name3)).toBe(false);
    });
  });

  describe('serialization', () => {
    it('should convert to string', () => {
      expect(new VlanName('Engineering').toString()).toBe('Engineering');
    });

    it('should serialize to JSON', () => {
      expect(JSON.stringify(new VlanName('Engineering'))).toBe('"Engineering"');
    });
  });

  describe('parseVlanName', () => {
    it('should parse string', () => {
      const name = parseVlanName('Engineering');
      expect(name.value).toBe('Engineering');
    });
  });

  describe('parseOptionalVlanName', () => {
    it('should return undefined for null', () => {
      expect(parseOptionalVlanName(null)).toBeUndefined();
    });

    it('should return undefined for undefined', () => {
      expect(parseOptionalVlanName(undefined)).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(parseOptionalVlanName('')).toBeUndefined();
    });

    it('should parse valid string', () => {
      expect(parseOptionalVlanName('Engineering')!.value).toBe('Engineering');
    });
  });
});
