import { describe, expect, it } from 'bun:test';
import { RoutingGenerator } from './routing-generator';
import type { RoutingSpec, OSPFSpec, EIGRPSpec, BGPSpec } from '../canonical/device.spec';

describe('RoutingGenerator', () => {
  describe('validate', () => {
    describe('router ID validation', () => {
      it('should accept valid OSPF router ID', () => {
        const routing: RoutingSpec = {
          ospf: {
            processId: 1,
            routerId: '1.1.1.1',
            areas: [{ areaId: '0', networks: ['192.168.1.0/24'] }]
          }
        };

        const result = RoutingGenerator.validate(routing);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject invalid OSPF router ID', () => {
        const routing: RoutingSpec = {
          ospf: {
            processId: 1,
            routerId: '999.999.999.999',
            areas: [{ areaId: '0', networks: ['192.168.1.0/24'] }]
          }
        };

        const result = RoutingGenerator.validate(routing);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Invalid OSPF router-id: 999.999.999.999. Must be a valid IPv4 address');
      });

      it('should reject malformed OSPF router ID', () => {
        const routing: RoutingSpec = {
          ospf: {
            processId: 1,
            routerId: 'not-an-ip',
            areas: [{ areaId: '0', networks: ['192.168.1.0/24'] }]
          }
        };

        const result = RoutingGenerator.validate(routing);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Invalid OSPF router-id: not-an-ip. Must be a valid IPv4 address');
      });

      it('should accept valid EIGRP router ID', () => {
        const routing: RoutingSpec = {
          eigrp: {
            asNumber: 100,
            routerId: '2.2.2.2',
            networks: ['192.168.0.0/16']
          }
        };

        const result = RoutingGenerator.validate(routing);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject invalid EIGRP router ID', () => {
        const routing: RoutingSpec = {
          eigrp: {
            asNumber: 100,
            routerId: '256.1.1.1',
            networks: ['192.168.0.0/16']
          }
        };

        const result = RoutingGenerator.validate(routing);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Invalid EIGRP router-id: 256.1.1.1. Must be a valid IPv4 address');
      });

      it('should accept valid BGP router ID', () => {
        const routing: RoutingSpec = {
          bgp: {
            asn: 65000,
            routerId: '3.3.3.3',
            neighbors: [{ ip: '10.0.0.1', remoteAs: 65001 }]
          }
        };

        const result = RoutingGenerator.validate(routing);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject invalid BGP router ID', () => {
        const routing: RoutingSpec = {
          bgp: {
            asn: 65000,
            routerId: '10.0.0',
            neighbors: [{ ip: '10.0.0.1', remoteAs: 65001 }]
          }
        };

        const result = RoutingGenerator.validate(routing);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Invalid BGP router-id: 10.0.0. Must be a valid IPv4 address');
      });

      it('should warn when OSPF has no router ID', () => {
        const routing: RoutingSpec = {
          ospf: {
            processId: 1,
            areas: [{ areaId: '0', networks: ['192.168.1.0/24'] }]
          }
        };

        const result = RoutingGenerator.validate(routing);
        expect(result.valid).toBe(true);
        expect(result.warnings).toContain('OSPF without explicit router-id. Will use highest IP address');
      });

      it('should validate multiple routing protocols', () => {
        const routing: RoutingSpec = {
          ospf: {
            processId: 1,
            routerId: 'invalid',
            areas: [{ areaId: '0', networks: ['192.168.1.0/24'] }]
          },
          eigrp: {
            asNumber: 100,
            routerId: 'also-invalid',
            networks: ['10.0.0.0/8']
          },
          bgp: {
            asn: 65000,
            routerId: '1.1.1.1',
            neighbors: [{ ip: '10.0.0.1', remoteAs: 65001 }]
          }
        };

        const result = RoutingGenerator.validate(routing);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBe(2);
        expect(result.errors).toContain('Invalid OSPF router-id: invalid. Must be a valid IPv4 address');
        expect(result.errors).toContain('Invalid EIGRP router-id: also-invalid. Must be a valid IPv4 address');
      });
    });
  });
});
