import { describe, it, expect } from 'bun:test';
import { parseBgpConfig, parseBgpConfigStrict } from './bgp.ts';

describe('BGP Schema Validation', () => {
  const validConfig = {
    device: 'R1',
    type: 'bgp',
    autonomousSystem: 65000,
    neighbors: [
      { ip: '192.0.2.1', remoteAs: 65100 },
    ],
    networks: ['10.0.0.0/24'],
  };

  it('should parse valid BGP configuration', () => {
    const result = parseBgpConfig(validConfig);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual(validConfig);
  });

  it('should reject invalid ASN', () => {
    const invalid = { ...validConfig, autonomousSystem: 'not-a-number' };
    expect(() => parseBgpConfigStrict(invalid)).toThrow();
    const safe = parseBgpConfig(invalid);
    expect(safe.success).toBe(false);
    if (!safe.success) expect(safe.error.issues[0]?.message).toContain('Invalid ASN');
  });

  it('should reject invalid neighbor IP', () => {
    const invalid = { ...validConfig, neighbors: [{ ip: '999.999.999.999', remoteAs: 65100 }] };
    expect(() => parseBgpConfigStrict(invalid)).toThrow();
    const safe = parseBgpConfig(invalid);
    expect(safe.success).toBe(false);
    if (!safe.success) expect(safe.error.issues[0]?.message).toContain('Invalid IPv4 address');
  });

  it('should reject invalid network CIDR', () => {
    const invalid = { ...validConfig, networks: ['10.0.0.0/33'] };
    expect(() => parseBgpConfigStrict(invalid)).toThrow();
    const safe = parseBgpConfig(invalid);
    expect(safe.success).toBe(false);
    if (!safe.success) expect(safe.error.issues[0]?.message).toContain('Invalid network (CIDR)');
  });
});
