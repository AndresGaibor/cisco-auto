/**
 * CCNA TEMPLATES TESTS
 */

import { describe, test, expect } from 'bun:test';
import { 
  CCNATemplates, 
  getTemplateById, 
  getTemplatesByCategory,
  getTemplatesByDifficulty,
  vlanBasicsTemplate,
  staticRoutingTemplate,
  ospfSingleAreaTemplate,
  aclBasicsTemplate,
  dhcpServerTemplate
} from '../../src/templates/ccna/index.ts';

describe('CCNA Templates', () => {
  describe('template metadata', () => {
    test('should have all required templates', () => {
      expect(CCNATemplates.length).toBe(5);
    });

    test('all templates should have required properties', () => {
      for (const template of CCNATemplates) {
        expect(template.id).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.description).toBeDefined();
        expect(template.difficulty).toMatch(/beginner|intermediate|advanced/);
        expect(template.category).toBeDefined();
        expect(template.objectives.length).toBeGreaterThan(0);
        expect(template.estimatedTime).toBeGreaterThan(0);
        expect(template.create).toBeTypeOf('function');
      }
    });
  });

  describe('vlanBasicsTemplate', () => {
    test('should generate lab with switch and PCs', () => {
      const lab = vlanBasicsTemplate.create();
      
      expect(lab.devices.length).toBe(4); // 1 switch + 3 PCs
      expect(lab.devices.filter(d => d.type === 'switch').length).toBe(1);
      expect(lab.devices.filter(d => d.type === 'pc').length).toBe(3);
    });

    test('should have VLAN configurations', () => {
      const lab = vlanBasicsTemplate.create();
      const switchDevice = lab.devices.find(d => d.type === 'switch');
      
      expect(switchDevice?.vlans).toBeDefined();
      expect(switchDevice?.vlans?.length).toBe(3);
    });
  });

  describe('staticRoutingTemplate', () => {
    test('should generate lab with two routers', () => {
      const lab = staticRoutingTemplate.create();
      
      expect(lab.devices.filter(d => d.type === 'router').length).toBe(2);
    });

    test('should have static routes configured', () => {
      const lab = staticRoutingTemplate.create();
      const router1 = lab.devices.find(d => d.name === 'Router1');
      
      expect(router1?.routing?.static).toBeDefined();
      expect(router1?.routing?.static?.length).toBeGreaterThan(0);
    });
  });

  describe('ospfSingleAreaTemplate', () => {
    test('should generate lab with three routers', () => {
      const lab = ospfSingleAreaTemplate.create();
      
      expect(lab.devices.filter(d => d.type === 'router').length).toBe(3);
    });

    test('should have OSPF configured on all routers', () => {
      const lab = ospfSingleAreaTemplate.create();
      
      for (const device of lab.devices) {
        expect(device.routing?.ospf).toBeDefined();
        expect(device.routing?.ospf?.processId).toBe(1);
        expect(device.routing?.ospf?.networks.length).toBeGreaterThan(0);
      }
    });

    test('should use area 0 for all networks', () => {
      const lab = ospfSingleAreaTemplate.create();
      
      for (const device of lab.devices) {
        for (const net of device.routing?.ospf?.networks || []) {
          expect(net.area).toBe('0');
        }
      }
    });
  });

  describe('aclBasicsTemplate', () => {
    test('should have ACL configuration', () => {
      const lab = aclBasicsTemplate.create();
      const router = lab.devices.find(d => d.type === 'router');
      
      expect(router?.security?.acls).toBeDefined();
      expect(router?.security?.acls?.length).toBeGreaterThan(0);
    });

    test('should have extended ACL', () => {
      const lab = aclBasicsTemplate.create();
      const router = lab.devices.find(d => d.type === 'router');
      const acl = router?.security?.acls?.[0];
      
      expect(acl?.type).toBe('extended');
    });
  });

  describe('dhcpServerTemplate', () => {
    test('should have DHCP configuration', () => {
      const lab = dhcpServerTemplate.create();
      const router = lab.devices.find(d => d.type === 'router');
      
      expect(router?.services?.dhcp).toBeDefined();
    });

    test('should have DHCP pool', () => {
      const lab = dhcpServerTemplate.create();
      const router = lab.devices.find(d => d.type === 'router');
      const dhcp = router?.services?.dhcp?.[0];
      
      expect(dhcp?.poolName).toBe('LAN_POOL');
      expect(dhcp?.network).toBeDefined();
      expect(dhcp?.defaultRouter).toBeDefined();
    });
  });

  describe('getTemplateById', () => {
    test('should find template by ID', () => {
      const template = getTemplateById('ccna-vlan-basics');
      
      expect(template).toBeDefined();
      expect(template?.name).toBe('VLAN Basics');
    });

    test('should return undefined for invalid ID', () => {
      const template = getTemplateById('invalid-id');
      
      expect(template).toBeUndefined();
    });
  });

  describe('getTemplatesByCategory', () => {
    test('should filter by Routing category', () => {
      const templates = getTemplatesByCategory('Routing');
      
      expect(templates.length).toBe(2); // Static Routing, OSPF
      expect(templates.every(t => t.category === 'Routing')).toBe(true);
    });

    test('should filter by Switching category', () => {
      const templates = getTemplatesByCategory('Switching');
      
      expect(templates.length).toBe(1); // VLAN Basics
    });
  });

  describe('getTemplatesByDifficulty', () => {
    test('should filter by beginner', () => {
      const templates = getTemplatesByDifficulty('beginner');
      
      expect(templates.length).toBe(3); // VLAN, Static Routing, DHCP
    });

    test('should filter by intermediate', () => {
      const templates = getTemplatesByDifficulty('intermediate');
      
      expect(templates.length).toBe(2); // OSPF, ACL
    });
  });

  describe('lab generation', () => {
    test('all templates should generate valid LabSpec', () => {
      for (const template of CCNATemplates) {
        const lab = template.create();
        
        expect(lab.metadata).toBeDefined();
        expect(lab.devices).toBeDefined();
        expect(lab.connections).toBeDefined();
        expect(lab.devices.length).toBeGreaterThan(0);
      }
    });

    test('all connections should reference existing devices', () => {
      for (const template of CCNATemplates) {
        const lab = template.create();
        const deviceNames = new Set(lab.devices.map(d => d.name));
        
        for (const conn of lab.connections) {
          expect(deviceNames.has(conn.from.deviceName)).toBe(true);
          expect(deviceNames.has(conn.to.deviceName)).toBe(true);
        }
      }
    });
  });
});
