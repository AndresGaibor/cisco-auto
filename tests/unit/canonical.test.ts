/**
 * Tests for the Canonical Model
 */

import { describe, it, expect } from 'bun:test';
import {
  DeviceType,
  CableType,
  LinkMedium,
  getDeviceFamily,
  getLinkMedium,
  parsePortName,
  PortType,
  cidrToMask,
  maskToCidr,
  isValidIP,
  isValidMAC
} from '../../src/core/canonical/types';

import {
  DeviceSpec,
  DeviceSpecFactory
} from '../../src/core/canonical/device.spec';

import {
  ConnectionSpec,
  ConnectionSpecFactory
} from '../../src/core/canonical/connection.spec';

import {
  LabSpec,
  LabSpecFactory,
  LabValidator
} from '../../src/core/canonical/lab.spec';

import { YamlAdapter } from '../../src/core/adapters/yaml.adapter';

// =============================================================================
// TYPES TESTS
// =============================================================================

describe('Canonical Types', () => {
  describe('DeviceType', () => {
    it('should have all required device types', () => {
      const types: DeviceType[] = [
        'router', 'switch', 'multilayer-switch', 'hub',
        'pc', 'laptop', 'server', 'printer', 'ip-phone',
        'access-point', 'wireless-router', 'firewall',
        'cloud', 'modem', 'unknown'
      ];
      
      types.forEach(type => {
        expect(typeof type).toBe('string');
      });
    });
  });
  
  describe('getDeviceFamily', () => {
    it('should return correct family for routers', () => {
      expect(getDeviceFamily('router')).toBe('infrastructure');
    });
    
    it('should return correct family for switches', () => {
      expect(getDeviceFamily('switch')).toBe('infrastructure');
    });
    
    it('should return correct family for PCs', () => {
      expect(getDeviceFamily('pc')).toBe('end-device');
    });
    
    it('should return correct family for IoT devices', () => {
      expect(getDeviceFamily('sensor')).toBe('iot');
    });
  });
  
  describe('CableType and LinkMedium', () => {
    it('should have correct cable types', () => {
      expect(CableType.STRAIGHT_THROUGH).toBe('eStraightThrough');
      expect(CableType.CROSSOVER).toBe('eCrossOver');
      expect(CableType.FIBER).toBe('eFiber');
      expect(CableType.SERIAL_DCE).toBe('eSerialDCE');
    });
    
    it('should get correct link medium', () => {
      expect(getLinkMedium(CableType.STRAIGHT_THROUGH)).toBe(LinkMedium.COPPER);
      expect(getLinkMedium(CableType.FIBER)).toBe(LinkMedium.FIBER);
      expect(getLinkMedium(CableType.SERIAL_DCE)).toBe(LinkMedium.SERIAL);
    });
  });
  
  describe('parsePortName', () => {
    it('should parse FastEthernet ports', () => {
      const result = parsePortName('FastEthernet0/1');
      expect(result.type).toBe(PortType.FAST_ETHERNET);
      expect(result.module).toBe(0);
      expect(result.number).toBe(1);
    });
    
    it('should parse GigabitEthernet ports', () => {
      const result = parsePortName('GigabitEthernet0/0');
      expect(result.type).toBe(PortType.GIGABIT_ETHERNET);
      expect(result.module).toBe(0);
      expect(result.number).toBe(0);
    });
    
    it('should parse abbreviated port names', () => {
      const result = parsePortName('Fa0/1');
      expect(result.type).toBe(PortType.FAST_ETHERNET);
      
      const result2 = parsePortName('Gi0/0');
      expect(result2.type).toBe(PortType.GIGABIT_ETHERNET);
    });
  });
  
  describe('IP utilities', () => {
    it('should validate IP addresses', () => {
      expect(isValidIP('192.168.1.1')).toBe(true);
      expect(isValidIP('10.0.0.1')).toBe(true);
      expect(isValidIP('256.0.0.1')).toBe(false);
      expect(isValidIP('not.an.ip')).toBe(false);
    });
    
    it('should convert CIDR to mask', () => {
      expect(cidrToMask(24)).toBe('255.255.255.0');
      expect(cidrToMask(16)).toBe('255.255.0.0');
      expect(cidrToMask(8)).toBe('255.0.0.0');
    });
    
    it('should convert mask to CIDR', () => {
      expect(maskToCidr('255.255.255.0')).toBe(24);
      expect(maskToCidr('255.255.0.0')).toBe(16);
    });
  });
  
  describe('MAC validation', () => {
    it('should validate MAC addresses', () => {
      expect(isValidMAC('00:11:22:33:44:55')).toBe(true);
      expect(isValidMAC('00-11-22-33-44-55')).toBe(true);
      expect(isValidMAC('invalid')).toBe(false);
    });
  });
});

// =============================================================================
// DEVICE TESTS
// =============================================================================

describe('DeviceSpec', () => {
  describe('DeviceSpecFactory', () => {
    it('should create a router with defaults', () => {
      const router = DeviceSpecFactory.createRouter('R1');
      
      expect(router.name).toBe('R1');
      expect(router.type).toBe('router');
      expect(router.hostname).toBe('R1');
      expect(router.interfaces.length).toBeGreaterThan(0);
    });
    
    it('should create a switch with correct ports', () => {
      const sw = DeviceSpecFactory.createSwitch('SW1');
      
      expect(sw.name).toBe('SW1');
      expect(sw.type).toBe('switch');
      expect(sw.interfaces.length).toBe(24);
      
      // Verify port numbering starts at 1, not 0
      expect(sw.interfaces[0].name).toBe('FastEthernet0/1');
      expect(sw.interfaces[23].name).toBe('FastEthernet0/24');
    });
    
    it('should create a PC', () => {
      const pc = DeviceSpecFactory.createPC('PC1');
      
      expect(pc.name).toBe('PC1');
      expect(pc.type).toBe('pc');
      expect(pc.interfaces.length).toBe(1);
    });
    
    it('should create a server', () => {
      const server = DeviceSpecFactory.createServer('SRV1');
      
      expect(server.name).toBe('SRV1');
      expect(server.type).toBe('server');
      expect(server.services?.http?.enabled).toBe(true);
    });
  });
});

// =============================================================================
// CONNECTION TESTS
// =============================================================================

describe('ConnectionSpec', () => {
  describe('ConnectionSpecFactory', () => {
    it('should create an ethernet connection', () => {
      const conn = ConnectionSpecFactory.createEthernet(
        'dev-1', 'R1', 'Gi0/0',
        'dev-2', 'SW1', 'Fa0/1'
      );
      
      expect(conn.from.deviceName).toBe('R1');
      expect(conn.from.port).toBe('Gi0/0');
      expect(conn.to.deviceName).toBe('SW1');
      expect(conn.to.port).toBe('Fa0/1');
      expect(conn.cableType).toBe(CableType.STRAIGHT_THROUGH);
    });
    
    it('should create a crossover connection', () => {
      const conn = ConnectionSpecFactory.createEthernet(
        'dev-1', 'SW1', 'Fa0/1',
        'dev-2', 'SW2', 'Fa0/1',
        true  // crossover
      );
      
      expect(conn.cableType).toBe(CableType.CROSSOVER);
    });
    
    it('should create a serial connection', () => {
      const conn = ConnectionSpecFactory.createSerial(
        'dev-1', 'R1', 'Se0/0/0',
        'dev-2', 'R2', 'Se0/0/0'
      );
      
      expect(conn.cableType).toBe(CableType.SERIAL_DCE);
    });
  });
});

// =============================================================================
// LAB TESTS
// =============================================================================

describe('LabSpec', () => {
  describe('LabSpecFactory', () => {
    it('should create an empty lab', () => {
      const lab = LabSpecFactory.create({
        name: 'Test Lab'
      });
      
      expect(lab.metadata.name).toBe('Test Lab');
      expect(lab.devices).toHaveLength(0);
      expect(lab.connections).toHaveLength(0);
    });
    
    it('should add devices', () => {
      const lab = LabSpecFactory.create({ name: 'Test' });
      const router = DeviceSpecFactory.createRouter('R1');
      
      const updated = LabSpecFactory.addDevice(lab, router);
      
      expect(updated.devices).toHaveLength(1);
      expect(updated.devices[0].name).toBe('R1');
    });
    
    it('should remove devices and their connections', () => {
      const lab = LabSpecFactory.create({ name: 'Test' });
      const router = DeviceSpecFactory.createRouter('R1');
      const sw = DeviceSpecFactory.createSwitch('SW1');
      
      let updated = LabSpecFactory.addDevice(lab, router);
      updated = LabSpecFactory.addDevice(updated, sw);
      
      const conn = ConnectionSpecFactory.createEthernet(
        router.id, 'R1', 'Gi0/0',
        sw.id, 'SW1', 'Fa0/1'
      );
      updated = LabSpecFactory.addConnection(updated, conn);
      
      expect(updated.devices).toHaveLength(2);
      expect(updated.connections).toHaveLength(1);
      
      // Remove router
      updated = LabSpecFactory.removeDevice(updated, router.id);
      
      expect(updated.devices).toHaveLength(1);
      expect(updated.connections).toHaveLength(0);  // Connection removed
    });
    
    it('should auto-layout devices', () => {
      const lab = LabSpecFactory.create({ name: 'Test' });
      
      let updated = lab;
      for (let i = 0; i < 5; i++) {
        const device = DeviceSpecFactory.createRouter(`R${i + 1}`);
        updated = LabSpecFactory.addDevice(updated, device);
      }
      
      const laidOut = LabSpecFactory.autoLayout(updated, 'grid');
      
      laidOut.devices.forEach(device => {
        expect(device.position).toBeDefined();
        expect(device.position!.x).toBeGreaterThan(0);
        expect(device.position!.y).toBeGreaterThan(0);
      });
    });
  });
  
  describe('LabValidator', () => {
    it('should validate an empty lab', () => {
      const lab = LabSpecFactory.create({ name: 'Test' });
      const result = LabValidator.validate(lab);
      
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Lab has no devices');
    });
    
    it('should detect duplicate device names', () => {
      const lab = LabSpecFactory.create({ name: 'Test' });
      const r1a = DeviceSpecFactory.createRouter('R1');
      const r1b = DeviceSpecFactory.createRouter('R1');
      
      // Manually create with same name but different IDs
      const updated = {
        ...lab,
        devices: [r1a, { ...r1b, id: 'different-id' }]
      };
      
      const result = LabValidator.validate(updated);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Duplicate device name'))).toBe(true);
    });
  });
});

// =============================================================================
// YAML ADAPTER TESTS
// =============================================================================

describe('YamlAdapter', () => {
  const sampleYAML = `
metadata:
  name: Test Lab
  difficulty: beginner
topology:
  devices:
    - name: R1
      type: router
      interfaces:
        - name: GigabitEthernet0/0
          ip: 192.168.1.1
          subnetMask: 255.255.255.0
    - name: SW1
      type: switch
      vlans:
        - id: 10
          name: Sales
        - id: 20
          name: Engineering
  connections:
    - from: R1
      fromInterface: Gi0/0
      to: SW1
      toInterface: Fa0/1
      type: ethernet
`;

  it('should parse YAML to LabSpec', () => {
    const lab = YamlAdapter.parse(sampleYAML);
    
    expect(lab.metadata.name).toBe('Test Lab');
    expect(lab.devices).toHaveLength(2);
    expect(lab.connections).toHaveLength(1);
  });
  
  it('should convert LabSpec back to YAML', () => {
    const lab = YamlAdapter.parse(sampleYAML);
    const yaml = YamlAdapter.dump(lab);
    
    expect(yaml).toContain('name: Test Lab');
    expect(yaml).toContain('R1');
    expect(yaml).toContain('SW1');
  });
  
  it('should round-trip without data loss', () => {
    const original = YamlAdapter.parse(sampleYAML);
    const yaml = YamlAdapter.dump(original);
    const roundTripped = YamlAdapter.parse(yaml);
    
    expect(roundTripped.metadata.name).toBe(original.metadata.name);
    expect(roundTripped.devices.length).toBe(original.devices.length);
    expect(roundTripped.connections.length).toBe(original.connections.length);
  });
});
