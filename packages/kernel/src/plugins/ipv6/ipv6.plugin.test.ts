import { describe, expect, test } from 'bun:test';
import { ipv6Plugin } from './index.js';
import { generateIpv6Commands } from './ipv6.generator.js';
import { ipv6ConfigSchema } from './ipv6.schema.js';

describe('ipv6 plugin', () => {
  // Metadata
  test('exposes the expected metadata', () => {
    expect(ipv6Plugin.id).toBe('ipv6');
    expect(ipv6Plugin.name).toBe('IPv6');
    expect(ipv6Plugin.category).toBe('routing');
    expect(ipv6Plugin.version).toBe('1.0.0');
    expect(ipv6Plugin.description).toContain('IPv6');
    expect(ipv6Plugin.commands).toHaveLength(1);
    expect(ipv6Plugin.commands[0].name).toBe('configure-ipv6');
  });

  // Schema validation
  test('schema accepts valid basic config', () => {
    const result = ipv6ConfigSchema.safeParse({
      deviceName: 'R1',
      routing: true,
      interfaces: [
        { name: 'GigabitEthernet0/0', address: '2001:db8:1::1/64' },
      ],
    });
    expect(result.success).toBe(true);
  });

  test('schema accepts valid config with EUI-64', () => {
    const result = ipv6ConfigSchema.safeParse({
      deviceName: 'R1',
      routing: true,
      interfaces: [
        { name: 'GigabitEthernet0/0', address: '2001:db8:1::/64', eui64: true },
      ],
    });
    expect(result.success).toBe(true);
  });

  test('schema accepts valid config with link-local', () => {
    const result = ipv6ConfigSchema.safeParse({
      deviceName: 'R1',
      interfaces: [
        { name: 'GigabitEthernet0/0', linkLocal: 'fe80::1' },
      ],
    });
    expect(result.success).toBe(true);
  });

  test('schema accepts valid config with autoconfig slaac', () => {
    const result = ipv6ConfigSchema.safeParse({
      deviceName: 'R1',
      interfaces: [
        { name: 'GigabitEthernet0/0', autoConfig: 'slaac' },
      ],
    });
    expect(result.success).toBe(true);
  });

  test('schema accepts valid config with autoconfig dhcpv6', () => {
    const result = ipv6ConfigSchema.safeParse({
      deviceName: 'R1',
      interfaces: [
        { name: 'GigabitEthernet0/0', autoConfig: 'dhcpv6' },
      ],
    });
    expect(result.success).toBe(true);
  });

  test('schema accepts valid static routes', () => {
    const result = ipv6ConfigSchema.safeParse({
      deviceName: 'R1',
      staticRoutes: [
        { network: '2001:db8:100::/64', nextHop: '2001:db8:1::2' },
      ],
    });
    expect(result.success).toBe(true);
  });

  test('schema accepts valid OSPFv3 config', () => {
    const result = ipv6ConfigSchema.safeParse({
      deviceName: 'R1',
      ospfv3: {
        processId: 1,
        routerId: '1.1.1.1',
        areas: [{ areaId: '0' }],
      },
    });
    expect(result.success).toBe(true);
  });

  test('schema accepts valid RIPng config', () => {
    const result = ipv6ConfigSchema.safeParse({
      deviceName: 'R1',
      ripng: {
        name: 'RIPNG1',
      },
    });
    expect(result.success).toBe(true);
  });

  test('schema rejects invalid IPv6 address', () => {
    const result = ipv6ConfigSchema.safeParse({
      deviceName: 'R1',
      interfaces: [
        { name: 'GigabitEthernet0/0', address: 'not-an-ipv6' },
      ],
    });
    expect(result.success).toBe(false);
  });

  test('schema rejects OSPFv3 with no areas', () => {
    const result = ipv6ConfigSchema.safeParse({
      deviceName: 'R1',
      ospfv3: {
        processId: 1,
        areas: [],
      },
    });
    expect(result.success).toBe(false);
  });

  test('schema rejects empty deviceName', () => {
    const result = ipv6ConfigSchema.safeParse({
      deviceName: '',
      routing: true,
    });
    expect(result.success).toBe(false);
  });

  // Command generation: ipv6 unicast-routing
  test('generates ipv6 unicast-routing when routing is true', () => {
    const commands = generateIpv6Commands({
      deviceName: 'R1',
      routing: true,
    });

    expect(commands).toContain('ipv6 unicast-routing');
  });

  test('does not generate ipv6 unicast-routing when routing is false', () => {
    const commands = generateIpv6Commands({
      deviceName: 'R1',
      routing: false,
    });

    expect(commands).not.toContain('ipv6 unicast-routing');
  });

  // Command generation: interfaces
  test('generates interface config with address', () => {
    const commands = generateIpv6Commands({
      deviceName: 'R1',
      interfaces: [
        { name: 'GigabitEthernet0/0', address: '2001:db8:1::1/64' },
      ],
    });

    expect(commands).toContain('interface GigabitEthernet0/0');
    expect(commands).toContain(' ipv6 enable');
    expect(commands).toContain(' ipv6 address 2001:db8:1::1/64');
  });

  test('generates interface config with EUI-64', () => {
    const commands = generateIpv6Commands({
      deviceName: 'R1',
      interfaces: [
        { name: 'GigabitEthernet0/0', address: '2001:db8:1::/64', eui64: true },
      ],
    });

    expect(commands).toContain(' ipv6 address 2001:db8:1::/64 eui-64');
  });

  test('generates interface config with link-local', () => {
    const commands = generateIpv6Commands({
      deviceName: 'R1',
      interfaces: [
        { name: 'GigabitEthernet0/0', linkLocal: 'fe80::1' },
      ],
    });

    expect(commands).toContain(' ipv6 address fe80::1 link-local');
  });

  test('generates interface config with autoconfig slaac', () => {
    const commands = generateIpv6Commands({
      deviceName: 'R1',
      interfaces: [
        { name: 'GigabitEthernet0/0', autoConfig: 'slaac' },
      ],
    });

    expect(commands).toContain(' ipv6 address autoconfig');
  });

  test('generates interface config with autoconfig dhcpv6', () => {
    const commands = generateIpv6Commands({
      deviceName: 'R1',
      interfaces: [
        { name: 'GigabitEthernet0/0', autoConfig: 'dhcpv6' },
      ],
    });

    expect(commands).toContain(' ipv6 address dhcp');
  });

  // Command generation: static routes
  test('generates static route with nextHop', () => {
    const commands = generateIpv6Commands({
      deviceName: 'R1',
      staticRoutes: [
        { network: '2001:db8:100::/64', nextHop: '2001:db8:1::2' },
      ],
    });

    expect(commands).toContain('! Rutas estáticas IPv6');
    expect(commands).toContain('ipv6 route 2001:db8:100::/64 2001:db8:1::2');
  });

  test('generates static route with interface and nextHop', () => {
    const commands = generateIpv6Commands({
      deviceName: 'R1',
      staticRoutes: [
        { network: '2001:db8:100::/64', interface: 'GigabitEthernet0/0', nextHop: '2001:db8:1::2' },
      ],
    });

    expect(commands).toContain('ipv6 route 2001:db8:100::/64 GigabitEthernet0/0 2001:db8:1::2');
  });

  test('generates static route with distance', () => {
    const commands = generateIpv6Commands({
      deviceName: 'R1',
      staticRoutes: [
        { network: '2001:db8:100::/64', nextHop: '2001:db8:1::2', distance: 10 },
      ],
    });

    expect(commands).toContain('ipv6 route 2001:db8:100::/64 2001:db8:1::2 10');
  });

  test('generates static route with name', () => {
    const commands = generateIpv6Commands({
      deviceName: 'R1',
      staticRoutes: [
        { network: '2001:db8:100::/64', nextHop: '2001:db8:1::2', name: 'TO_HQ' },
      ],
    });

    expect(commands).toContain('ipv6 route 2001:db8:100::/64 2001:db8:1::2 name TO_HQ');
  });

  // Command generation: OSPFv3
  test('generates OSPFv3 commands', () => {
    const commands = generateIpv6Commands({
      deviceName: 'R1',
      ospfv3: {
        processId: 1,
        routerId: '1.1.1.1',
        areas: [{ areaId: '0' }],
      },
    });

    expect(commands).toContain('! Configuración OSPFv3');
    expect(commands).toContain('ipv6 router ospf 1');
    expect(commands).toContain(' router-id 1.1.1.1');
    expect(commands).toContain(' exit');
  });

  test('generates OSPFv3 with stub area', () => {
    const commands = generateIpv6Commands({
      deviceName: 'R1',
      ospfv3: {
        processId: 1,
        areas: [{ areaId: '1', type: 'stub', stubNoSummary: true }],
      },
    });

    expect(commands).toContain(' area 1 stub no-summary');
  });

  test('generates OSPFv3 with NSSA area', () => {
    const commands = generateIpv6Commands({
      deviceName: 'R1',
      ospfv3: {
        processId: 1,
        areas: [{ areaId: '2', type: 'nssa', nssaDefaultOriginate: true }],
      },
    });

    expect(commands).toContain(' area 2 nssa default-information-originate');
  });

  test('generates OSPFv3 with default-information originate always', () => {
    const commands = generateIpv6Commands({
      deviceName: 'R1',
      ospfv3: {
        processId: 1,
        areas: [{ areaId: '0' }],
        defaultInformation: 'originate always',
      },
    });

    expect(commands).toContain(' default-information originate always');
  });

  test('generates OSPFv3 with auto-cost reference-bandwidth', () => {
    const commands = generateIpv6Commands({
      deviceName: 'R1',
      ospfv3: {
        processId: 1,
        areas: [{ areaId: '0' }],
        autoCostReferenceBandwidth: 1000,
      },
    });

    expect(commands).toContain(' auto-cost reference-bandwidth 1000');
  });

  // Command generation: RIPng
  test('generates RIPng commands', () => {
    const commands = generateIpv6Commands({
      deviceName: 'R1',
      ripng: {
        name: 'RIPNG1',
      },
    });

    expect(commands).toContain('! Configuración RIPng');
    expect(commands).toContain('ipv6 router rip RIPNG1');
  });

  test('generates RIPng with redistribution', () => {
    const commands = generateIpv6Commands({
      deviceName: 'R1',
      ripng: {
        name: 'RIPNG1',
        redistribute: ['ospf', 'static'],
      },
    });

    expect(commands).toContain(' redistribute ospf');
    expect(commands).toContain(' redistribute static');
  });

  test('generates RIPng with default-information', () => {
    const commands = generateIpv6Commands({
      deviceName: 'R1',
      ripng: {
        name: 'RIPNG1',
        defaultInformation: true,
      },
    });

    expect(commands).toContain(' default-information originate');
  });

  // Combined config
  test('generates combined IPv6 config', () => {
    const commands = generateIpv6Commands({
      deviceName: 'R1',
      routing: true,
      interfaces: [
        { name: 'GigabitEthernet0/0', address: '2001:db8:1::1/64' },
      ],
      staticRoutes: [
        { network: '2001:db8:100::/64', nextHop: '2001:db8:1::2' },
      ],
    });

    expect(commands).toContain('ipv6 unicast-routing');
    expect(commands).toContain('interface GigabitEthernet0/0');
    expect(commands).toContain('! Rutas estáticas IPv6');
    expect(commands).toContain('ipv6 route 2001:db8:100::/64 2001:db8:1::2');
  });

  // Deterministic output
  test('commands are deterministic', () => {
    const spec = {
      deviceName: 'R1',
      routing: true,
      interfaces: [
        { name: 'GigabitEthernet0/0', address: '2001:db8:1::1/64' },
      ],
    };

    const run1 = generateIpv6Commands(spec);
    const run2 = generateIpv6Commands(spec);
    const run3 = generateIpv6Commands(spec);

    expect(run1).toEqual(run2);
    expect(run2).toEqual(run3);
  });

  // Validation
  test('validation rejects config with no IPv6 configuration', () => {
    const result = ipv6Plugin.validate({
      deviceName: 'R1',
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'no_ipv6_config' }),
      ])
    );
  });

  test('validation rejects invalid schema', () => {
    const result = ipv6Plugin.validate({
      deviceName: '',
      routing: true,
    });

    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('validation accepts valid config', () => {
    const result = ipv6Plugin.validate({
      deviceName: 'R1',
      routing: true,
      interfaces: [
        { name: 'GigabitEthernet0/0', address: '2001:db8:1::1/64' },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
