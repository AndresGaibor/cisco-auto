/**
 * END DEVICES CATALOG
 * 
 * Catálogo de dispositivos finales soportados en Packet Tracer
 */

import type { DeviceCatalogEntry, PortDefinition, DeviceCapabilities } from './schema';

// =============================================================================
// CAPABILITIES BASE
// =============================================================================

const pcCapabilities: DeviceCapabilities = {
  // Layer 2
  supportsVlans: false,
  maxVlans: 0,
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
  supportsNtp: false,
  supportsSnmp: false,
  supportsSsh: false,
  supportsTelnet: false,
  supportsHttp: false,
  
  // Wireless
  supportsWireless: false,
  wirelessStandards: [],
  
  // Voice
  supportsVoice: false,
  supportsPoe: false,
  
  // QoS
  supportsQos: false,
  
  // Hardware
  supportsModules: false,
  moduleSlots: 0,
  supportedModules: [],
  
  // Management
  supportsConsole: false,
  supportsUsb: false,
  supportsSdCard: false,
  
  ptSupportedVersion: '5.0'
};

const serverCapabilities: DeviceCapabilities = {
  ...pcCapabilities,
  supportsDhcp: true,
  supportsDns: true,
  supportsHttp: true,
  supportsSsh: true,
  supportsTelnet: true,
  supportsSnmp: true,
  supportsNtp: true
};

const wirelessClientCapabilities: DeviceCapabilities = {
  ...pcCapabilities,
  supportsWireless: true,
  wirelessStandards: ['802.11a', '802.11b', '802.11g', '802.11n']
};

// =============================================================================
// PORT DEFINITIONS
// =============================================================================

const singleFaPort: PortDefinition = {
  type: 'FastEthernet',
  prefix: 'Fa',
  module: 0,
  range: [0, 0],
  speed: 100,
  connector: 'rj45',
  supportsCopper: true
};

const singleGiPort: PortDefinition = {
  type: 'GigabitEthernet',
  prefix: 'Gi',
  module: 0,
  range: [0, 0],
  speed: 1000,
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
// END DEVICE ENTRIES
// =============================================================================

export const endDeviceCatalog: DeviceCatalogEntry[] = [
  // === PCs ===
  {
    id: 'pc-pt',
    model: 'PC-PT',
    series: 'End Device',
    family: 'PC',
    vendor: 'generic',
    type: 'pc',
    deviceFamily: 'end-device',
    
    fixedPorts: [singleFaPort],
    moduleSlots: [],
    
    capabilities: pcCapabilities,
    
    displayName: 'PC-PT',
    description: 'Generic PC with FastEthernet',
    ptCategory: 'End Devices',
    tags: ['pc', 'desktop', 'end-device'],
    isGeneric: true
  },
  
  // === Laptops ===
  {
    id: 'laptop-pt',
    model: 'Laptop-PT',
    series: 'End Device',
    family: 'Laptop',
    vendor: 'generic',
    type: 'laptop',
    deviceFamily: 'end-device',
    
    fixedPorts: [singleFaPort, wirelessPort],
    moduleSlots: [],
    
    capabilities: {
      ...wirelessClientCapabilities,
      supportsWireless: true,
      wirelessStandards: ['802.11a', '802.11b', '802.11g', '802.11n']
    },
    
    displayName: 'Laptop-PT',
    description: 'Laptop with FastEthernet and WiFi',
    ptCategory: 'End Devices',
    tags: ['laptop', 'wireless', 'end-device'],
    isGeneric: true
  },
  
  // === Servers ===
  {
    id: 'server-pt',
    model: 'Server-PT',
    series: 'End Device',
    family: 'Server',
    vendor: 'generic',
    type: 'server',
    deviceFamily: 'end-device',
    
    fixedPorts: [singleGiPort],
    moduleSlots: [],
    
    capabilities: serverCapabilities,
    
    displayName: 'Server-PT',
    description: 'Server with GigabitEthernet, supports DHCP/DNS/HTTP/FTP/Email',
    ptCategory: 'End Devices',
    tags: ['server', 'services', 'end-device'],
    isGeneric: true
  },
  
  {
    id: 'server-meraki',
    model: 'Meraki-Server',
    series: 'Meraki',
    family: 'Server',
    vendor: 'cisco',
    type: 'server',
    deviceFamily: 'end-device',
    
    fixedPorts: [singleGiPort],
    moduleSlots: [],
    
    capabilities: {
      ...serverCapabilities,
      ptSupportedVersion: '7.0'
    },
    
    displayName: 'Meraki Server',
    description: 'Cloud-managed server',
    ptCategory: 'End Devices',
    tags: ['server', 'meraki', 'cloud'],
    releaseYear: 2015
  },
  
  // === Printers ===
  {
    id: 'printer-pt',
    model: 'Printer-PT',
    series: 'End Device',
    family: 'Printer',
    vendor: 'generic',
    type: 'printer',
    deviceFamily: 'end-device',
    
    fixedPorts: [singleFaPort],
    moduleSlots: [],
    
    capabilities: pcCapabilities,
    
    displayName: 'Printer-PT',
    description: 'Network printer',
    ptCategory: 'End Devices',
    tags: ['printer', 'end-device'],
    isGeneric: true
  },
  
  // === IP Phones ===
  {
    id: 'ip-phone-7960',
    model: '7960',
    series: 'IP Phone',
    family: 'Phone',
    vendor: 'cisco',
    type: 'ip-phone',
    deviceFamily: 'end-device',
    
    fixedPorts: [
      {
        type: 'FastEthernet',
        prefix: 'Fa',
        module: 0,
        range: [0, 1],  // Switch port + PC port
        speed: 100,
        connector: 'rj45',
        supportsCopper: true
      }
    ],
    moduleSlots: [],
    
    capabilities: {
      ...pcCapabilities,
      supportsVoice: true
    },
    
    displayName: 'Cisco 7960 IP Phone',
    description: 'Cisco IP Phone with switch port',
    ptCategory: 'End Devices',
    tags: ['phone', 'voip', 'voice', 'end-device'],
    releaseYear: 1999
  },
  
  {
    id: 'home-voip-pt',
    model: 'Home-VoIP-PT',
    series: 'VoIP',
    family: 'Phone',
    vendor: 'generic',
    type: 'ip-phone',
    deviceFamily: 'end-device',
    
    fixedPorts: [singleFaPort],
    moduleSlots: [],
    
    capabilities: {
      ...pcCapabilities,
      supportsVoice: true
    },
    
    displayName: 'Home VoIP-PT',
    description: 'Home VoIP phone',
    ptCategory: 'End Devices',
    tags: ['phone', 'voip', 'home'],
    isGeneric: true
  },
  
  {
    id: 'analog-phone-pt',
    model: 'Analog-Phone-PT',
    series: 'Phone',
    family: 'Phone',
    vendor: 'generic',
    type: 'ip-phone',
    deviceFamily: 'end-device',
    
    fixedPorts: [{
      type: 'Phone',
      prefix: 'Ph',
      module: 0,
      range: [0, 0],
      speed: 0,
      connector: 'rj45'
    }],
    moduleSlots: [],
    
    capabilities: {
      ...pcCapabilities,
      supportsVoice: true
    },
    
    displayName: 'Analog Phone-PT',
    description: 'Analog phone for VoIP gateway',
    ptCategory: 'End Devices',
    tags: ['phone', 'analog', 'legacy'],
    isGeneric: true
  },
  
  // === Mobile Devices ===
  {
    id: 'tablet-pt',
    model: 'TabletPC-PT',
    series: 'Mobile',
    family: 'Tablet',
    vendor: 'generic',
    type: 'tablet',
    deviceFamily: 'end-device',
    
    fixedPorts: [wirelessPort],
    moduleSlots: [],
    
    capabilities: wirelessClientCapabilities,
    
    displayName: 'Tablet-PT',
    description: 'Tablet with WiFi',
    ptCategory: 'End Devices',
    tags: ['tablet', 'wireless', 'mobile', 'end-device'],
    isGeneric: true
  },
  
  {
    id: 'smartphone-pt',
    model: 'SMARTPHONE-PT',
    series: 'Mobile',
    family: 'Smartphone',
    vendor: 'generic',
    type: 'smartphone',
    deviceFamily: 'end-device',
    
    fixedPorts: [wirelessPort],
    moduleSlots: [],
    
    capabilities: wirelessClientCapabilities,
    
    displayName: 'Smartphone-PT',
    description: 'Smartphone with WiFi',
    ptCategory: 'End Devices',
    tags: ['smartphone', 'wireless', 'mobile', 'end-device'],
    isGeneric: true
  },
  
  // === TV ===
  {
    id: 'tv-pt',
    model: 'TV-PT',
    series: 'Media',
    family: 'TV',
    vendor: 'generic',
    type: 'tv',
    deviceFamily: 'end-device',
    
    fixedPorts: [singleFaPort, wirelessPort],
    moduleSlots: [],
    
    capabilities: wirelessClientCapabilities,
    
    displayName: 'TV-PT',
    description: 'Smart TV with Ethernet and WiFi',
    ptCategory: 'End Devices',
    tags: ['tv', 'media', 'wireless', 'end-device'],
    isGeneric: true
  },
  
  // === Special End Devices ===
  {
    id: 'wireless-end-device-pt',
    model: 'WirelessEndDevice-PT',
    series: 'Wireless',
    family: 'Wireless',
    vendor: 'generic',
    type: 'pc',
    deviceFamily: 'end-device',
    
    fixedPorts: [wirelessPort],
    moduleSlots: [],
    
    capabilities: wirelessClientCapabilities,
    
    displayName: 'Wireless End Device-PT',
    description: 'Generic wireless client',
    ptCategory: 'End Devices',
    tags: ['wireless', 'client', 'end-device'],
    isGeneric: true
  },
  
  {
    id: 'wired-device-pt',
    model: 'WiredDevice-PT',
    series: 'Wired',
    family: 'Wired',
    vendor: 'generic',
    type: 'pc',
    deviceFamily: 'end-device',
    
    fixedPorts: [singleFaPort],
    moduleSlots: [],
    
    capabilities: pcCapabilities,
    
    displayName: 'Wired End Device-PT',
    description: 'Generic wired client',
    ptCategory: 'End Devices',
    tags: ['wired', 'client', 'end-device'],
    isGeneric: true
  },
  
  // === Network Tools ===
  {
    id: 'sniffer-pt',
    model: 'Sniffer',
    series: 'Tools',
    family: 'Sniffer',
    vendor: 'generic',
    type: 'sniffer',
    deviceFamily: 'other',
    
    fixedPorts: [singleGiPort],
    moduleSlots: [],
    
    capabilities: {
      ...pcCapabilities,
      supportsSnmp: true
    },
    
    displayName: 'Sniffer',
    description: 'Network traffic analyzer',
    ptCategory: 'End Devices',
    tags: ['sniffer', 'analyzer', 'tools'],
    isGeneric: true
  },
  
  // === Industrial ===
  {
    id: 'data-historian-server',
    model: 'DataHistorianServer',
    series: 'Industrial',
    family: 'Server',
    vendor: 'cisco',
    type: 'server',
    deviceFamily: 'end-device',
    
    fixedPorts: [singleGiPort],
    moduleSlots: [],
    
    capabilities: {
      ...serverCapabilities,
      ptSupportedVersion: '9.0'
    },
    
    displayName: 'Data Historian Server',
    description: 'Industrial data historian for OT',
    ptCategory: 'End Devices',
    tags: ['server', 'industrial', 'ot', 'historian'],
    releaseYear: 2019
  },
  
  {
    id: 'cyber-observer',
    model: 'CyberObserver',
    series: 'Security',
    family: 'Monitor',
    vendor: 'cisco',
    type: 'server',
    deviceFamily: 'security',
    
    fixedPorts: [singleGiPort],
    moduleSlots: [],
    
    capabilities: {
      ...serverCapabilities,
      supportsFirewall: true,
      supportsSnmp: true,
      ptSupportedVersion: '9.0'
    },
    
    displayName: 'Cyber Observer',
    description: 'Industrial security monitoring',
    ptCategory: 'End Devices',
    tags: ['security', 'industrial', 'monitoring', 'ot'],
    releaseYear: 2020
  }
];

export default endDeviceCatalog;
