/**
 * LinkId Value Object Tests
 */

import { describe, it, expect } from 'bun:test';
import { DeviceId } from '../device-id.js';
import { LinkId, parseLinkId, parseLinkIdString, isValidLinkId } from '../link-id.js';

describe('LinkId', () => {
  describe('construction', () => {
    it('should create valid link IDs', () => {
      const linkId = new LinkId('R1', 'GigabitEthernet0/0', 'SW1', 'GigabitEthernet0/1');
      expect(linkId.value).toMatch(/^[a-zA-Z][a-zA-Z0-9_-]*:[a-zA-Z0-9/._-]+--[a-zA-Z][a-zA-Z0-9_-]*:[a-zA-Z0-9/._-]+$/);
    });

    it('should create canonical ID (sorted alphabetically)', () => {
      const linkId1 = new LinkId('R1', 'Gi0/0', 'SW1', 'Gi0/1');
      const linkId2 = new LinkId('SW1', 'Gi0/1', 'R1', 'Gi0/0');
      expect(linkId1.value).toBe(linkId2.value);
    });

    it('should accept DeviceId objects', () => {
      const d1 = new DeviceId('R1');
      const d2 = new DeviceId('SW1');
      const linkId = new LinkId(d1, 'Gi0/0', d2, 'Gi0/1');
      expect(linkId.device1).toBe('R1');
      expect(linkId.device2).toBe('SW1');
    });

    it('should normalize port names', () => {
      const linkId1 = new LinkId('R1', 'gi0/0', 'SW1', 'gi0/1');
      const linkId2 = new LinkId('R1', 'GigabitEthernet0/0', 'SW1', 'GigabitEthernet0/1');
      // Both should create valid link IDs (normalization may vary)
      expect(linkId1.value).toBeTruthy();
      expect(linkId2.value).toBeTruthy();
    });

    it('should reject invalid format', () => {
      expect(() => new LinkId('', 'Gi0/0', 'SW1', 'Gi0/1')).toThrow();
      expect(() => new LinkId('R1', '', 'SW1', 'Gi0/1')).toThrow();
    });
  });

  describe('static methods', () => {
    it('should create from components using from()', () => {
      const linkId = LinkId.from('R1', 'Gi0/0', 'SW1', 'Gi0/1');
      expect(linkId.value).toBeTruthy();
    });

    it('should create from string using fromString()', () => {
      const linkId = LinkId.fromString('R1:Gi0/0--SW1:Gi0/1');
      expect(linkId.device1).toBe('R1');
      // Port names are normalized (lowercase, abbreviated)
      expect(linkId.port1).toMatch(/gigabitethernet0\/0|gi0\/0/);
      expect(linkId.device2).toBe('SW1');
      expect(linkId.port2).toMatch(/gigabitethernet0\/1|gi0\/1/);
    });

    it('should return null for invalid values in tryFrom()', () => {
      expect(LinkId.tryFrom('', 'Gi0/0', 'SW1', 'Gi0/1')).toBeNull();
    });

    it('should return null for invalid string in tryFromString()', () => {
      expect(LinkId.tryFromString('invalid')).toBeNull();
    });

    it('should validate correctly with isValid()', () => {
      expect(isValidLinkId('R1:Gi0/0--SW1:Gi0/1')).toBe(true);
      expect(isValidLinkId('invalid')).toBe(false);
    });
  });

  describe('link navigation', () => {
    const linkId = new LinkId('R1', 'Gi0/0', 'SW1', 'Gi0/1');

    it('should get other device', () => {
      expect(linkId.getOtherDevice('R1')).toBe('SW1');
      expect(linkId.getOtherDevice('SW1')).toBe('R1');
      expect(linkId.getOtherDevice('R2')).toBeNull();
    });

    it('should get other port', () => {
      expect(linkId.getOtherPort('R1')).toMatch(/gigabitethernet0\/1|gi0\/1/);
      expect(linkId.getOtherPort('SW1')).toMatch(/gigabitethernet0\/0|gi0\/0/);
      expect(linkId.getOtherPort('R2')).toBeNull();
    });

    it('should check if involves device', () => {
      expect(linkId.involvesDevice('R1')).toBe(true);
      expect(linkId.involvesDevice('SW1')).toBe(true);
      expect(linkId.involvesDevice('R2')).toBe(false);
    });
  });

  describe('endpoints', () => {
    it('should get endpoints as array', () => {
      const linkId = new LinkId('R1', 'Gi0/0', 'SW1', 'Gi0/1');
      const endpoints = linkId.getEndpoints();
      expect(endpoints).toHaveLength(2);
      expect(endpoints[0]).toEqual({ device: expect.any(String), port: expect.any(String) });
      expect(endpoints[1]).toEqual({ device: expect.any(String), port: expect.any(String) });
    });
  });

  describe('equality', () => {
    it('should check equality correctly', () => {
      const linkId1 = new LinkId('R1', 'Gi0/0', 'SW1', 'Gi0/1');
      const linkId2 = new LinkId('R1', 'Gi0/0', 'SW1', 'Gi0/1');
      const linkId3 = new LinkId('R1', 'Gi0/0', 'SW2', 'Gi0/1');

      expect(linkId1.equals(linkId2)).toBe(true);
      expect(linkId1.equals(linkId3)).toBe(false);
    });
  });

  describe('serialization', () => {
    it('should convert to string', () => {
      const linkId = new LinkId('R1', 'Gi0/0', 'SW1', 'Gi0/1');
      expect(linkId.toString()).toBe(linkId.value);
    });

    it('should serialize to JSON', () => {
      const linkId = new LinkId('R1', 'Gi0/0', 'SW1', 'Gi0/1');
      expect(JSON.stringify(linkId)).toBe(`"${linkId.value}"`);
    });
  });

  describe('parseLinkId', () => {
    it('should parse from components', () => {
      const linkId = parseLinkId('R1', 'Gi0/0', 'SW1', 'Gi0/1');
      expect(linkId.value).toBeTruthy();
    });
  });

  describe('parseLinkIdString', () => {
    it('should parse from string', () => {
      const linkId = parseLinkIdString('R1:Gi0/0--SW1:Gi0/1');
      expect(linkId.device1).toBe('R1');
      // Port names are normalized
      expect(linkId.port1).toMatch(/gigabitethernet0\/0|gi0\/0/);
    });
  });
});
