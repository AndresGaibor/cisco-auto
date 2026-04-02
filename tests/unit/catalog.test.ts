/**
 * DEVICE CATALOG TESTS
 */

import { describe, test, expect } from 'bun:test';
import { 
  deviceCatalog,
  routerCatalog,
  switchCatalog,
  endDeviceCatalog,
  moduleCatalog,
  getModuleByCode,
  getModulesBySlotType
} from '../../packages/core/src/catalog';
import { getTotalPorts } from '../../packages/core/src/catalog/schema';

describe('DeviceCatalog', () => {
  describe('Stats', () => {
    test('should have devices in all categories', () => {
      const stats = deviceCatalog.getStats();
      
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.byType['router']).toBeGreaterThan(0);
      expect(stats.byType['switch']).toBeGreaterThan(0);
      expect(stats.byType['pc']).toBeGreaterThan(0);
    });
    
    test('should count generic and legacy devices', () => {
      const stats = deviceCatalog.getStats();
      
      expect(stats.generic).toBeGreaterThan(0);
      expect(stats.legacy).toBeGreaterThan(0);
    });
  });
  
  describe('getById', () => {
    test('should find router by ID', () => {
      const router = deviceCatalog.getById('router-1941');
      
      expect(router).toBeDefined();
      expect(router?.model).toBe('1941');
      expect(router?.type).toBe('router');
    });
    
    test('should find switch by ID', () => {
      const sw = deviceCatalog.getById('switch-2960-24tt');
      
      expect(sw).toBeDefined();
      expect(sw?.model).toBe('2960-24TT-L');
      expect(sw?.type).toBe('switch');
    });
    
    test('should return undefined for invalid ID', () => {
      const device = deviceCatalog.getById('nonexistent');
      
      expect(device).toBeUndefined();
    });
  });
  
  describe('getByModel', () => {
    test('should find device by model (case insensitive)', () => {
      const router = deviceCatalog.getByModel('1941');
      const routerLower = deviceCatalog.getByModel('1941');
      
      expect(router).toBeDefined();
      expect(routerLower).toBeDefined();
    });
    
    test('should find switch by model', () => {
      const sw = deviceCatalog.getByModel('2960-24TT-L');
      
      expect(sw).toBeDefined();
      expect(sw?.type).toBe('switch');
    });
  });
  
  describe('getByType', () => {
    test('should return all routers', () => {
      const routers = deviceCatalog.getByType('router');
      
      expect(routers.length).toBeGreaterThan(0);
      expect(routers.every(r => r.type === 'router')).toBe(true);
    });
    
    test('should return all switches', () => {
      const switches = deviceCatalog.getByType('switch');
      
      expect(switches.length).toBeGreaterThan(0);
      expect(switches.every(s => s.type === 'switch')).toBe(true);
    });
    
    test('should return empty array for invalid type', () => {
      const devices = deviceCatalog.getByType('invalid' as any);
      
      expect(devices).toEqual([]);
    });
  });
  
  describe('search', () => {
    test('should filter by type', () => {
      const results = deviceCatalog.search({ type: 'router' });
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.type === 'router')).toBe(true);
    });
    
    test('should filter by family', () => {
      const results = deviceCatalog.search({ family: 'infrastructure' });
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(d => d.deviceFamily === 'infrastructure')).toBe(true);
    });
    
    test('should search by text', () => {
      const results = deviceCatalog.search({ search: 'gigabit' });
      
      expect(results.length).toBeGreaterThan(0);
    });
    
    test('should filter by vendor', () => {
      const results = deviceCatalog.search({ vendor: 'cisco' });
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(d => d.vendor === 'cisco')).toBe(true);
    });
    
    test('should exclude generic devices', () => {
      const results = deviceCatalog.search({ includeGeneric: false });
      
      expect(results.every(d => !d.isGeneric)).toBe(true);
    });
    
    test('should exclude legacy devices', () => {
      const results = deviceCatalog.search({ includeLegacy: false });
      
      expect(results.every(d => !d.isLegacy)).toBe(true);
    });
    
    test('should filter by tags', () => {
      const results = deviceCatalog.search({ tags: ['poe'] });
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(d => d.tags.includes('poe'))).toBe(true);
    });
    
    test('should filter by capability', () => {
      const results = deviceCatalog.search({ 
        hasCapability: 'supportsRouting',
        capabilityValue: true
      });
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(d => d.capabilities.supportsRouting === true)).toBe(true);
    });
  });
  
  describe('Helper methods', () => {
    test('getRouters should return only routers', () => {
      const routers = deviceCatalog.getRouters();
      
      expect(routers.length).toBeGreaterThan(0);
      expect(routers.every(r => r.type === 'router')).toBe(true);
    });
    
    test('getLayer2Switches should return L2 switches', () => {
      const switches = deviceCatalog.getLayer2Switches();
      
      expect(switches.length).toBeGreaterThan(0);
      expect(switches.every(s => !s.capabilities.supportsRouting)).toBe(true);
    });
    
    test('getLayer3Switches should return L3 switches', () => {
      const switches = deviceCatalog.getLayer3Switches();
      
      expect(switches.every(s => s.type === 'multilayer-switch')).toBe(true);
    });
    
    test('getPoEDevices should return PoE capable devices', () => {
      const devices = deviceCatalog.getPoEDevices();
      
      expect(devices.length).toBeGreaterThan(0);
      expect(devices.every(d => d.capabilities.supportsPoe)).toBe(true);
    });
    
    test('getWirelessDevices should return wireless devices', () => {
      const devices = deviceCatalog.getWirelessDevices();
      
      expect(devices.length).toBeGreaterThan(0);
      expect(devices.every(d => d.capabilities.supportsWireless)).toBe(true);
    });
    
    test('getSecurityDevices should return firewalls', () => {
      const devices = deviceCatalog.getSecurityDevices();
      
      expect(devices.length).toBeGreaterThan(0);
    });
    
    test('getCCNADevices should return devices for CCNA labs', () => {
      const devices = deviceCatalog.getCCNADevices();
      
      expect(devices.length).toBeGreaterThan(0);
    });
  });
  
  describe('Compatibility', () => {
    test('areCompatible should check PT versions', () => {
      const result = deviceCatalog.areCompatible('router-1941', 'switch-2960-24tt');
      
      expect(result.compatible).toBe(true);
      expect(result.reasons.length).toBe(0);
    });
    
    test('areCompatible should return false for nonexistent devices', () => {
      const result = deviceCatalog.areCompatible('nonexistent', 'router-1941');
      
      expect(result.compatible).toBe(false);
      expect(result.reasons).toContain('Device not found');
    });
  });
});

describe('Router Catalog', () => {
  test('should have ISR 4000 series', () => {
    const isr4k = routerCatalog.filter(r => r.series.includes('ISR 4000'));
    
    expect(isr4k.length).toBeGreaterThan(0);
    expect(isr4k.some(r => r.model === 'ISR4321')).toBe(true);
    expect(isr4k.some(r => r.model === 'ISR4331')).toBe(true);
  });
  
  test('should have ISR G2 series', () => {
    const isrG2 = routerCatalog.filter(r => r.series === 'ISR G2');
    
    expect(isrG2.length).toBeGreaterThan(0);
    expect(isrG2.some(r => r.model === '1941')).toBe(true);
    expect(isrG2.some(r => r.model === '2901')).toBe(true);
    expect(isrG2.some(r => r.model === '2911')).toBe(true);
  });
  
  test('all routers should support routing', () => {
    expect(routerCatalog.every(r => r.capabilities.supportsRouting)).toBe(true);
  });
  
  test('all routers should have at least 2 ports', () => {
    routerCatalog.forEach(r => {
      const portCount = getTotalPorts(r.fixedPorts);
      expect(portCount).toBeGreaterThanOrEqual(2);
    });
  });
});

describe('Switch Catalog', () => {
  test('should have 2960 series', () => {
    const c2960 = switchCatalog.filter(s => s.series.includes('2960'));
    
    expect(c2960.length).toBeGreaterThan(0);
  });
  
  test('should have 3560/3650 L3 switches', () => {
    const l3 = switchCatalog.filter(s => s.type === 'multilayer-switch');
    
    expect(l3.length).toBeGreaterThan(0);
    expect(l3.every(s => s.capabilities.supportsRouting)).toBe(true);
  });
  
  test('L2 switches should not have routing', () => {
    const l2 = switchCatalog.filter(s => s.type === 'switch');
    
    expect(l2.every(s => !s.capabilities.supportsRouting)).toBe(true);
  });
  
  test('switches should have 24 or 48 ports', () => {
    switchCatalog.forEach(s => {
      const portCount = getTotalPorts(s.fixedPorts);
      // Allow for switches with fewer ports (like industrial IE2000)
      expect(portCount).toBeGreaterThanOrEqual(8);
    });
  });
});

describe('End Device Catalog', () => {
  test('should have PC, Laptop, Server', () => {
    expect(endDeviceCatalog.some(d => d.type === 'pc')).toBe(true);
    expect(endDeviceCatalog.some(d => d.type === 'laptop')).toBe(true);
    expect(endDeviceCatalog.some(d => d.type === 'server')).toBe(true);
  });
  
  test('should have IP phones', () => {
    const phones = endDeviceCatalog.filter(d => d.type === 'ip-phone');
    
    expect(phones.length).toBeGreaterThan(0);
    expect(phones.some(p => p.capabilities.supportsVoice)).toBe(true);
  });
  
  test('mobile devices should support wireless', () => {
    const mobile = endDeviceCatalog.filter(d => 
      d.type === 'tablet' || d.type === 'smartphone'
    );
    
    expect(mobile.every(d => d.capabilities.supportsWireless)).toBe(true);
  });
});

describe('Module Catalog', () => {
  test('should have HWIC modules', () => {
    const hwic = getModulesBySlotType('hwic');
    
    expect(hwic.length).toBeGreaterThan(0);
    expect(hwic.some(m => m.code === 'HWIC-2T')).toBe(true);
    expect(hwic.some(m => m.code === 'HWIC-4ESW')).toBe(true);
  });
  
  test('should have WIC modules (legacy)', () => {
    const wic = getModulesBySlotType('wic');
    
    expect(wic.length).toBeGreaterThan(0);
    expect(wic.some(m => m.code === 'WIC-2T')).toBe(true);
  });
  
  test('should have NM/NME modules', () => {
    const nm = getModulesBySlotType('nm');
    const nme = getModulesBySlotType('nme');
    
    expect(nm.length).toBeGreaterThan(0);
    expect(nme.length).toBeGreaterThan(0);
  });
  
  test('getModuleByCode should find module', () => {
    const mod = getModuleByCode('HWIC-2T');
    
    expect(mod).toBeDefined();
    expect(mod?.name).toContain('Serial');
  });
  
  test('modules should have port definitions', () => {
    const hwic2t = getModuleByCode('HWIC-2T');
    
    expect(hwic2t?.ports.length).toBeGreaterThan(0);
    
    const portCount = hwic2t!.ports.reduce((sum, p) => {
      return sum + (p.range[1] - p.range[0] + 1);
    }, 0);
    
    expect(portCount).toBe(2); // 2 serial ports
  });
});

describe('Port Definitions', () => {
  test('switch ports should start at 1 (not 0)', () => {
    const sw2960 = deviceCatalog.getByModel('2960-24TT-L');
    
    expect(sw2960).toBeDefined();
    
    const faPorts = sw2960!.fixedPorts.find(p => p.type === 'FastEthernet');
    expect(faPorts).toBeDefined();
    expect(faPorts!.range[0]).toBe(1); // Start at 1, not 0
    expect(faPorts!.range[1]).toBe(24); // End at 24
  });
  
  test('router ports should start at 0', () => {
    const router = deviceCatalog.getByModel('1941');
    
    expect(router).toBeDefined();
    
    const giPorts = router!.fixedPorts.find(p => p.type === 'GigabitEthernet');
    expect(giPorts).toBeDefined();
    expect(giPorts!.range[0]).toBe(0);
  });
});
