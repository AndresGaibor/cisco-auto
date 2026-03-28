/**
 * CCNA LAB TEMPLATES
 * Plantillas pre-configuradas para laboratorios CCNA
 */

import type { LabSpec, DeviceSpec, ConnectionSpec } from '../../canonical/index.ts';

export interface LabTemplate {
  id: string;
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  objectives: string[];
  estimatedTime: number; // minutes
  create: () => LabSpec;
}

/**
 * Template: VLAN Básico
 * Un switch con 3 VLANs y 3 PCs
 */
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
      created: new Date().toISOString()
    },
    devices: [
      {
        name: 'Switch1',
        type: 'switch',
        hostname: 'SW1',
        interfaces: [
          { name: 'Vlan10', ipAddress: '192.168.10.1/24', description: 'VLAN 10 Gateway' },
          { name: 'Vlan20', ipAddress: '192.168.20.1/24', description: 'VLAN 20 Gateway' },
          { name: 'Vlan30', ipAddress: '192.168.30.1/24', description: 'VLAN 30 Gateway' }
        ],
        vlans: [
          { id: 10, name: 'Sales', interfaces: ['Fa0/1', 'Fa0/2'] },
          { id: 20, name: 'HR', interfaces: ['Fa0/3', 'Fa0/4'] },
          { id: 30, name: 'IT', interfaces: ['Fa0/5', 'Fa0/6'] }
        ]
      },
      {
        name: 'PC1',
        type: 'pc',
        interfaces: [{ name: 'Fa0', ipAddress: '192.168.10.10/24' }]
      },
      {
        name: 'PC2',
        type: 'pc',
        interfaces: [{ name: 'Fa0', ipAddress: '192.168.20.10/24' }]
      },
      {
        name: 'PC3',
        type: 'pc',
        interfaces: [{ name: 'Fa0', ipAddress: '192.168.30.10/24' }]
      }
    ],
    connections: [
      { from: { deviceName: 'PC1', portName: 'Fa0' }, to: { deviceName: 'Switch1', portName: 'Fa0/1' }, cableType: 'eStraightThrough' },
      { from: { deviceName: 'PC2', portName: 'Fa0' }, to: { deviceName: 'Switch1', portName: 'Fa0/3' }, cableType: 'eStraightThrough' },
      { from: { deviceName: 'PC3', portName: 'Fa0' }, to: { deviceName: 'Switch1', portName: 'Fa0/5' }, cableType: 'eStraightThrough' }
    ]
  })
};

/**
 * Template: Static Routing
 * Dos routers conectados con rutas estáticas
 */
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
      created: new Date().toISOString()
    },
    devices: [
      {
        name: 'Router1',
        type: 'router',
        hostname: 'R1',
        interfaces: [
          { name: 'Gi0/0', ipAddress: '192.168.1.1/24', description: 'LAN' },
          { name: 'Gi0/1', ipAddress: '10.0.0.1/30', description: 'WAN to R2' }
        ],
        routing: {
          static: [
            { network: '192.168.2.0/24', nextHop: '10.0.0.2' }
          ]
        }
      },
      {
        name: 'Router2',
        type: 'router',
        hostname: 'R2',
        interfaces: [
          { name: 'Gi0/0', ipAddress: '192.168.2.1/24', description: 'LAN' },
          { name: 'Gi0/1', ipAddress: '10.0.0.2/30', description: 'WAN to R1' }
        ],
        routing: {
          static: [
            { network: '192.168.1.0/24', nextHop: '10.0.0.1' }
          ]
        }
      },
      {
        name: 'PC1',
        type: 'pc',
        interfaces: [{ name: 'Fa0', ipAddress: '192.168.1.10/24' }]
      },
      {
        name: 'PC2',
        type: 'pc',
        interfaces: [{ name: 'Fa0', ipAddress: '192.168.2.10/24' }]
      }
    ],
    connections: [
      { from: { deviceName: 'Router1', portName: 'Gi0/1' }, to: { deviceName: 'Router2', portName: 'Gi0/1' }, cableType: 'eSerialDCE' },
      { from: { deviceName: 'PC1', portName: 'Fa0' }, to: { deviceName: 'Router1', portName: 'Gi0/0' }, cableType: 'eStraightThrough' },
      { from: { deviceName: 'PC2', portName: 'Fa0' }, to: { deviceName: 'Router2', portName: 'Gi0/0' }, cableType: 'eStraightThrough' }
    ]
  })
};

/**
 * Template: OSPF Single Area
 * Tres routers con OSPF en área 0
 */
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
      created: new Date().toISOString()
    },
    devices: [
      {
        name: 'Router1',
        type: 'router',
        hostname: 'R1',
        interfaces: [
          { name: 'Gi0/0', ipAddress: '192.168.1.1/24' },
          { name: 'Gi0/1', ipAddress: '10.0.12.1/30' },
          { name: 'Gi0/2', ipAddress: '10.0.13.1/30' }
        ],
        routing: {
          ospf: {
            processId: 1,
            routerId: '1.1.1.1',
            networks: [
              { network: '192.168.1.0', wildcard: '0.0.0.255', area: '0' },
              { network: '10.0.12.0', wildcard: '0.0.0.3', area: '0' },
              { network: '10.0.13.0', wildcard: '0.0.0.3', area: '0' }
            ]
          }
        }
      },
      {
        name: 'Router2',
        type: 'router',
        hostname: 'R2',
        interfaces: [
          { name: 'Gi0/0', ipAddress: '192.168.2.1/24' },
          { name: 'Gi0/1', ipAddress: '10.0.12.2/30' },
          { name: 'Gi0/2', ipAddress: '10.0.23.1/30' }
        ],
        routing: {
          ospf: {
            processId: 1,
            routerId: '2.2.2.2',
            networks: [
              { network: '192.168.2.0', wildcard: '0.0.0.255', area: '0' },
              { network: '10.0.12.0', wildcard: '0.0.0.3', area: '0' },
              { network: '10.0.23.0', wildcard: '0.0.0.3', area: '0' }
            ]
          }
        }
      },
      {
        name: 'Router3',
        type: 'router',
        hostname: 'R3',
        interfaces: [
          { name: 'Gi0/0', ipAddress: '192.168.3.1/24' },
          { name: 'Gi0/1', ipAddress: '10.0.13.2/30' },
          { name: 'Gi0/2', ipAddress: '10.0.23.2/30' }
        ],
        routing: {
          ospf: {
            processId: 1,
            routerId: '3.3.3.3',
            networks: [
              { network: '192.168.3.0', wildcard: '0.0.0.255', area: '0' },
              { network: '10.0.13.0', wildcard: '0.0.0.3', area: '0' },
              { network: '10.0.23.0', wildcard: '0.0.0.3', area: '0' }
            ]
          }
        }
      }
    ],
    connections: [
      { from: { deviceName: 'Router1', portName: 'Gi0/1' }, to: { deviceName: 'Router2', portName: 'Gi0/1' }, cableType: 'eStraightThrough' },
      { from: { deviceName: 'Router1', portName: 'Gi0/2' }, to: { deviceName: 'Router3', portName: 'Gi0/1' }, cableType: 'eStraightThrough' },
      { from: { deviceName: 'Router2', portName: 'Gi0/2' }, to: { deviceName: 'Router3', portName: 'Gi0/2' }, cableType: 'eStraightThrough' }
    ]
  })
};

/**
 * Template: ACL Basics
 * Router con ACLs para filtrar tráfico
 */
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
      created: new Date().toISOString()
    },
    devices: [
      {
        name: 'Router1',
        type: 'router',
        hostname: 'R1',
        interfaces: [
          { name: 'Gi0/0', ipAddress: '192.168.1.1/24', description: 'LAN' },
          { name: 'Gi0/1', ipAddress: '192.168.2.1/24', description: 'Server LAN' }
        ],
        security: {
          acls: [
            {
              name: '100',
              type: 'extended',
              entries: [
                { action: 'permit', protocol: 'tcp', source: '192.168.1.0 0.0.0.255', destination: '192.168.2.10 0.0.0.0', port: '80' },
                { action: 'permit', protocol: 'tcp', source: '192.168.1.0 0.0.0.255', destination: '192.168.2.10 0.0.0.0', port: '443' },
                { action: 'deny', protocol: 'ip', source: 'any', destination: 'any' }
              ]
            }
          ]
        }
      },
      {
        name: 'Server1',
        type: 'server',
        interfaces: [{ name: 'Fa0', ipAddress: '192.168.2.10/24' }]
      },
      {
        name: 'PC1',
        type: 'pc',
        interfaces: [{ name: 'Fa0', ipAddress: '192.168.1.10/24' }]
      }
    ],
    connections: [
      { from: { deviceName: 'PC1', portName: 'Fa0' }, to: { deviceName: 'Router1', portName: 'Gi0/0' }, cableType: 'eStraightThrough' },
      { from: { deviceName: 'Server1', portName: 'Fa0' }, to: { deviceName: 'Router1', portName: 'Gi0/1' }, cableType: 'eStraightThrough' }
    ]
  })
};

/**
 * Template: DHCP Server
 * Router configurado como servidor DHCP
 */
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
      created: new Date().toISOString()
    },
    devices: [
      {
        name: 'Router1',
        type: 'router',
        hostname: 'R1',
        interfaces: [
          { name: 'Gi0/0', ipAddress: '192.168.1.1/24' }
        ],
        services: {
          dhcp: [
            {
              poolName: 'LAN_POOL',
              network: '192.168.1.0',
              subnetMask: '255.255.255.0',
              defaultRouter: '192.168.1.1',
              dnsServers: ['8.8.8.8'],
              excludedAddresses: ['192.168.1.1', '192.168.1.2', '192.168.1.3']
            }
          ]
        }
      },
      {
        name: 'PC1',
        type: 'pc',
        interfaces: [{ name: 'Fa0' }] // DHCP client
      },
      {
        name: 'PC2',
        type: 'pc',
        interfaces: [{ name: 'Fa0' }] // DHCP client
      }
    ],
    connections: [
      { from: { deviceName: 'PC1', portName: 'Fa0' }, to: { deviceName: 'Router1', portName: 'Gi0/0' }, cableType: 'eStraightThrough' },
      { from: { deviceName: 'PC2', portName: 'Fa0' }, to: { deviceName: 'Router1', portName: 'Gi0/0' }, cableType: 'eStraightThrough' }
    ]
  })
};

/**
 * Registry de todos los templates
 */
export const CCNATemplates: LabTemplate[] = [
  vlanBasicsTemplate,
  staticRoutingTemplate,
  ospfSingleAreaTemplate,
  aclBasicsTemplate,
  dhcpServerTemplate
];

/**
 * Busca un template por ID
 */
export function getTemplateById(id: string): LabTemplate | undefined {
  return CCNATemplates.find(t => t.id === id);
}

/**
 * Busca templates por categoría
 */
export function getTemplatesByCategory(category: string): LabTemplate[] {
  return CCNATemplates.filter(t => t.category === category);
}

/**
 * Busca templates por dificultad
 */
export function getTemplatesByDifficulty(difficulty: LabTemplate['difficulty']): LabTemplate[] {
  return CCNATemplates.filter(t => t.difficulty === difficulty);
}
