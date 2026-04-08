/**
 * CableMedia Value Object Tests
 */

import { describe, it, expect } from 'bun:test';
import { CableMedia, parseCableMediaFromType, parseCableMedia, isValidCableType } from '../cable-media.js';

describe('CableMedia', () => {
  describe('construction', () => {
    it('should create valid cable media types', () => {
      expect(() => new CableMedia('copper')).not.toThrow();
      expect(() => new CableMedia('fiber')).not.toThrow();
      expect(() => new CableMedia('wireless')).not.toThrow();
      expect(() => new CableMedia('coaxial')).not.toThrow();
      expect(() => new CableMedia('serial')).not.toThrow();
      expect(() => new CableMedia('usb')).not.toThrow();
      expect(() => new CableMedia('unknown')).not.toThrow();
    });

    it('should reject invalid media types', () => {
      expect(() => new CableMedia('invalid' as any)).toThrow();
      expect(() => new CableMedia('' as any)).toThrow();
    });
  });

  describe('fromCableType', () => {
    it('should map copper cable types', () => {
      expect(CableMedia.fromCableType('straight').value).toBe('copper');
      expect(CableMedia.fromCableType('cross').value).toBe('copper');
      expect(CableMedia.fromCableType('roll').value).toBe('copper');
      expect(CableMedia.fromCableType('console').value).toBe('copper');
    });

    it('should map fiber cable types', () => {
      expect(CableMedia.fromCableType('fiber').value).toBe('fiber');
    });

    it('should map wireless cable types', () => {
      expect(CableMedia.fromCableType('wireless').value).toBe('wireless');
      expect(CableMedia.fromCableType('cellular').value).toBe('wireless');
    });

    it('should map coaxial cable types', () => {
      expect(CableMedia.fromCableType('coaxial').value).toBe('coaxial');
    });

    it('should map serial cable types', () => {
      expect(CableMedia.fromCableType('serial').value).toBe('serial');
    });

    it('should map USB cable types', () => {
      expect(CableMedia.fromCableType('usb').value).toBe('usb');
    });

    it('should map unknown cable types', () => {
      expect(CableMedia.fromCableType('auto').value).toBe('unknown');
      expect(CableMedia.fromCableType('custom_io').value).toBe('unknown');
    });

    it('should handle case insensitivity', () => {
      expect(CableMedia.fromCableType('STRAIGHT').value).toBe('copper');
      expect(CableMedia.fromCableType('Fiber').value).toBe('fiber');
    });
  });

  describe('static methods', () => {
    it('should create from media type using from()', () => {
      const media = CableMedia.from('copper');
      expect(media.value).toBe('copper');
    });

    it('should return null for invalid values in tryFrom()', () => {
      expect(CableMedia.tryFrom('invalid')).toBeNull();
    });

    it('should return null for invalid cable type in tryFromCableType()', () => {
      expect(CableMedia.tryFromCableType('')).toBeNull();
    });

    it('should validate cable type with isValidCableType()', () => {
      expect(isValidCableType('straight')).toBe(true);
      // Unknown cable types are mapped to 'unknown' media, which is valid
      expect(isValidCableType('invalid')).toBe(true);
      // Empty string is invalid
      expect(isValidCableType('')).toBe(false);
    });
  });

  describe('type guards', () => {
    it('should identify copper media', () => {
      const media = new CableMedia('copper');
      expect(media.isCopper).toBe(true);
      expect(media.isFiber).toBe(false);
      expect(media.isWireless).toBe(false);
    });

    it('should identify fiber media', () => {
      const media = new CableMedia('fiber');
      expect(media.isFiber).toBe(true);
      expect(media.isCopper).toBe(false);
    });

    it('should identify wireless media', () => {
      const media = new CableMedia('wireless');
      expect(media.isWireless).toBe(true);
      expect(media.isPhysical).toBe(false);
    });

    it('should identify physical media', () => {
      expect(new CableMedia('copper').isPhysical).toBe(true);
      expect(new CableMedia('fiber').isPhysical).toBe(true);
      expect(new CableMedia('serial').isPhysical).toBe(true);
      expect(new CableMedia('wireless').isPhysical).toBe(false);
    });
  });

  describe('typical distances', () => {
    it('should return typical max distance for copper', () => {
      expect(new CableMedia('copper').typicalMaxDistance).toBe(100);
    });

    it('should return typical max distance for fiber', () => {
      expect(new CableMedia('fiber').typicalMaxDistance).toBe(2000);
    });

    it('should return typical max distance for wireless', () => {
      expect(new CableMedia('wireless').typicalMaxDistance).toBe(100);
    });

    it('should return null for unknown', () => {
      expect(new CableMedia('unknown').typicalMaxDistance).toBeNull();
    });
  });

  describe('typical speeds', () => {
    it('should return typical speed for copper', () => {
      expect(new CableMedia('copper').typicalSpeed).toBe(1000);
    });

    it('should return typical speed for fiber', () => {
      expect(new CableMedia('fiber').typicalSpeed).toBe(10000);
    });

    it('should return typical speed for wireless', () => {
      expect(new CableMedia('wireless').typicalSpeed).toBe(300);
    });

    it('should return null for unknown', () => {
      expect(new CableMedia('unknown').typicalSpeed).toBeNull();
    });
  });

  describe('equality', () => {
    it('should check equality correctly', () => {
      const media1 = new CableMedia('copper');
      const media2 = new CableMedia('copper');
      const media3 = new CableMedia('fiber');

      expect(media1.equals(media2)).toBe(true);
      expect(media1.equals(media3)).toBe(false);
    });
  });

  describe('serialization', () => {
    it('should convert to string', () => {
      expect(new CableMedia('copper').toString()).toBe('copper');
    });

    it('should serialize to JSON', () => {
      expect(JSON.stringify(new CableMedia('copper'))).toBe('"copper"');
    });
  });

  describe('parseCableMediaFromType', () => {
    it('should parse from cable type', () => {
      const media = parseCableMediaFromType('straight');
      expect(media.value).toBe('copper');
    });
  });

  describe('parseCableMedia', () => {
    it('should parse from media type', () => {
      const media = parseCableMedia('fiber');
      expect(media.value).toBe('fiber');
    });
  });
});
