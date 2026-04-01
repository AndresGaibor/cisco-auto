/**
 * VTP Value Objects Tests
 */

import { describe, it, expect } from 'bun:test';
import {
  VtpMode,
  VtpVersion,
  VtpDomain,
  VtpPassword,
  parseVtpMode,
  parseVtpVersion,
  parseVtpDomain,
  parseOptionalVtpPassword,
} from '../../src/value-objects/vtp-types.js';

describe('VtpMode', () => {
  describe('construction', () => {
    it('should create valid VTP modes', () => {
      expect(() => new VtpMode('server')).not.toThrow();
      expect(() => new VtpMode('client')).not.toThrow();
      expect(() => new VtpMode('transparent')).not.toThrow();
      expect(() => new VtpMode('off')).not.toThrow();
    });

    it('should reject invalid modes', () => {
      expect(() => new VtpMode('invalid' as any)).toThrow();
      expect(() => new VtpMode('')).toThrow();
    });
  });

  describe('static methods', () => {
    it('should create from mode using from()', () => {
      const mode = VtpMode.from('server');
      expect(mode.value).toBe('server');
    });

    it('should return null for invalid values in tryFrom()', () => {
      expect(VtpMode.tryFrom('invalid')).toBeNull();
      expect(VtpMode.tryFrom('')).toBeNull();
    });

    it('should return VtpMode for valid values in tryFrom()', () => {
      const mode = VtpMode.tryFrom('server');
      expect(mode).not.toBeNull();
      expect(mode!.value).toBe('server');
    });

    it('should validate correctly with isValid()', () => {
      expect(VtpMode.isValid('server')).toBe(true);
      expect(VtpMode.isValid('client')).toBe(true);
      expect(VtpMode.isValid('invalid')).toBe(false);
    });
  });

  describe('mode guards', () => {
    it('should identify server mode', () => {
      const mode = new VtpMode('server');
      expect(mode.isServer).toBe(true);
      expect(mode.isClient).toBe(false);
      expect(mode.isTransparent).toBe(false);
      expect(mode.isOff).toBe(false);
    });

    it('should identify client mode', () => {
      const mode = new VtpMode('client');
      expect(mode.isClient).toBe(true);
      expect(mode.isServer).toBe(false);
    });

    it('should identify transparent mode', () => {
      const mode = new VtpMode('transparent');
      expect(mode.isTransparent).toBe(true);
    });

    it('should identify off mode', () => {
      const mode = new VtpMode('off');
      expect(mode.isOff).toBe(true);
    });

    it('should identify modes that can modify VLANs', () => {
      expect(new VtpMode('server').canModifyVlans).toBe(true);
      expect(new VtpMode('transparent').canModifyVlans).toBe(true);
      expect(new VtpMode('client').canModifyVlans).toBe(false);
      expect(new VtpMode('off').canModifyVlans).toBe(false);
    });
  });

  describe('equality', () => {
    it('should check equality correctly', () => {
      const mode1 = new VtpMode('server');
      const mode2 = new VtpMode('server');
      const mode3 = new VtpMode('client');

      expect(mode1.equals(mode2)).toBe(true);
      expect(mode1.equals(mode3)).toBe(false);
    });
  });

  describe('serialization', () => {
    it('should convert to string', () => {
      expect(new VtpMode('server').toString()).toBe('server');
    });

    it('should serialize to JSON', () => {
      expect(JSON.stringify(new VtpMode('server'))).toBe('"server"');
    });
  });
});

describe('VtpVersion', () => {
  describe('construction', () => {
    it('should create valid VTP versions', () => {
      expect(() => new VtpVersion(1)).not.toThrow();
      expect(() => new VtpVersion(2)).not.toThrow();
      expect(() => new VtpVersion(3)).not.toThrow();
    });

    it('should reject invalid versions', () => {
      expect(() => new VtpVersion(0)).toThrow();
      expect(() => new VtpVersion(4)).toThrow();
    });
  });

  describe('static methods', () => {
    it('should create from version using from()', () => {
      const version = VtpVersion.from(2);
      expect(version.value).toBe(2);
    });

    it('should return null for invalid values in tryFrom()', () => {
      expect(VtpVersion.tryFrom(0)).toBeNull();
      expect(VtpVersion.tryFrom(4)).toBeNull();
    });

    it('should return VtpVersion for valid values in tryFrom()', () => {
      const version = VtpVersion.tryFrom(2);
      expect(version).not.toBeNull();
      expect(version!.value).toBe(2);
    });

    it('should validate correctly with isValid()', () => {
      expect(VtpVersion.isValid(1)).toBe(true);
      expect(VtpVersion.isValid(2)).toBe(true);
      expect(VtpVersion.isValid(3)).toBe(true);
      expect(VtpVersion.isValid(0)).toBe(false);
    });
  });

  describe('equality', () => {
    it('should check equality correctly', () => {
      const v1 = new VtpVersion(2);
      const v2 = new VtpVersion(2);
      const v3 = new VtpVersion(1);

      expect(v1.equals(v2)).toBe(true);
      expect(v1.equals(v3)).toBe(false);
    });
  });

  describe('serialization', () => {
    it('should convert to string', () => {
      expect(new VtpVersion(2).toString()).toBe('2');
    });

    it('should serialize to JSON', () => {
      expect(JSON.stringify(new VtpVersion(2))).toBe('2');
    });
  });
});

describe('VtpDomain', () => {
  describe('construction', () => {
    it('should create valid VTP domains', () => {
      expect(new VtpDomain('Engineering').value).toBe('Engineering');
      expect(new VtpDomain('CORP').value).toBe('CORP');
    });

    it('should trim whitespace', () => {
      expect(new VtpDomain('  Engineering  ').value).toBe('Engineering');
    });

    it('should accept domains with hyphens and underscores', () => {
      expect(new VtpDomain('CORP-NET').value).toBe('CORP-NET');
      expect(new VtpDomain('Engineering_Floor').value).toBe('Engineering_Floor');
    });
  });

  describe('validation', () => {
    it('should reject empty domains', () => {
      expect(() => new VtpDomain('')).toThrow('VTP domain cannot be empty');
    });

    it('should reject domains longer than 32 characters', () => {
      expect(() => new VtpDomain('A'.repeat(33))).toThrow();
    });

    it('should reject domains starting with special characters', () => {
      expect(() => new VtpDomain('-Engineering')).toThrow();
    });

    it('should reject domains with spaces', () => {
      expect(() => new VtpDomain('Engineering Corp')).toThrow();
    });
  });

  describe('static methods', () => {
    it('should create from string using from()', () => {
      const domain = VtpDomain.from('Engineering');
      expect(domain.value).toBe('Engineering');
    });

    it('should return null for invalid values in tryFrom()', () => {
      expect(VtpDomain.tryFrom('')).toBeNull();
      expect(VtpDomain.tryFrom('A'.repeat(33))).toBeNull();
    });

    it('should validate correctly with isValid()', () => {
      expect(VtpDomain.isValid('Engineering')).toBe(true);
      expect(VtpDomain.isValid('')).toBe(false);
    });
  });

  describe('equality', () => {
    it('should check equality correctly', () => {
      const d1 = new VtpDomain('Engineering');
      const d2 = new VtpDomain('Engineering');
      const d3 = new VtpDomain('Sales');

      expect(d1.equals(d2)).toBe(true);
      expect(d1.equals(d3)).toBe(false);
    });
  });

  describe('serialization', () => {
    it('should convert to string', () => {
      expect(new VtpDomain('Engineering').toString()).toBe('Engineering');
    });

    it('should serialize to JSON', () => {
      expect(JSON.stringify(new VtpDomain('Engineering'))).toBe('"Engineering"');
    });
  });
});

describe('VtpPassword', () => {
  describe('construction', () => {
    it('should create valid VTP passwords', () => {
      expect(new VtpPassword('Password123').value).toBe('Password123');
    });

    it('should require minimum 8 characters', () => {
      expect(() => new VtpPassword('Short1')).toThrow('at least 8 characters');
    });

    it('should reject passwords longer than 32 characters', () => {
      expect(() => new VtpPassword('A'.repeat(33))).toThrow();
    });

    it('should accept passwords with hyphens and underscores', () => {
      expect(new VtpPassword('My_Password-123').value).toBe('My_Password-123');
    });

    it('should reject passwords with special characters', () => {
      expect(() => new VtpPassword('Pass@word123')).toThrow();
      expect(() => new VtpPassword('Pass word123')).toThrow();
    });
  });

  describe('static methods', () => {
    it('should create from string using from()', () => {
      const password = VtpPassword.from('Password123');
      expect(password.value).toBe('Password123');
    });

    it('should return undefined for empty values in fromOptional()', () => {
      expect(VtpPassword.fromOptional('')).toBeUndefined();
      expect(VtpPassword.fromOptional(null)).toBeUndefined();
      expect(VtpPassword.fromOptional(undefined)).toBeUndefined();
    });

    it('should create from valid string in fromOptional()', () => {
      const password = VtpPassword.fromOptional('Password123');
      expect(password).not.toBeUndefined();
      expect(password!.value).toBe('Password123');
    });

    it('should return null for invalid values in tryFrom()', () => {
      expect(VtpPassword.tryFrom('Short1')).toBeNull();
      expect(VtpPassword.tryFrom('A'.repeat(33))).toBeNull();
    });

    it('should validate correctly with isValid()', () => {
      expect(VtpPassword.isValid('Password123')).toBe(true);
      expect(VtpPassword.isValid('Short1')).toBe(false);
    });
  });

  describe('equality', () => {
    it('should check equality correctly', () => {
      const p1 = new VtpPassword('Password123');
      const p2 = new VtpPassword('Password123');
      const p3 = new VtpPassword('Secret456');

      expect(p1.equals(p2)).toBe(true);
      expect(p1.equals(p3)).toBe(false);
    });
  });

  describe('serialization', () => {
    it('should convert to string', () => {
      expect(new VtpPassword('Password123').toString()).toBe('Password123');
    });

    it('should serialize to JSON', () => {
      expect(JSON.stringify(new VtpPassword('Password123'))).toBe('"Password123"');
    });
  });
});

describe('Helper functions', () => {
  it('parseVtpMode should create VtpMode', () => {
    const mode = parseVtpMode('server');
    expect(mode.value).toBe('server');
  });

  it('parseVtpVersion should create VtpVersion', () => {
    const version = parseVtpVersion(2);
    expect(version.value).toBe(2);
  });

  it('parseVtpDomain should create VtpDomain', () => {
    const domain = parseVtpDomain('Engineering');
    expect(domain.value).toBe('Engineering');
  });

  it('parseOptionalVtpPassword should handle optional values', () => {
    expect(parseOptionalVtpPassword(null)).toBeUndefined();
    expect(parseOptionalVtpPassword(undefined)).toBeUndefined();
    expect(parseOptionalVtpPassword('Password123')!.value).toBe('Password123');
  });
});
