/**
 * ROUTER CATALOG
 * 
 * Catálogo de routers soportados en Packet Tracer
 */

import type { DeviceCatalogEntry, PortDefinition, DeviceCapabilities } from './schema';
import { CableType } from '../canonical/types';

// =============================================================================
// CAPABILITIES BASE
// =============================================================================

const baseRouterCapabilities: DeviceCapabilities = {
  // Layer 2
  supportsVlans: true,
  maxVlans: 1005,
  supportsVtp: false,
  supportsStp: false,
  stpModes: [],
  supportsEtherchannel: false,
  maxEtherchannels: 0,
  supportsPortSecurity: false,
  
  // Layer 3
  supportsRouting: true,
  supportsIpv6: true,
  routingProtocols: ['static', 'rip', 'ospf', 'eigrp'],
  
  // Security
  supportsAcl: true,
  maxAcls: 100,
  supportsNat: true,
  supportsVpn: false,
  supportsFirewall: false,
  
  // Services
  supportsDhcp: true,
  supportsDns: false,
  supportsNtp: true,
  supportsSnmp: true,
  supportsSsh: true,
  supportsTelnet: true,
  supportsHttp: true,
  
  // Wireless
  supportsWireless: false,
  wirelessStandards: [],
  
  // Voice
  supportsVoice: false,
  supportsPoe: false,
  
  // QoS
  supportsQos: true,
  
  // Hardware
  supportsModules: true,
  moduleSlots: 2,
  supportedModules: [],
  
  // Management
  supportsConsole: true,
  supportsUsb: false,
  supportsSdCard: false,
  
  ptSupportedVersion: '7.0'
};

// =============================================================================
// ROUTER PORT DEFINITIONS
// =============================================================================

const giPorts2 = (module: number = 0): PortDefinition[] => [
  {
    type: 'GigabitEthernet',
    prefix: 'Gi',
    module,
    range: [0, 1],
    speed: 1000,
    connector: 'rj45',
    supportsCopper: true
  }
];

const giPorts3 = (module: number = 0): PortDefinition[] => [
  {
    type: 'GigabitEthernet',
    prefix: 'Gi',
    module,
    range: [0, 2],
    speed: 1000,
    connector: 'rj45',
    supportsCopper: true
  }
];

const faPorts2 = (module: number = 0): PortDefinition[] => [
  {
    type: 'FastEthernet',
    prefix: 'Fa',
    module,
    range: [0, 1],
    speed: 100,
    connector: 'rj45',
    supportsCopper: true
  }
];

const consolePort: PortDefinition = {
  type: 'Console',
  prefix: 'Con',
  module: 0,
  range: [0, 0],
  speed: 0,
  connector: 'console'
};

// =============================================================================
// ROUTER ENTRIES
// =============================================================================

export const routerCatalog: DeviceCatalogEntry[] = [
  // === ISR 4000 Series (Modern) ===
  {
    id: 'router-isr4321',
    model: 'ISR4321',
    series: 'ISR 4000',
    family: 'ISR',
    vendor: 'cisco',
    type: 'router',
    deviceFamily: 'infrastructure',
    
    fixedPorts: [
      ...giPorts2(0),
      {
        type: 'GigabitEthernet',
        prefix: 'Gi',
        module: 0,
        range: [0, 0],
        speed: 1000,
        connector: 'sfp',
        supportsFiber: true
      },
      consolePort
    ],
    
    moduleSlots: [
      { type: 'nme', count: 1, supportedModules: ['NME-16ES-1G'] }
    ],
    
    capabilities: {
      ...baseRouterCapabilities,
      supportsIpv6: true,
      routingProtocols: ['static', 'rip', 'ospf', 'eigrp', 'bgp'],
      moduleSlots: 1,
      ptSupportedVersion: '7.0'
    },
    
    displayName: 'Cisco ISR 4321',
    description: 'ISR 4000 Series Router with 2 GE ports',
    ptCategory: 'Routers',
    tags: ['router', 'isr', '4000', 'gigabit'],
    releaseYear: 2014
  },
  
  {
    id: 'router-isr4331',
    model: 'ISR4331',
    series: 'ISR 4000',
    family: 'ISR',
    vendor: 'cisco',
    type: 'router',
    deviceFamily: 'infrastructure',
    
    fixedPorts: [
      ...giPorts3(0),
      consolePort
    ],
    
    moduleSlots: [
      { type: 'nme', count: 2, supportedModules: ['NME-16ES-1G', 'NME-X-23ES-1G'] }
    ],
    
    capabilities: {
      ...baseRouterCapabilities,
      routingProtocols: ['static', 'rip', 'ospf', 'eigrp', 'bgp'],
      moduleSlots: 2,
      ptSupportedVersion: '7.0'
    },
    
    displayName: 'Cisco ISR 4331',
    description: 'ISR 4000 Series Router with 3 GE ports',
    ptCategory: 'Routers',
    tags: ['router', 'isr', '4000', 'gigabit'],
    releaseYear: 2014
  },
  
  // === ISR G2 Series ===
  {
    id: 'router-1941',
    model: '1941',
    series: 'ISR G2',
    family: 'ISR',
    vendor: 'cisco',
    type: 'router',
    deviceFamily: 'infrastructure',
    
    fixedPorts: [
      ...giPorts2(0),
      consolePort
    ],
    
    moduleSlots: [
      { type: 'hwic', count: 2, supportedModules: ['HWIC-2T', 'HWIC-4ESW', 'HWIC-AP'] }
    ],
    
    capabilities: {
      ...baseRouterCapabilities,
      moduleSlots: 2,
      ptSupportedVersion: '6.0'
    },
    
    displayName: 'Cisco 1941',
    description: 'ISR G2 Router with 2 GE ports',
    ptCategory: 'Routers',
    tags: ['router', 'isr-g2', 'gigabit'],
    releaseYear: 2009
  },
  
  {
    id: 'router-2901',
    model: '2901',
    series: 'ISR G2',
    family: 'ISR',
    vendor: 'cisco',
    type: 'router',
    deviceFamily: 'infrastructure',
    
    fixedPorts: [
      ...giPorts2(0),
      consolePort
    ],
    
    moduleSlots: [
      { type: 'hwic', count: 2, supportedModules: ['HWIC-2T', 'HWIC-4ESW', 'HWIC-AP'] },
      { type: 'pvdm', count: 2, supportedModules: ['PVDM3-16', 'PVDM3-32'] }
    ],
    
    capabilities: {
      ...baseRouterCapabilities,
      moduleSlots: 4,
      supportsVoice: true,
      ptSupportedVersion: '6.0'
    },
    
    displayName: 'Cisco 2901',
    description: 'ISR G2 Voice Router with 2 GE ports',
    ptCategory: 'Routers',
    tags: ['router', 'isr-g2', 'gigabit', 'voice'],
    releaseYear: 2009
  },
  
  {
    id: 'router-2911',
    model: '2911',
    series: 'ISR G2',
    family: 'ISR',
    vendor: 'cisco',
    type: 'router',
    deviceFamily: 'infrastructure',
    
    fixedPorts: [
      ...giPorts3(0),
      consolePort
    ],
    
    moduleSlots: [
      { type: 'hwic', count: 4, supportedModules: ['HWIC-2T', 'HWIC-4ESW', 'HWIC-AP'] },
      { type: 'pvdm', count: 3, supportedModules: ['PVDM3-16', 'PVDM3-32'] }
    ],
    
    capabilities: {
      ...baseRouterCapabilities,
      routingProtocols: ['static', 'rip', 'ospf', 'eigrp', 'bgp'],
      moduleSlots: 7,
      supportsVoice: true,
      ptSupportedVersion: '6.0'
    },
    
    displayName: 'Cisco 2911',
    description: 'ISR G2 Voice Router with 3 GE ports',
    ptCategory: 'Routers',
    tags: ['router', 'isr-g2', 'gigabit', 'voice'],
    releaseYear: 2009
  },
  
  // === Legacy ISR ===
  {
    id: 'router-1841',
    model: '1841',
    series: 'ISR',
    family: 'ISR',
    vendor: 'cisco',
    type: 'router',
    deviceFamily: 'infrastructure',
    
    fixedPorts: [
      ...faPorts2(0),
      consolePort
    ],
    
    moduleSlots: [
      { type: 'hwic', count: 2, supportedModules: ['HWIC-2T', 'HWIC-4ESW'] }
    ],
    
    capabilities: {
      ...baseRouterCapabilities,
      supportsIpv6: true,
      moduleSlots: 2,
      ptSupportedVersion: '5.0'
    },
    
    displayName: 'Cisco 1841',
    description: 'Legacy ISR Router with 2 FE ports',
    ptCategory: 'Routers',
    tags: ['router', 'isr', 'legacy', 'fastethernet'],
    releaseYear: 2005,
    isLegacy: true
  },
  
  {
    id: 'router-2811',
    model: '2811',
    series: 'ISR',
    family: 'ISR',
    vendor: 'cisco',
    type: 'router',
    deviceFamily: 'infrastructure',
    
    fixedPorts: [
      ...faPorts2(0),
      consolePort
    ],
    
    moduleSlots: [
      { type: 'hwic', count: 4, supportedModules: ['HWIC-2T', 'HWIC-4ESW'] },
      { type: 'nm', count: 1, supportedModules: ['NM-16ESW'] }
    ],
    
    capabilities: {
      ...baseRouterCapabilities,
      moduleSlots: 5,
      ptSupportedVersion: '5.0'
    },
    
    displayName: 'Cisco 2811',
    description: 'Legacy ISR Router with 2 FE ports and NM slot',
    ptCategory: 'Routers',
    tags: ['router', 'isr', 'legacy', 'fastethernet'],
    releaseYear: 2005,
    isLegacy: true
  },
  
  // === 2600XM Series (Very Legacy) ===
  {
    id: 'router-2620xm',
    model: '2620XM',
    series: '2600XM',
    family: '2600',
    vendor: 'cisco',
    type: 'router',
    deviceFamily: 'infrastructure',
    
    fixedPorts: [
      ...faPorts2(0),
      consolePort
    ],
    
    moduleSlots: [
      { type: 'wic', count: 2, supportedModules: ['WIC-2T'] },
      { type: 'nm', count: 1, supportedModules: ['NM-16ESW'] }
    ],
    
    capabilities: {
      ...baseRouterCapabilities,
      supportsIpv6: false,
      routingProtocols: ['static', 'rip', 'ospf', 'eigrp'],
      moduleSlots: 3,
      ptSupportedVersion: '5.0'
    },
    
    displayName: 'Cisco 2620XM',
    description: 'Legacy 2600XM Router',
    ptCategory: 'Routers',
    tags: ['router', '2600', 'legacy', 'fastethernet'],
    releaseYear: 2003,
    isLegacy: true
  },
  
  {
    id: 'router-2621xm',
    model: '2621XM',
    series: '2600XM',
    family: '2600',
    vendor: 'cisco',
    type: 'router',
    deviceFamily: 'infrastructure',
    
    fixedPorts: [
      ...faPorts2(0),
      consolePort
    ],
    
    moduleSlots: [
      { type: 'wic', count: 2, supportedModules: ['WIC-2T'] },
      { type: 'nm', count: 1, supportedModules: ['NM-16ESW'] }
    ],
    
    capabilities: {
      ...baseRouterCapabilities,
      supportsIpv6: false,
      routingProtocols: ['static', 'rip', 'ospf', 'eigrp'],
      moduleSlots: 3,
      ptSupportedVersion: '5.0'
    },
    
    displayName: 'Cisco 2621XM',
    description: 'Legacy 2600XM Router',
    ptCategory: 'Routers',
    tags: ['router', '2600', 'legacy', 'fastethernet'],
    releaseYear: 2003,
    isLegacy: true
  },
  
  // === Cellular Routers ===
  {
    id: 'router-819',
    model: '819',
    series: '800',
    family: 'ISR',
    vendor: 'cisco',
    type: 'router',
    deviceFamily: 'infrastructure',
    
    fixedPorts: [
      ...faPorts2(0),
      consolePort
    ],
    
    moduleSlots: [],
    
    capabilities: {
      ...baseRouterCapabilities,
      moduleSlots: 0,
      supportsWireless: true,
      wirelessStandards: ['802.11n'],
      ptSupportedVersion: '7.0'
    },
    
    displayName: 'Cisco 819 Cellular Router',
    description: 'Cellular router with WiFi',
    ptCategory: 'Routers',
    tags: ['router', 'cellular', 'wireless', '3g'],
    releaseYear: 2012
  },
  
  {
    id: 'router-829',
    model: '829',
    series: '800',
    family: 'ISR',
    vendor: 'cisco',
    type: 'router',
    deviceFamily: 'infrastructure',
    
    fixedPorts: [
      ...giPorts2(0),
      consolePort
    ],
    
    moduleSlots: [],
    
    capabilities: {
      ...baseRouterCapabilities,
      moduleSlots: 0,
      supportsWireless: true,
      wirelessStandards: ['802.11n'],
      ptSupportedVersion: '7.0'
    },
    
    displayName: 'Cisco 829 Cellular Router',
    description: '4G LTE cellular router with WiFi',
    ptCategory: 'Routers',
    tags: ['router', 'cellular', 'wireless', '4g', 'lte'],
    releaseYear: 2014
  },
  
  // === Industrial Routers ===
  {
    id: 'router-cgr1240',
    model: 'CGR1240',
    series: 'Connected Grid',
    family: 'Industrial',
    vendor: 'cisco',
    type: 'router',
    deviceFamily: 'infrastructure',
    
    fixedPorts: [
      ...giPorts2(0),
      consolePort
    ],
    
    moduleSlots: [
      { type: 'hwic', count: 2, supportedModules: ['HWIC-2T'] }
    ],
    
    capabilities: {
      ...baseRouterCapabilities,
      moduleSlots: 2,
      ptSupportedVersion: '7.0'
    },
    
    displayName: 'Cisco CGR 1240 Industrial Router',
    description: 'Industrial router for smart grid',
    ptCategory: 'Routers',
    tags: ['router', 'industrial', 'smart-grid'],
    releaseYear: 2011
  },
  
  {
    id: 'router-ir8340',
    model: 'IR-8340',
    series: 'IR',
    family: 'Industrial',
    vendor: 'cisco',
    type: 'router',
    deviceFamily: 'infrastructure',
    
    fixedPorts: [
      ...giPorts2(0),
      consolePort
    ],
    
    moduleSlots: [],
    
    capabilities: {
      ...baseRouterCapabilities,
      routingProtocols: ['static', 'rip', 'ospf', 'eigrp', 'bgp'],
      moduleSlots: 0,
      ptSupportedVersion: '8.0'
    },
    
    displayName: 'Cisco IR 8340 Industrial Router',
    description: 'Industrial routing platform',
    ptCategory: 'Routers',
    tags: ['router', 'industrial'],
    releaseYear: 2017
  },
  
  // === Generic PT Router ===
  {
    id: 'router-pt-generic',
    model: 'Router-PT',
    series: 'Packet Tracer',
    family: 'Generic',
    vendor: 'cisco',
    type: 'router',
    deviceFamily: 'infrastructure',
    
    fixedPorts: [
      ...faPorts2(0),
      consolePort
    ],
    
    moduleSlots: [],
    
    capabilities: {
      ...baseRouterCapabilities,
      moduleSlots: 0,
      ptSupportedVersion: '5.0'
    },
    
    displayName: 'Generic Router',
    description: 'Generic Packet Tracer Router',
    ptCategory: 'Routers',
    tags: ['router', 'generic'],
    isGeneric: true
  },
  
  // === C8200 (New in PT 9.0) ===
  {
    id: 'router-c8200',
    model: 'C8200',
    series: 'Catalyst 8000',
    family: 'ISR',
    vendor: 'cisco',
    type: 'router',
    deviceFamily: 'infrastructure',
    
    fixedPorts: [
      ...giPorts3(0),
      consolePort
    ],
    
    moduleSlots: [
      { type: 'nme', count: 2, supportedModules: ['NME-16ES-1G'] }
    ],
    
    capabilities: {
      ...baseRouterCapabilities,
      routingProtocols: ['static', 'rip', 'ospf', 'eigrp', 'bgp'],
      supportsVpn: true,
      moduleSlots: 2,
      ptSupportedVersion: '9.0'
    },
    
    displayName: 'Cisco Catalyst 8200',
    description: 'SD-WAN capable router',
    ptCategory: 'Routers',
    tags: ['router', 'catalyst', '8000', 'sd-wan'],
    releaseYear: 2020
  }
];

export default routerCatalog;
