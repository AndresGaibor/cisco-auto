import { describe, it, expect } from 'bun:test';
import {
  parseStaticRouteConfig,
  parseStaticRouteConfigStrict,
} from './static-route.ts';

describe('Static Route Schema Validation', () => {
  const validConfig = {
    device: 'R1',
    type: 'static-route',
    destination: '192.168.1.0',
    mask: '255.255.255.0',
    nextHop: '192.168.2.1',
  };

  it('should parse valid static route configuration', () => {
    const result = parseStaticRouteConfig(validConfig);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validConfig);
    }
  });

  it('should parse valid static route configuration with interface as next hop', () => {
    const configWithInterface = {
      ...validConfig,
      nextHop: 'GigabitEthernet0/0',
    };
    const result = parseStaticRouteConfig(configWithInterface);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(configWithInterface);
    }
  });

  it('should throw on invalid device (empty)', () => {
    const invalidConfig = { ...validConfig, device: '' };
    expect(() => parseStaticRouteConfigStrict(invalidConfig)).toThrow();

    const safeResult = parseStaticRouteConfig(invalidConfig);
    expect(safeResult.success).toBe(false);
    if (!safeResult.success) {
      expect(safeResult.error.issues[0]?.code).toBe('too_small');
    }
  });

  it('should throw on wrong type literal', () => {
    const invalidConfig = { ...validConfig, type: 'ospf' as const };
    expect(() => parseStaticRouteConfigStrict(invalidConfig)).toThrow();

    const safeResult = parseStaticRouteConfig(invalidConfig);
    expect(safeResult.success).toBe(false);
    if (!safeResult.success) {
      expect(safeResult.error.issues[0]?.code).toBe('invalid_value');
    }
  });

  it('should throw on invalid IPv4 address in destination', () => {
    const invalidConfig = {
      ...validConfig,
      destination: '999.1.1.1',
    };
    expect(() => parseStaticRouteConfigStrict(invalidConfig)).toThrow();

    const safeResult = parseStaticRouteConfig(invalidConfig);
    expect(safeResult.success).toBe(false);
    if (!safeResult.success) {
      expect(safeResult.error.issues[0]?.message).toContain('Invalid IPv4 address');
    }
  });

  it('should throw on invalid IPv4 address in mask', () => {
    const invalidConfig = {
      ...validConfig,
      mask: '255.255.255.256',
    };
    expect(() => parseStaticRouteConfigStrict(invalidConfig)).toThrow();

    const safeResult = parseStaticRouteConfig(invalidConfig);
    expect(safeResult.success).toBe(false);
    if (!safeResult.success) {
      expect(safeResult.error.issues[0]?.message).toContain('Invalid subnet mask');
    }
  });

  it('should throw on invalid IPv4 address in nextHop', () => {
    const invalidConfig = {
      ...validConfig,
      nextHop: '999.1.1.1',
    };
    expect(() => parseStaticRouteConfigStrict(invalidConfig)).toThrow();

    const safeResult = parseStaticRouteConfig(invalidConfig);
    expect(safeResult.success).toBe(false);
    if (!safeResult.success) {
      expect(safeResult.error.issues[0]?.message).toContain('Invalid next hop');
    }
  });

  it('should throw on invalid nextHop', () => {
    const invalidConfig = {
      ...validConfig,
      nextHop: 'Invalid!0/0',
    };
    expect(() => parseStaticRouteConfigStrict(invalidConfig)).toThrow();

    const safeResult = parseStaticRouteConfig(invalidConfig);
    expect(safeResult.success).toBe(false);
    if (!safeResult.success) {
      expect(safeResult.error.issues[0]?.message).toContain('Invalid next hop');
    }
  });

  it('should allow missing optional fields', () => {
    const minimalConfig = {
      device: 'R1',
      type: 'static-route',
      destination: '192.168.1.0',
      mask: '255.255.255.0',
      nextHop: '192.168.2.1',
    };

    const result = parseStaticRouteConfig(minimalConfig);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.device).toBe('R1');
      expect(result.data.type).toBe('static-route');
      expect(result.data.destination).toBe('192.168.1.0');
      expect(result.data.mask).toBe('255.255.255.0');
      expect(result.data.nextHop).toBe('192.168.2.1');
    }
  });
});
