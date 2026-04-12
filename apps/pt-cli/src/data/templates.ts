#!/usr/bin/env bun
/**
 * Plantillas CCNA locales
 * 
 * Implementación local sin dependencias de @cisco-auto/core.
 */

import type { LabSpec } from '../contracts/lab-spec';

export interface LabTemplate {
  id: string;
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  objectives: string[];
  estimatedTime: number;
  create: () => LabSpec;
}

export const vlanBasicsTemplate: LabTemplate = {
  id: 'ccna-vlan-basics',
  name: 'VLAN Basics',
  description: 'Learn to configure VLANs on a single switch',
  difficulty: 'beginner',
  category: 'Switching',
  objectives: [
    'Create VLANs on a switch',
    'Assign ports to VLANs',
    'Verify VLAN configuration'
  ],
  estimatedTime: 30,
  create: (): LabSpec => ({
    metadata: {
      name: 'VLAN Basics Lab',
      version: '1.0',
      author: 'cisco-auto-template',
      createdAt: new Date()
    },
    devices: [
      {
        id: 'switch1',
        name: 'Switch1',
        type: 'switch',
        hostname: 'SW1',
        interfaces: [
          { name: 'Vlan10', ip: '192.168.10.1', subnetMask: '255.255.255.0', description: 'VLAN 10 Gateway' },
          { name: 'Vlan20', ip: '192.168.20.1', subnetMask: '255.255.255.0', description: 'VLAN 20 Gateway' },
          { name: 'Vlan30', ip: '192.168.30.1', subnetMask: '255.255.255.0', description: 'VLAN 30 Gateway' }
        ]
      },
      {
        id: 'pc1',
        name: 'PC1',
        type: 'pc',
        hostname: 'PC1',
        interfaces: [{ name: 'Fa0', ip: '192.168.10.10', subnetMask: '255.255.255.0' }]
      },
      {
        id: 'pc2',
        name: 'PC2',
        type: 'pc',
        hostname: 'PC2',
        interfaces: [{ name: 'Fa0', ip: '192.168.20.10', subnetMask: '255.255.255.0' }]
      },
      {
        id: 'pc3',
        name: 'PC3',
        type: 'pc',
        hostname: 'PC3',
        interfaces: [{ name: 'Fa0', ip: '192.168.30.10', subnetMask: '255.255.255.0' }]
      }
    ],
    connections: [
      { id: 'conn1', from: { deviceId: 'pc1', deviceName: 'PC1', port: 'Fa0' }, to: { deviceId: 'switch1', deviceName: 'Switch1', port: 'Fa0/1' }, cableType: 'straight-through' },
      { id: 'conn2', from: { deviceId: 'pc2', deviceName: 'PC2', port: 'Fa0' }, to: { deviceId: 'switch1', deviceName: 'Switch1', port: 'Fa0/3' }, cableType: 'straight-through' },
      { id: 'conn3', from: { deviceId: 'pc3', deviceName: 'PC3', port: 'Fa0' }, to: { deviceId: 'switch1', deviceName: 'Switch1', port: 'Fa0/5' }, cableType: 'straight-through' }
    ]
  })
};

export const staticRoutingTemplate: LabTemplate = {
  id: 'ccna-static-routing',
  name: 'Static Routing',
  description: 'Configure static routes between two networks',
  difficulty: 'beginner',
  category: 'Routing',
  objectives: [
    'Configure IP addresses on router interfaces',
    'Create static routes',
    'Verify connectivity between networks'
  ],
  estimatedTime: 45,
  create: (): LabSpec => ({
    metadata: {
      name: 'Static Routing Lab',
      version: '1.0',
      author: 'cisco-auto-template',
      createdAt: new Date()
    },
    devices: [
      {
        id: 'router1',
        name: 'Router1',
        type: 'router',
        hostname: 'R1',
        interfaces: [
          { name: 'Gi0/0', ip: '192.168.1.1', subnetMask: '255.255.255.0', description: 'LAN' },
          { name: 'Gi0/1', ip: '10.0.0.1', subnetMask: '255.255.255.252', description: 'WAN to R2' }
        ]
      },
      {
        id: 'router2',
        name: 'Router2',
        type: 'router',
        hostname: 'R2',
        interfaces: [
          { name: 'Gi0/0', ip: '192.168.2.1', subnetMask: '255.255.255.0', description: 'LAN' },
          { name: 'Gi0/1', ip: '10.0.0.2', subnetMask: '255.255.255.252', description: 'WAN to R1' }
        ]
      },
      {
        id: 'pc1',
        name: 'PC1',
        type: 'pc',
        hostname: 'PC1',
        interfaces: [{ name: 'Fa0', ip: '192.168.1.10', subnetMask: '255.255.255.0' }]
      },
      {
        id: 'pc2',
        name: 'PC2',
        type: 'pc',
        hostname: 'PC2',
        interfaces: [{ name: 'Fa0', ip: '192.168.2.10', subnetMask: '255.255.255.0' }]
      }
    ],
    connections: [
      { id: 'conn1', from: { deviceId: 'router1', deviceName: 'Router1', port: 'Gi0/1' }, to: { deviceId: 'router2', deviceName: 'Router2', port: 'Gi0/1' }, cableType: 'straight-through' },
      { id: 'conn2', from: { deviceId: 'pc1', deviceName: 'PC1', port: 'Fa0' }, to: { deviceId: 'router1', deviceName: 'Router1', port: 'Gi0/0' }, cableType: 'straight-through' },
      { id: 'conn3', from: { deviceId: 'pc2', deviceName: 'PC2', port: 'Fa0' }, to: { deviceId: 'router2', deviceName: 'Router2', port: 'Gi0/0' }, cableType: 'straight-through' }
    ]
  })
};

export const ospfSingleAreaTemplate: LabTemplate = {
  id: 'ccna-ospf-single-area',
  name: 'OSPF Single Area',
  description: 'Configure OSPF in a single area network',
  difficulty: 'intermediate',
  category: 'Routing',
  objectives: [
    'Enable OSPF on routers',
    'Configure network statements',
    'Verify OSPF neighbors and routes'
  ],
  estimatedTime: 60,
  create: (): LabSpec => ({
    metadata: {
      name: 'OSPF Single Area Lab',
      version: '1.0',
      author: 'cisco-auto-template',
      createdAt: new Date()
    },
    devices: [
      {
        id: 'router1',
        name: 'Router1',
        type: 'router',
        hostname: 'R1',
        interfaces: [
          { name: 'Gi0/0', ip: '192.168.1.1', subnetMask: '255.255.255.0' },
          { name: 'Gi0/1', ip: '10.0.12.1', subnetMask: '255.255.255.252' },
          { name: 'Gi0/2', ip: '10.0.13.1', subnetMask: '255.255.255.252' }
        ]
      },
      {
        id: 'router2',
        name: 'Router2',
        type: 'router',
        hostname: 'R2',
        interfaces: [
          { name: 'Gi0/0', ip: '192.168.2.1', subnetMask: '255.255.255.0' },
          { name: 'Gi0/1', ip: '10.0.12.2', subnetMask: '255.255.255.252' },
          { name: 'Gi0/2', ip: '10.0.23.1', subnetMask: '255.255.255.252' }
        ]
      },
      {
        id: 'router3',
        name: 'Router3',
        type: 'router',
        hostname: 'R3',
        interfaces: [
          { name: 'Gi0/0', ip: '192.168.3.1', subnetMask: '255.255.255.0' },
          { name: 'Gi0/1', ip: '10.0.13.2', subnetMask: '255.255.255.252' },
          { name: 'Gi0/2', ip: '10.0.23.2', subnetMask: '255.255.255.252' }
        ]
      }
    ],
    connections: [
      { id: 'conn1', from: { deviceId: 'router1', deviceName: 'Router1', port: 'Gi0/1' }, to: { deviceId: 'router2', deviceName: 'Router2', port: 'Gi0/1' }, cableType: 'straight-through' },
      { id: 'conn2', from: { deviceId: 'router1', deviceName: 'Router1', port: 'Gi0/2' }, to: { deviceId: 'router3', deviceName: 'Router3', port: 'Gi0/1' }, cableType: 'straight-through' },
      { id: 'conn3', from: { deviceId: 'router2', deviceName: 'Router2', port: 'Gi0/2' }, to: { deviceId: 'router3', deviceName: 'Router3', port: 'Gi0/2' }, cableType: 'straight-through' }
    ]
  })
};

export const aclBasicsTemplate: LabTemplate = {
  id: 'ccna-acl-basics',
  name: 'ACL Basics',
  description: 'Configure standard and extended ACLs',
  difficulty: 'intermediate',
  category: 'Security',
  objectives: [
    'Create standard ACLs',
    'Create extended ACLs',
    'Apply ACLs to interfaces'
  ],
  estimatedTime: 45,
  create: (): LabSpec => ({
    metadata: {
      name: 'ACL Basics Lab',
      version: '1.0',
      author: 'cisco-auto-template',
      createdAt: new Date()
    },
    devices: [
      {
        id: 'router1',
        name: 'Router1',
        type: 'router',
        hostname: 'R1',
        interfaces: [
          { name: 'Gi0/0', ip: '192.168.1.1', subnetMask: '255.255.255.0', description: 'LAN' },
          { name: 'Gi0/1', ip: '192.168.2.1', subnetMask: '255.255.255.0', description: 'Server LAN' }
        ]
      },
      {
        id: 'server1',
        name: 'Server1',
        type: 'server',
        hostname: 'SRV1',
        interfaces: [{ name: 'Fa0', ip: '192.168.2.10', subnetMask: '255.255.255.0' }]
      },
      {
        id: 'pc1',
        name: 'PC1',
        type: 'pc',
        hostname: 'PC1',
        interfaces: [{ name: 'Fa0', ip: '192.168.1.10', subnetMask: '255.255.255.0' }]
      }
    ],
    connections: [
      { id: 'conn1', from: { deviceId: 'pc1', deviceName: 'PC1', port: 'Fa0' }, to: { deviceId: 'router1', deviceName: 'Router1', port: 'Gi0/0' }, cableType: 'straight-through' },
      { id: 'conn2', from: { deviceId: 'server1', deviceName: 'Server1', port: 'Fa0' }, to: { deviceId: 'router1', deviceName: 'Router1', port: 'Gi0/1' }, cableType: 'straight-through' }
    ]
  })
};

export const dhcpServerTemplate: LabTemplate = {
  id: 'ccna-dhcp-server',
  name: 'DHCP Server',
  description: 'Configure router as DHCP server',
  difficulty: 'beginner',
  category: 'Services',
  objectives: [
    'Configure DHCP pool',
    'Exclude static addresses',
    'Verify DHCP operation'
  ],
  estimatedTime: 30,
  create: (): LabSpec => ({
    metadata: {
      name: 'DHCP Server Lab',
      version: '1.0',
      author: 'cisco-auto-template',
      createdAt: new Date()
    },
    devices: [
      {
        id: 'router1',
        name: 'Router1',
        type: 'router',
        hostname: 'R1',
        interfaces: [
          { name: 'Gi0/0', ip: '192.168.1.1', subnetMask: '255.255.255.0' }
        ]
      },
      {
        id: 'pc1',
        name: 'PC1',
        type: 'pc',
        hostname: 'PC1',
        interfaces: [{ name: 'Fa0' }]
      },
      {
        id: 'pc2',
        name: 'PC2',
        type: 'pc',
        hostname: 'PC2',
        interfaces: [{ name: 'Fa0' }]
      }
    ],
    connections: [
      { id: 'conn1', from: { deviceId: 'pc1', deviceName: 'PC1', port: 'Fa0' }, to: { deviceId: 'router1', deviceName: 'Router1', port: 'Gi0/0' }, cableType: 'straight-through' },
      { id: 'conn2', from: { deviceId: 'pc2', deviceName: 'PC2', port: 'Fa0' }, to: { deviceId: 'router1', deviceName: 'Router1', port: 'Gi0/0' }, cableType: 'straight-through' }
    ]
  })
};

export const CCNATemplates: LabTemplate[] = [
  vlanBasicsTemplate,
  staticRoutingTemplate,
  ospfSingleAreaTemplate,
  aclBasicsTemplate,
  dhcpServerTemplate
];

export function getTemplateById(id: string): LabTemplate | undefined {
  return CCNATemplates.find(t => t.id === id);
}

export function getTemplatesByCategory(category: string): LabTemplate[] {
  return CCNATemplates.filter(t => t.category === category);
}

export function getTemplatesByDifficulty(difficulty: LabTemplate['difficulty']): LabTemplate[] {
  return CCNATemplates.filter(t => t.difficulty === difficulty);
}
