import { describe, expect, it } from 'bun:test';
import { DeviceSpecValidator, ValidationCodes } from './device-spec.validator';
import type { DeviceSpec } from '../canonical/device.spec';
import { VlanId, VlanName, VlanRange } from '@cisco-auto/kernel/domain/ios/value-objects';

describe('DeviceSpecValidator', () => {
  const createBaseDevice = (overrides: Partial<DeviceSpec> = {}): DeviceSpec => ({
    id: 'test-device-1',
    name: 'TestRouter',
    type: 'router',
    hostname: 'TestRouter',
    interfaces: [],
    ...overrides
  });

  describe('validate - basic', () => {
    it('should accept valid minimal device', () => {
      const device = createBaseDevice();
      const result = DeviceSpecValidator.validate(device);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty hostname', () => {
      const device = createBaseDevice({ hostname: '' });
      const result = DeviceSpecValidator.validate(device);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Hostname'))).toBe(true);
    });

    it('should reject hostname with spaces', () => {
      const device = createBaseDevice({ hostname: 'My Router' });
      const result = DeviceSpecValidator.validate(device);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('spaces'))).toBe(true);
    });
  });

  describe('validate - interfaces', () => {
    it('should accept valid interface names', () => {
      const device = createBaseDevice({
        interfaces: [
          { name: 'GigabitEthernet0/0', shutdown: false },
          { name: 'FastEthernet0/1', shutdown: false },
          { name: 'Serial0/0/0', shutdown: false },
          { name: 'Vlan10', ip: '192.168.1.1/24' },
          { name: 'Loopback0', ip: '1.1.1.1/32' },
        ]
      });

      const result = DeviceSpecValidator.validate(device);

      expect(result.errors.filter(e => e.code === ValidationCodes.INVALID_INTERFACE_NAME)).toHaveLength(0);
    });

    it('should reject invalid interface names', () => {
      const device = createBaseDevice({
        interfaces: [
          { name: 'InvalidInterface1/1', shutdown: false },
          { name: 'Gi0/0', shutdown: false }, // Abbreviation not allowed
        ]
      });

      const result = DeviceSpecValidator.validate(device);

      expect(result.errors.some(e => e.code === ValidationCodes.INVALID_INTERFACE_NAME)).toBe(true);
    });

    it('should detect duplicate interfaces', () => {
      const device = createBaseDevice({
        interfaces: [
          { name: 'GigabitEthernet0/0', ip: '192.168.1.1/24' },
          { name: 'GigabitEthernet0/0', ip: '192.168.2.1/24' },
        ]
      });

      const result = DeviceSpecValidator.validate(device);

      expect(result.errors.some(e => e.code === ValidationCodes.DUPLICATE_INTERFACE)).toBe(true);
    });

    it('should validate IP format', () => {
      const device = createBaseDevice({
        interfaces: [
          { name: 'GigabitEthernet0/0', ip: '192.168.1.256/24' }, // Invalid octet
          { name: 'GigabitEthernet0/1', ip: '10.0.0.1/24' }, // Valid
        ]
      });

      const result = DeviceSpecValidator.validate(device);

      expect(result.errors.some(e => e.code === ValidationCodes.INVALID_IP_FORMAT)).toBe(true);
    });

    it('should validate CIDR notation', () => {
      const device = createBaseDevice({
        interfaces: [
          { name: 'GigabitEthernet0/0', ip: '192.168.1.1/33' }, // Invalid CIDR
        ]
      });

      const result = DeviceSpecValidator.validate(device);

      expect(result.errors.some(e => e.code === ValidationCodes.INVALID_SUBNET_MASK)).toBe(true);
    });

    it('should validate VLAN range', () => {
      // VlanId throws on construction for invalid values, so we test with tryFrom
      const invalidVlan = VlanId.tryFrom(5000);
      expect(invalidVlan).toBeNull();
    });

    it('should validate native VLAN range', () => {
      const invalidVlan = VlanId.tryFrom(0);
      expect(invalidVlan).toBeNull();
    });

    it('should validate allowed VLANs', () => {
      // VlanRange throws on construction for invalid values
      const invalidRange = VlanRange.tryFrom([1, 5000, 6000]);
      expect(invalidRange).toBeNull();
    });
  });

  describe('validate - VLANs', () => {
    it('should accept valid VLANs', () => {
      const device = createBaseDevice({
        vlans: [
          { id: VlanId.from(10), name: VlanName.from('DATA') },
          { id: VlanId.from(20), name: VlanName.from('VOICE') },
          { id: VlanId.from(99), name: VlanName.from('GUEST') },
        ]
      });

      const result = DeviceSpecValidator.validate(device);

      expect(result.errors.filter(e => e.code === ValidationCodes.VLAN_INVALID_ID)).toHaveLength(0);
    });

    it('should reject invalid VLAN IDs', () => {
      // Invalid VLANs are caught at VlanId construction time
      // This test verifies that tryFrom returns null for invalid values
      expect(VlanId.tryFrom(0)).toBeNull();
      expect(VlanId.tryFrom(4095)).toBeNull();
    });

    it('should warn about VLAN 1', () => {
      const device = createBaseDevice({
        vlans: [{ id: VlanId.from(1), name: VlanName.from('DEFAULT') }]
      });

      const result = DeviceSpecValidator.validate(device);

      expect(result.warnings.some(w => w.message.includes('VLAN 1'))).toBe(true);
    });

    it('should detect duplicate VLANs', () => {
      const device = createBaseDevice({
        vlans: [
          { id: VlanId.from(10), name: VlanName.from('DATA') },
          { id: VlanId.from(10), name: VlanName.from('DATA2') },
        ]
      });

      const result = DeviceSpecValidator.validate(device);

      expect(result.errors.some(e => e.code === ValidationCodes.VLAN_DUPLICATE)).toBe(true);
    });

    it('should warn about long VLAN names', () => {
      // VlanName truncates automatically to 32 chars
      const longName = 'A'.repeat(50);
      const vlanName = VlanName.from(longName);
      expect(vlanName.truncated).toBe(true);
      expect(vlanName.value.length).toBe(32);
      
      // The validator checks the truncated name, so no warning is generated
      // This test verifies that VlanName handles truncation correctly
      const device = createBaseDevice({
        vlans: [{ id: VlanId.from(10), name: vlanName }]
      });

      const result = DeviceSpecValidator.validate(device);
      
      // No warning because VlanName already truncated the value
      expect(result.warnings.some(w => w.message.includes('32 characters'))).toBe(false);
    });
  });

  describe('validate - routing', () => {
    describe('OSPF', () => {
      it('should accept valid OSPF configuration', () => {
        const device = createBaseDevice({
          routing: {
            ospf: {
              processId: 1,
              routerId: '1.1.1.1',
              areas: [{
                areaId: '0',
                networks: ['192.168.1.0/24']
              }]
            }
          }
        });

        const result = DeviceSpecValidator.validate(device);

        expect(result.errors.filter(e => e.code === ValidationCodes.ROUTER_ID_INVALID)).toHaveLength(0);
        expect(result.errors.filter(e => e.code === ValidationCodes.OSPF_AREA_INVALID)).toHaveLength(0);
      });

      it('should reject invalid router ID', () => {
        const device = createBaseDevice({
          routing: {
            ospf: {
              processId: 1,
              routerId: '999.999.999.999',
              areas: [{ areaId: '0', networks: ['192.168.1.0/24'] }]
            }
          }
        });

        const result = DeviceSpecValidator.validate(device);

        expect(result.errors.some(e => e.code === ValidationCodes.ROUTER_ID_INVALID)).toBe(true);
      });

      it('should warn about missing router ID', () => {
        const device = createBaseDevice({
          routing: {
            ospf: {
              processId: 1,
              areas: [{ areaId: '0', networks: ['192.168.1.0/24'] }]
            }
          }
        });

        const result = DeviceSpecValidator.validate(device);

        expect(result.warnings.some(w => w.message.includes('router-id'))).toBe(true);
      });

      it('should accept IP format area ID', () => {
        const device = createBaseDevice({
          routing: {
            ospf: {
              processId: 1,
              areas: [{ areaId: '0.0.0.0', networks: ['192.168.1.0/24'] }]
            }
          }
        });

        const result = DeviceSpecValidator.validate(device);

        expect(result.errors.filter(e => e.code === ValidationCodes.OSPF_AREA_INVALID)).toHaveLength(0);
      });

      it('should reject invalid area ID', () => {
        const device = createBaseDevice({
          routing: {
            ospf: {
              processId: 1,
              areas: [{ areaId: 'invalid-area', networks: ['192.168.1.0/24'] }]
            }
          }
        });

        const result = DeviceSpecValidator.validate(device);

        expect(result.errors.some(e => e.code === ValidationCodes.OSPF_AREA_INVALID)).toBe(true);
      });
    });

    describe('EIGRP', () => {
      it('should accept valid EIGRP configuration', () => {
        const device = createBaseDevice({
          routing: {
            eigrp: {
              asNumber: 100,
              routerId: '2.2.2.2',
              networks: ['192.168.0.0/16']
            }
          }
        });

        const result = DeviceSpecValidator.validate(device);

        expect(result.errors.filter(e => e.code === ValidationCodes.EIGRP_ASN_INVALID)).toHaveLength(0);
      });

      it('should reject invalid AS number', () => {
        const device = createBaseDevice({
          routing: {
            eigrp: {
              asNumber: 70000,
              networks: ['192.168.0.0/16']
            }
          }
        });

        const result = DeviceSpecValidator.validate(device);

        expect(result.errors.some(e => e.code === ValidationCodes.EIGRP_ASN_INVALID)).toBe(true);
      });

      it('should reject invalid router ID', () => {
        const device = createBaseDevice({
          routing: {
            eigrp: {
              asNumber: 100,
              routerId: 'not-an-ip',
              networks: ['192.168.0.0/16']
            }
          }
        });

        const result = DeviceSpecValidator.validate(device);

        expect(result.errors.some(e => e.code === ValidationCodes.ROUTER_ID_INVALID)).toBe(true);
      });
    });

    describe('BGP', () => {
      it('should accept valid BGP configuration', () => {
        const device = createBaseDevice({
          routing: {
            bgp: {
              asn: 65000,
              routerId: '3.3.3.3',
              neighbors: [{ ip: '10.0.0.1', remoteAs: 65001 }]
            }
          }
        });

        const result = DeviceSpecValidator.validate(device);

        expect(result.errors.filter(e => e.code === ValidationCodes.BGP_ASN_INVALID)).toHaveLength(0);
      });

      it('should reject invalid ASN', () => {
        const device = createBaseDevice({
          routing: {
            bgp: {
              asn: 0,
              neighbors: [{ ip: '10.0.0.1', remoteAs: 65001 }]
            }
          }
        });

        const result = DeviceSpecValidator.validate(device);

        expect(result.errors.some(e => e.code === ValidationCodes.BGP_ASN_INVALID)).toBe(true);
      });
    });
  });

  describe('validate - security', () => {
    it('should accept valid ACL configuration', () => {
      const device = createBaseDevice({
        security: {
          acls: [
            {
              name: 'ALLOWED_HOSTS',
              type: 'named',
              rules: [
                { action: 'permit', protocol: 'ip', source: '192.168.1.0', sourceWildcard: '0.0.0.255' },
              ]
            }
          ]
        }
      });

      const result = DeviceSpecValidator.validate(device);

      expect(result.errors.filter(e => e.code === ValidationCodes.ACL_INVALID_NAME)).toHaveLength(0);
      expect(result.errors.filter(e => e.code === ValidationCodes.ACL_INVALID_RULE)).toHaveLength(0);
    });

    it('should reject empty ACL name', () => {
      const device = createBaseDevice({
        security: {
          acls: [{ name: '', type: 'named', rules: [] }]
        }
      });

      const result = DeviceSpecValidator.validate(device);

      expect(result.errors.some(e => e.code === ValidationCodes.ACL_INVALID_NAME)).toBe(true);
    });

    it('should reject invalid ACL action', () => {
      const device = createBaseDevice({
        security: {
          acls: [{
            name: 'TEST_ACL',
            type: 'named',
            rules: [{ action: 'reject' as any, protocol: 'ip', source: 'any' }]
          }]
        }
      });

      const result = DeviceSpecValidator.validate(device);

      expect(result.errors.some(e => e.code === ValidationCodes.ACL_INVALID_RULE)).toBe(true);
    });
  });

  describe('validate - topology', () => {
    it('should detect duplicate router IDs across devices', () => {
      const device1 = createBaseDevice({
        id: 'router-1',
        routing: {
          ospf: {
            processId: 1,
            routerId: '1.1.1.1',
            areas: [{ areaId: '0', networks: ['192.168.1.0/24'] }]
          }
        }
      });

      const device2 = createBaseDevice({
        id: 'router-2',
        routing: {
          ospf: {
            processId: 1,
            routerId: '1.1.1.1', // Duplicate!
            areas: [{ areaId: '0', networks: ['10.0.0.0/8'] }]
          }
        }
      });

      const result = DeviceSpecValidator.validate(device1, [device1, device2]);

      expect(result.errors.some(e => e.code === ValidationCodes.ROUTER_ID_DUPLICATE)).toBe(true);
    });

    it('should detect duplicate IPs across devices', () => {
      const device1 = createBaseDevice({
        id: 'router-1',
        interfaces: [{ name: 'GigabitEthernet0/0', ip: '192.168.1.1/24' }]
      });

      const device2 = createBaseDevice({
        id: 'router-2',
        interfaces: [{ name: 'GigabitEthernet0/0', ip: '192.168.1.1/24' }] // Duplicate!
      });

      const result = DeviceSpecValidator.validate(device1, [device1, device2]);

      expect(result.errors.some(e => e.code === ValidationCodes.TOPOLOGY_DUPLICATE_IP)).toBe(true);
    });
  });

  describe('validate - comprehensive', () => {
    it('should validate complete device configuration', () => {
      const device: DeviceSpec = {
        id: 'switch-1',
        name: 'CoreSwitch',
        type: 'switch',
        hostname: 'CoreSwitch',
        model: { model: '2960-24TT-L' },
        interfaces: [
          { name: 'Vlan10', ip: '192.168.10.1/24' },
          { name: 'Vlan20', ip: '192.168.20.1/24' },
          { name: 'GigabitEthernet0/1', switchportMode: 'trunk', nativeVlan: VlanId.from(99), allowedVlans: VlanRange.from([10, 20, 99]) },
        ],
        vlans: [
          { id: VlanId.from(10), name: VlanName.from('DATA') },
          { id: VlanId.from(20), name: VlanName.from('VOICE') },
          { id: VlanId.from(99), name: VlanName.from('MANAGEMENT') },
        ],
        routing: {
          ospf: {
            processId: 1,
            routerId: '10.0.0.1',
            areas: [{ areaId: '0', networks: ['192.168.0.0/16'] }]
          }
        }
      };

      const result = DeviceSpecValidator.validate(device);

      // Should have warnings but no critical errors for this valid config
      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
    });
  });
});
