import { describe, it, expect } from 'bun:test';
import { VlanConfigSchema, parseVlanConfig, parseVlanConfigStrict, type VlanConfig } from './vlan.ts';

describe('VlanConfigSchema', () => {
  const validVlanConfig: VlanConfig = {
    id: '10',
    name: 'VLAN10',
    state: 'active',
  };

  it('should parse valid VLAN config', () => {
    const result = parseVlanConfig(validVlanConfig);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('10');
      expect(result.data.name).toBe('VLAN10');
      expect(result.data.state).toBe('active');
    }
  });

  it('should parse VLAN config with default state', () => {
    const vlanWithoutState = {
      id: '20',
      name: 'VLAN20',
    };
    const result = parseVlanConfig(vlanWithoutState);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.state).toBe('active'); // default value
    }
  });

  it('should accept all valid VLAN states', () => {
    const states = ['active', 'suspended', 'act/unsup'];
    for (const state of states) {
      const vlanConfig = {
        id: '30',
        name: 'VLAN30',
        state: state as any,
      };
      const result = parseVlanConfig(vlanConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.state).toBe(state);
      }
    }
  });

  it('should throw on VLAN config with invalid ID (too low)', () => {
    const invalidVlan = {
      ...validVlanConfig,
      id: '0',
    };
    expect(() => parseVlanConfigStrict(invalidVlan)).toThrow();
    
    const safeResult = parseVlanConfig(invalidVlan);
    expect(safeResult.success).toBe(false);
    if (!safeResult.success) {
      expect(safeResult.error.issues[0]?.message).toBe('Invalid VLAN ID');
    }
  });

  it('should throw on VLAN config with invalid ID (too high)', () => {
    const invalidVlan = {
      ...validVlanConfig,
      id: '4095',
    };
    expect(() => parseVlanConfigStrict(invalidVlan)).toThrow();
    
    const safeResult = parseVlanConfig(invalidVlan);
    expect(safeResult.success).toBe(false);
    if (!safeResult.success) {
      expect(safeResult.error.issues[0]?.message).toBe('Invalid VLAN ID');
    }
  });

  it('should throw on VLAN config with non-integer ID', () => {
    const invalidVlan = {
      ...validVlanConfig,
      id: 'ten',
    };
    expect(() => parseVlanConfigStrict(invalidVlan)).toThrow();
    
    const safeResult = parseVlanConfig(invalidVlan);
    expect(safeResult.success).toBe(false);
    if (!safeResult.success) {
      expect(safeResult.error.issues[0]?.message).toBe('Invalid VLAN ID');
    }
  });

  it('should throw on VLAN config with empty name', () => {
    const invalidVlan = {
      ...validVlanConfig,
      name: '',
    };
    expect(() => parseVlanConfigStrict(invalidVlan)).toThrow();
    
    const safeResult = parseVlanConfig(invalidVlan);
    expect(safeResult.success).toBe(false);
    if (!safeResult.success) {
      expect(safeResult.error.issues[0]?.message).toBe('VLAN name is required');
    }
  });

  it('should throw on VLAN config with name too long', () => {
    const invalidVlan = {
      ...validVlanConfig,
      name: 'a'.repeat(33), // 33 characters, max is 32
    };
    expect(() => parseVlanConfigStrict(invalidVlan)).toThrow();
    
    const safeResult = parseVlanConfig(invalidVlan);
    expect(safeResult.success).toBe(false);
    if (!safeResult.success) {
      expect(safeResult.error.issues[0]?.message).toBe('VLAN name must be 32 characters or less');
    }
  });

  it('should throw on VLAN config with invalid state', () => {
    const invalidVlan = {
      ...validVlanConfig,
      state: 'invalid' as any,
    };
    expect(() => parseVlanConfigStrict(invalidVlan)).toThrow();
    
    const safeResult = parseVlanConfig(invalidVlan);
    expect(safeResult.success).toBe(false);
    if (!safeResult.success) {
      expect(safeResult.error.issues[0]?.code).toBe('invalid_value');
      expect(safeResult.error.issues[0]?.message).toContain('expected one of "active"|"suspended"|"act/unsup"');
    }
  });

  it('should accept various valid VLAN IDs', () => {
    const validIds = ['1', '2', '100', '1001', '1002', '1005', '1006', '2000', '4094'];
    for (const id of validIds) {
      const vlanConfig = {
        id: id,
        name: 'VLAN' + id,
        state: 'active',
      };
      const result = parseVlanConfig(vlanConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(id);
      }
    }
  });

  it('should accept various valid VLAN names', () => {
    const validNames = [
      'VLAN1',
      'Sales',
      'Engineering',
      'Guest_WiFi',
      'VOICE',
      'VIDEO',
      'DATA',
      'MGMT',
      'DEFAULT',
      'a'.repeat(32), // exactly 32 characters
    ];
    for (const name of validNames) {
      const vlanConfig = {
        id: '100',
        name: name,
        state: 'active',
      };
      const result = parseVlanConfig(vlanConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe(name);
      }
    }
  });
});
