import { test, expect, describe, beforeEach } from 'bun:test';
import { DeviceAggregate } from '../../../../src/domain/ios/aggregates/device.aggregate.js';
import { DeviceId, DeviceType } from '../../../../src/domain/ios/value-objects/device-id.vo.js';
import { InterfaceName } from '../../../../src/domain/ios/value-objects/interface-name.vo.js';
import { Ipv4Address, SubnetMask } from '../../../../src/domain/ios/value-objects/ipv4-address.vo.js';
import { VlanId } from '../../../../src/domain/ios/value-objects/vlan-id.vo.js';
import { DomainError } from '../../../../src/domain/shared/errors/domain.error.js';

describe('DeviceAggregate', () => {
  let aggregate: DeviceAggregate;

  beforeEach(() => {
    const id = DeviceId.from('Router1');
    aggregate = DeviceAggregate.create(id, DeviceType.ROUTER, '2911');
  });

  describe('create', () => {
    test('should create aggregate with DeviceAdded event', () => {
      const agg = DeviceAggregate.create(DeviceId.from('SW1'), DeviceType.SWITCH, '2960');
      expect(agg.events.length).toBe(1);
      expect(agg.events[0].type).toBe('DeviceAdded');
      expect(agg.id.value).toBe('SW1');
    });

    test('should set device properties', () => {
      expect(aggregate.device.deviceType).toBe(DeviceType.ROUTER);
      expect(aggregate.device.model).toBe('2911');
      expect(aggregate.interfaceCount).toBe(0);
    });
  });

  describe('rename', () => {
    test('should change hostname and emit event', () => {
      aggregate.rename('R1-EDGE');
      expect(aggregate.device.hostname).toBe('R1-EDGE');
      const renameEvent = aggregate.events.find((e) => e.type === 'DeviceRenamed');
      expect(renameEvent).toBeDefined();
    });

    test('should not emit event if name is same', () => {
      const eventCount = aggregate.events.length;
      aggregate.rename('Router1');
      expect(aggregate.events.length).toBe(eventCount);
    });
  });

  describe('addInterface', () => {
    test('should add interface and emit event', () => {
      const name = new InterfaceName('GigabitEthernet0/0');
      aggregate.addInterface(name);
      expect(aggregate.interfaceCount).toBe(1);
      const event = aggregate.events.find((e) => e.type === 'InterfaceAdded');
      expect(event).toBeDefined();
    });

    test('should throw for duplicate interface', () => {
      const name = new InterfaceName('GigabitEthernet0/0');
      aggregate.addInterface(name);
      expect(() => aggregate.addInterface(name)).toThrow(DomainError);
    });
  });

  describe('removeInterface', () => {
    test('should remove interface and emit event', () => {
      const name = new InterfaceName('GigabitEthernet0/0');
      aggregate.addInterface(name);
      aggregate.addInterface(new InterfaceName('GigabitEthernet0/1'));
      aggregate.clearEvents();
      aggregate.removeInterface(name);
      expect(aggregate.interfaceCount).toBe(1);
      const event = aggregate.events.find((e) => e.type === 'InterfaceRemoved');
      expect(event).toBeDefined();
    });

    test('should throw when trying to remove last interface', () => {
      const name = new InterfaceName('GigabitEthernet0/0');
      aggregate.addInterface(name);
      // Cannot remove because it would leave 0 interfaces
      // But wait, the aggregate starts with 0 interfaces, so we need to add 2 first
      aggregate.addInterface(new InterfaceName('GigabitEthernet0/1'));
      aggregate.removeInterface(name);
      expect(aggregate.interfaceCount).toBe(1);
      expect(() => aggregate.removeInterface(new InterfaceName('GigabitEthernet0/1'))).toThrow(DomainError);
    });

    test('should throw when interface does not exist', () => {
      expect(() => aggregate.removeInterface(new InterfaceName('GigabitEthernet0/0'))).toThrow(DomainError);
    });
  });

  describe('configureInterfaceIp', () => {
    test('should configure IP on existing interface', () => {
      const name = new InterfaceName('GigabitEthernet0/0');
      aggregate.addInterface(name);
      aggregate.configureInterfaceIp(
        name,
        new Ipv4Address('192.168.1.1'),
        new SubnetMask('255.255.255.0')
      );
      const iface = aggregate.getInterface(name);
      expect(iface?.ipAddress?.value).toBe('192.168.1.1');
      const event = aggregate.events.find((e) => e.type === 'InterfaceConfigured');
      expect(event).toBeDefined();
    });

    test('should throw for non-existent interface', () => {
      expect(() =>
        aggregate.configureInterfaceIp(
          new InterfaceName('GigabitEthernet0/0'),
          new Ipv4Address('10.0.0.1'),
          new SubnetMask('255.0.0.0')
        )
      ).toThrow(DomainError);
    });
  });

  describe('enableInterface / disableInterface', () => {
    test('enableInterface should set interface UP and emit event', () => {
      const name = new InterfaceName('GigabitEthernet0/0');
      aggregate.addInterface(name);
      aggregate.enableInterface(name);
      const iface = aggregate.getInterface(name);
      expect(iface?.isUp).toBe(true);
      expect(aggregate.events.some((e) => e.type === 'InterfaceEnabled')).toBe(true);
    });

    test('disableInterface should set interface DOWN and emit event', () => {
      const name = new InterfaceName('GigabitEthernet0/0');
      aggregate.addInterface(name);
      aggregate.enableInterface(name);
      aggregate.disableInterface(name);
      const iface = aggregate.getInterface(name);
      expect(iface?.isUp).toBe(false);
      expect(aggregate.events.some((e) => e.type === 'InterfaceDisabled')).toBe(true);
    });

    test('should throw for non-existent interface', () => {
      expect(() => aggregate.enableInterface(new InterfaceName('GigabitEthernet0/0'))).toThrow(DomainError);
    });
  });

  describe('VLAN management', () => {
    test('addVlan should add VLAN and emit event', () => {
      aggregate.addVlan(new VlanId(10));
      expect(aggregate.device.hasVlan(10)).toBe(true);
      expect(aggregate.events.some((e) => e.type === 'VlanConfigured')).toBe(true);
    });

    test('removeVlan should remove VLAN', () => {
      aggregate.addVlan(new VlanId(10));
      aggregate.removeVlan(new VlanId(10));
      expect(aggregate.device.hasVlan(10)).toBe(false);
    });

    test('should not allow removing VLAN 1', () => {
      expect(() => aggregate.removeVlan(new VlanId(1))).toThrow(DomainError);
    });

    test('setInterfaceAccessVlan should configure access mode', () => {
      const name = new InterfaceName('GigabitEthernet0/1');
      aggregate.addInterface(name);
      aggregate.setInterfaceAccessVlan(name, new VlanId(20));
      const iface = aggregate.getInterface(name);
      expect(iface?.accessVlan?.value).toBe(20);
    });

    test('setInterfaceTrunk should configure trunk mode', () => {
      const name = new InterfaceName('GigabitEthernet0/1');
      aggregate.addInterface(name);
      aggregate.setInterfaceTrunk(name, new VlanId(99));
      const iface = aggregate.getInterface(name);
      expect(iface?.switchportMode).toBe('trunk');
      expect(iface?.nativeVlan?.value).toBe(99);
    });
  });

  describe('validate', () => {
    test('should throw when device has no interfaces', () => {
      // The aggregate was created without interfaces
      expect(() => aggregate.validate()).toThrow(DomainError);
    });

    test('should pass when device has at least one interface', () => {
      aggregate.addInterface(new InterfaceName('GigabitEthernet0/0'));
      expect(() => aggregate.validate()).not.toThrow();
    });
  });

  describe('clearEvents', () => {
    test('should clear all collected events', () => {
      aggregate.addInterface(new InterfaceName('GigabitEthernet0/0'));
      expect(aggregate.events.length).toBeGreaterThan(0);
      aggregate.clearEvents();
      expect(aggregate.events).toEqual([]);
    });
  });

  describe('toJSON', () => {
    test('should serialize aggregate state', () => {
      aggregate.addInterface(new InterfaceName('GigabitEthernet0/0'));
      const json = aggregate.toJSON();
      expect(json.id).toBe('Router1');
      expect((json.interfaces as unknown[]).length).toBe(1);
      expect((json.events as string[]).length).toBeGreaterThan(0);
    });
  });
});
