import { describe, expect, test } from 'bun:test';
import { routingPlugin } from './index.js';
import { generateRoutingCommands } from './routing.generator.js';
import { routingConfigSchema } from './routing.schema.js';

describe('routing plugin', () => {
  // Metadata
  test('exposes the expected metadata', () => {
    expect(routingPlugin.id).toBe('routing');
    expect(routingPlugin.name).toBe('Routing');
    expect(routingPlugin.category).toBe('routing');
    expect(routingPlugin.version).toBe('1.0.0');
    expect(routingPlugin.description).toContain('routing');
    expect(routingPlugin.commands).toHaveLength(1);
    expect(routingPlugin.commands[0].name).toBe('configure-routing');
  });

  // Schema validation
  test('schema accepts valid OSPF config', () => {
    const result = routingConfigSchema.safeParse({
      deviceName: 'R1',
      ospf: {
        processId: 1,
        routerId: '1.1.1.1',
        areas: [{ areaId: 0, networks: [{ network: '192.168.1.0', wildcard: '0.0.0.255' }] }],
      },
    });
    expect(result.success).toBe(true);
  });

  test('schema accepts valid EIGRP config', () => {
    const result = routingConfigSchema.safeParse({
      deviceName: 'R1',
      eigrp: {
        asNumber: 100,
        networks: ['192.168.1.0', '10.0.0.0'],
      },
    });
    expect(result.success).toBe(true);
  });

  test('schema accepts valid BGP config', () => {
    const result = routingConfigSchema.safeParse({
      deviceName: 'R1',
      bgp: {
        asn: 65000,
        neighbors: [{ ip: '10.0.0.2', remoteAs: 65001 }],
      },
    });
    expect(result.success).toBe(true);
  });

  test('schema accepts valid static routes', () => {
    const result = routingConfigSchema.safeParse({
      deviceName: 'R1',
      staticRoutes: [
        { network: '0.0.0.0', mask: '0.0.0.0', nextHop: '192.168.1.1' },
      ],
    });
    expect(result.success).toBe(true);
  });

  test('schema rejects invalid IPv4 address', () => {
    const result = routingConfigSchema.safeParse({
      deviceName: 'R1',
      ospf: {
        processId: 1,
        areas: [{ areaId: 0, networks: [{ network: '999.999.999.999', wildcard: '0.0.0.255' }] }],
      },
    });
    expect(result.success).toBe(false);
  });

  test('schema rejects OSPF with no areas', () => {
    const result = routingConfigSchema.safeParse({
      deviceName: 'R1',
      ospf: {
        processId: 1,
        areas: [],
      },
    });
    expect(result.success).toBe(false);
  });

  test('schema rejects BGP with no neighbors', () => {
    const result = routingConfigSchema.safeParse({
      deviceName: 'R1',
      bgp: {
        asn: 65000,
        neighbors: [],
      },
    });
    expect(result.success).toBe(false);
  });

  test('schema rejects EIGRP with no networks', () => {
    const result = routingConfigSchema.safeParse({
      deviceName: 'R1',
      eigrp: {
        asNumber: 100,
        networks: [],
      },
    });
    expect(result.success).toBe(false);
  });

  // OSPF command generation
  test('generates OSPF commands with router-id', () => {
    const commands = generateRoutingCommands({
      deviceName: 'R1',
      ospf: {
        processId: 1,
        routerId: '1.1.1.1',
        areas: [
          {
            areaId: 0,
            networks: [
              { network: '192.168.1.0', wildcard: '0.0.0.255' },
              { network: '10.0.0.0', wildcard: '0.0.0.3' },
            ],
          },
        ],
      },
    });

    expect(commands).toEqual([
      '! Configuración OSPF',
      'router ospf 1',
      ' router-id 1.1.1.1',
      ' network 192.168.1.0 0.0.0.255 area 0',
      ' network 10.0.0.0 0.0.0.3 area 0',
      'exit',
    ]);
  });

  test('generates OSPF commands with passive interfaces', () => {
    const commands = generateRoutingCommands({
      deviceName: 'R1',
      ospf: {
        processId: 10,
        areas: [
          { areaId: 0, networks: [{ network: '192.168.1.0', wildcard: '0.0.0.255' }] },
        ],
        passiveInterfaces: ['GigabitEthernet0/0', 'Loopback0'],
      },
    });

    expect(commands).toContain(' passive-interface GigabitEthernet0/0');
    expect(commands).toContain(' passive-interface Loopback0');
  });

  test('generates OSPF with named area', () => {
    const commands = generateRoutingCommands({
      deviceName: 'R1',
      ospf: {
        processId: 1,
        areas: [
          { areaId: '0.0.0.0', networks: [{ network: '10.0.0.0', wildcard: '0.255.255.255' }] },
        ],
      },
    });

    expect(commands).toContain(' network 10.0.0.0 0.255.255.255 area 0.0.0.0');
  });

  // EIGRP command generation
  test('generates EIGRP commands', () => {
    const commands = generateRoutingCommands({
      deviceName: 'R1',
      eigrp: {
        asNumber: 100,
        networks: ['192.168.1.0', '10.0.0.0'],
      },
    });

    expect(commands).toEqual([
      '! Configuración EIGRP',
      'router eigrp 100',
      ' network 192.168.1.0',
      ' network 10.0.0.0',
      'exit',
    ]);
  });

  test('generates EIGRP with router-id', () => {
    const commands = generateRoutingCommands({
      deviceName: 'R1',
      eigrp: {
        asNumber: 100,
        routerId: '2.2.2.2',
        networks: ['192.168.1.0'],
      },
    });

    expect(commands).toContain(' eigrp router-id 2.2.2.2');
  });

  test('generates EIGRP with passive interfaces', () => {
    const commands = generateRoutingCommands({
      deviceName: 'R1',
      eigrp: {
        asNumber: 100,
        networks: ['192.168.1.0'],
        passiveInterfaces: ['GigabitEthernet0/1'],
      },
    });

    expect(commands).toContain(' passive-interface GigabitEthernet0/1');
  });

  // BGP command generation
  test('generates BGP commands', () => {
    const commands = generateRoutingCommands({
      deviceName: 'R1',
      bgp: {
        asn: 65000,
        neighbors: [
          { ip: '10.0.0.2', remoteAs: 65001 },
        ],
      },
    });

    expect(commands).toEqual([
      '! Configuración BGP',
      'router bgp 65000',
      ' neighbor 10.0.0.2 remote-as 65001',
      'exit',
    ]);
  });

  test('generates BGP with router-id and neighbor options', () => {
    const commands = generateRoutingCommands({
      deviceName: 'R1',
      bgp: {
        asn: 65000,
        routerId: '1.1.1.1',
        neighbors: [
          { ip: '10.0.0.2', remoteAs: 65001, description: 'ISP Peer', nextHopSelf: true },
        ],
        networks: [{ network: '192.168.0.0', mask: '255.255.0.0' }],
      },
    });

    expect(commands).toContain(' bgp router-id 1.1.1.1');
    expect(commands).toContain(' neighbor 10.0.0.2 remote-as 65001');
    expect(commands).toContain(' neighbor 10.0.0.2 description ISP Peer');
    expect(commands).toContain(' neighbor 10.0.0.2 next-hop-self');
    expect(commands).toContain(' network 192.168.0.0 mask 255.255.0.0');
  });

  // Static route command generation
  test('generates static route commands', () => {
    const commands = generateRoutingCommands({
      deviceName: 'R1',
      staticRoutes: [
        { network: '0.0.0.0', mask: '0.0.0.0', nextHop: '192.168.1.1' },
        { network: '10.0.0.0', mask: '255.0.0.0', nextHop: '192.168.1.2' },
      ],
    });

    expect(commands).toEqual([
      '! Rutas estáticas',
      'ip route 0.0.0.0 0.0.0.0 192.168.1.1',
      'ip route 10.0.0.0 255.0.0.0 192.168.1.2',
    ]);
  });

  test('generates static route with administrative distance', () => {
    const commands = generateRoutingCommands({
      deviceName: 'R1',
      staticRoutes: [
        { network: '0.0.0.0', mask: '0.0.0.0', nextHop: '192.168.1.1', administrativeDistance: 10 },
      ],
    });

    expect(commands).toContain('ip route 0.0.0.0 0.0.0.0 192.168.1.1 10');
  });

  test('static route with distance 1 omits the distance', () => {
    const commands = generateRoutingCommands({
      deviceName: 'R1',
      staticRoutes: [
        { network: '0.0.0.0', mask: '0.0.0.0', nextHop: '192.168.1.1', administrativeDistance: 1 },
      ],
    });

    expect(commands).toContain('ip route 0.0.0.0 0.0.0.0 192.168.1.1');
    expect(commands).not.toContain('ip route 0.0.0.0 0.0.0.0 192.168.1.1 1');
  });

  // Combined protocols
  test('generates commands for multiple protocols', () => {
    const commands = generateRoutingCommands({
      deviceName: 'R1',
      staticRoutes: [
        { network: '0.0.0.0', mask: '0.0.0.0', nextHop: '192.168.1.1' },
      ],
      ospf: {
        processId: 1,
        areas: [{ areaId: 0, networks: [{ network: '10.0.0.0', wildcard: '0.0.0.255' }] }],
      },
    });

    expect(commands).toContain('! Rutas estáticas');
    expect(commands).toContain('! Configuración OSPF');
    expect(commands).toContain('ip route 0.0.0.0 0.0.0.0 192.168.1.1');
    expect(commands).toContain('router ospf 1');
  });

  // Deterministic output
  test('commands are deterministic', () => {
    const spec = {
      deviceName: 'R1',
      ospf: {
        processId: 1,
        routerId: '1.1.1.1',
        areas: [
          { areaId: 0, networks: [{ network: '192.168.1.0', wildcard: '0.0.0.255' }] },
        ],
      },
      bgp: {
        asn: 65000,
        neighbors: [{ ip: '10.0.0.2', remoteAs: 65001 }],
      },
    };

    const run1 = generateRoutingCommands(spec);
    const run2 = generateRoutingCommands(spec);
    const run3 = generateRoutingCommands(spec);

    expect(run1).toEqual(run2);
    expect(run2).toEqual(run3);
  });

  // Validation
  test('validation rejects config with no routing protocol', () => {
    const result = routingPlugin.validate({
      deviceName: 'R1',
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'no_routing_protocol' }),
      ])
    );
  });

  test('validation rejects duplicate BGP neighbors', () => {
    const result = routingPlugin.validate({
      deviceName: 'R1',
      bgp: {
        asn: 65000,
        neighbors: [
          { ip: '10.0.0.2', remoteAs: 65001 },
          { ip: '10.0.0.2', remoteAs: 65002 },
        ],
      },
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'duplicate_bgp_neighbor' }),
      ])
    );
  });

  test('validation rejects invalid schema', () => {
    const result = routingPlugin.validate({
      deviceName: '',
      ospf: {
        processId: -1,
        areas: [],
      },
    });

    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('validation accepts valid config', () => {
    const result = routingPlugin.validate({
      deviceName: 'R1',
      ospf: {
        processId: 1,
        areas: [{ areaId: 0, networks: [{ network: '192.168.1.0', wildcard: '0.0.0.255' }] }],
      },
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('validation accepts valid static routes only', () => {
    const result = routingPlugin.validate({
      deviceName: 'R1',
      staticRoutes: [
        { network: '0.0.0.0', mask: '0.0.0.0', nextHop: '192.168.1.1' },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
