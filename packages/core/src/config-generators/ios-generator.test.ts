import { describe, expect, it } from 'bun:test';
import { SectionOrderConfig, DEFAULT_SECTION_ORDER, IOSGenerator } from './ios-generator';
import type { DeviceSpec } from '../canonical/device.spec';

describe('SectionOrderConfig', () => {
  const mockDevice: Partial<DeviceSpec> = {
    id: 'test-1',
    name: 'TestRouter',
    type: 'router',
    hostname: 'TestRouter',
    interfaces: [
      { name: 'GigabitEthernet0/0', ip: '192.168.1.1/24', shutdown: false }
    ],
    vlans: [{ id: 10, name: 'DATA' }],
    routing: {
      ospf: {
        processId: 1,
        routerId: '1.1.1.1',
        areas: [{ areaId: '0', networks: ['192.168.1.0/24'] }]
      }
    }
  };

  describe('DEFAULT_SECTION_ORDER', () => {
    it('should have correct default order', () => {
      expect(DEFAULT_SECTION_ORDER).toEqual([
        'basic',
        'vlans',
        'vtp',
        'interfaces',
        'routing',
        'security',
        'lines'
      ]);
    });
  });

  describe('generate with custom order', () => {
    it('should use default order when no custom order provided', () => {
      const result = SectionOrderConfig.generate(mockDevice as DeviceSpec);

      const basicIndex = result.commands.findIndex(c => c.includes('--- BASIC ---'));
      const vlansIndex = result.commands.findIndex(c => c.includes('--- VLANS ---'));
      const routingIndex = result.commands.findIndex(c => c.includes('--- ROUTING ---'));

      expect(basicIndex).toBeLessThan(vlansIndex);
      expect(vlansIndex).toBeLessThan(routingIndex);
    });

    it('should use custom order when provided', () => {
      const customOrder = ['interfaces', 'basic', 'routing', 'vlans'];
      const result = SectionOrderConfig.generate(mockDevice as DeviceSpec, customOrder);

      const interfacesIndex = result.commands.findIndex(c => c.includes('--- INTERFACES ---'));
      const basicIndex = result.commands.findIndex(c => c.includes('--- BASIC ---'));
      const routingIndex = result.commands.findIndex(c => c.includes('--- ROUTING ---'));
      const vlansIndex = result.commands.findIndex(c => c.includes('--- VLANS ---'));

      expect(interfacesIndex).toBeLessThan(basicIndex);
      expect(basicIndex).toBeLessThan(routingIndex);
      expect(routingIndex).toBeLessThan(vlansIndex);
    });

    it('should handle empty custom order by using default', () => {
      const result = SectionOrderConfig.generate(mockDevice as DeviceSpec, []);

      const basicIndex = result.commands.findIndex(c => c.includes('--- BASIC ---'));
      expect(basicIndex).toBeGreaterThan(-1);
    });
  });

  describe('validateOrder', () => {
    it('should validate correct order', () => {
      const result = SectionOrderConfig.validateOrder(DEFAULT_SECTION_ORDER);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn about unknown sections', () => {
      const result = SectionOrderConfig.validateOrder(['basic', 'unknown-section']);

      expect(result.warnings).toContain("Unknown section: 'unknown-section'. Will be ignored if not generated");
    });

    it('should error on duplicate sections', () => {
      const result = SectionOrderConfig.validateOrder(['basic', 'basic', 'interfaces']);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Duplicate section: 'basic'");
    });

    it('should allow subset of sections', () => {
      const result = SectionOrderConfig.validateOrder(['basic', 'interfaces']);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('customizeOrder', () => {
    it('should move section to new position', () => {
      const customOrder = SectionOrderConfig.customizeOrder({ 'routing': 0 });

      expect(customOrder[0]).toBe('routing');
      expect(customOrder).toContain('basic');
      expect(customOrder.length).toBe(DEFAULT_SECTION_ORDER.length);
    });

    it('should move multiple sections', () => {
      const customOrder = SectionOrderConfig.customizeOrder({
        'interfaces': 0,
        'basic': 1
      });

      expect(customOrder[0]).toBe('interfaces');
      expect(customOrder[1]).toBe('basic');
    });

    it('should handle out of bounds indices', () => {
      const customOrder = SectionOrderConfig.customizeOrder({ 'basic': 100 });

      // Should clamp to valid range
      expect(customOrder).toContain('basic');
      expect(customOrder.length).toBe(DEFAULT_SECTION_ORDER.length);
    });

    it('should not modify original order', () => {
      const original = [...DEFAULT_SECTION_ORDER];
      SectionOrderConfig.customizeOrder({ 'routing': 0 });

      expect(DEFAULT_SECTION_ORDER).toEqual(original);
    });
  });

  describe('getDefaultOrder', () => {
    it('should return a copy of default order', () => {
      const order = SectionOrderConfig.getDefaultOrder();

      expect(order).toEqual(DEFAULT_SECTION_ORDER);
      expect(order).not.toBe(DEFAULT_SECTION_ORDER); // Should be a copy
    });
  });

  describe('IOSGenerator compatibility', () => {
    it('should generate config with default order', () => {
      const device: Partial<DeviceSpec> = {
        id: 'test-2',
        name: 'TestSwitch',
        type: 'switch',
        hostname: 'TestSwitch',
        interfaces: [{ name: 'Vlan10', ip: '192.168.10.1/24' }]
      };

      const result = IOSGenerator.generate(device as DeviceSpec);

      expect(result.hostname).toBe('TestSwitch');
      expect(result.commands).toContain('end');
      expect(result.commands).toContain('write memory');
      expect(result.sections).toHaveProperty('basic');
      expect(result.sections).toHaveProperty('interfaces');
    });
  });
});
