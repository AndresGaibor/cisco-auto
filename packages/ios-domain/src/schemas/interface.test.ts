import { describe, it, expect } from 'bun:test';
import { InterfaceConfigSchema, parseInterfaceConfig, parseInterfaceConfigStrict, type InterfaceConfig } from './interface.ts';

describe('InterfaceConfigSchema', () => {
  const validInterfaceConfig: InterfaceConfig = {
    name: 'GigabitEthernet0/0',
    ip: '192.168.1.1',
    mask: '255.255.255.0',
    description: 'Uplink to Core Switch',
    shutdown: false,
  };

  const validInterfaceConfigWithoutIp: InterfaceConfig = {
    name: 'VLAN100',
    description: 'Management VLAN',
    shutdown: true,
  };

  const validInterfaceConfigWithShutdownTrue: InterfaceConfig = {
    name: 'FastEthernet0/1',
    ip: '10.0.0.1',
    mask: '255.255.255.0',
    shutdown: true,
  };

  it('should parse valid interface config', () => {
    const result = parseInterfaceConfig(validInterfaceConfig);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('GigabitEthernet0/0');
      expect(result.data.ip).toBe('192.168.1.1');
      expect(result.data.mask).toBe('255.255.255.0');
      expect(result.data.description).toBe('Uplink to Core Switch');
      expect(result.data.shutdown).toBe(false);
    }
  });

  it('should parse valid interface config without IP', () => {
    const result = parseInterfaceConfig(validInterfaceConfigWithoutIp);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('VLAN100');
      expect(result.data.ip).toBeUndefined();
      expect(result.data.mask).toBeUndefined();
      expect(result.data.description).toBe('Management VLAN');
      expect(result.data.shutdown).toBe(true);
    }
  });

  it('should parse valid interface config with shutdown true', () => {
    const result = parseInterfaceConfig(validInterfaceConfigWithShutdownTrue);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('FastEthernet0/1');
      expect(result.data.ip).toBe('10.0.0.1');
      expect(result.data.mask).toBe('255.255.255.0');
      expect(result.data.description).toBeUndefined();
      expect(result.data.shutdown).toBe(true);
    }
  });

  it('should throw on interface config with empty name', () => {
    const invalidConfig = {
      ...validInterfaceConfig,
      name: ''
    };
    expect(() => parseInterfaceConfigStrict(invalidConfig)).toThrow();
    
    const safeResult = parseInterfaceConfig(invalidConfig);
    expect(safeResult.success).toBe(false);
    if (!safeResult.success) {
      expect(safeResult.error.issues[0]?.message).toBe('Invalid interface name');
    }
  });

  it('should throw on interface config with invalid interface name format', () => {
    const invalidConfig = {
      ...validInterfaceConfig,
      name: 'Invalid Interface Name'
    };
    expect(() => parseInterfaceConfigStrict(invalidConfig)).toThrow();
    
    const safeResult = parseInterfaceConfig(invalidConfig);
    expect(safeResult.success).toBe(false);
    if (!safeResult.success) {
      expect(safeResult.error.issues[0]?.message).toBe('Invalid interface name');
    }
  });

  it('should throw on interface config with invalid IPv4 address', () => {
    const invalidConfig = {
      ...validInterfaceConfig,
      ip: '999.999.999.999'
    };
    expect(() => parseInterfaceConfigStrict(invalidConfig)).toThrow();
    
    const safeResult = parseInterfaceConfig(invalidConfig);
    expect(safeResult.success).toBe(false);
    if (!safeResult.success) {
      expect(safeResult.error.issues[0]?.message).toBe('Invalid IPv4 address');
    }
  });

  it('should throw on interface config with invalid subnet mask', () => {
    const invalidConfig = {
      ...validInterfaceConfig,
      mask: '255.255.255.256'
    };
    expect(() => parseInterfaceConfigStrict(invalidConfig)).toThrow();
    
    const safeResult = parseInterfaceConfig(invalidConfig);
    expect(safeResult.success).toBe(false);
    if (!safeResult.success) {
      expect(safeResult.error.issues[0]?.message).toBe('Invalid subnet mask');
    }
  });

  it('should throw on interface config with invalid description (too long)', () => {
    const invalidConfig = {
      ...validInterfaceConfig,
      description: 'x'.repeat(241) // Exceeds 240 character limit
    };
    expect(() => parseInterfaceConfigStrict(invalidConfig)).toThrow();
    
    const safeResult = parseInterfaceConfig(invalidConfig);
    expect(safeResult.success).toBe(false);
    if (!safeResult.success) {
      expect(safeResult.error.issues[0]?.message).toBe('Invalid interface description');
    }
  });

  it('should throw on interface config with invalid description (line breaks)', () => {
    const invalidConfig = {
      ...validInterfaceConfig,
      description: 'Line1\nLine2'
    };
    expect(() => parseInterfaceConfigStrict(invalidConfig)).toThrow();
    
    const safeResult = parseInterfaceConfig(invalidConfig);
    expect(safeResult.success).toBe(false);
    if (!safeResult.success) {
      expect(safeResult.error.issues[0]?.message).toBe('Invalid interface description');
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
      const interfaceConfig = {
        ...validInterfaceConfig,
        name: interfaceName
      };
      
      const result = parseInterfaceConfig(interfaceConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe(interfaceName);
      }
    }
  });

  it('should accept various valid IPv4 addresses', () => {
    const validIps = [
      '0.0.0.0',
      '192.168.1.1',
      '10.0.0.1',
      '172.16.0.1',
      '255.255.255.255'
    ];

    for (const ip of validIps) {
      const interfaceConfig = {
        ...validInterfaceConfig,
        ip: ip
      };
      
      const result = parseInterfaceConfig(interfaceConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.ip).toBe(ip);
      }
    }
  });

  it('should accept various valid subnet masks', () => {
    const validMasks = [
      '0.0.0.0',
      '255.0.0.0',
      '255.255.0.0',
      '255.255.255.0',
      '255.255.255.252',
      '255.255.255.255'
    ];

    for (const mask of validMasks) {
      const interfaceConfig = {
        ...validInterfaceConfig,
        mask: mask
      };
      
      const result = parseInterfaceConfig(interfaceConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.mask).toBe(mask);
      }
    }
  });

  it('should accept various valid descriptions', () => {
    const validDescriptions = [
      'Uplink to Core Switch',
      'Management VLAN',
      'Server Farm Connection',
      '',
      'A'.repeat(240) // Maximum length
    ];

    for (const description of validDescriptions) {
      const interfaceConfig = {
        ...validInterfaceConfig,
        description: description === '' ? undefined : description
      };
      
      const result = parseInterfaceConfig(interfaceConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBe(description === '' ? undefined : description);
      }
    }
  });
});