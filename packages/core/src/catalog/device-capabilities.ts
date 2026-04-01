/**
 * DEVICE CAPABILITIES - Tipos y definiciones compartidas
 * 
 * Define las capabilities y puertos estándar para dispositivos wireless y seguridad
 */

import type { DeviceCapabilities, PortDefinition } from './schema';

// =============================================================================
// ACCESS POINT CAPABILITIES
// =============================================================================

export const apCapabilities: DeviceCapabilities = {
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

// =============================================================================
// FIREWALL CAPABILITIES
// =============================================================================

export const firewallCapabilities: DeviceCapabilities = {
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

// =============================================================================
// WIRELESS ROUTER CAPABILITIES
// =============================================================================

export const wirelessRouterCapabilities: DeviceCapabilities = {
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

export const giPort: PortDefinition = {
  type: 'GigabitEthernet',
  prefix: 'Gi',
  module: 0,
  range: [0, 0],
  speed: 1000,
  connector: 'rj45',
  supportsCopper: true
};

export const giPorts4: PortDefinition = {
  type: 'GigabitEthernet',
  prefix: 'Gi',
  module: 0,
  range: [0, 3],
  speed: 1000,
  connector: 'rj45',
  supportsCopper: true
};

export const faPorts5: PortDefinition = {
  type: 'FastEthernet',
  prefix: 'Fa',
  module: 0,
  range: [0, 4],
  speed: 100,
  connector: 'rj45',
  supportsCopper: true
};

export const wirelessPort: PortDefinition = {
  type: 'Wireless',
  prefix: 'Wl',
  module: 0,
  range: [0, 0],
  speed: 0,
  connector: 'rj45'
};
