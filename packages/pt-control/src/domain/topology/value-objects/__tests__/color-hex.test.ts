/**
 * ColorHex Value Object Tests
 */

import { describe, it, expect } from 'bun:test';
import { ColorHex, parseColorHex, parseOptionalColorHex, isValidColorHex, inferVlanFromColor } from '../color-hex.js';

describe('ColorHex', () => {
  describe('construction', () => {
    it('should create valid hex colors', () => {
      expect(() => new ColorHex('#FFF')).not.toThrow();
      expect(() => new ColorHex('#FFFFFF')).not.toThrow();
      expect(() => new ColorHex('#FFFFFFFF')).not.toThrow();
      expect(() => new ColorHex('#000000')).not.toThrow();
    });

    it('should handle mixed case', () => {
      expect(() => new ColorHex('#FfFfFf')).not.toThrow();
      expect(() => new ColorHex('#aAbBcC')).not.toThrow();
    });

    it('should trim whitespace', () => {
      const color = new ColorHex('  #FFFFFF  ');
      expect(color.value).toBe('#FFFFFF');
    });

    it('should reject invalid formats', () => {
      expect(() => new ColorHex('FFF')).toThrow();
      expect(() => new ColorHex('FFFFFF')).toThrow();
      expect(() => new ColorHex('#GGGGGG')).toThrow();
      expect(() => new ColorHex('#FFFg')).toThrow();
    });
  });

  describe('static methods', () => {
    it('should create from string using from()', () => {
      const color = ColorHex.from('#FF0000');
      expect(color.value).toBe('#FF0000');
    });

    it('should return null for invalid values in tryFrom()', () => {
      expect(ColorHex.tryFrom('invalid')).toBeNull();
      expect(ColorHex.tryFrom('#GGG')).toBeNull();
    });

    it('should validate correctly with isValid()', () => {
      expect(isValidColorHex('#FFFFFF')).toBe(true);
      expect(isValidColorHex('invalid')).toBe(false);
    });

    it('should create from RGB values', () => {
      const color = ColorHex.fromRGB(255, 128, 64);
      expect(color.value.toLowerCase()).toBe('#ff8040');
    });

    it('should reject RGB values out of range', () => {
      expect(() => ColorHex.fromRGB(256, 0, 0)).toThrow();
      expect(() => ColorHex.fromRGB(0, -1, 0)).toThrow();
    });
  });

  describe('RGB conversion', () => {
    it('should parse RGB from 6-digit hex', () => {
      const color = new ColorHex('#FF8040');
      const rgb = color.toRGB();
      expect(rgb).toEqual({ r: 255, g: 128, b: 64 });
    });

    it('should parse RGB from 3-digit hex', () => {
      const color = new ColorHex('#F80');
      const rgb = color.toRGB();
      expect(rgb).toEqual({ r: 255, g: 136, b: 0 });
    });

    it('should parse RGBA from 8-digit hex', () => {
      const color = new ColorHex('#FF804080');
      const rgb = color.toRGB();
      expect(rgb).toEqual({ r: 255, g: 128, b: 64, a: 128 });
    });
  });

  describe('PT zone colors', () => {
    it('should infer VLAN 10 from blue', () => {
      expect(new ColorHex('#0000FF').inferredVlanId).toBe(10);
      expect(new ColorHex('#0000ff').inferredVlanId).toBe(10);
    });

    it('should infer VLAN 20 from magenta', () => {
      expect(new ColorHex('#FF00FF').inferredVlanId).toBe(20);
      expect(new ColorHex('#ff00ff').inferredVlanId).toBe(20);
    });

    it('should infer VLAN 30 from yellow', () => {
      expect(new ColorHex('#FFFF00').inferredVlanId).toBe(30);
      expect(new ColorHex('#ffff00').inferredVlanId).toBe(30);
    });

    it('should infer VLAN 40 from green', () => {
      expect(new ColorHex('#00FF00').inferredVlanId).toBe(40);
      expect(new ColorHex('#00ff00').inferredVlanId).toBe(40);
    });

    it('should infer VLAN 50 from orange', () => {
      expect(new ColorHex('#FFA500').inferredVlanId).toBe(50);
      expect(new ColorHex('#ffa500').inferredVlanId).toBe(50);
    });

    it('should return null for unknown colors', () => {
      expect(new ColorHex('#123456').inferredVlanId).toBeNull();
    });

    it('should identify PT zone colors', () => {
      expect(new ColorHex('#0000FF').isPTZoneColor).toBe(true);
      expect(new ColorHex('#123456').isPTZoneColor).toBe(false);
    });
  });

  describe('brightness and text color', () => {
    it('should identify light colors', () => {
      expect(new ColorHex('#FFFFFF').isLight).toBe(true);
      expect(new ColorHex('#FFFF00').isLight).toBe(true);
    });

    it('should identify dark colors', () => {
      expect(new ColorHex('#000000').isDark).toBe(true);
      expect(new ColorHex('#0000FF').isDark).toBe(true);
    });

    it('should suggest contrasting text color', () => {
      expect(new ColorHex('#FFFFFF').contrastingTextColor).toBe('#000000');
      expect(new ColorHex('#000000').contrastingTextColor).toBe('#FFFFFF');
      expect(new ColorHex('#0000FF').contrastingTextColor).toBe('#FFFFFF');
    });
  });

  describe('equality', () => {
    it('should check equality correctly', () => {
      const color1 = new ColorHex('#FFFFFF');
      const color2 = new ColorHex('#ffffff');
      const color3 = new ColorHex('#000000');

      expect(color1.equals(color2)).toBe(true);
      expect(color1.equals(color3)).toBe(false);
    });
  });

  describe('serialization', () => {
    it('should convert to string', () => {
      expect(new ColorHex('#FFFFFF').toString()).toBe('#FFFFFF');
    });

    it('should serialize to JSON (normalized)', () => {
      expect(JSON.stringify(new ColorHex('#FFFFFF'))).toBe('"#ffffff"');
    });
  });

  describe('parseColorHex', () => {
    it('should parse string', () => {
      const color = parseColorHex('#FF0000');
      expect(color.value).toBe('#FF0000');
    });
  });

  describe('parseOptionalColorHex', () => {
    it('should return undefined for null', () => {
      expect(parseOptionalColorHex(null)).toBeUndefined();
    });

    it('should return undefined for undefined', () => {
      expect(parseOptionalColorHex(undefined)).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(parseOptionalColorHex('')).toBeUndefined();
    });

    it('should parse valid string', () => {
      expect(parseOptionalColorHex('#FF0000')!.value).toBe('#FF0000');
    });
  });

  describe('inferVlanFromColor', () => {
    it('should infer VLAN from PT zone colors', () => {
      expect(inferVlanFromColor('#0000FF')).toBe(10);
      expect(inferVlanFromColor('#FF00FF')).toBe(20);
      expect(inferVlanFromColor('#FFFF00')).toBe(30);
    });

    it('should return null for invalid colors', () => {
      expect(inferVlanFromColor('invalid')).toBeNull();
    });
  });
});
