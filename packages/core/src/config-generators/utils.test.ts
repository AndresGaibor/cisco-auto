import { describe, expect, it, test } from 'bun:test';
import { NetworkUtils } from './utils';

describe('NetworkUtils', () => {
  describe('cidrToMask', () => {
    const testCases = [
      { cidr: 0, expected: '0.0.0.0' },
      { cidr: 1, expected: '128.0.0.0' },
      { cidr: 8, expected: '255.0.0.0' },
      { cidr: 16, expected: '255.255.0.0' },
      { cidr: 24, expected: '255.255.255.0' },
      { cidr: 30, expected: '255.255.255.252' },
      { cidr: 31, expected: '255.255.255.254' },
      { cidr: 32, expected: '255.255.255.255' },
      // Edge cases
      { cidr: 7, expected: '254.0.0.0' },
      { cidr: 15, expected: '255.254.0.0' },
      { cidr: 23, expected: '255.255.254.0' },
      { cidr: 29, expected: '255.255.255.248' },
    ];

    test.each(testCases)('should convert CIDR /$cidr to $expected', ({ cidr, expected }) => {
      expect(NetworkUtils.cidrToMask(cidr)).toBe(expected);
    });

    it('should throw error for invalid CIDR values', () => {
      expect(() => NetworkUtils.cidrToMask(-1)).toThrow('Invalid CIDR: -1');
      expect(() => NetworkUtils.cidrToMask(33)).toThrow('Invalid CIDR: 33');
      expect(() => NetworkUtils.cidrToMask(100)).toThrow('Invalid CIDR: 100');
    });
  });

  describe('cidrToWildcard', () => {
    const testCases = [
      { cidr: 0, expected: '255.255.255.255' },
      { cidr: 8, expected: '0.255.255.255' },
      { cidr: 16, expected: '0.0.255.255' },
      { cidr: 24, expected: '0.0.0.255' },
      { cidr: 30, expected: '0.0.0.3' },
      { cidr: 31, expected: '0.0.0.1' },
      { cidr: 32, expected: '0.0.0.0' },
    ];

    test.each(testCases)('should convert CIDR /$cidr to wildcard $expected', ({ cidr, expected }) => {
      expect(NetworkUtils.cidrToWildcard(cidr)).toBe(expected);
    });

    it('should throw error for invalid CIDR values', () => {
      expect(() => NetworkUtils.cidrToWildcard(-1)).toThrow();
      expect(() => NetworkUtils.cidrToWildcard(33)).toThrow();
    });
  });
});
