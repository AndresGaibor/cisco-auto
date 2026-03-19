/**
 * Tests para el protocolo VLAN (802.1Q)
 */

import { describe, test, expect } from 'bun:test';
import {
  // VLAN tag utilities
  createVLANTag,
  isValidVLAN,
  isNormalRangeVLAN,
  isExtendedRangeVLAN,
  isReservedVLAN,
  parseVLANList,
  vlanListToString,
  // Switchport config
  createAccessConfig,
  createTrunkConfig,
  getSwitchportConfig,
  // VLAN membership
  checkIngressVLAN,
  checkEgressVLAN,
  // VLAN definition
  createDefaultVLAN,
  createVLANDefinition,
  getVLANMembers,
  getFloodPorts,
  // QoS
  getPCPName,
  getRecommendedPCP,
  // Constants
  VLAN_RESERVED,
  PCP_VALUES
} from '../protocols/vlan';

import type { InterfaceRuntime } from '../runtime';

// =============================================================================
// VLAN TAG UTILITIES
// =============================================================================

describe('VLAN Tag Utilities', () => {
  
  describe('createVLANTag', () => {
    test('creates VLAN tag with default values', () => {
      const tag = createVLANTag(10);
      
      expect(tag.vid).toBe(10);
      expect(tag.pcp).toBe(PCP_VALUES.BEST_EFFORT);
      expect(tag.dei).toBe(false);
    });
    
    test('creates VLAN tag with custom values', () => {
      const tag = createVLANTag(100, { pcp: 5, dei: true });
      
      expect(tag.vid).toBe(100);
      expect(tag.pcp).toBe(5);
      expect(tag.dei).toBe(true);
    });
    
    test('throws on invalid VLAN ID', () => {
      expect(() => createVLANTag(-1)).toThrow();
      expect(() => createVLANTag(4095)).toThrow();
      expect(() => createVLANTag(5000)).toThrow();
    });
    
    test('accepts VLAN 0 (priority tagging)', () => {
      const tag = createVLANTag(0);
      expect(tag.vid).toBe(0);
    });
  });
  
  describe('isValidVLAN', () => {
    test('returns true for valid VLANs', () => {
      expect(isValidVLAN(0)).toBe(true);
      expect(isValidVLAN(1)).toBe(true);
      expect(isValidVLAN(100)).toBe(true);
      expect(isValidVLAN(4094)).toBe(true);
    });
    
    test('returns false for invalid VLANs', () => {
      expect(isValidVLAN(-1)).toBe(false);
      expect(isValidVLAN(4095)).toBe(false);
      expect(isValidVLAN(1.5)).toBe(false);
      expect(isValidVLAN(NaN)).toBe(false);
    });
  });
  
  describe('isNormalRangeVLAN', () => {
    test('returns true for normal range VLANs', () => {
      expect(isNormalRangeVLAN(1)).toBe(true);
      expect(isNormalRangeVLAN(100)).toBe(true);
      expect(isNormalRangeVLAN(1005)).toBe(true);
    });
    
    test('returns false for extended range VLANs', () => {
      expect(isNormalRangeVLAN(1006)).toBe(false);
      expect(isNormalRangeVLAN(2000)).toBe(false);
    });
  });
  
  describe('isExtendedRangeVLAN', () => {
    test('returns true for extended range VLANs', () => {
      expect(isExtendedRangeVLAN(1006)).toBe(true);
      expect(isExtendedRangeVLAN(2000)).toBe(true);
      expect(isExtendedRangeVLAN(4094)).toBe(true);
    });
    
    test('returns false for normal range VLANs', () => {
      expect(isExtendedRangeVLAN(1)).toBe(false);
      expect(isExtendedRangeVLAN(1005)).toBe(false);
    });
  });
  
  describe('isReservedVLAN', () => {
    test('returns true for reserved VLANs', () => {
      expect(isReservedVLAN(1002)).toBe(true);
      expect(isReservedVLAN(1003)).toBe(true);
      expect(isReservedVLAN(1004)).toBe(true);
      expect(isReservedVLAN(1005)).toBe(true);
    });
    
    test('returns false for non-reserved VLANs', () => {
      expect(isReservedVLAN(1)).toBe(false);
      expect(isReservedVLAN(100)).toBe(false);
      expect(isReservedVLAN(1006)).toBe(false);
    });
  });
  
  describe('parseVLANList', () => {
    test('parses single VLAN', () => {
      expect(parseVLANList('10')).toEqual([10]);
    });
    
    test('parses comma-separated VLANs', () => {
      expect(parseVLANList('1,2,3,10,20')).toEqual([1, 2, 3, 10, 20]);
    });
    
    test('parses VLAN ranges', () => {
      expect(parseVLANList('1-5')).toEqual([1, 2, 3, 4, 5]);
    });
    
    test('parses mixed list with ranges', () => {
      expect(parseVLANList('1,5-7,10,20-22')).toEqual([1, 5, 6, 7, 10, 20, 21, 22]);
    });
    
    test('removes duplicates', () => {
      expect(parseVLANList('1,2,1,3,2')).toEqual([1, 2, 3]);
    });
    
    test('sorts results', () => {
      expect(parseVLANList('10,1,5')).toEqual([1, 5, 10]);
    });
  });
  
  describe('vlanListToString', () => {
    test('converts single VLAN', () => {
      expect(vlanListToString([10])).toBe('10');
    });
    
    test('converts consecutive VLANs to range', () => {
      expect(vlanListToString([1, 2, 3, 4, 5])).toBe('1-5');
    });
    
    test('converts mixed VLANs', () => {
      expect(vlanListToString([1, 2, 3, 10, 20, 21])).toBe('1-3,10,20-21');
    });
    
    test('handles empty list', () => {
      expect(vlanListToString([])).toBe('');
    });
  });
});

// =============================================================================
// SWITCHPORT CONFIG
// =============================================================================

describe('Switchport Config', () => {
  
  describe('createAccessConfig', () => {
    test('creates default access config', () => {
      const config = createAccessConfig();
      
      expect(config.mode).toBe('access');
      expect(config.accessVlan).toBe(1);
      expect(config.nativeVlan).toBe(1);
    });
    
    test('creates access config with custom VLAN', () => {
      const config = createAccessConfig(100);
      
      expect(config.accessVlan).toBe(100);
      expect(config.allowedVlans).toEqual([100]);
    });
  });
  
  describe('createTrunkConfig', () => {
    test('creates default trunk config', () => {
      const config = createTrunkConfig();
      
      expect(config.mode).toBe('trunk');
      expect(config.nativeVlan).toBe(1);
      // 'all' mode creates all VLANs
      expect(config.allowedVlans.length).toBe(4094);
    });
    
    test('creates trunk config with specific VLANs', () => {
      const config = createTrunkConfig(1, [1, 10, 20, 30]);
      
      expect(config.allowedVlans).toEqual([1, 10, 20, 30]);
    });
  });
  
  describe('getSwitchportConfig', () => {
    test('extracts config from InterfaceRuntime', () => {
      const iface: InterfaceRuntime = {
        name: 'FastEthernet0/1',
        mac: 'aa:bb:cc:dd:ee:ff',
        vlan: 10,
        switchportMode: 'access',
        adminStatus: 'up',
        linkStatus: 'up',
        rxBytes: 0,
        txBytes: 0,
        rxPackets: 0,
        txPackets: 0,
        rxErrors: 0,
        txErrors: 0,
        outputQueue: []
      };
      
      const config = getSwitchportConfig(iface);
      
      expect(config.mode).toBe('access');
      expect(config.accessVlan).toBe(10);
    });
    
    test('handles trunk interface', () => {
      const iface: InterfaceRuntime = {
        name: 'GigabitEthernet0/1',
        mac: 'aa:bb:cc:dd:ee:ff',
        vlan: 1,
        nativeVlan: 1,
        allowedVlans: [1, 10, 20, 30],
        switchportMode: 'trunk',
        adminStatus: 'up',
        linkStatus: 'up',
        rxBytes: 0,
        txBytes: 0,
        rxPackets: 0,
        txPackets: 0,
        rxErrors: 0,
        txErrors: 0,
        outputQueue: []
      };
      
      const config = getSwitchportConfig(iface);
      
      expect(config.mode).toBe('trunk');
      expect(config.nativeVlan).toBe(1);
      expect(config.allowedVlans).toEqual([1, 10, 20, 30]);
    });
  });
});

// =============================================================================
// VLAN MEMBERSHIP
// =============================================================================

describe('VLAN Membership', () => {
  
  describe('checkIngressVLAN', () => {
    
    test('access port accepts untagged frame', () => {
      const config = createAccessConfig(10);
      const result = checkIngressVLAN(undefined, config);
      
      expect(result.allowed).toBe(true);
      expect(result.outputVlan).toBe(10);
    });
    
    test('access port rejects tagged frame on different VLAN', () => {
      const config = createAccessConfig(10);
      const result = checkIngressVLAN(20, config);
      
      expect(result.allowed).toBe(false);
    });
    
    test('access port accepts tagged frame on access VLAN', () => {
      const config = createAccessConfig(10);
      const result = checkIngressVLAN(10, config);
      
      expect(result.allowed).toBe(true);
      expect(result.outputVlan).toBe(10);
    });
    
    test('trunk port accepts tagged frame in allowed list', () => {
      const config = createTrunkConfig(1, [1, 10, 20]);
      const result = checkIngressVLAN(10, config);
      
      expect(result.allowed).toBe(true);
      expect(result.outputVlan).toBe(10);
    });
    
    test('trunk port rejects tagged frame not in allowed list', () => {
      const config = createTrunkConfig(1, [1, 10, 20]);
      const result = checkIngressVLAN(30, config);
      
      expect(result.allowed).toBe(false);
    });
    
    test('trunk port assigns untagged frame to native VLAN', () => {
      const config = createTrunkConfig(99, [1, 10, 20, 99]);
      const result = checkIngressVLAN(undefined, config);
      
      expect(result.allowed).toBe(true);
      expect(result.outputVlan).toBe(99);
      expect(result.untagged).toBe(true);
    });
  });
  
  describe('checkEgressVLAN', () => {
    
    test('access port sends untagged on access VLAN', () => {
      const config = createAccessConfig(10);
      const result = checkEgressVLAN(10, config);
      
      expect(result.allowed).toBe(true);
      expect(result.untagged).toBe(true);
    });
    
    test('access port rejects non-access VLAN', () => {
      const config = createAccessConfig(10);
      const result = checkEgressVLAN(20, config);
      
      expect(result.allowed).toBe(false);
    });
    
    test('trunk port sends tagged for non-native VLAN', () => {
      const config = createTrunkConfig(1, [1, 10, 20]);
      const result = checkEgressVLAN(10, config);
      
      expect(result.allowed).toBe(true);
      expect(result.untagged).toBe(false);
    });
    
    test('trunk port sends untagged for native VLAN', () => {
      const config = createTrunkConfig(1, [1, 10, 20]);
      const result = checkEgressVLAN(1, config);
      
      expect(result.allowed).toBe(true);
      expect(result.untagged).toBe(true);
    });
    
    test('trunk port rejects VLAN not in allowed list', () => {
      const config = createTrunkConfig(1, [1, 10, 20]);
      const result = checkEgressVLAN(30, config);
      
      expect(result.allowed).toBe(false);
    });
  });
});

// =============================================================================
// VLAN DEFINITION
// =============================================================================

describe('VLAN Definition', () => {
  
  describe('createDefaultVLAN', () => {
    test('creates VLAN 1 as default', () => {
      const vlan = createDefaultVLAN();
      
      expect(vlan.id).toBe(1);
      expect(vlan.name).toBe('default');
      expect(vlan.status).toBe('active');
      expect(vlan.isDefault).toBe(true);
    });
  });
  
  describe('createVLANDefinition', () => {
    test('creates VLAN with default name', () => {
      const vlan = createVLANDefinition(100);
      
      expect(vlan.id).toBe(100);
      expect(vlan.name).toBe('VLAN0100');
    });
    
    test('creates VLAN with custom name', () => {
      const vlan = createVLANDefinition(100, 'Management');
      
      expect(vlan.name).toBe('Management');
    });
    
    test('throws on invalid VLAN ID', () => {
      expect(() => createVLANDefinition(-1)).toThrow();
      expect(() => createVLANDefinition(4095)).toThrow();
    });
  });
  
  describe('getVLANMembers', () => {
    test('finds access ports in VLAN', () => {
      const interfaces = new Map<string, InterfaceRuntime>([
        ['Fa0/1', createIface('Fa0/1', 'access', 10)],
        ['Fa0/2', createIface('Fa0/2', 'access', 10)],
        ['Fa0/3', createIface('Fa0/3', 'access', 20)]
      ]);
      
      const members = getVLANMembers(10, interfaces);
      
      expect(members).toContain('Fa0/1');
      expect(members).toContain('Fa0/2');
      expect(members).not.toContain('Fa0/3');
    });
    
    test('finds trunk ports that allow VLAN', () => {
      const interfaces = new Map<string, InterfaceRuntime>([
        ['Gi0/1', createIface('Gi0/1', 'trunk', 1, [1, 10, 20])],
        ['Gi0/2', createIface('Gi0/2', 'trunk', 1, [1, 20])]
      ]);
      
      const members = getVLANMembers(10, interfaces);
      
      expect(members).toContain('Gi0/1');
      expect(members).not.toContain('Gi0/2');
    });
  });
  
  describe('getFloodPorts', () => {
    test('excludes ingress port', () => {
      const interfaces = new Map<string, InterfaceRuntime>([
        ['Fa0/1', createIface('Fa0/1', 'access', 10)],
        ['Fa0/2', createIface('Fa0/2', 'access', 10)],
        ['Fa0/3', createIface('Fa0/3', 'access', 10)]
      ]);
      
      const ports = getFloodPorts(10, interfaces, 'Fa0/1');
      
      expect(ports).not.toContain('Fa0/1');
      expect(ports).toContain('Fa0/2');
      expect(ports).toContain('Fa0/3');
    });
    
    test('excludes down interfaces', () => {
      const ifaceDown = createIface('Fa0/2', 'access', 10);
      ifaceDown.adminStatus = 'down';
      
      const interfaces = new Map<string, InterfaceRuntime>([
        ['Fa0/1', createIface('Fa0/1', 'access', 10)],
        ['Fa0/2', ifaceDown]
      ]);
      
      const ports = getFloodPorts(10, interfaces, 'Fa0/1');
      
      expect(ports).not.toContain('Fa0/2');
    });
  });
});

// =============================================================================
// QOS/PCP
// =============================================================================

describe('QoS/PCP', () => {
  
  describe('getPCPName', () => {
    test('returns name for valid PCP values', () => {
      expect(getPCPName(0)).toBe('Best Effort');
      expect(getPCPName(5)).toBe('Voice');
      expect(getPCPName(7)).toBe('Network Control');
    });
    
    test('returns unknown for invalid PCP', () => {
      expect(getPCPName(8)).toContain('Unknown');
    });
  });
  
  describe('getRecommendedPCP', () => {
    test('returns correct PCP for traffic types', () => {
      expect(getRecommendedPCP('voice')).toBe(PCP_VALUES.VOICE);
      expect(getRecommendedPCP('video')).toBe(PCP_VALUES.VIDEO);
      expect(getRecommendedPCP('data')).toBe(PCP_VALUES.BEST_EFFORT);
      expect(getRecommendedPCP('control')).toBe(PCP_VALUES.INTERNETWORK_CONTROL);
    });
  });
});

// =============================================================================
// HELPERS
// =============================================================================

function createIface(
  name: string,
  mode: 'access' | 'trunk',
  vlan: number,
  allowedVlans?: number[]
): InterfaceRuntime {
  return {
    name,
    mac: 'aa:bb:cc:dd:ee:ff',
    vlan,
    allowedVlans,
    switchportMode: mode,
    adminStatus: 'up',
    linkStatus: 'up',
    rxBytes: 0,
    txBytes: 0,
    rxPackets: 0,
    txPackets: 0,
    rxErrors: 0,
    txErrors: 0,
    outputQueue: []
  };
}
