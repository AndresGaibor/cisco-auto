import { test, expect, describe, beforeEach } from 'bun:test';
import { DeviceEntity } from '../../../../src/domain/ios/entities/device.entity.js';
import { DeviceId, DeviceType } from '../../../../src/domain/ios/value-objects/device-id.vo.js';
import { InterfaceName } from '../../../../src/domain/ios/value-objects/interface-name.vo.js';
import { DomainError } from '../../../../src/domain/shared/errors/domain.error.js';

describe('DeviceEntity', () => {
  let device: DeviceEntity;

  beforeEach(() => {
    const id = DeviceId.from('Router1');
    device = new DeviceEntity(id, DeviceType.ROUTER, '2911');
  });

  describe('constructor', () => {
    test('should create device with identity, type and model', () => {
      expect(device.id.value).toBe('Router1');
      expect(device.deviceType).toBe(DeviceType.ROUTER);
      expect(device.model).toBe('2911');
    });

    test('should set hostname to device ID by default', () => {
      expect(device.hostname).toBe('Router1');
    });

    test('should start with no interfaces', () => {
      expect(device.interfaceCount).toBe(0);
      expect(device.interfaces.size).toBe(0);
    });

    test('should start with no VLANs', () => {
      expect(device.vlans.size).toBe(0);
    });
  });

  describe('configureHostname', () => {
    test('should change the hostname', () => {
      device.configureHostname('R1-EDGE');
      expect(device.hostname).toBe('R1-EDGE');
    });

    test('should reject empty hostname', () => {
      expect(() => device.configureHostname('')).toThrow(DomainError);
    });

    test('should reject hostname longer than 63 chars', () => {
      const longName = 'a'.repeat(64);
      expect(() => device.configureHostname(longName)).toThrow(DomainError);
    });

    test('should trim whitespace', () => {
      device.configureHostname('  MyRouter  ');
      expect(device.hostname).toBe('MyRouter');
    });
  });

  describe('addInterface', () => {
    test('should add a new interface', () => {
      const name = new InterfaceName('GigabitEthernet0/0');
      const iface = device.addInterface(name);
      expect(device.interfaceCount).toBe(1);
      expect(iface.name.value).toBe('GigabitEthernet0/0');
    });

    test('should add multiple interfaces', () => {
      device.addInterface(new InterfaceName('GigabitEthernet0/0'));
      device.addInterface(new InterfaceName('GigabitEthernet0/1'));
      expect(device.interfaceCount).toBe(2);
    });

    test('should reject duplicate interface names', () => {
      device.addInterface(new InterfaceName('GigabitEthernet0/0'));
      expect(() => device.addInterface(new InterfaceName('GigabitEthernet0/0'))).toThrow(DomainError);
    });
  });

  describe('removeInterface', () => {
    test('should remove an existing interface', () => {
      const name = new InterfaceName('GigabitEthernet0/0');
      device.addInterface(name);
      device.removeInterface(name);
      expect(device.interfaceCount).toBe(0);
    });

    test('should throw when interface does not exist', () => {
      expect(() => device.removeInterface(new InterfaceName('GigabitEthernet0/0'))).toThrow(DomainError);
    });
  });

  describe('getInterface', () => {
    test('should return interface by name', () => {
      const name = new InterfaceName('GigabitEthernet0/0');
      device.addInterface(name);
      const iface = device.getInterface(name);
      expect(iface).not.toBeNull();
      expect(iface?.name.value).toBe('GigabitEthernet0/0');
    });

    test('should return null for non-existent interface', () => {
      const result = device.getInterface(new InterfaceName('GigabitEthernet0/0'));
      expect(result).toBeNull();
    });
  });

  describe('hasInterface', () => {
    test('should return true for existing interface', () => {
      device.addInterface(new InterfaceName('GigabitEthernet0/0'));
      expect(device.hasInterface(new InterfaceName('GigabitEthernet0/0'))).toBe(true);
    });

    test('should return false for non-existent interface', () => {
      expect(device.hasInterface(new InterfaceName('GigabitEthernet0/0'))).toBe(false);
    });
  });

  describe('VLAN management', () => {
    test('should add a VLAN', () => {
      device.addVlan(10);
      expect(device.hasVlan(10)).toBe(true);
    });

    test('should add multiple VLANs', () => {
      device.addVlan(10);
      device.addVlan(20);
      device.addVlan(30);
      expect(device.vlans.size).toBe(3);
    });

    test('should remove a VLAN', () => {
      device.addVlan(10);
      device.removeVlan(10);
      expect(device.hasVlan(10)).toBe(false);
    });

    test('should not allow removing VLAN 1', () => {
      expect(() => device.removeVlan(1)).toThrow(DomainError);
    });

    test('should reject invalid VLAN ID', () => {
      expect(() => device.addVlan(0)).toThrow(DomainError);
      expect(() => device.addVlan(4095)).toThrow(DomainError);
    });
  });

  describe('validate', () => {
    test('should pass for valid device', () => {
      expect(() => device.validate()).not.toThrow();
    });
  });

  describe('toJSON', () => {
    test('should serialize device state', () => {
      device.configureHostname('R1');
      device.addVlan(10);
      const json = device.toJSON();
      expect(json.hostname).toBe('R1');
      expect(json.type).toBe('router');
      expect(json.model).toBe('2911');
      expect((json.vlans as number[]).includes(10)).toBe(true);
    });
  });
});
