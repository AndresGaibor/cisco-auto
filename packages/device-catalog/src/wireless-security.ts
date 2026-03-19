/**
 * WIRELESS & SECURITY CATALOG
 * 
 * Catálogo de dispositivos wireless, firewalls y otros dispositivos especiales
 */

import type { DeviceCatalogEntry, PortDefinition, DeviceCapabilities } from './schema';

// =============================================================================
// CAPABILITIES BASE
// =============================================================================

const apCapabilities: DeviceCapabilities = {
  // Layer 2
  supportsVlans: true,
  maxVlans: 16,
  supportsVtp: false,
  supportsStp: false,
  stpModes: [],
  supportsEtherchannel: false,
  maxEtherchannels: 0,
  supportsPortSecurity: false,
  
  // Layer 3
  supportsRouting: false,
  supportsIpv6: false,
  routingProtocols: [],
  
  // Security
  supportsAcl: false,
  maxAcls: 0,
  supportsNat: false,
  supportsVpn: false,
  supportsFirewall: false,
  
  // Services
  supportsDhcp: false,
  supportsDns: false,
  supportsNtp: true,
  supportsSnmp: true,
  supportsSsh: true,
  supportsTelnet: true,
  supportsHttp: true,
  
  // Wireless
  supportsWireless: true,
  wirelessStandards: ['802.11a', '802.11b', '802.11g', '802.11n'],
  
  // Voice
  supportsVoice: false,
  supportsPoe: false,
  
  // QoS
  supportsQos: true,
  
  // Hardware
  supportsModules: false,
  moduleSlots: 0,
  supportedModules: [],
  
  // Management
  supportsConsole: false,
  supportsUsb: false,
  supportsSdCard: false,
  
  ptSupportedVersion: '6.0'
};

const firewallCapabilities: DeviceCapabilities = {
  // Layer 2
  supportsVlans: true,
  maxVlans: 255,
  supportsVtp: false,
  supportsStp: false,
  stpModes: [],
  supportsEtherchannel: false,
  maxEtherchannels: 0,
  supportsPortSecurity: false,
  
  // Layer 3
  supportsRouting: true,
  supportsIpv6: true,
  routingProtocols: ['static', 'ospf'],
  
  // Security
  supportsAcl: true,
  maxAcls: 200,
  supportsNat: true,
  supportsVpn: true,
  supportsFirewall: true,
  
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
  supportsModules: false,
  moduleSlots: 0,
  supportedModules: [],
  
  // Management
  supportsConsole: true,
  supportsUsb: false,
  supportsSdCard: false,
  
  ptSupportedVersion: '6.0'
};

const wirelessRouterCapabilities: DeviceCapabilities = {
  ...apCapabilities,
  supportsRouting: true,
  supportsIpv6: true,
  routingProtocols: ['static'],
  supportsNat: true,
  supportsDhcp: true
};

// =============================================================================
// PORT DEFINITIONS
// =============================================================================

const giPort: PortDefinition = {
  type: 'GigabitEthernet',
  prefix: 'Gi',
  module: 0,
  range: [0, 0],
  speed: 1000,
  connector: 'rj45',
  supportsCopper: true
};

const giPorts4: PortDefinition = {
  type: 'GigabitEthernet',
  prefix: 'Gi',
  module: 0,
  range: [0, 3],
  speed: 1000,
  connector: 'rj45',
  supportsCopper: true
};

const faPorts5: PortDefinition = {
  type: 'FastEthernet',
  prefix: 'Fa',
  module: 0,
  range: [0, 4],
  speed: 100,
  connector: 'rj45',
  supportsCopper: true
};

const wirelessPort: PortDefinition = {
  type: 'Wireless',
  prefix: 'Wl',
  module: 0,
  range: [0, 0],
  speed: 0,
  connector: 'rj45'
};

// =============================================================================
// WIRELESS ENTRIES
// =============================================================================

export const wirelessCatalog: DeviceCatalogEntry[] = [
  // === Access Points ===
  {
    id: 'ap-pt',
    model: 'AccessPoint-PT',
    series: 'Access Point',
    family: 'AP',
    vendor: 'generic',
    type: 'access-point',
    deviceFamily: 'wireless',
    
    fixedPorts: [giPort, wirelessPort],
    moduleSlots: [],
    
    capabilities: {
      ...apCapabilities,
      wirelessStandards: ['802.11a', '802.11b', '802.11g', '802.11n']
    },
    
    displayName: 'Access Point-PT',
    description: 'Generic 802.11a/b/g/n Access Point',
    ptCategory: 'Wireless Devices',
    tags: ['ap', 'wireless', 'wifi'],
    isGeneric: true
  },
  
  {
    id: 'ap-pt-a',
    model: 'AccessPoint-PT-A',
    series: 'Access Point',
    family: 'AP',
    vendor: 'generic',
    type: 'access-point',
    deviceFamily: 'wireless',
    
    fixedPorts: [giPort, wirelessPort],
    moduleSlots: [],
    
    capabilities: {
      ...apCapabilities,
      wirelessStandards: ['802.11a']
    },
    
    displayName: 'Access Point-PT-A',
    description: '802.11a Access Point',
    ptCategory: 'Wireless Devices',
    tags: ['ap', 'wireless', 'wifi', '802.11a'],
    isGeneric: true
  },
  
  {
    id: 'ap-pt-n',
    model: 'AccessPoint-PT-N',
    series: 'Access Point',
    family: 'AP',
    vendor: 'generic',
    type: 'access-point',
    deviceFamily: 'wireless',
    
    fixedPorts: [giPort, wirelessPort],
    moduleSlots: [],
    
    capabilities: {
      ...apCapabilities,
      wirelessStandards: ['802.11n']
    },
    
    displayName: 'Access Point-PT-N',
    description: '802.11n Access Point',
    ptCategory: 'Wireless Devices',
    tags: ['ap', 'wireless', 'wifi', '802.11n'],
    isGeneric: true
  },
  
  {
    id: 'ap-pt-ac',
    model: 'AccessPoint-PT-AC',
    series: 'Access Point',
    family: 'AP',
    vendor: 'generic',
    type: 'access-point',
    deviceFamily: 'wireless',
    
    fixedPorts: [giPort, wirelessPort],
    moduleSlots: [],
    
    capabilities: {
      ...apCapabilities,
      wirelessStandards: ['802.11a', '802.11n', '802.11ac'],
      ptSupportedVersion: '7.0'
    },
    
    displayName: 'Access Point-PT-AC',
    description: '802.11ac Access Point',
    ptCategory: 'Wireless Devices',
    tags: ['ap', 'wireless', 'wifi', '802.11ac'],
    isGeneric: true
  },
  
  {
    id: 'lap-pt',
    model: 'LAP-PT',
    series: 'Lightweight AP',
    family: 'AP',
    vendor: 'cisco',
    type: 'access-point',
    deviceFamily: 'wireless',
    
    fixedPorts: [giPort, wirelessPort],
    moduleSlots: [],
    
    capabilities: {
      ...apCapabilities,
      ptSupportedVersion: '6.0'
    },
    
    displayName: 'Lightweight AP-PT',
    description: 'Lightweight Access Point (requires WLC)',
    ptCategory: 'Wireless Devices',
    tags: ['ap', 'wireless', 'lap', 'lightweight'],
    releaseYear: 2008
  },
  
  {
    id: 'aironet-3702i',
    model: 'Aironet-3702i',
    series: 'Aironet',
    family: 'AP',
    vendor: 'cisco',
    type: 'access-point',
    deviceFamily: 'wireless',
    
    fixedPorts: [giPort, wirelessPort],
    moduleSlots: [],
    
    capabilities: {
      ...apCapabilities,
      wirelessStandards: ['802.11a', '802.11n', '802.11ac'],
      supportsPoe: true,
      ptSupportedVersion: '7.0'
    },
    
    displayName: 'Cisco Aironet 3702i',
    description: 'Enterprise 802.11ac Wave 2 Access Point',
    ptCategory: 'Wireless Devices',
    tags: ['ap', 'cisco', 'aironet', 'enterprise', '802.11ac'],
    releaseYear: 2015
  },
  
  // === Wireless Controllers ===
  {
    id: 'wlc-pt',
    model: 'WLC-PT',
    series: 'Wireless Controller',
    family: 'WLC',
    vendor: 'generic',
    type: 'server',
    deviceFamily: 'wireless',
    
    fixedPorts: [giPort],
    moduleSlots: [],
    
    capabilities: {
      ...apCapabilities,
      supportsRouting: false,
      ptSupportedVersion: '6.0'
    },
    
    displayName: 'Wireless LAN Controller-PT',
    description: 'Generic Wireless LAN Controller',
    ptCategory: 'Wireless Devices',
    tags: ['wlc', 'controller', 'wireless'],
    isGeneric: true
  },
  
  {
    id: 'wlc-2504',
    model: 'WLC-2504',
    series: 'Wireless Controller',
    family: 'WLC',
    vendor: 'cisco',
    type: 'server',
    deviceFamily: 'wireless',
    
    fixedPorts: [giPorts4],
    moduleSlots: [],
    
    capabilities: {
      ...apCapabilities,
      ptSupportedVersion: '6.0'
    },
    
    displayName: 'Cisco WLC 2504',
    description: '2504 Wireless Controller (up to 75 APs)',
    ptCategory: 'Wireless Devices',
    tags: ['wlc', 'cisco', 'controller', 'wireless'],
    releaseYear: 2008
  },
  
  {
    id: 'wlc-3504',
    model: 'WLC-3504',
    series: 'Wireless Controller',
    family: 'WLC',
    vendor: 'cisco',
    type: 'server',
    deviceFamily: 'wireless',
    
    fixedPorts: [giPorts4],
    moduleSlots: [],
    
    capabilities: {
      ...apCapabilities,
      wirelessStandards: ['802.11a', '802.11n', '802.11ac'],
      ptSupportedVersion: '7.0'
    },
    
    displayName: 'Cisco WLC 3504',
    description: '3504 Wireless Controller (up to 150 APs)',
    ptCategory: 'Wireless Devices',
    tags: ['wlc', 'cisco', 'controller', 'wireless'],
    releaseYear: 2015
  },
  
  // === Wireless Routers ===
  {
    id: 'wireless-router-pt',
    model: 'WirelessRouter-PT',
    series: 'Wireless Router',
    family: 'Router',
    vendor: 'generic',
    type: 'wireless-router',
    deviceFamily: 'wireless',
    
    fixedPorts: [faPorts5, wirelessPort],
    moduleSlots: [],
    
    capabilities: {
      ...wirelessRouterCapabilities,
      wirelessStandards: ['802.11b', '802.11g', '802.11n']
    },
    
    displayName: 'Wireless Router-PT',
    description: 'SOHO Wireless Router with NAT/DHCP',
    ptCategory: 'Wireless Devices',
    tags: ['router', 'wireless', 'soho', 'nat'],
    isGeneric: true
  },
  
  {
    id: 'home-router',
    model: 'Home-Router',
    series: 'Home Router',
    family: 'Router',
    vendor: 'generic',
    type: 'wireless-router',
    deviceFamily: 'wireless',
    
    fixedPorts: [faPorts5, wirelessPort],
    moduleSlots: [],
    
    capabilities: wirelessRouterCapabilities,
    
    displayName: 'Home Router',
    description: 'Home WiFi Router',
    ptCategory: 'Wireless Devices',
    tags: ['router', 'wireless', 'home', 'soho'],
    isGeneric: true
  },
  
  {
    id: 'wrt300n',
    model: 'WRT300N',
    series: 'Linksys',
    family: 'Router',
    vendor: 'linksys',
    type: 'wireless-router',
    deviceFamily: 'wireless',
    
    fixedPorts: [faPorts5, wirelessPort],
    moduleSlots: [],
    
    capabilities: {
      ...wirelessRouterCapabilities,
      wirelessStandards: ['802.11n']
    },
    
    displayName: 'Linksys WRT300N',
    description: 'Linksys Wireless-N Router',
    ptCategory: 'Wireless Devices',
    tags: ['router', 'wireless', 'linksys', '802.11n'],
    releaseYear: 2007
  },
  
  {
    id: 'home-gateway',
    model: 'Home-Gateway',
    series: 'Gateway',
    family: 'Gateway',
    vendor: 'generic',
    type: 'home-gateway',
    deviceFamily: 'iot',
    
    fixedPorts: [giPort, wirelessPort],
    moduleSlots: [],
    
    capabilities: {
      ...wirelessRouterCapabilities,
      wirelessStandards: ['802.11n', '802.11ac'],
      ptSupportedVersion: '7.0'
    },
    
    displayName: 'Home Gateway',
    description: 'IoT Home Gateway with WiFi',
    ptCategory: 'Wireless Devices',
    tags: ['gateway', 'iot', 'wireless', 'smart-home'],
    isGeneric: true
  },
  
  // === Repeaters ===
  {
    id: 'repeater-pt',
    model: 'Repeater-PT',
    series: 'Repeater',
    family: 'Repeater',
    vendor: 'generic',
    type: 'repeater',
    deviceFamily: 'infrastructure',
    
    fixedPorts: [wirelessPort],
    moduleSlots: [],
    
    capabilities: {
      ...apCapabilities,
      supportsVlans: false
    },
    
    displayName: 'Repeater-PT',
    description: 'Wireless Repeater',
    ptCategory: 'Wireless Devices',
    tags: ['repeater', 'wireless'],
    isGeneric: true
  }
];

// =============================================================================
// SECURITY ENTRIES
// =============================================================================

export const securityCatalog: DeviceCatalogEntry[] = [
  // === ASA Firewalls ===
  {
    id: 'asa-5505',
    model: 'ASA-5505',
    series: 'ASA',
    family: 'Firewall',
    vendor: 'cisco',
    type: 'firewall',
    deviceFamily: 'security',
    
    fixedPorts: [
      {
        type: 'FastEthernet',
        prefix: 'Fa',
        module: 0,
        range: [0, 7],
        speed: 100,
        connector: 'rj45',
        supportsCopper: true
      }
    ],
    moduleSlots: [],
    
    capabilities: {
      ...firewallCapabilities,
      maxVlans: 20,
      ptSupportedVersion: '6.0'
    },
    
    displayName: 'Cisco ASA 5505',
    description: 'ASA 5505 Adaptive Security Appliance',
    ptCategory: 'Security',
    tags: ['firewall', 'asa', 'security', 'vpn'],
    releaseYear: 2005
  },
  
  {
    id: 'asa-5506',
    model: 'ASA-5506',
    series: 'ASA',
    family: 'Firewall',
    vendor: 'cisco',
    type: 'firewall',
    deviceFamily: 'security',
    
    fixedPorts: [giPorts4],
    moduleSlots: [],
    
    capabilities: {
      ...firewallCapabilities,
      wirelessStandards: ['802.11n'],
      supportsWireless: true,
      ptSupportedVersion: '7.0'
    },
    
    displayName: 'Cisco ASA 5506-X',
    description: 'ASA 5506-X with FirePOWER',
    ptCategory: 'Security',
    tags: ['firewall', 'asa', 'security', ' firepower'],
    releaseYear: 2014
  },
  
  {
    id: 'isa-3000',
    model: 'ISA-3000',
    series: 'ISA',
    family: 'Firewall',
    vendor: 'cisco',
    type: 'firewall',
    deviceFamily: 'security',
    
    fixedPorts: [giPorts4],
    moduleSlots: [],
    
    capabilities: {
      ...firewallCapabilities,
      ptSupportedVersion: '8.0'
    },
    
    displayName: 'Cisco ISA 3000',
    description: 'Industrial Security Appliance',
    ptCategory: 'Security',
    tags: ['firewall', 'industrial', 'security', 'ot'],
    releaseYear: 2017
  },
  
  // === Meraki ===
  {
    id: 'meraki-mx65w',
    model: 'Meraki-MX65W',
    series: 'Meraki MX',
    family: 'Firewall',
    vendor: 'cisco',
    type: 'firewall',
    deviceFamily: 'security',
    
    fixedPorts: [giPorts4],
    moduleSlots: [],
    
    capabilities: {
      ...firewallCapabilities,
      supportsWireless: true,
      wirelessStandards: ['802.11ac'],
      ptSupportedVersion: '7.0'
    },
    
    displayName: 'Meraki MX65W',
    description: 'Meraki Cloud-Managed Security Appliance with WiFi',
    ptCategory: 'Security',
    tags: ['firewall', 'meraki', 'cloud', 'wireless'],
    releaseYear: 2016
  }
];

// =============================================================================
// WAN/OTHER ENTRIES
// =============================================================================

export const otherDeviceCatalog: DeviceCatalogEntry[] = [
  // === Cloud ===
  {
    id: 'cloud-pt',
    model: 'Cloud-PT',
    series: 'Cloud',
    family: 'WAN',
    vendor: 'generic',
    type: 'cloud',
    deviceFamily: 'infrastructure',
    
    fixedPorts: [giPorts4],
    moduleSlots: [],
    
    capabilities: {
      ...firewallCapabilities,
      supportsVlans: false,
      supportsRouting: true,
      routingProtocols: ['static', 'bgp'],
      supportsAcl: false,
      supportsNat: true,
      supportsVpn: false,
      supportsFirewall: false
    },
    
    displayName: 'Cloud-PT',
    description: 'Internet/Cloud simulation',
    ptCategory: 'WAN Emulation',
    tags: ['cloud', 'wan', 'internet'],
    isGeneric: true
  },
  
  // === Modems ===
  {
    id: 'dsl-modem-pt',
    model: 'DSL-Modem-PT',
    series: 'Modem',
    family: 'DSL',
    vendor: 'generic',
    type: 'modem',
    deviceFamily: 'infrastructure',
    
    fixedPorts: [
      {
        type: 'DSL',
        prefix: 'DSL',
        module: 0,
        range: [0, 0],
        speed: 0,
        connector: 'rj45'
      },
      giPort
    ],
    moduleSlots: [],
    
    capabilities: {
      ...firewallCapabilities,
      supportsVlans: false,
      supportsRouting: false,
      supportsAcl: false,
      supportsNat: true
    },
    
    displayName: 'DSL Modem-PT',
    description: 'DSL Modem',
    ptCategory: 'WAN Emulation',
    tags: ['modem', 'dsl', 'wan'],
    isGeneric: true
  },
  
  {
    id: 'cable-modem-pt',
    model: 'Cable-Modem-PT',
    series: 'Modem',
    family: 'Cable',
    vendor: 'generic',
    type: 'modem',
    deviceFamily: 'infrastructure',
    
    fixedPorts: [
      {
        type: 'Cable',
        prefix: 'Ca',
        module: 0,
        range: [0, 0],
        speed: 0,
        connector: 'rj45'
      },
      giPort
    ],
    moduleSlots: [],
    
    capabilities: {
      ...firewallCapabilities,
      supportsVlans: false,
      supportsRouting: false,
      supportsAcl: false,
      supportsNat: true
    },
    
    displayName: 'Cable Modem-PT',
    description: 'Cable Modem',
    ptCategory: 'WAN Emulation',
    tags: ['modem', 'cable', 'wan'],
    isGeneric: true
  },
  
  // === Cell Tower ===
  {
    id: 'cell-tower-pt',
    model: 'Cell-Tower',
    series: 'Cellular',
    family: 'Tower',
    vendor: 'generic',
    type: 'cloud',
    deviceFamily: 'infrastructure',
    
    fixedPorts: [giPort],
    moduleSlots: [],
    
    capabilities: {
      ...firewallCapabilities,
      supportsVlans: false,
      supportsRouting: true,
      routingProtocols: ['static'],
      supportsAcl: false,
      supportsNat: true
    },
    
    displayName: 'Cell Tower',
    description: 'Cellular network simulation',
    ptCategory: 'WAN Emulation',
    tags: ['cellular', 'tower', 'mobile'],
    isGeneric: true
  },
  
  // === Central Office ===
  {
    id: 'central-office-server',
    model: 'Central-Office-Server',
    series: 'CO',
    family: 'Server',
    vendor: 'generic',
    type: 'server',
    deviceFamily: 'infrastructure',
    
    fixedPorts: [giPort],
    moduleSlots: [],
    
    capabilities: {
      ...firewallCapabilities,
      supportsRouting: true,
      routingProtocols: ['static', 'ospf', 'bgp']
    },
    
    displayName: 'Central Office Server',
    description: 'Central Office for WAN simulation',
    ptCategory: 'WAN Emulation',
    tags: ['co', 'central-office', 'wan'],
    isGeneric: true
  }
];

export default [...wirelessCatalog, ...securityCatalog, ...otherDeviceCatalog];
