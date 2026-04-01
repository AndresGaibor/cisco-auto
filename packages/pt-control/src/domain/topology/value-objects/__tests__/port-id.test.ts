/**
 * PortId Value Object Tests
 */

import { describe, it, expect } from 'bun:test';
import { DeviceId } from '../device-id.js';
import { PortId, parsePortId, parsePortIdString, isValidPortId } from '../port-id.js';

describe('PortId', () => {
  describe('construction', () => {
    it('should create valid port IDs', () => {
      expect(() => new PortId('R1', 'GigabitEthernet0/0')).not.toThrow();
      expect(() => new PortId('SW1', 'FastEthernet0/1')).not.toThrow();
      expect(() => new PortId('R1', 'Serial0/0/0')).not.toThrow();
    });

    it('should accept DeviceId objects', () => {
      const deviceId = new DeviceId('R1');
      const portId = new PortId(deviceId, 'Gi0/0');
      expect(portId.device).toBe('R1');
      expect(portId.port).toBe('Gi0/0');
    });

    it('should trim port name', () => {
      const portId = new PortId('R1', '  Gi0/0  ');
      expect(portId.port).toBe('Gi0/0');
    });

    it('should reject empty port names', () => {
      expect(() => new PortId('R1', '')).toThrow('Port name cannot be empty');
      expect(() => new PortId('R1', '   ')).toThrow('Port name cannot be empty');
    });

    it('should reject invalid format', () => {
      expect(() => new PortId('', 'Gi0/0')).toThrow();
      expect(() => new PortId('1R', 'Gi0/0')).toThrow();
    });
  });

  describe('static methods', () => {
    it('should create from device and port using from()', () => {
      const portId = PortId.from('R1', 'Gi0/0');
      expect(portId.value).toBe('R1:Gi0/0');
    });

    it('should create from string using fromString()', () => {
      const portId = PortId.fromString('R1:Gi0/0');
      expect(portId.device).toBe('R1');
      expect(portId.port).toBe('Gi0/0');
    });

    it('should return null for invalid values in tryFrom()', () => {
      expect(PortId.tryFrom('R1', '')).toBeNull();
      expect(PortId.tryFrom('', 'Gi0/0')).toBeNull();
    });

    it('should return null for invalid string in tryFromString()', () => {
      expect(PortId.tryFromString('invalid')).toBeNull();
    });

    it('should validate correctly with isValid()', () => {
      expect(isValidPortId('R1:Gi0/0')).toBe(true);
      expect(isValidPortId('invalid')).toBe(false);
    });
  });

  describe('properties', () => {
    it('should get device and port', () => {
      const portId = new PortId('R1', 'Gi0/0');
      expect(portId.device).toBe('R1');
      expect(portId.port).toBe('Gi0/0');
    });

    it('should check if on device', () => {
      const portId = new PortId('R1', 'Gi0/0');
      expect(portId.isOnDevice('R1')).toBe(true);
      expect(portId.isOnDevice('R2')).toBe(false);
    });

    it('should check if on DeviceId object', () => {
      const portId = new PortId('R1', 'Gi0/0');
      const deviceId = new DeviceId('R1');
      expect(portId.isOnDevice(deviceId)).toBe(true);
    });
  });

  describe('equality', () => {
    it('should check equality correctly', () => {
      const portId1 = new PortId('R1', 'Gi0/0');
      const portId2 = new PortId('R1', 'Gi0/0');
      const portId3 = new PortId('R1', 'Gi0/1');

      expect(portId1.equals(portId2)).toBe(true);
      expect(portId1.equals(portId3)).toBe(false);
    });
  });

  describe('serialization', () => {
    it('should convert to string', () => {
      const portId = new PortId('R1', 'Gi0/0');
      expect(portId.toString()).toBe('R1:Gi0/0');
    });

    it('should convert to object', () => {
      const portId = new PortId('R1', 'Gi0/0');
      expect(portId.toObject()).toEqual({ device: 'R1', port: 'Gi0/0' });
    });

    it('should serialize to JSON', () => {
      const portId = new PortId('R1', 'Gi0/0');
      expect(JSON.stringify(portId)).toBe('"R1:Gi0/0"');
    });
  });

  describe('parsePortId', () => {
    it('should parse from device and port', () => {
      const portId = parsePortId('R1', 'Gi0/0');
      expect(portId.value).toBe('R1:Gi0/0');
    });
  });

  describe('parsePortIdString', () => {
    it('should parse from string', () => {
      const portId = parsePortIdString('R1:Gi0/0');
      expect(portId.device).toBe('R1');
      expect(portId.port).toBe('Gi0/0');
    });
  });
});
