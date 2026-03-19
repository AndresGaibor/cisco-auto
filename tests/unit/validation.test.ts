/**
 * VALIDATION TESTS
 */

import { describe, test, expect } from 'bun:test';
import { LabValidator, validateLab } from '../../src/core/validation/lab.validator.ts';
import type { LabSpec } from '../../src/core/canonical/index.ts';

describe('LabValidator', () => {
  const createValidLab = (): LabSpec => ({
    metadata: { name: 'Test Lab', version: '1.0', author: 'test', created: new Date().toISOString() },
    devices: [
      { name: 'Router1', type: 'router', interfaces: [{ name: 'Gi0/0', ipAddress: '192.168.1.1/24' }] },
      { name: 'PC1', type: 'pc', interfaces: [{ name: 'Fa0', ipAddress: '192.168.1.10/24' }] }
    ],
    connections: [
      { from: { deviceName: 'Router1', portName: 'Gi0/0' }, to: { deviceName: 'PC1', portName: 'Fa0' }, cableType: 'eStraightThrough' }
    ]
  });

  describe('validate', () => {
    test('should pass valid lab', () => {
      const lab = createValidLab();
      const result = validateLab(lab);
      
      expect(result.valid).toBe(true);
      expect(result.summary.errors).toBe(0);
    });

    test('should detect duplicate device names', () => {
      const lab = createValidLab();
      lab.devices.push({ name: 'Router1', type: 'router' });
      
      const result = validateLab(lab);
      
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.message.includes('Duplicate device name'))).toBe(true);
    });

    test('should detect missing lab name', () => {
      const lab = createValidLab();
      lab.metadata.name = '';
      
      const result = validateLab(lab);
      
      expect(result.issues.some(i => i.message.includes('name is required'))).toBe(true);
    });

    test('should detect empty devices', () => {
      const lab: LabSpec = {
        metadata: { name: 'Test', version: '1.0', author: 'test', created: new Date().toISOString() },
        devices: [],
        connections: []
      };
      
      const result = validateLab(lab);
      
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.message.includes('at least one device'))).toBe(true);
    });

    test('should detect IP conflicts', () => {
      const lab = createValidLab();
      lab.devices[0].interfaces = [{ name: 'Gi0/0', ipAddress: '192.168.1.1/24' }];
      lab.devices[1].interfaces = [{ name: 'Fa0', ipAddress: '192.168.1.1/24' }]; // Same IP
      
      const result = validateLab(lab);
      
      expect(result.issues.some(i => i.message.includes('IP address conflict'))).toBe(true);
    });

    test('should detect invalid IP format', () => {
      const lab = createValidLab();
      lab.devices[0].interfaces = [{ name: 'Gi0/0', ipAddress: '999.999.999.999/24' }];
      
      const result = validateLab(lab);
      
      expect(result.issues.some(i => i.category === 'logical')).toBe(true);
    });

    test('should detect unconnected devices', () => {
      const lab = createValidLab();
      lab.devices.push({ name: 'Orphan', type: 'pc', interfaces: [] });
      
      const result = validateLab(lab);
      
      expect(result.issues.some(i => 
        i.message.includes('not connected') && i.severity === 'warning'
      )).toBe(true);
    });

    test('should detect invalid CIDR', () => {
      const lab = createValidLab();
      lab.devices[0].interfaces = [{ name: 'Gi0/0', ipAddress: '192.168.1.1/35' }];
      
      const result = validateLab(lab);
      
      expect(result.issues.some(i => i.message.includes('Invalid CIDR'))).toBe(true);
    });

    test('should suggest CIDR notation', () => {
      const lab = createValidLab();
      lab.devices[0].interfaces = [{ name: 'Gi0/0', ipAddress: '192.168.1.1' }]; // No CIDR
      
      const result = validateLab(lab);
      
      expect(result.issues.some(i => 
        i.message.includes('without CIDR') && i.severity === 'warning'
      )).toBe(true);
    });
  });

  describe('validation summary', () => {
    test('should count errors, warnings, and info correctly', () => {
      const lab: LabSpec = {
        metadata: { name: '', version: '1.0', author: 'test', created: new Date().toISOString() },
        devices: [
          { name: 'R1', type: 'router', interfaces: [{ name: 'Gi0/0', ipAddress: '192.168.1.1' }] },
          { name: 'R1', type: 'router' } // Duplicate
        ],
        connections: []
      };
      
      const result = validateLab(lab);
      
      expect(result.summary.errors).toBeGreaterThan(0);
      expect(result.summary.warnings).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('validateLab convenience function', () => {
  test('should work as shortcut', () => {
    const lab: LabSpec = {
      metadata: { name: 'Test', version: '1.0', author: 'test', created: new Date().toISOString() },
      devices: [{ name: 'R1', type: 'router' }],
      connections: []
    };
    
    const result = validateLab(lab);
    
    expect(result).toHaveProperty('valid');
    expect(result).toHaveProperty('issues');
    expect(result).toHaveProperty('summary');
  });
});
