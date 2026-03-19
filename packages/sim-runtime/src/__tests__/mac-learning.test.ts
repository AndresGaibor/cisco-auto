/**
 * Tests para MAC Learning
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import {
  MACLearningEngine,
  makeForwardingDecision,
  DEFAULT_AGING_TIME,
  DEFAULT_MAC_TABLE_SIZE
} from '../protocols/mac-learning';

import type { DeviceRuntime, InterfaceRuntime } from '../runtime';
import { normalizeMAC } from '../protocols/ethernet';

// =============================================================================
// MAC LEARNING ENGINE
// =============================================================================

describe('MACLearningEngine', () => {
  let engine: MACLearningEngine;
  let device: DeviceRuntime;
  
  beforeEach(() => {
    engine = new MACLearningEngine({
      agingTime: 300,
      maxTableSize: 100,
      learningEnabled: true
    });
    
    device = createMockDevice();
  });
  
  describe('learn', () => {
    
    test('learns new MAC address', () => {
      const result = engine.learn(device, 'aa:bb:cc:dd:ee:01', 'Fa0/1', 1, 0);
      
      expect(result.learned).toBe(true);
      expect(result.isNew).toBe(true);
      expect(result.reason).toContain('New MAC learned');
    });
    
    test('updates existing MAC on same port', () => {
      engine.learn(device, 'aa:bb:cc:dd:ee:01', 'Fa0/1', 1, 0);
      const result = engine.learn(device, 'aa:bb:cc:dd:ee:01', 'Fa0/1', 1, 100);
      
      expect(result.learned).toBe(true);
      expect(result.isNew).toBe(false);
      expect(result.portChanged).toBe(false);
    });
    
    test('updates MAC when port changes', () => {
      engine.learn(device, 'aa:bb:cc:dd:ee:01', 'Fa0/1', 1, 0);
      const result = engine.learn(device, 'aa:bb:cc:dd:ee:01', 'Fa0/2', 1, 100);
      
      expect(result.learned).toBe(true);
      expect(result.isNew).toBe(false);
      expect(result.portChanged).toBe(true);
      expect(result.previousPort).toBe('Fa0/1');
    });
    
    test('does not learn broadcast MAC', () => {
      const result = engine.learn(device, 'ff:ff:ff:ff:ff:ff', 'Fa0/1', 1, 0);
      
      expect(result.learned).toBe(false);
      expect(result.reason).toContain('broadcast');
    });
    
    test('does not learn invalid MAC', () => {
      const result = engine.learn(device, 'invalid', 'Fa0/1', 1, 0);
      
      expect(result.learned).toBe(false);
    });
    
    test('does not update static entries', () => {
      // Add static entry
      engine.addStatic(device, 'aa:bb:cc:dd:ee:01', 'Fa0/1', 1, 0);
      
      // Try to learn on different port
      const result = engine.learn(device, 'aa:bb:cc:dd:ee:01', 'Fa0/2', 1, 100);
      
      expect(result.learned).toBe(false);
      expect(result.reason).toContain('static');
    });
    
    test('normalizes MAC address format', () => {
      engine.learn(device, 'AA:BB:CC:DD:EE:01', 'Fa0/1', 1, 0);
      
      const lookup = engine.lookup(device, 'aa:bb:cc:dd:ee:01', 1, 0);
      expect(lookup.found).toBe(true);
    });
    
    test('respects learning disabled ports', () => {
      engine.updateConfig({
        learningDisabledPorts: new Set(['Fa0/1'])
      });
      
      const result = engine.learn(device, 'aa:bb:cc:dd:ee:01', 'Fa0/1', 1, 0);
      
      expect(result.learned).toBe(false);
      expect(result.reason).toContain('disabled on port');
    });
    
    test('respects global learning disabled', () => {
      engine.updateConfig({ learningEnabled: false });
      
      const result = engine.learn(device, 'aa:bb:cc:dd:ee:01', 'Fa0/1', 1, 0);
      
      expect(result.learned).toBe(false);
      expect(result.reason).toContain('disabled globally');
    });
  });
  
  describe('lookup', () => {
    
    test('finds learned MAC', () => {
      engine.learn(device, 'aa:bb:cc:dd:ee:01', 'Fa0/1', 1, 0);
      
      const result = engine.lookup(device, 'aa:bb:cc:dd:ee:01', 1, 0);
      
      expect(result.found).toBe(true);
      expect(result.port).toBe('Fa0/1');
      expect(result.vlan).toBe(1);
    });
    
    test('returns not found for unknown MAC', () => {
      const result = engine.lookup(device, 'aa:bb:cc:dd:ee:99', 1, 0);
      
      expect(result.found).toBe(false);
    });
    
    test('distinguishes by VLAN', () => {
      engine.learn(device, 'aa:bb:cc:dd:ee:01', 'Fa0/1', 1, 0);
      engine.learn(device, 'aa:bb:cc:dd:ee:01', 'Fa0/2', 10, 0);
      
      const result1 = engine.lookup(device, 'aa:bb:cc:dd:ee:01', 1, 0);
      const result10 = engine.lookup(device, 'aa:bb:cc:dd:ee:01', 10, 0);
      
      expect(result1.port).toBe('Fa0/1');
      expect(result10.port).toBe('Fa0/2');
    });
    
    test('detects expired entries', () => {
      engine.updateConfig({ agingTime: 100 });
      engine.learn(device, 'aa:bb:cc:dd:ee:01', 'Fa0/1', 1, 0);
      
      const result = engine.lookup(device, 'aa:bb:cc:dd:ee:01', 1, 200);
      
      expect(result.found).toBe(true);
      expect(result.expired).toBe(true);
    });
    
    test('static entries never expire', () => {
      engine.updateConfig({ agingTime: 100 });
      engine.addStatic(device, 'aa:bb:cc:dd:ee:01', 'Fa0/1', 1, 0);
      
      const result = engine.lookup(device, 'aa:bb:cc:dd:ee:01', 1, 100000);
      
      expect(result.found).toBe(true);
      expect(result.expired).toBeUndefined();
      expect(result.type).toBe('static');
    });
  });
  
  describe('remove', () => {
    
    test('removes MAC entry', () => {
      engine.learn(device, 'aa:bb:cc:dd:ee:01', 'Fa0/1', 1, 0);
      
      const removed = engine.remove(device, 'aa:bb:cc:dd:ee:01', 1);
      
      expect(removed).toBe(true);
      
      const lookup = engine.lookup(device, 'aa:bb:cc:dd:ee:01', 1, 0);
      expect(lookup.found).toBe(false);
    });
    
    test('returns false for non-existent entry', () => {
      const removed = engine.remove(device, 'aa:bb:cc:dd:ee:99', 1);
      expect(removed).toBe(false);
    });
  });
  
  describe('removeByPort', () => {
    
    test('removes all entries for a port', () => {
      engine.learn(device, 'aa:bb:cc:dd:ee:01', 'Fa0/1', 1, 0);
      engine.learn(device, 'aa:bb:cc:dd:ee:02', 'Fa0/1', 1, 0);
      engine.learn(device, 'aa:bb:cc:dd:ee:03', 'Fa0/2', 1, 0);
      
      const removed = engine.removeByPort(device, 'Fa0/1');
      
      expect(removed).toBe(2);
      expect(engine.lookup(device, 'aa:bb:cc:dd:ee:01', 1, 0).found).toBe(false);
      expect(engine.lookup(device, 'aa:bb:cc:dd:ee:02', 1, 0).found).toBe(false);
      expect(engine.lookup(device, 'aa:bb:cc:dd:ee:03', 1, 0).found).toBe(true);
    });
    
    test('does not remove static entries', () => {
      engine.learn(device, 'aa:bb:cc:dd:ee:01', 'Fa0/1', 1, 0);
      engine.addStatic(device, 'aa:bb:cc:dd:ee:02', 'Fa0/1', 1, 0);
      
      const removed = engine.removeByPort(device, 'Fa0/1');
      
      expect(removed).toBe(1);
      expect(engine.lookup(device, 'aa:bb:cc:dd:ee:02', 1, 0).found).toBe(true);
    });
  });
  
  describe('ageOut', () => {
    
    test('removes expired entries', () => {
      engine.updateConfig({ agingTime: 100 });
      
      engine.learn(device, 'aa:bb:cc:dd:ee:01', 'Fa0/1', 1, 0);
      engine.learn(device, 'aa:bb:cc:dd:ee:02', 'Fa0/1', 1, 50);
      engine.learn(device, 'aa:bb:cc:dd:ee:03', 'Fa0/1', 1, 150);
      
      const aged = engine.ageOut(device, 200);
      
      expect(aged.length).toBe(2);
      expect(aged.find(e => e.mac === 'aa:bb:cc:dd:ee:01')).toBeDefined();
      expect(aged.find(e => e.mac === 'aa:bb:cc:dd:ee:02')).toBeDefined();
      expect(aged.find(e => e.mac === 'aa:bb:cc:dd:ee:03')).toBeUndefined();
    });
    
    test('does not age out static entries', () => {
      engine.updateConfig({ agingTime: 100 });
      engine.addStatic(device, 'aa:bb:cc:dd:ee:01', 'Fa0/1', 1, 0);
      
      const aged = engine.ageOut(device, 1000);
      
      expect(aged.length).toBe(0);
    });
  });
  
  describe('clear', () => {
    
    test('clears only dynamic entries by default', () => {
      engine.learn(device, 'aa:bb:cc:dd:ee:01', 'Fa0/1', 1, 0);
      engine.addStatic(device, 'aa:bb:cc:dd:ee:02', 'Fa0/1', 1, 0);
      
      const removed = engine.clear(device);
      
      expect(removed).toBe(1);
      expect(device.macTable.size).toBe(1);
    });
    
    test('clears all entries including static', () => {
      engine.learn(device, 'aa:bb:cc:dd:ee:01', 'Fa0/1', 1, 0);
      engine.addStatic(device, 'aa:bb:cc:dd:ee:02', 'Fa0/1', 1, 0);
      
      const removed = engine.clear(device, true);
      
      expect(removed).toBe(2);
      expect(device.macTable.size).toBe(0);
    });
  });
  
  describe('addStatic', () => {
    
    test('adds static entry', () => {
      const result = engine.addStatic(device, 'aa:bb:cc:dd:ee:01', 'Fa0/1', 1, 0);
      
      expect(result).toBe(true);
      
      const lookup = engine.lookup(device, 'aa:bb:cc:dd:ee:01', 1, 0);
      expect(lookup.found).toBe(true);
      expect(lookup.type).toBe('static');
    });
    
    test('overwrites existing dynamic entry', () => {
      engine.learn(device, 'aa:bb:cc:dd:ee:01', 'Fa0/1', 1, 0);
      engine.addStatic(device, 'aa:bb:cc:dd:ee:01', 'Fa0/2', 1, 100);
      
      const lookup = engine.lookup(device, 'aa:bb:cc:dd:ee:01', 1, 100);
      expect(lookup.port).toBe('Fa0/2');
      expect(lookup.type).toBe('static');
    });
  });
  
  describe('getStats', () => {
    
    test('returns correct statistics', () => {
      engine.learn(device, 'aa:bb:cc:dd:ee:01', 'Fa0/1', 1, 0);
      engine.learn(device, 'aa:bb:cc:dd:ee:02', 'Fa0/1', 10, 0);
      engine.learn(device, 'aa:bb:cc:dd:ee:03', 'Fa0/2', 1, 0);
      engine.addStatic(device, 'aa:bb:cc:dd:ee:04', 'Fa0/1', 1, 0);
      
      const stats = engine.getStats(device);
      
      expect(stats.total).toBe(4);
      expect(stats.dynamic).toBe(3);
      expect(stats.static).toBe(1);
      expect(stats.byVlan.get(1)).toBe(3);
      expect(stats.byVlan.get(10)).toBe(1);
      expect(stats.byPort.get('Fa0/1')).toBe(3);
      expect(stats.byPort.get('Fa0/2')).toBe(1);
    });
  });
  
  describe('table size limits', () => {
    
    test('evicts oldest entry when table is full', () => {
      const smallEngine = new MACLearningEngine({
        maxTableSize: 3,
        agingTime: 300
      });
      
      smallEngine.learn(device, 'aa:bb:cc:dd:ee:01', 'Fa0/1', 1, 0);
      smallEngine.learn(device, 'aa:bb:cc:dd:ee:02', 'Fa0/1', 1, 10);
      smallEngine.learn(device, 'aa:bb:cc:dd:ee:03', 'Fa0/1', 1, 20);
      
      // This should trigger eviction of oldest (01)
      smallEngine.learn(device, 'aa:bb:cc:dd:ee:04', 'Fa0/1', 1, 30);
      
      expect(device.macTable.size).toBe(3);
      expect(smallEngine.lookup(device, 'aa:bb:cc:dd:ee:01', 1, 30).found).toBe(false);
      expect(smallEngine.lookup(device, 'aa:bb:cc:dd:ee:04', 1, 30).found).toBe(true);
    });
  });
});

// =============================================================================
// FORWARDING DECISION
// =============================================================================

describe('makeForwardingDecision', () => {
  let engine: MACLearningEngine;
  let device: DeviceRuntime;
  let interfaces: Map<string, InterfaceRuntime>;
  
  beforeEach(() => {
    engine = new MACLearningEngine({ agingTime: 300 });
    device = createMockDevice();
    interfaces = device.interfaces;
  });
  
  test('floods broadcast MAC', () => {
    const decision = makeForwardingDecision(
      device,
      'aa:bb:cc:dd:ee:01',
      'ff:ff:ff:ff:ff:ff',
      'Fa0/1',
      1,
      engine,
      0,
      interfaces
    );
    
    expect(decision.action).toBe('flood');
    expect(decision.reason).toContain('Broadcast');
    expect(decision.outPorts).not.toContain('Fa0/1');
  });
  
  test('floods unknown unicast', () => {
    const decision = makeForwardingDecision(
      device,
      'aa:bb:cc:dd:ee:01',
      'aa:bb:cc:dd:ee:99', // Unknown MAC
      'Fa0/1',
      1,
      engine,
      0,
      interfaces
    );
    
    expect(decision.action).toBe('flood');
    expect(decision.reason).toContain('Unknown unicast');
  });
  
  test('forwards known unicast', () => {
    engine.learn(device, 'aa:bb:cc:dd:ee:02', 'Fa0/2', 1, 0);
    
    const decision = makeForwardingDecision(
      device,
      'aa:bb:cc:dd:ee:01',
      'aa:bb:cc:dd:ee:02',
      'Fa0/1',
      1,
      engine,
      0,
      interfaces
    );
    
    expect(decision.action).toBe('forward');
    expect(decision.outPorts).toEqual(['Fa0/2']);
  });
  
  test('drops frame destined to same port', () => {
    engine.learn(device, 'aa:bb:cc:dd:ee:02', 'Fa0/1', 1, 0);
    
    const decision = makeForwardingDecision(
      device,
      'aa:bb:cc:dd:ee:01',
      'aa:bb:cc:dd:ee:02',
      'Fa0/1', // Same port as destination
      1,
      engine,
      0,
      interfaces
    );
    
    expect(decision.action).toBe('drop');
    expect(decision.reason).toContain('same port');
  });
  
  test('floods expired MAC entry', () => {
    engine.updateConfig({ agingTime: 100 });
    engine.learn(device, 'aa:bb:cc:dd:ee:02', 'Fa0/2', 1, 0);
    
    const decision = makeForwardingDecision(
      device,
      'aa:bb:cc:dd:ee:01',
      'aa:bb:cc:dd:ee:02',
      'Fa0/1',
      1,
      engine,
      200, // After aging time
      interfaces
    );
    
    expect(decision.action).toBe('flood');
    expect(decision.reason).toContain('expired');
  });
  
  test('processes reserved MAC locally', () => {
    // STP bridge group address
    const decision = makeForwardingDecision(
      device,
      'aa:bb:cc:dd:ee:01',
      '01:80:c2:00:00:00',
      'Fa0/1',
      1,
      engine,
      0,
      interfaces
    );
    
    expect(decision.action).toBe('process-locally');
    expect(decision.reason).toContain('Reserved');
  });
  
  test('respects VLAN membership in flood', () => {
    // Learn a MAC on VLAN 10
    engine.learn(device, 'aa:bb:cc:dd:ee:02', 'Fa0/4', 10, 0);
    
    // Flood on VLAN 1 should not include Fa0/4 (different VLAN)
    const decision = makeForwardingDecision(
      device,
      'aa:bb:cc:dd:ee:01',
      'ff:ff:ff:ff:ff:ff',
      'Fa0/1',
      1,
      engine,
      0,
      interfaces
    );
    
    expect(decision.outPorts).not.toContain('Fa0/4');
  });
});

// =============================================================================
// HELPERS
// =============================================================================

function createMockDevice(): DeviceRuntime {
  const interfaces = new Map<string, InterfaceRuntime>([
    ['Fa0/1', createIface('Fa0/1', 'access', 1)],
    ['Fa0/2', createIface('Fa0/2', 'access', 1)],
    ['Fa0/3', createIface('Fa0/3', 'access', 10)],
    ['Fa0/4', createIface('Fa0/4', 'access', 10)],
    ['Gi0/1', createIface('Gi0/1', 'trunk', 1, [1, 10, 20])]
  ]);
  
  return {
    id: 'switch-1',
    name: 'Switch1',
    type: 'switch',
    family: 'infrastructure',
    powerOn: true,
    interfaces,
    macTable: new Map(),
    arpTable: new Map(),
    routingTable: [],
    vlans: new Map([[1, { id: 1, name: 'default' }], [10, { id: 10, name: 'VLAN10' }]]),
    activeProcesses: new Set(),
    pendingTimers: new Map(),
    commandQueue: [],
    eventLog: []
  };
}

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
    nativeVlan: 1,
    allowedVlans: allowedVlans ?? [1, 10, 20],
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
