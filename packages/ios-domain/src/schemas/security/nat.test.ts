import { describe, it, expect } from 'bun:test';
import { NatConfigSchema, parseNatConfig, parseNatConfigStrict, type NatConfig } from './nat.ts';

describe('NatConfigSchema', () => {
  const validStaticNat: NatConfig = {
    type: 'static',
    insideInterface: 'GigabitEthernet0/0',
    outsideInterface: 'GigabitEthernet0/1',
  };

  const validDynamicNat: NatConfig = {
    type: 'dynamic',
    insideInterface: 'GigabitEthernet0/0',
    outsideInterface: 'GigabitEthernet0/1',
  };

  const validPatNat: NatConfig = {
    type: 'pat',
    insideInterface: 'GigabitEthernet0/0',
    outsideInterface: 'GigabitEthernet0/1',
  };

  it('should parse valid static NAT config', () => {
    const result = parseNatConfig(validStaticNat);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('static');
      expect(result.data.insideInterface).toBe('GigabitEthernet0/0');
      expect(result.data.outsideInterface).toBe('GigabitEthernet0/1');
    }
  });

  it('should parse valid dynamic NAT config', () => {
    const result = parseNatConfig(validDynamicNat);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('dynamic');
      expect(result.data.insideInterface).toBe('GigabitEthernet0/0');
      expect(result.data.outsideInterface).toBe('GigabitEthernet0/1');
    }
  });

  it('should parse valid PAT NAT config', () => {
    const result = parseNatConfig(validPatNat);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('pat');
      expect(result.data.insideInterface).toBe('GigabitEthernet0/0');
      expect(result.data.outsideInterface).toBe('GigabitEthernet0/1');
    }
  });

  it('should throw on NAT config with invalid type', () => {
    const invalidNat = {
      ...validStaticNat,
      type: 'invalid' as any
    };
    expect(() => parseNatConfigStrict(invalidNat)).toThrow();
    
    const safeResult = parseNatConfig(invalidNat);
    expect(safeResult.success).toBe(false);
    if (!safeResult.success) {
      expect(safeResult.error.issues[0]?.code).toBe('invalid_value');
      expect(safeResult.error.issues[0]?.message).toContain('expected one of "static"|"dynamic"|"pat"');
    }
  });

  it('should throw on NAT config with empty inside interface', () => {
    const invalidNat = {
      ...validStaticNat,
      insideInterface: ''
    };
    expect(() => parseNatConfigStrict(invalidNat)).toThrow();
    
    const safeResult = parseNatConfig(invalidNat);
    expect(safeResult.success).toBe(false);
    if (!safeResult.success) {
      expect(safeResult.error.issues[0]?.message).toBe('Invalid interface name');
    }
  });

  it('should throw on NAT config with invalid inside interface format', () => {
    const invalidNat = {
      ...validStaticNat,
      insideInterface: 'Invalid Interface Name'
    };
    expect(() => parseNatConfigStrict(invalidNat)).toThrow();
    
    const safeResult = parseNatConfig(invalidNat);
    expect(safeResult.success).toBe(false);
    if (!safeResult.success) {
      expect(safeResult.error.issues[0]?.message).toBe('Invalid interface name');
    }
  });

  it('should throw on NAT config with empty outside interface', () => {
    const invalidNat = {
      ...validStaticNat,
      outsideInterface: ''
    };
    expect(() => parseNatConfigStrict(invalidNat)).toThrow();
    
    const safeResult = parseNatConfig(invalidNat);
    expect(safeResult.success).toBe(false);
    if (!safeResult.success) {
      expect(safeResult.error.issues[0]?.message).toBe('Invalid interface name');
    }
  });

  it('should throw on NAT config with invalid outside interface format', () => {
    const invalidNat = {
      ...validStaticNat,
      outsideInterface: 'Invalid Interface Name'
    };
    expect(() => parseNatConfigStrict(invalidNat)).toThrow();
    
    const safeResult = parseNatConfig(invalidNat);
    expect(safeResult.success).toBe(false);
    if (!safeResult.success) {
      expect(safeResult.error.issues[0]?.message).toBe('Invalid interface name');
    }
  });

  it('should accept various valid interface names', () => {
    const validInterfaces = [
      'GigabitEthernet0/0',
      'FastEthernet0/1',
      'Ethernet0/0',
      'Serial0/0/0',
      'VLAN100',
      'Loopback0',
      'PortChannel1',
      'Tunnel0',
      'GigabitEthernet0/0.100',
      'FastEthernet0/1.200'
    ];

    for (const interfaceName of validInterfaces) {
      const natConfig = {
        ...validStaticNat,
        insideInterface: interfaceName,
        outsideInterface: interfaceName
      };
      
      const result = parseNatConfig(natConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.insideInterface).toBe(interfaceName);
        expect(result.data.outsideInterface).toBe(interfaceName);
      }
    }
  });
});
