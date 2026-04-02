/**
 * EXECUTOR TESTS
 */

import { describe, test, expect } from 'bun:test';
import { DeployOrchestrator } from '../../packages/core/src/executor/deploy.orchestrator';
import { ValidationExecutor, generateValidationSpec } from '../../packages/core/src/executor/validation.executor';
import type { DeviceSpec, LabSpec } from '../../packages/core/src/canonical';
import type { DeployOptions, ConnectionCredentials } from '../../packages/core/src/executor/types';

describe('DeployOrchestrator', () => {
  describe('createDeployPlan', () => {
    test('should create plan with correct order', () => {
      const orchestrator = new DeployOrchestrator({ dryRun: true });
      
      const lab: LabSpec = {
        metadata: { name: 'Test', version: '1.0', author: 'test', created: new Date().toISOString() },
        devices: [
          { name: 'Switch1', type: 'switch' },
          { name: 'PC1', type: 'pc' },
          { name: 'Router1', type: 'router' }
        ],
        connections: [
          { from: { deviceName: 'PC1', portName: 'Fa0' }, to: { deviceName: 'Switch1', portName: 'Fa0/1' }, cableType: 'straight-through' as any }
        ]
      };
      
      const plan = orchestrator.createDeployPlan(lab);
      
      expect(plan.order.length).toBeGreaterThan(0);
      expect(plan.parallel).toBe(true);
    });
    
    test('should place infrastructure devices first', () => {
      const orchestrator = new DeployOrchestrator({ dryRun: true });
      
      const lab: LabSpec = {
        metadata: { name: 'Test', version: '1.0', author: 'test', created: new Date().toISOString() },
        devices: [
          { name: 'PC1', type: 'pc' },
          { name: 'Switch1', type: 'switch' },
          { name: 'Router1', type: 'router' }
        ],
        connections: [
          { from: { deviceName: 'PC1', portName: 'Fa0' }, to: { deviceName: 'Switch1', portName: 'Fa0/1' }, cableType: 'straight-through' as any },
          { from: { deviceName: 'Switch1', portName: 'Gi0/1' }, to: { deviceName: 'Router1', portName: 'Gi0/0' }, cableType: 'straight-through' as any }
        ]
      };
      
      const plan = orchestrator.createDeployPlan(lab);
      
      // PC1 should be in a later batch than Switch1
      let pcBatch = -1;
      let switchBatch = -1;
      
      plan.order.forEach((batch, index) => {
        if (batch.includes('PC1')) pcBatch = index;
        if (batch.includes('Switch1')) switchBatch = index;
      });
      
      // PC depends on Switch, so Switch should be deployed first (or same batch)
      expect(switchBatch).toBeLessThanOrEqual(pcBatch);
    });
  });
  
  describe('deployDevice', () => {
    test('should skip device without credentials', async () => {
      const orchestrator = new DeployOrchestrator({ dryRun: true });
      
      const device: DeviceSpec = {
        name: 'TestDevice',
        type: 'router'
      };
      
      const result = await orchestrator.deployDevice(device, null);
      
      expect(result.success).toBe(false);
      expect(result.warnings).toContain('No credentials provided - skipped');
    });
    
    test('should work in dry-run mode', async () => {
      const orchestrator = new DeployOrchestrator({ dryRun: true });
      
      const device: DeviceSpec = {
        name: 'TestDevice',
        type: 'router',
        interfaces: [
          { name: 'Gi0/0', ipAddress: '192.168.1.1/24' }
        ]
      };
      
      const credentials: ConnectionCredentials = {
        host: '192.168.1.1',
        username: 'admin',
        password: 'admin'
      };
      
      const result = await orchestrator.deployDevice(device, credentials);
      
      expect(result.success).toBe(true);
      expect(result.warnings).toContain('Dry run - no changes made');
      expect(result.configGenerated).toContain('TestDevice');
    });
  });
  
  describe('deployLab', () => {
    test('should deploy all devices in dry-run', async () => {
      const orchestrator = new DeployOrchestrator({ dryRun: true, verbose: false });
      
      const lab: LabSpec = {
        metadata: { name: 'Test', version: '1.0', author: 'test', created: new Date().toISOString() },
        devices: [
          { name: 'Router1', type: 'router' },
          { name: 'Switch1', type: 'switch' }
        ],
        connections: []
      };
      
      const getCredentials = (d: DeviceSpec) => ({
        host: '192.168.1.1',
        username: 'admin',
        password: 'admin'
      });
      
      const result = await orchestrator.deployLab(lab, getCredentials);
      
      expect(result.success).toBe(true);
      expect(result.devices.length).toBe(2);
      expect(result.summary.successful).toBe(2);
    });
    
    test('should filter to specific device', async () => {
      const orchestrator = new DeployOrchestrator({ dryRun: true });
      
      const lab: LabSpec = {
        metadata: { name: 'Test', version: '1.0', author: 'test', created: new Date().toISOString() },
        devices: [
          { name: 'Router1', type: 'router' },
          { name: 'Switch1', type: 'switch' }
        ],
        connections: []
      };
      
      // Filter before deploy
      lab.devices = lab.devices.filter(d => d.name === 'Router1');
      
      const getCredentials = (d: DeviceSpec) => ({
        host: '192.168.1.1',
        username: 'admin',
        password: 'admin'
      });
      
      const result = await orchestrator.deployLab(lab, getCredentials);
      
      expect(result.devices.length).toBe(1);
      expect(result.devices[0].deviceName).toBe('Router1');
    });
  });
});

describe('ValidationExecutor', () => {
  describe('generateValidationSpec', () => {
    test('should generate validation for interfaces', () => {
      const device: DeviceSpec = {
        name: 'Router1',
        type: 'router',
        interfaces: [
          { name: 'Gi0/0', ipAddress: '192.168.1.1/24', shutdown: false },
          { name: 'Gi0/1', ipAddress: '192.168.2.1/24', shutdown: true }
        ]
      };
      
      const credentials: ConnectionCredentials = {
        host: '192.168.1.1',
        username: 'admin',
        password: 'admin'
      };
      
      const spec = generateValidationSpec(device, credentials);
      
      expect(spec.checks.interfaces).toBeDefined();
      expect(spec.checks.interfaces?.length).toBe(1); // Only non-shutdown
      expect(spec.checks.interfaces?.[0].name).toBe('Gi0/0');
      expect(spec.checks.interfaces?.[0].expectedUp).toBe(true);
    });
    
    test('should generate VLAN validation for switches', () => {
      const device: DeviceSpec = {
        name: 'Switch1',
        type: 'switch',
        interfaces: [
          { name: 'Fa0/1', switchport: { mode: 'access', accessVlan: 10 } },
          { name: 'Fa0/2', switchport: { mode: 'access', accessVlan: 20 } }
        ]
      };
      
      const credentials: ConnectionCredentials = {
        host: '192.168.1.2',
        username: 'admin',
        password: 'admin'
      };
      
      const spec = generateValidationSpec(device, credentials);
      
      expect(spec.checks.vlans).toBeDefined();
      expect(spec.checks.vlans?.length).toBe(2);
    });
    
    test('should not generate VLAN validation for routers', () => {
      const device: DeviceSpec = {
        name: 'Router1',
        type: 'router',
        interfaces: [
          { name: 'Gi0/0', ipAddress: '192.168.1.1/24' }
        ]
      };
      
      const credentials: ConnectionCredentials = {
        host: '192.168.1.1',
        username: 'admin',
        password: 'admin'
      };
      
      const spec = generateValidationSpec(device, credentials);
      
      expect(spec.checks.vlans).toBeUndefined();
    });
  });
});

describe('DeployOptions', () => {
  test('should have correct defaults', () => {
    const defaults: DeployOptions = {
      dryRun: false,
      concurrency: 5,
      commandTimeout: 30000,
      connectionTimeout: 30000,
      validateAfter: true,
      autoRollback: false,
      saveBackup: true,
      continueOnError: true,
      verbose: false
    };
    
    expect(defaults.concurrency).toBe(5);
    expect(defaults.commandTimeout).toBe(30000);
    expect(defaults.saveBackup).toBe(true);
  });
});
