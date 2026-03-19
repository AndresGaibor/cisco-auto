/**
 * TOPOLOGY VISUALIZER TESTS
 */

import { describe, test, expect } from 'bun:test';
import { 
  visualizeTopology, 
  generateMermaidDiagram, 
  generateAdjacencyMatrix,
  analyzeTopology
} from '../../src/core/topology/visualizer.ts';
import type { LabSpec } from '../../src/core/canonical/index.ts';

const createTestLab = (): LabSpec => ({
  metadata: { name: 'Test Lab', version: '1.0', author: 'test', created: new Date().toISOString() },
  devices: [
    { name: 'Router1', type: 'router', interfaces: [{ name: 'Gi0/0', ipAddress: '192.168.1.1/24' }] },
    { name: 'Switch1', type: 'switch', interfaces: [{ name: 'Vlan1', ipAddress: '192.168.1.2/24' }] },
    { name: 'PC1', type: 'pc', interfaces: [{ name: 'Fa0', ipAddress: '192.168.1.10/24' }] },
    { name: 'PC2', type: 'pc', interfaces: [{ name: 'Fa0', ipAddress: '192.168.1.11/24' }] }
  ],
  connections: [
    { from: { deviceName: 'Router1', portName: 'Gi0/0' }, to: { deviceName: 'Switch1', portName: 'Fa0/1' }, cableType: 'eStraightThrough' },
    { from: { deviceName: 'Switch1', portName: 'Fa0/2' }, to: { deviceName: 'PC1', portName: 'Fa0' }, cableType: 'eStraightThrough' },
    { from: { deviceName: 'Switch1', portName: 'Fa0/3' }, to: { deviceName: 'PC2', portName: 'Fa0' }, cableType: 'eStraightThrough' }
  ]
});

describe('Topology Visualizer', () => {
  describe('visualizeTopology', () => {
    test('should generate ASCII visualization', () => {
      const lab = createTestLab();
      const output = visualizeTopology(lab);
      
      expect(output).toContain('TOPOLOGY');
      expect(output).toContain('DEVICES');
      expect(output).toContain('CONNECTIONS');
      expect(output).toContain('Router1');
      expect(output).toContain('Switch1');
      expect(output).toContain('PC1');
    });

    test('should include IP addresses when option is enabled', () => {
      const lab = createTestLab();
      lab.devices[0].managementIp = '10.0.0.1';
      const output = visualizeTopology(lab, { showIPs: true });
      
      expect(output).toContain('10.0.0.1');
    });

    test('should include ports when option is enabled', () => {
      const lab = createTestLab();
      const output = visualizeTopology(lab, { showPorts: true });
      
      expect(output).toContain('Gi0/0');
      expect(output).toContain('Fa0/1');
    });

    test('should show cable types when option is enabled', () => {
      const lab = createTestLab();
      const output = visualizeTopology(lab, { showCables: true });
      
      expect(output).toContain('══'); // StraightThrough symbol
    });
  });

  describe('generateMermaidDiagram', () => {
    test('should generate Mermaid diagram', () => {
      const lab = createTestLab();
      const output = generateMermaidDiagram(lab);
      
      expect(output).toContain('```mermaid');
      expect(output).toContain('graph TB');
      expect(output).toContain('Router1');
      expect(output).toContain('Switch1');
    });

    test('should create subgraphs by device type', () => {
      const lab = createTestLab();
      const output = generateMermaidDiagram(lab);
      
      expect(output).toContain('subgraph Routers');
      expect(output).toContain('subgraph Switches');
      expect(output).toContain('subgraph End Devices');
    });

    test('should add connections between devices', () => {
      const lab = createTestLab();
      const output = generateMermaidDiagram(lab);
      
      expect(output).toContain('---');
    });
  });

  describe('generateAdjacencyMatrix', () => {
    test('should generate adjacency matrix', () => {
      const lab = createTestLab();
      const output = generateAdjacencyMatrix(lab);
      
      expect(output).toContain('Adjacency Matrix');
      expect(output).toContain('Router1');
      expect(output).toContain('Switch1');
    });
  });

  describe('analyzeTopology', () => {
    test('should return correct statistics', () => {
      const lab = createTestLab();
      const stats = analyzeTopology(lab);
      
      expect(stats.deviceCount).toBe(4);
      expect(stats.connectionCount).toBe(3);
      expect(stats.connectedComponents).toBe(1);
    });

    test('should calculate density correctly', () => {
      const lab = createTestLab();
      const stats = analyzeTopology(lab);
      
      // With 4 devices and 3 connections
      // Max edges = 4*3/2 = 6
      // Density = 3/6 = 0.5
      expect(stats.density).toBe(0.5);
    });

    test('should count average connections', () => {
      const lab = createTestLab();
      const stats = analyzeTopology(lab);
      
      // 3 connections * 2 endpoints = 6 total connections
      // 6 / 4 devices = 1.5
      expect(stats.avgConnections).toBe(1.5);
    });

    test('should provide device type distribution', () => {
      const lab = createTestLab();
      const stats = analyzeTopology(lab);
      
      expect(stats.deviceTypeDistribution['router']).toBe(1);
      expect(stats.deviceTypeDistribution['switch']).toBe(1);
      expect(stats.deviceTypeDistribution['pc']).toBe(2);
    });

    test('should detect disconnected components', () => {
      const lab = createTestLab();
      lab.devices.push({ name: 'Isolated', type: 'pc', interfaces: [] });
      
      const stats = analyzeTopology(lab);
      
      expect(stats.connectedComponents).toBe(2);
    });

    test('should handle empty lab', () => {
      const lab: LabSpec = {
        metadata: { name: 'Empty', version: '1.0', author: 'test', created: new Date().toISOString() },
        devices: [],
        connections: []
      };
      
      const stats = analyzeTopology(lab);
      
      expect(stats.deviceCount).toBe(0);
      expect(stats.connectionCount).toBe(0);
      expect(stats.density).toBe(0);
      expect(stats.connectedComponents).toBe(0);
    });
  });
});
