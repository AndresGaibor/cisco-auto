import { test, expect, describe } from 'bun:test';
import { DeviceAggregate } from '../../../../src/domain/ios/aggregates/device.aggregate.js';
import { DeviceId, DeviceType } from '../../../../src/domain/ios/value-objects/device-id.vo.js';
import { InterfaceName } from '../../../../src/domain/ios/value-objects/interface-name.vo.js';
import { Ipv4Address, SubnetMask } from '../../../../src/domain/ios/value-objects/ipv4-address.vo.js';
import { VlanId } from '../../../../src/domain/ios/value-objects/vlan-id.vo.js';
import type {
  DeviceAddedEvent,
  InterfaceAddedEvent,
  InterfaceConfiguredEvent,
  InterfaceEnabledEvent,
  InterfaceDisabledEvent,
  VlanConfiguredEvent,
  InterfaceRemovedEvent,
  DeviceRenamedEvent,
} from '../../../../src/domain/ios/events/ios.events.js';

describe('IOS Domain Events', () => {
  describe('DeviceAddedEvent', () => {
    test('should be emitted on device creation', () => {
      const agg = DeviceAggregate.create(DeviceId.from('R1'), DeviceType.ROUTER, '2911');
      const events = agg.events;
      expect(events.length).toBeGreaterThan(0);
      const event = events[0] as DeviceAddedEvent;
      expect(event.type).toBe('DeviceAdded');
      expect(event.deviceName).toBe('R1');
      expect(event.deviceType).toBe('router');
      expect(event.model).toBe('2911');
      expect(event.aggregateId).toBe('R1');
      expect(event.occurredOn).toBeDefined();
    });
  });

  describe('DeviceRenamedEvent', () => {
    test('should be emitted on rename', () => {
      const agg = DeviceAggregate.create(DeviceId.from('R1'), DeviceType.ROUTER, '2911');
      agg.clearEvents();
      agg.rename('Router-Edge');
      const event = agg.events.find((e) => e.type === 'DeviceRenamed') as DeviceRenamedEvent;
      expect(event).toBeDefined();
      expect(event.oldName).toBe('R1');
      expect(event.newName).toBe('Router-Edge');
    });
  });

  describe('InterfaceAddedEvent', () => {
    test('should be emitted when adding interface', () => {
      const agg = DeviceAggregate.create(DeviceId.from('R1'), DeviceType.ROUTER, '2911');
      agg.clearEvents();
      agg.addInterface(new InterfaceName('Gig0/0'));
      const event = agg.events.find((e) => e.type === 'InterfaceAdded') as InterfaceAddedEvent;
      expect(event).toBeDefined();
      expect(event.interfaceName).toBe('Gig0/0');
    });
  });

  describe('InterfaceConfiguredEvent', () => {
    test('should be emitted when configuring IP', () => {
      const agg = DeviceAggregate.create(DeviceId.from('R1'), DeviceType.ROUTER, '2911');
      agg.addInterface(new InterfaceName('Gig0/0'));
      agg.clearEvents();
      agg.configureInterfaceIp(
        new InterfaceName('Gig0/0'),
        new Ipv4Address('10.0.0.1'),
        new SubnetMask('255.255.255.0')
      );
      const event = agg.events.find((e) => e.type === 'InterfaceConfigured') as InterfaceConfiguredEvent;
      expect(event).toBeDefined();
      expect(event.ipAddress).toBe('10.0.0.1');
      expect(event.subnetMask).toBe('255.255.255.0');
    });
  });

  describe('InterfaceEnabledEvent', () => {
    test('should be emitted when enabling interface', () => {
      const agg = DeviceAggregate.create(DeviceId.from('R1'), DeviceType.ROUTER, '2911');
      agg.addInterface(new InterfaceName('Gig0/0'));
      agg.clearEvents();
      agg.enableInterface(new InterfaceName('Gig0/0'));
      const event = agg.events.find((e) => e.type === 'InterfaceEnabled') as InterfaceEnabledEvent;
      expect(event).toBeDefined();
      expect(event.interfaceName).toBe('Gig0/0');
    });
  });

  describe('InterfaceDisabledEvent', () => {
    test('should be emitted when disabling interface', () => {
      const agg = DeviceAggregate.create(DeviceId.from('R1'), DeviceType.ROUTER, '2911');
      agg.addInterface(new InterfaceName('Gig0/0'));
      agg.enableInterface(new InterfaceName('Gig0/0'));
      agg.clearEvents();
      agg.disableInterface(new InterfaceName('Gig0/0'));
      const event = agg.events.find((e) => e.type === 'InterfaceDisabled') as InterfaceDisabledEvent;
      expect(event).toBeDefined();
    });
  });

  describe('InterfaceRemovedEvent', () => {
    test('should be emitted when removing interface', () => {
      const agg = DeviceAggregate.create(DeviceId.from('R1'), DeviceType.ROUTER, '2911');
      agg.addInterface(new InterfaceName('Gig0/0'));
      agg.addInterface(new InterfaceName('Gig0/1'));
      agg.clearEvents();
      agg.removeInterface(new InterfaceName('Gig0/0'));
      const event = agg.events.find((e) => e.type === 'InterfaceRemoved') as InterfaceRemovedEvent;
      expect(event).toBeDefined();
      expect(event.interfaceName).toBe('Gig0/0');
    });
  });

  describe('VlanConfiguredEvent', () => {
    test('should be emitted when adding VLAN', () => {
      const agg = DeviceAggregate.create(DeviceId.from('R1'), DeviceType.ROUTER, '2911');
      agg.clearEvents();
      agg.addVlan(new VlanId(10));
      const event = agg.events.find((e) => e.type === 'VlanConfigured') as VlanConfiguredEvent;
      expect(event).toBeDefined();
      expect(event.vlanId).toBe(10);
    });
  });

  describe('event metadata', () => {
    test('all events should have valid ISO timestamps', () => {
      const agg = DeviceAggregate.create(DeviceId.from('R1'), DeviceType.ROUTER, '2911');
      agg.addInterface(new InterfaceName('Gig0/0'));
      for (const event of agg.events) {
        expect(new Date(event.occurredOn).toISOString()).toBe(event.occurredOn);
      }
    });

    test('all events should have correct aggregateId', () => {
      const agg = DeviceAggregate.create(DeviceId.from('R1'), DeviceType.ROUTER, '2911');
      agg.addInterface(new InterfaceName('Gig0/0'));
      for (const event of agg.events) {
        expect(event.aggregateId).toBe('R1');
      }
    });
  });
});
