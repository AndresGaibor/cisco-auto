import { test, expect, describe, beforeEach } from 'bun:test';
import { TopologyGraphAggregate } from '../../../../src/domain/topology/aggregates/topology-graph.aggregate.js';
import { CableType } from '../../../../src/domain/topology/entities/link.entity.js';
import { DomainError } from '../../../../src/domain/shared/errors/domain.error.js';

describe('TopologyGraphAggregate', () => {
  let topology: TopologyGraphAggregate;

  beforeEach(() => {
    topology = TopologyGraphAggregate.create('Test Topology');
  });

  describe('create', () => {
    test('should create topology with TopologyCreated event', () => {
      expect(topology.linkCount).toBe(0);
      expect(topology.name).toBe('Test Topology');
      expect(topology.events.length).toBe(1);
      expect(topology.events[0].type).toBe('TopologyCreated');
    });

    test('should normalize ID from name', () => {
      const t = TopologyGraphAggregate.create('My Network Topology');
      expect(t.id.value).toBe('my-network-topology');
    });
  });

  describe('addLink', () => {
    test('should create a link between two interfaces', () => {
      const link = topology.addLink(
        { deviceName: 'R1', interfaceName: 'Gig0/0' },
        { deviceName: 'SW1', interfaceName: 'Fa0/1' },
        CableType.STRAIGHT
      );
      expect(topology.linkCount).toBe(1);
      expect(link.cableType).toBe(CableType.STRAIGHT);
      expect(link.active).toBe(true);
    });

    test('should emit LinkCreated event', () => {
      topology.addLink(
        { deviceName: 'R1', interfaceName: 'Gig0/0' },
        { deviceName: 'SW1', interfaceName: 'Fa0/1' },
        CableType.STRAIGHT
      );
      expect(topology.events.some((e) => e.type === 'LinkCreated')).toBe(true);
    });

    test('should reject self-connection on same interface', () => {
      expect(() =>
        topology.addLink(
          { deviceName: 'R1', interfaceName: 'Gig0/0' },
          { deviceName: 'R1', interfaceName: 'Gig0/0' },
          CableType.STRAIGHT
        )
      ).toThrow(DomainError);
    });

    test('should allow self-connection on different interfaces (loopback)', () => {
      expect(() =>
        topology.addLink(
          { deviceName: 'R1', interfaceName: 'Gig0/0' },
          { deviceName: 'R1', interfaceName: 'Gig0/1' },
          CableType.CROSSOVER
        )
      ).not.toThrow();
    });

    test('should reject duplicate links', () => {
      topology.addLink(
        { deviceName: 'R1', interfaceName: 'Gig0/0' },
        { deviceName: 'SW1', interfaceName: 'Fa0/1' },
        CableType.STRAIGHT
      );
      expect(() =>
        topology.addLink(
          { deviceName: 'R1', interfaceName: 'Gig0/0' },
          { deviceName: 'SW1', interfaceName: 'Fa0/1' },
          CableType.STRAIGHT
        )
      ).toThrow(DomainError);
    });

    test('should reject duplicate links in reverse order', () => {
      topology.addLink(
        { deviceName: 'R1', interfaceName: 'Gig0/0' },
        { deviceName: 'SW1', interfaceName: 'Fa0/1' },
        CableType.STRAIGHT
      );
      expect(() =>
        topology.addLink(
          { deviceName: 'SW1', interfaceName: 'Fa0/1' },
          { deviceName: 'R1', interfaceName: 'Gig0/0' },
          CableType.STRAIGHT
        )
      ).toThrow(DomainError);
    });

    test('should reject if interface already has active link', () => {
      topology.addLink(
        { deviceName: 'R1', interfaceName: 'Gig0/0' },
        { deviceName: 'SW1', interfaceName: 'Fa0/1' },
        CableType.STRAIGHT
      );
      expect(() =>
        topology.addLink(
          { deviceName: 'R1', interfaceName: 'Gig0/0' },
          { deviceName: 'SW2', interfaceName: 'Fa0/2' },
          CableType.STRAIGHT
        )
      ).toThrow(DomainError);
    });

    test('should work with different cable types', () => {
      topology.addLink(
        { deviceName: 'R1', interfaceName: 'Serial0/0' },
        { deviceName: 'R2', interfaceName: 'Serial0/0' },
        CableType.SERIAL
      );
      expect(topology.linkCount).toBe(1);
    });
  });

  describe('removeLink', () => {
    test('should remove link by ID and emit event', () => {
      const link = topology.addLink(
        { deviceName: 'R1', interfaceName: 'Gig0/0' },
        { deviceName: 'SW1', interfaceName: 'Fa0/1' },
        CableType.STRAIGHT
      );
      topology.clearEvents();
      topology.removeLink(link.id);
      expect(topology.linkCount).toBe(0);
      expect(topology.events.some((e) => e.type === 'LinkRemoved')).toBe(true);
    });

    test('should throw for non-existent link', () => {
      expect(() => topology.removeLink('non-existent')).toThrow(DomainError);
    });
  });

  describe('removeLinkByEndpoints', () => {
    test('should remove link by interface endpoint', () => {
      topology.addLink(
        { deviceName: 'R1', interfaceName: 'Gig0/0' },
        { deviceName: 'SW1', interfaceName: 'Fa0/1' },
        CableType.STRAIGHT
      );
      topology.removeLinkByEndpoints('R1', 'Gig0/0');
      expect(topology.linkCount).toBe(0);
    });

    test('should work from either side', () => {
      topology.addLink(
        { deviceName: 'R1', interfaceName: 'Gig0/0' },
        { deviceName: 'SW1', interfaceName: 'Fa0/1' },
        CableType.STRAIGHT
      );
      topology.removeLinkByEndpoints('SW1', 'Fa0/1');
      expect(topology.linkCount).toBe(0);
    });
  });

  describe('findLinkByInterface', () => {
    test('should find link by either side', () => {
      topology.addLink(
        { deviceName: 'R1', interfaceName: 'Gig0/0' },
        { deviceName: 'SW1', interfaceName: 'Fa0/1' },
        CableType.STRAIGHT
      );
      const linkA = topology.findLinkByInterface('R1', 'Gig0/0');
      const linkB = topology.findLinkByInterface('SW1', 'Fa0/1');
      expect(linkA).not.toBeNull();
      expect(linkB).not.toBeNull();
      expect(linkA?.id).toBe(linkB?.id);
    });

    test('should return null for non-existent interface', () => {
      const link = topology.findLinkByInterface('R1', 'Gig0/0');
      expect(link).toBeNull();
    });
  });

  describe('getDeviceLinks', () => {
    test('should return all links for a device', () => {
      topology.addLink(
        { deviceName: 'R1', interfaceName: 'Gig0/0' },
        { deviceName: 'SW1', interfaceName: 'Fa0/1' },
        CableType.STRAIGHT
      );
      topology.addLink(
        { deviceName: 'R1', interfaceName: 'Gig0/1' },
        { deviceName: 'SW2', interfaceName: 'Fa0/1' },
        CableType.STRAIGHT
      );
      const links = topology.getDeviceLinks('R1');
      expect(links.length).toBe(2);
    });

    test('should return empty array for device with no links', () => {
      expect(topology.getDeviceLinks('R1')).toEqual([]);
    });
  });

  describe('getConnectedDevices', () => {
    test('should return connected devices', () => {
      topology.addLink(
        { deviceName: 'R1', interfaceName: 'Gig0/0' },
        { deviceName: 'SW1', interfaceName: 'Fa0/1' },
        CableType.STRAIGHT
      );
      topology.addLink(
        { deviceName: 'R1', interfaceName: 'Gig0/1' },
        { deviceName: 'R2', interfaceName: 'Gig0/0' },
        CableType.CROSSOVER
      );
      const connected = topology.getConnectedDevices('R1');
      expect(connected).toContain('SW1');
      expect(connected).toContain('R2');
      expect(connected.length).toBe(2);
    });

    test('should not include disconnected devices', () => {
      topology.addLink(
        { deviceName: 'R1', interfaceName: 'Gig0/0' },
        { deviceName: 'SW1', interfaceName: 'Fa0/1' },
        CableType.STRAIGHT
      );
      const link = topology.addLink(
        { deviceName: 'R1', interfaceName: 'Gig0/1' },
        { deviceName: 'R2', interfaceName: 'Gig0/0' },
        CableType.CROSSOVER
      );
      link.disconnect();
      const connected = topology.getConnectedDevices('R1');
      expect(connected).toContain('SW1');
      expect(connected).not.toContain('R2');
    });
  });

  describe('validate', () => {
    test('should pass for valid topology', () => {
      topology.addLink(
        { deviceName: 'R1', interfaceName: 'Gig0/0' },
        { deviceName: 'SW1', interfaceName: 'Fa0/1' },
        CableType.STRAIGHT
      );
      expect(() => topology.validate()).not.toThrow();
    });

    test('should throw for empty name', () => {
      const t = TopologyGraphAggregate.create('');
      expect(() => t.validate()).toThrow(DomainError);
    });
  });

  describe('toJSON', () => {
    test('should serialize topology state', () => {
      topology.addLink(
        { deviceName: 'R1', interfaceName: 'Gig0/0' },
        { deviceName: 'SW1', interfaceName: 'Fa0/1' },
        CableType.STRAIGHT
      );
      const json = topology.toJSON();
      expect(json.name).toBe('Test Topology');
      expect((json.links as unknown[]).length).toBe(1);
      expect((json.events as string[]).length).toBeGreaterThan(0);
    });
  });
});
