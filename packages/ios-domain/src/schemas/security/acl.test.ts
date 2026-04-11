import { describe, it, expect } from 'bun:test';
import { AclConfigSchema, parseAclConfig, parseAclConfigStrict, type AclConfig } from './acl.ts';

describe('AclConfigSchema', () => {
  const validStandardAcl: AclConfig = {
    name: 'STD_ACL',
    type: 'standard',
    rules: [
      {
        action: 'permit',
        protocol: 'ip',
        source: '192.168.1.0',
        sourceWildcard: '0.0.0.255',
      },
      {
        action: 'deny',
        protocol: 'ip',
        source: '10.0.0.0',
        sourceWildcard: '0.255.255.255',
      }
    ]
  };

  const validExtendedAcl: AclConfig = {
    name: 'EXT_ACL',
    type: 'extended',
    rules: [
      {
        action: 'permit',
        protocol: 'tcp',
        source: '192.168.1.0',
        sourceWildcard: '0.0.0.255',
        sourcePort: 'eq 80',
        destination: '10.0.0.0',
        destinationWildcard: '0.0.0.255',
        destinationPort: 'eq 443',
        log: true
      },
      {
        action: 'deny',
        protocol: 'udp',
        source: '172.16.0.0',
        sourceWildcard: '0.0.255.255',
        destination: '192.168.0.0',
        destinationWildcard: '0.0.255.255',
        log: false
      }
    ]
  };

  const validProtocolNumberAcl: AclConfig = {
    name: 'PROTO_NUM_ACL',
    type: 'extended',
    rules: [
      {
        action: 'permit',
        protocol: 89, // OSPF protocol number
        source: '192.168.1.0',
        sourceWildcard: '0.0.0.255',
      }
    ]
  };

  it('should parse valid standard ACL', () => {
    const result = parseAclConfig(validStandardAcl);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('STD_ACL');
      expect(result.data.type).toBe('standard');
      expect(result.data.rules).toHaveLength(2);
    }
  });

  it('should parse valid extended ACL', () => {
    const result = parseAclConfig(validExtendedAcl);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('EXT_ACL');
      expect(result.data.type).toBe('extended');
      expect(result.data.rules).toHaveLength(2);
      expect(result.data.rules[0].protocol).toBe('tcp');
      expect(result.data.rules[0].sourcePort).toBe('eq 80');
      expect(result.data.rules[0].destinationPort).toBe('eq 443');
      expect(result.data.rules[0].log).toBe(true);
    }
  });

  it('should parse valid protocol number ACL', () => {
    const result = parseAclConfig(validProtocolNumberAcl);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('PROTO_NUM_ACL');
      expect(result.data.type).toBe('extended');
      expect(result.data.rules[0].protocol).toBe(89);
    }
  });

  it('should throw on ACL with empty name', () => {
    const invalidAcl = {
      ...validStandardAcl,
      name: ''
    };
    expect(() => parseAclConfigStrict(invalidAcl)).toThrow();
    
    const safeResult = parseAclConfig(invalidAcl);
    expect(safeResult.success).toBe(false);
    if (!safeResult.success) {
      expect(safeResult.error.issues[0]?.message).toBe('ACL name is required');
    }
  });

  it('should throw on ACL with invalid type', () => {
    const invalidAcl = {
      ...validStandardAcl,
      type: 'invalid' as any
    };
    expect(() => parseAclConfigStrict(invalidAcl)).toThrow();
    
    const safeResult = parseAclConfig(invalidAcl);
    expect(safeResult.success).toBe(false);
    if (!safeResult.success) {
      expect(safeResult.error.issues[0]?.code).toBe('invalid_value');
      expect(safeResult.error.issues[0]?.message).toContain('expected one of "standard"|"extended"');
    }
  });

  it('should throw on ACL with empty rules array', () => {
    const invalidAcl = {
      ...validStandardAcl,
      rules: []
    };
    expect(() => parseAclConfigStrict(invalidAcl)).toThrow();
    
    const safeResult = parseAclConfig(invalidAcl);
    expect(safeResult.success).toBe(false);
    if (!safeResult.success) {
      expect(safeResult.error.issues[0]?.message).toBe('At least one rule is required');
    }
  });

  it('should throw on rule with invalid IPv4 address', () => {
    const invalidAcl = {
      ...validStandardAcl,
      rules: [
        {
          ...validStandardAcl.rules[0],
          source: '999.999.999.999'
        }
      ]
    };
    expect(() => parseAclConfigStrict(invalidAcl)).toThrow();
    
    const safeResult = parseAclConfig(invalidAcl);
    expect(safeResult.success).toBe(false);
    if (!safeResult.success) {
      expect(safeResult.error.issues[0]?.message).toBe('Invalid IPv4 address');
    }
  });

  it('should throw on rule with invalid wildcard mask', () => {
    const invalidAcl = {
      ...validStandardAcl,
      rules: [
        {
          ...validStandardAcl.rules[0],
          sourceWildcard: '255.255.255.256'
        }
      ]
    };
    expect(() => parseAclConfigStrict(invalidAcl)).toThrow();
    
    const safeResult = parseAclConfig(invalidAcl);
    expect(safeResult.success).toBe(false);
    if (!safeResult.success) {
      expect(safeResult.error.issues[0]?.message).toBe('Invalid wildcard mask');
    }
  });

  it('should throw on rule with invalid protocol', () => {
    const invalidAcl = {
      ...validStandardAcl,
      rules: [
        {
          ...validStandardAcl.rules[0],
          protocol: 'invalid' as any
        }
      ]
    };
    expect(() => parseAclConfigStrict(invalidAcl)).toThrow();
    
    const safeResult = parseAclConfig(invalidAcl);
    expect(safeResult.success).toBe(false);
    if (!safeResult.success) {
      expect(safeResult.error.issues[0]?.code).toBe('invalid_union');
      expect(safeResult.error.issues[0]?.message).toContain('Invalid input');
    }
  });

  it('should throw on rule with invalid port specification', () => {
    const invalidAcl = {
      ...validStandardAcl,
      rules: [
        {
          ...validStandardAcl.rules[0],
          sourcePort: 'invalid'
        }
      ]
    };
    expect(() => parseAclConfigStrict(invalidAcl)).toThrow();
    
    const safeResult = parseAclConfig(invalidAcl);
    expect(safeResult.success).toBe(false);
    if (!safeResult.success) {
      expect(safeResult.error.issues[0]?.message).toBe('Invalid port specification');
    }
  });

  it('should accept rule with valid port specifications', () => {
    const validPortAcl = {
      name: 'PORT_TEST',
      type: 'extended',
      rules: [
        {
          action: 'permit',
          protocol: 'tcp',
          source: '192.168.1.0',
          sourceWildcard: '0.0.0.255',
          sourcePort: 'eq 80'
        },
        {
          action: 'deny',
          protocol: 'tcp',
          source: '192.168.1.0',
          sourceWildcard: '0.0.0.255',
          sourcePort: 'lt 1024'
        },
        {
          action: 'permit',
          protocol: 'tcp',
          source: '192.168.1.0',
          sourceWildcard: '0.0.0.255',
          sourcePort: 'gt 1023'
        },
        {
          action: 'deny',
          protocol: 'tcp',
          source: '192.168.1.0',
          sourceWildcard: '0.0.0.255',
          sourcePort: 'neq 80'
        },
        {
          action: 'permit',
          protocol: 'tcp',
          source: '192.168.1.0',
          sourceWildcard: '0.0.0.255',
          sourcePort: 'range 8000 8080'
        }
      ]
    };
    const result = parseAclConfig(validPortAcl);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rules).toHaveLength(5);
    }
  });
});
