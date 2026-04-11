import { describe, it, expect } from 'bun:test';
import { parseEigrpConfig, parseEigrpConfigStrict } from './eigrp.ts';

describe('EIGRP Schema Validation', () => {
  const validConfig = {
    device: 'R1',
    type: 'eigrp',
    autonomousSystem: 100,
    networks: [
      { network: '10.0.0.0', wildcard: '0.0.0.255' },
    ],
    passiveInterfaces: ['GigabitEthernet0/0'],
  };

  it('should parse valid EIGRP configuration', () => {
    const result = parseEigrpConfig(validConfig);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual(validConfig);
  });

  it('should reject invalid ASN', () => {
    const invalid = { ...validConfig, autonomousSystem: 'not-a-number' };
    expect(() => parseEigrpConfigStrict(invalid)).toThrow();
    const safe = parseEigrpConfig(invalid);
    expect(safe.success).toBe(false);
    if (!safe.success) expect(safe.error.issues[0]?.message).toContain('Invalid ASN');
  });

  it('should reject invalid IPv4/network inputs', () => {
    const invalid = { ...validConfig, networks: [{ network: '10.0.0.256', wildcard: '0.0.0.255' }] };
    expect(() => parseEigrpConfigStrict(invalid)).toThrow();
    const safe = parseEigrpConfig(invalid);
    expect(safe.success).toBe(false);
    if (!safe.success) expect(safe.error.issues[0]?.message).toContain('Invalid IPv4 address');
  });

  it('should reject invalid interface names', () => {
    const invalid = { ...validConfig, passiveInterfaces: ['Bad!Int0'] };
    expect(() => parseEigrpConfigStrict(invalid)).toThrow();
    const safe = parseEigrpConfig(invalid);
    expect(safe.success).toBe(false);
    if (!safe.success) expect(safe.error.issues[0]?.message).toContain('Invalid interface name');
  });
});
