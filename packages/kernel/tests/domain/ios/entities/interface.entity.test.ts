import { test, expect, describe, beforeEach } from 'bun:test';
import { InterfaceEntity, InterfaceStatus, SwitchportMode } from '../../../../src/domain/ios/entities/interface.entity.js';
import { InterfaceName } from '../../../../src/domain/ios/value-objects/interface-name.vo.js';
import { Ipv4Address, SubnetMask } from '../../../../src/domain/ios/value-objects/ipv4-address.vo.js';
import { MacAddress } from '../../../../src/domain/ios/value-objects/mac-address.vo.js';
import { VlanId } from '../../../../src/domain/ios/value-objects/vlan-id.vo.js';
import { DomainError } from '../../../../src/domain/shared/errors/domain.error.js';

describe('InterfaceEntity', () => {
  let iface: InterfaceEntity;
  let name: InterfaceName;

  beforeEach(() => {
    name = new InterfaceName('GigabitEthernet0/0');
    iface = new InterfaceEntity(name);
  });

  describe('constructor', () => {
    test('should create interface with given name', () => {
      expect(iface.name.value).toBe('GigabitEthernet0/0');
    });

    test('should start in administratively_down status', () => {
      expect(iface.status).toBe(InterfaceStatus.ADMIN_DOWN);
    });

    test('should start without IP configuration', () => {
      expect(iface.ipAddress).toBeNull();
      expect(iface.subnetMask).toBeNull();
    });

    test('should start without MAC address', () => {
      expect(iface.macAddress).toBeNull();
    });

    test('should start with switchport mode NONE', () => {
      expect(iface.switchportMode).toBe(SwitchportMode.NONE);
    });
  });

  describe('assignIp', () => {
    test('should assign IP address and subnet mask', () => {
      const ip = new Ipv4Address('192.168.1.1');
      const mask = new SubnetMask('255.255.255.0');
      iface.assignIp(ip, mask);
      expect(iface.ipAddress?.value).toBe('192.168.1.1');
      expect(iface.subnetMask?.value).toBe('255.255.255.0');
    });

    test('should override previous IP configuration', () => {
      iface.assignIp(new Ipv4Address('10.0.0.1'), new SubnetMask('255.0.0.0'));
      iface.assignIp(new Ipv4Address('192.168.1.1'), new SubnetMask('255.255.255.0'));
      expect(iface.ipAddress?.value).toBe('192.168.1.1');
      expect(iface.subnetMask?.value).toBe('255.255.255.0');
    });

    test('should mark interface as having IP configured', () => {
      expect(iface.hasIpConfigured).toBe(false);
      iface.assignIp(new Ipv4Address('10.0.0.1'), new SubnetMask('255.0.0.0'));
      expect(iface.hasIpConfigured).toBe(true);
    });
  });

  describe('removeIp', () => {
    test('should remove IP configuration', () => {
      iface.assignIp(new Ipv4Address('10.0.0.1'), new SubnetMask('255.0.0.0'));
      iface.removeIp();
      expect(iface.ipAddress).toBeNull();
      expect(iface.subnetMask).toBeNull();
      expect(iface.hasIpConfigured).toBe(false);
    });
  });

  describe('enable / disable', () => {
    test('enable should set status to UP', () => {
      iface.enable();
      expect(iface.status).toBe(InterfaceStatus.UP);
      expect(iface.isUp).toBe(true);
    });

    test('disable should set status to ADMIN_DOWN', () => {
      iface.enable();
      iface.disable();
      expect(iface.status).toBe(InterfaceStatus.ADMIN_DOWN);
      expect(iface.isUp).toBe(false);
    });
  });

  describe('setMacAddress', () => {
    test('should set MAC address', () => {
      const mac = new MacAddress('00:1A:2B:3C:4D:5E');
      iface.setMacAddress(mac);
      expect(iface.macAddress?.value).toBe('00:1A:2B:3C:4D:5E');
    });
  });

  describe('switchport modes', () => {
    test('setTrunk should set mode to TRUNK with default native VLAN', () => {
      iface.setTrunk();
      expect(iface.switchportMode).toBe(SwitchportMode.TRUNK);
      expect(iface.nativeVlan?.value).toBe(1);
    });

    test('setTrunk should accept custom native VLAN', () => {
      iface.setTrunk(new VlanId(99));
      expect(iface.switchportMode).toBe(SwitchportMode.TRUNK);
      expect(iface.nativeVlan?.value).toBe(99);
    });

    test('setAccessVlan should set mode to ACCESS', () => {
      iface.setAccessVlan(new VlanId(10));
      expect(iface.switchportMode).toBe(SwitchportMode.ACCESS);
      expect(iface.accessVlan?.value).toBe(10);
    });

    test('setRouted should clear switchport configuration', () => {
      iface.setTrunk();
      iface.setRouted();
      expect(iface.switchportMode).toBe(SwitchportMode.NONE);
      expect(iface.accessVlan).toBeNull();
      expect(iface.nativeVlan).toBeNull();
    });

    test('setAllowedVlans should throw when not in trunk mode', () => {
      expect(() => iface.setAllowedVlans([10, 20])).toThrow(DomainError);
    });

    test('setAllowedVlans should work in trunk mode', () => {
      iface.setTrunk();
      iface.setAllowedVlans([10, 20, 30]);
      expect(iface.switchportMode).toBe(SwitchportMode.TRUNK);
    });
  });

  describe('toJSON', () => {
    test('should serialize interface state', () => {
      iface.enable();
      iface.assignIp(new Ipv4Address('10.0.0.1'), new SubnetMask('255.255.255.0'));
      const json = iface.toJSON();
      expect(json.name).toBe('GigabitEthernet0/0');
      expect(json.status).toBe('up');
      expect(json.ipAddress).toBe('10.0.0.1');
    });
  });
});
