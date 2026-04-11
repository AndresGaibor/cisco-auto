import { describe, it, expect } from 'bun:test';
import {
  parseOspfConfig,
  parseOspfConfigStrict,
} from './ospf.ts';

describe('OSPF Schema Validation', () => {
  const validConfig = {
    device: 'R1',
    type: 'ospf',
    processId: 1,
    routerId: '1.1.1.1',
    networks: [
      {
        network: '10.0.0.0',
        wildcard: '0.0.0.255',
        area: 0,
      },
      {
        network: '192.168.1.0',
        wildcard: '0.0.0.255',
        area: 1,
      },
    ],
    passiveInterfaces: ['GigabitEthernet0/0'],
    areas: {
      0: {
        stub: true,
      },
    },
  };

  it('should parse valid OSPF configuration', () => {
    const result = parseOspfConfig(validConfig);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validConfig);
    }
  });

  it('should throw on invalid processId (too low)', () => {
    const invalidConfig = { ...validConfig, processId: 0 };
    expect(() => parseOspfConfigStrict(invalidConfig)).toThrow();

    const safeResult = parseOspfConfig(invalidConfig);
    expect(safeResult.success).toBe(false);
    if (!safeResult.success) {
      expect(safeResult.error.issues[0]?.code).toBe('too_small');
    }
  });

  it('should throw on invalid processId (too high)', () => {
    const invalidConfig = { ...validConfig, processId: 65536 };
    expect(() => parseOspfConfigStrict(invalidConfig)).toThrow();

    const safeResult = parseOspfConfig(invalidConfig);
    expect(safeResult.success).toBe(false);
    if (!safeResult.success) {
      expect(safeResult.error.issues[0]?.code).toBe('too_big');
    }
  });

  it('should throw on invalid IPv4 address in routerId', () => {
    const invalidConfig = { ...validConfig, routerId: '999.1.1.1' };
    expect(() => parseOspfConfigStrict(invalidConfig)).toThrow();

    const safeResult = parseOspfConfig(invalidConfig);
    expect(safeResult.success).toBe(false);
    if (!safeResult.success) {
      expect(safeResult.error.issues[0]?.message).toContain('Invalid IPv4 address');
    }
  });

  it('should throw on invalid IPv4 address in network', () => {
    const invalidConfig = {
      ...validConfig,
      networks: [
        {
          ...validConfig.networks[0],
          network: '10.0.0.256',
        },
      ],
    };
    expect(() => parseOspfConfigStrict(invalidConfig)).toThrow();

    const safeResult = parseOspfConfig(invalidConfig);
    expect(safeResult.success).toBe(false);
    if (!safeResult.success) {
      expect(safeResult.error.issues[0]?.message).toContain('Invalid IPv4 address');
    }
  });

  it('should throw on invalid wildcard mask', () => {
    const invalidConfig = {
      ...validConfig,
      networks: [
        {
          ...validConfig.networks[0],
          wildcard: '0.0.0.256',
        },
      ],
    };
    expect(() => parseOspfConfigStrict(invalidConfig)).toThrow();

    const safeResult = parseOspfConfig(invalidConfig);
    expect(safeResult.success).toBe(false);
    if (!safeResult.success) {
      expect(safeResult.error.issues[0]?.message).toContain('Invalid wildcard mask');
    }
  });

  it('should throw on invalid interface name', () => {
    const invalidConfig = {
      ...validConfig,
      passiveInterfaces: ['Invalid!0/0'],
    };
    expect(() => parseOspfConfigStrict(invalidConfig)).toThrow();

    const safeResult = parseOspfConfig(invalidConfig);
    expect(safeResult.success).toBe(false);
    if (!safeResult.success) {
      expect(safeResult.error.issues[0]?.message).toContain('Invalid interface name');
    }
  });

  it('should reject wrong type literal', () => {
    const invalidConfig = { ...validConfig, type: 'rip' as const };
    expect(() => parseOspfConfigStrict(invalidConfig)).toThrow();

    const safeResult = parseOspfConfig(invalidConfig);
    expect(safeResult.success).toBe(false);
    if (!safeResult.success) {
      expect(safeResult.error.issues[0]?.code).toBe('invalid_value');
    }
  });

  it('should allow missing optional fields', () => {
    const minimalConfig = {
      device: 'R1',
      type: 'ospf',
      processId: 1,
      networks: [
        {
          network: '10.0.0.0',
          wildcard: '0.0.0.255',
          area: 0,
        },
      ],
    };

    const result = parseOspfConfig(minimalConfig);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.device).toBe('R1');
      expect(result.data.type).toBe('ospf');
      expect(result.data.processId).toBe(1);
      expect(result.data.networks).toHaveLength(1);
      expect(result.data.routerId).toBeUndefined();
      expect(result.data.passiveInterfaces).toBeUndefined();
      expect(result.data.areas).toBeUndefined();
    }
  });
});
