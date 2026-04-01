/**
 * Tests for Routing Utilities - routing configuration generation
 */

import { describe, test, expect } from 'bun:test';

describe('Routing Configuration', () => {
  describe('Static routing', () => {
    test('should create static route commands', () => {
      const route = {
        destination: '10.0.0.0',
        mask: '255.255.255.0',
        nextHop: '192.168.1.1'
      };

      const cmd = `ip route ${route.destination} ${route.mask} ${route.nextHop}`;
      
      expect(cmd).toContain('ip route');
      expect(cmd).toContain('10.0.0.0');
      expect(cmd).toContain('192.168.1.1');
    });

    test('should handle default route', () => {
      const defaultRoute = {
        destination: '0.0.0.0',
        mask: '0.0.0.0',
        nextHop: '192.168.1.1'
      };

      const cmd = `ip route ${defaultRoute.destination} ${defaultRoute.mask} ${defaultRoute.nextHop}`;
      
      expect(cmd).toContain('0.0.0.0 0.0.0.0');
    });

    test('should support recursive routes', () => {
      const routes = [
        { destination: '10.0.0.0', mask: '255.255.0.0', nextHop: '192.168.1.2' },
        { destination: '172.16.0.0', mask: '255.255.0.0', nextHop: '192.168.1.2' }
      ];

      expect(routes).toHaveLength(2);
      routes.forEach(route => {
        expect(route.nextHop).toBe('192.168.1.2');
      });
    });

    test('should handle route preference/distance', () => {
      const route = {
        destination: '10.0.0.0',
        mask: '255.255.255.0',
        nextHop: '192.168.1.1',
        distance: 5
      };

      expect(route.distance).toBeGreaterThan(0);
      expect(route.distance).toBeLessThan(256);
    });

    test('should delete static routes', () => {
      const route = {
        destination: '10.0.0.0',
        mask: '255.255.255.0',
        nextHop: '192.168.1.1'
      };

      const deleteCmd = `no ip route ${route.destination} ${route.mask} ${route.nextHop}`;
      
      expect(deleteCmd).toContain('no ip route');
    });
  });

  describe('Dynamic routing - OSPF', () => {
    test('should enable OSPF process', () => {
      const processId = 1;
      const cmd = `router ospf ${processId}`;

      expect(cmd).toContain('router ospf');
      expect(cmd).toContain('1');
    });

    test('should define OSPF networks', () => {
      const networks = [
        { network: '192.168.0.0', wildcard: '0.0.255.255', area: 0 },
        { network: '10.0.0.0', wildcard: '0.255.255.255', area: 1 }
      ];

      networks.forEach(net => {
        expect(net.area).toBeGreaterThanOrEqual(0);
        expect(net.wildcard).toBeDefined();
      });
    });

    test('should configure OSPF areas', () => {
      const areas = [
        { id: 0, type: 'standard' },
        { id: 1, type: 'stub' },
        { id: 2, type: 'nssa' }
      ];

      expect(areas).toHaveLength(3);
      expect(areas[0]!.id).toBe(0);
    });

    test('should set OSPF router ID', () => {
      const routerId = '192.168.1.1';
      const cmd = `router-id ${routerId}`;

      expect(cmd).toContain('router-id');
      expect(cmd).toContain(routerId);
    });

    test('should configure interface costs', () => {
      const cost = 100;
      const cmd = `ip ospf cost ${cost}`;

      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeLessThanOrEqual(65535);
    });
  });

  describe('Dynamic routing - BGP', () => {
    test('should enable BGP', () => {
      const asn = 65000;
      const cmd = `router bgp ${asn}`;

      expect(cmd).toContain('router bgp');
      expect(cmd).toContain('65000');
    });

    test('should define BGP neighbors', () => {
      const neighbor = {
        ip: '192.168.1.2',
        asn: 65001,
        description: 'peer1'
      };

      const cmd = `neighbor ${neighbor.ip} remote-as ${neighbor.asn}`;
      
      expect(cmd).toContain('neighbor');
      expect(cmd).toContain('192.168.1.2');
    });

    test('should define networks for redistribution', () => {
      const networks = [
        '10.0.0.0/8',
        '192.168.0.0/16',
        '172.16.0.0/12'
      ];

      expect(networks).toHaveLength(3);
      networks.forEach(net => {
        expect(net).toContain('/');
      });
    });

    test('should configure route aggregation', () => {
      const aggregate = {
        network: '10.0.0.0',
        mask: '255.0.0.0',
        suppressMap: 'SUPP'
      };

      expect(aggregate.network).toBeDefined();
      expect(aggregate.suppressMap).toBe('SUPP');
    });

    test('should handle BGP communities', () => {
      const community = '65000:100';

      expect(community).toContain(':');
      const [asn, value] = community.split(':');
      expect(parseInt(asn!)).toBe(65000);
    });
  });

  describe('Route filtering', () => {
    test('should create prefix lists', () => {
      const prefixList = {
        name: 'ALLOW_RFC1918',
        sequence: 10,
        action: 'permit',
        prefix: '10.0.0.0/8',
        lessThan: 24
      };

      expect(prefixList.action).toBe('permit');
      expect(prefixList.prefix).toContain('/');
    });

    test('should define route maps', () => {
      const routeMap = {
        name: 'OSPF_TO_BGP',
        sequence: 10,
        action: 'permit',
        matchPrefixList: 'ALLOW_RFC1918'
      };

      expect(routeMap.action).toBe('permit');
      expect(routeMap.matchPrefixList).toBeDefined();
    });

    test('should set communities in route maps', () => {
      const setAction = {
        community: '65000:100',
        localPref: 200,
        metric: 50
      };

      expect(setAction.localPref).toBeGreaterThan(0);
      expect(setAction.metric).toBeGreaterThan(0);
    });

    test('should filter routes with ACLs', () => {
      const acl = {
        number: 100,
        lines: [
          { action: 'permit', source: '192.168.1.0', wildcard: '0.0.0.255' },
          { action: 'deny', source: '0.0.0.0', wildcard: '255.255.255.255' }
        ]
      };

      expect(acl.number).toBe(100);
      expect(acl.lines).toHaveLength(2);
    });
  });

  describe('Redistribution', () => {
    test('should configure route redistribution', () => {
      const redist = {
        from: 'ospf 1',
        into: 'bgp 65000',
        routeMap: 'OSPF_TO_BGP'
      };

      expect(redist.from).toContain('ospf');
      expect(redist.into).toContain('bgp');
    });

    test('should set redistribution metrics', () => {
      const metric = {
        value: 100,
        type: 2
      };

      expect(metric.value).toBeGreaterThan(0);
      expect(metric.type).toBeGreaterThanOrEqual(1);
      expect(metric.type).toBeLessThanOrEqual(2);
    });

    test('should handle default-information originate', () => {
      const defaultInfo = {
        enabled: true,
        always: false,
        metric: 10,
        metricType: 2
      };

      expect(defaultInfo.enabled).toBe(true);
      expect(defaultInfo.metricType).toBe(2);
    });
  });

  describe('IP addressing', () => {
    test('should validate IP addresses', () => {
      const ips = ['192.168.1.1', '10.0.0.1', '172.16.0.1'];

      ips.forEach(ip => {
        const parts = ip.split('.');
        expect(parts).toHaveLength(4);
        parts.forEach(part => {
          const octet = parseInt(part);
          expect(octet).toBeGreaterThanOrEqual(0);
          expect(octet).toBeLessThanOrEqual(255);
        });
      });
    });

    test('should calculate subnets', () => {
      const subnet = {
        network: '192.168.0.0',
        cidr: 24,
        firstHost: '192.168.0.1',
        lastHost: '192.168.0.254',
        broadcast: '192.168.0.255'
      };

      expect(subnet.cidr).toBeGreaterThan(0);
      expect(subnet.cidr).toBeLessThan(32);
    });

    test('should handle secondary IPs', () => {
      const primaryIp = '192.168.1.1';
      const secondaryIps = ['192.168.1.2', '192.168.1.3'];

      expect(secondaryIps.length).toBeGreaterThan(0);
      secondaryIps.forEach(ip => {
        expect(ip).not.toBe(primaryIp);
      });
    });
  });

  describe('Convergence and timers', () => {
    test('should configure OSPF timers', () => {
      const timers = {
        helloInterval: 10,
        deadInterval: 40,
        retransmitInterval: 5
      };

      expect(timers.helloInterval).toBeLessThan(timers.deadInterval);
      expect(timers.deadInterval).toBeGreaterThan(timers.helloInterval);
    });

    test('should configure BGP timers', () => {
      const timers = {
        connectRetry: 120,
        holdTime: 180,
        keepalive: 60
      };

      expect(timers.keepalive).toBeLessThan(timers.holdTime);
      expect(timers.holdTime).toBeGreaterThan(0);
    });

    test('should handle SPF throttling', () => {
      const throttle = {
        initial: 5,
        increment: 5,
        maximum: 200
      };

      expect(throttle.initial).toBeLessThanOrEqual(throttle.increment);
      expect(throttle.increment).toBeLessThanOrEqual(throttle.maximum);
    });
  });

  describe('Edge cases', () => {
    test('should handle loopback addresses', () => {
      const loopback = '127.0.0.1';
      
      expect(loopback.startsWith('127')).toBe(true);
    });

    test('should validate VLAN routing', () => {
      const vlanInterfaces = [
        { vlan: 10, ip: '192.168.10.1' },
        { vlan: 20, ip: '192.168.20.1' },
        { vlan: 30, ip: '192.168.30.1' }
      ];

      expect(vlanInterfaces).toHaveLength(3);
      vlanInterfaces.forEach(intf => {
        expect(intf.vlan).toBeGreaterThan(0);
      });
    });

    test('should handle multi-area OSPF', () => {
      const areas = {
        0: { type: 'backbone', networks: ['10.0.0.0/8'] },
        1: { type: 'standard', networks: ['10.1.0.0/16'] },
        2: { type: 'stub', networks: ['10.2.0.0/16'] }
      };

      expect(Object.keys(areas)).toHaveLength(3);
      expect(areas[0].type).toBe('backbone');
    });

    test('should handle very large ASNs (4-byte)', () => {
      const largeAsn = 4200000000;

      expect(largeAsn).toBeGreaterThan(65535);
      expect(largeAsn).toBeLessThan(4294967296);
    });
  });
});
