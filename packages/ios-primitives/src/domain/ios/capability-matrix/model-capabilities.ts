// ============================================================================
// Capability Matrix - Model Capabilities Data
// ============================================================================

import type { DeviceCapabilities, SurfaceCapability, OperationCapability, InterfaceNamingPattern, ModelInfo } from './capability-types.js';

/**
 * Capabilities por modelo de device
 */
export const MODEL_CAPABILITIES: Record<string, DeviceCapabilities> = {
  // Routers
  '2911': createRouterCapabilities('2911', 'ISR G2'),
  '2921': createRouterCapabilities('2921', 'ISR G2'),
  '2901': createRouterCapabilities('2901', 'ISR G2'),
  '1941': createRouterCapabilities('1941', 'ISR G2'),
  
  // Switches
  '2960-24TC-L': createSwitchCapabilities('2960-24TC-L', '2960'),
  '2960-48TC-L': createSwitchCapabilities('2960-48TC-L', '2960'),
  '2960-24TT-L': createSwitchCapabilities('2960-24TT-L', '2960'),
  '2960-48TT-L': createSwitchCapabilities('2960-48TT-L', '2960'),
  '2960X-48FPS-L': createSwitchCapabilities('2960X-48FPS-L', '2960-X'),
  '2960X-48PTS-L': createSwitchCapabilities('2960X-48PTS-L', '2960-X'),
  
  // Layer 3 Switches
  '3650-24PS-L': createL3SwitchCapabilities('3650-24PS-L', '3650'),
  '3650-48PS-L': createL3SwitchCapabilities('3650-48PS-L', '3650'),
  '3650-48TS-L': createL3SwitchCapabilities('3650-48TS-L', '3650'),
  '3850-48P-L': createL3SwitchCapabilities('3850-48P-L', '3850'),
  
  // Servers
  'Server-PT': createServerCapabilities(),
  
  // PCs
  'PC-PT': createPCCapabilities(),
  
  // Cloud
  'Cloud-PT': createCloudCapabilities(),
  
  // Wireless
  'WirelessRouter-PT': createWirelessRouterCapabilities(),
  'AccessPoint-PT': createAccessPointCapabilities(),
};

/**
 * Model info lookup
 */
export const MODEL_INFO: Record<string, ModelInfo> = {
  '2911': { model: '2911', type: 'router', vendor: 'Cisco', series: 'ISR G2' },
  '2921': { model: '2921', type: 'router', vendor: 'Cisco', series: 'ISR G2' },
  '2901': { model: '2901', type: 'router', vendor: 'Cisco', series: 'ISR G2' },
  '1941': { model: '1941', type: 'router', vendor: 'Cisco', series: 'ISR G2' },
  '2960-24TC-L': { model: '2960-24TC-L', type: 'switch', vendor: 'Cisco', series: '2960' },
  '2960-48TC-L': { model: '2960-48TC-L', type: 'switch', vendor: 'Cisco', series: '2960' },
  '3650-24PS-L': { model: '3650-24PS-L', type: 'switch-layer3', vendor: 'Cisco', series: '3650' },
  '3650-48PS-L': { model: '3650-48PS-L', type: 'switch-layer3', vendor: 'Cisco', series: '3650' },
  'Server-PT': { model: 'Server-PT', type: 'server', vendor: 'Cisco' },
  'PC-PT': { model: 'PC-PT', type: 'pc', vendor: 'Cisco' },
  'Cloud-PT': { model: 'Cloud-PT', type: 'cloud', vendor: 'Cisco' },
  'WirelessRouter-PT': { model: 'WirelessRouter-PT', type: 'wireless', vendor: 'Cisco' },
  'AccessPoint-PT': { model: 'AccessPoint-PT', type: 'wireless', vendor: 'Cisco' },
};

// ==================== Factory Functions ====================

function createRouterCapabilities(model: string, series: string): DeviceCapabilities {
  return {
    model,
    surfaces: {
      ios: { supported: true },
      hostport: { supported: true, interfaces: ['FastEthernet', 'GigabitEthernet', 'Serial'] },
      'dhcp-appliance': { supported: false },
      'wireless-ap': { supported: false },
    },
    operations: {
      'vlan': { supported: false, notes: 'Router no tiene capacidad Layer 2' },
      'trunk': { supported: false, notes: 'Router no soporta trunking' },
      'access-port': { supported: false, notes: 'Router no tiene puertos switch' },
      'svi': { supported: false, notes: 'Router no tiene SVIs' },
      'subinterface': { supported: true, maxInstances: 10 },
      'dhcp-pool': { supported: true },
      'dhcp-relay': { supported: true },
      'static-route': { supported: true },
      'ospf': { supported: true, maxInstances: 1 },
      'eigrp': { supported: true },
      'bgp': { supported: true },
      'acl-standard': { supported: true },
      'acl-extended': { supported: true },
      'nat': { supported: true },
      'ssh': { supported: true },
      'tunnel': { supported: true },
      'backup': { supported: true },
    },
    interfaceNaming: {
      pattern: /^GigabitEthernet(\d)\/(\d+)$/,
      validRanges: { '0': [0, 4], '1': [0, 1] },
    },
    parserSupport: [
      'show-ip-interface-brief', 'show-running-config', 'show-ip-route',
      'show-ip-protocols', 'show-access-lists', 'show-version', 'show-interface',
    ],
  };
}

function createSwitchCapabilities(model: string, series: string): DeviceCapabilities {
  return {
    model,
    surfaces: {
      ios: { supported: true },
      hostport: { supported: true, interfaces: ['FastEthernet', 'GigabitEthernet'] },
      'dhcp-appliance': { supported: false },
      'wireless-ap': { supported: false },
    },
    operations: {
      'vlan': { supported: true, maxInstances: 100 },
      'trunk': { supported: true },
      'access-port': { supported: true },
      'svi': { supported: false, notes: 'Switch Layer 2 no tiene SVIs' },
      'subinterface': { supported: false, notes: 'No hay subinterfaces en Layer 2' },
      'dhcp-pool': { supported: false, notes: 'Solo routers pueden hacer DHCP pool' },
      'dhcp-relay': { supported: false },
      'static-route': { supported: false, notes: 'Switch Layer 2 no tiene routing' },
      'ospf': { supported: false, notes: 'Switch Layer 2 no corre OSPF' },
      'eigrp': { supported: false, notes: 'Switch Layer 2 no corre EIGRP' },
      'bgp': { supported: false },
      'acl-standard': { supported: true },
      'acl-extended': { supported: true },
      'nat': { supported: false },
      'ssh': { supported: true },
      'tunnel': { supported: false },
      'backup': { supported: true },
    },
    interfaceNaming: {
      pattern: /^FastEthernet(\d+)\/(\d+)$/,
      validRanges: { '0': [0, 24], '1': [0, 1] },
    },
    parserSupport: [
      'show-vlan-brief', 'show-running-config', 'show-interface',
      'show-cdp-neighbors', 'show-version',
    ],
  };
}

function createL3SwitchCapabilities(model: string, series: string): DeviceCapabilities {
  return {
    model,
    surfaces: {
      ios: { supported: true },
      hostport: { supported: true, interfaces: ['FastEthernet', 'GigabitEthernet', 'TenGigabitEthernet'] },
      'dhcp-appliance': { supported: false },
      'wireless-ap': { supported: false },
    },
    operations: {
      'vlan': { supported: true, maxInstances: 255 },
      'trunk': { supported: true },
      'access-port': { supported: true },
      'svi': { supported: true, maxInstances: 255 },
      'subinterface': { supported: false, notes: 'L3 switch no usa subinterfaces' },
      'dhcp-pool': { supported: false, notes: 'Usar DHCP relay a router' },
      'dhcp-relay': { supported: true },
      'static-route': { supported: true },
      'ospf': { supported: true },
      'eigrp': { supported: true },
      'bgp': { supported: true },
      'acl-standard': { supported: true },
      'acl-extended': { supported: true },
      'nat': { supported: true },
      'ssh': { supported: true },
      'tunnel': { supported: true },
      'backup': { supported: true },
    },
    interfaceNaming: {
      pattern: /^GigabitEthernet(\d)\/(\d+)\/(\d+)$/,
      validRanges: { '0': [0, 1], '1': [0, 47], '2': [0, 3] },
    },
    parserSupport: [
      'show-vlan-brief', 'show-ip-interface-brief', 'show-running-config',
      'show-ip-route', 'show-ip-protocols', 'show-access-lists',
      'show-cdp-neighbors', 'show-version', 'show-interface',
      'show-ip-ospf-neighbor', 'show-ip-eigrp-neighbor',
    ],
  };
}

function createServerCapabilities(): DeviceCapabilities {
  return {
    model: 'Server-PT',
    surfaces: {
      ios: { supported: false },
      hostport: { supported: true, interfaces: ['Ethernet'] },
      'dhcp-appliance': { supported: true, maxInstances: 10 },
      'wireless-ap': { supported: false },
    },
    operations: {
      'vlan': { supported: false },
      'trunk': { supported: false },
      'access-port': { supported: false },
      'svi': { supported: false },
      'subinterface': { supported: false },
      'dhcp-pool': { supported: true, maxInstances: 10 },
      'dhcp-relay': { supported: false },
      'static-route': { supported: false },
      'ospf': { supported: false },
      'eigrp': { supported: false },
      'bgp': { supported: false },
      'acl-standard': { supported: false },
      'acl-extended': { supported: false },
      'nat': { supported: false },
      'ssh': { supported: false },
      'tunnel': { supported: false },
      'backup': { supported: false },
    },
    interfaceNaming: {
      pattern: /^Ethernet(\d+)$/,
      validRanges: { '0': [0, 4] },
    },
    parserSupport: [],
  };
}

function createPCCapabilities(): DeviceCapabilities {
  return {
    model: 'PC-PT',
    surfaces: {
      ios: { supported: false },
      hostport: { supported: true, interfaces: ['Ethernet'] },
      'dhcp-appliance': { supported: false },
      'wireless-ap': { supported: true },
    },
    operations: {
      'vlan': { supported: false },
      'trunk': { supported: false },
      'access-port': { supported: false },
      'svi': { supported: false },
      'subinterface': { supported: false },
      'dhcp-pool': { supported: false },
      'dhcp-relay': { supported: false },
      'static-route': { supported: false },
      'ospf': { supported: false },
      'eigrp': { supported: false },
      'bgp': { supported: false },
      'acl-standard': { supported: false },
      'acl-extended': { supported: false },
      'nat': { supported: false },
      'ssh': { supported: false },
      'tunnel': { supported: false },
      'backup': { supported: false },
    },
    interfaceNaming: {
      pattern: /^Ethernet(\d+)$/,
      validRanges: { '0': [0] },
    },
    parserSupport: [],
  };
}

function createCloudCapabilities(): DeviceCapabilities {
  return {
    model: 'Cloud-PT',
    surfaces: {
      ios: { supported: true },
      hostport: { supported: true, interfaces: ['Ethernet', 'Serial'] },
      'dhcp-appliance': { supported: false },
      'wireless-ap': { supported: false },
    },
    operations: {
      'vlan': { supported: false },
      'trunk': { supported: false },
      'access-port': { supported: false },
      'svi': { supported: false },
      'subinterface': { supported: false },
      'dhcp-pool': { supported: false },
      'dhcp-relay': { supported: false },
      'static-route': { supported: false },
      'ospf': { supported: false },
      'eigrp': { supported: false },
      'bgp': { supported: false },
      'acl-standard': { supported: false },
      'acl-extended': { supported: false },
      'nat': { supported: false },
      'ssh': { supported: false },
      'tunnel': { supported: false },
      'backup': { supported: false },
    },
    interfaceNaming: {
      pattern: /^Ethernet(\d+)$/,
      validRanges: { '0': [0, 7] },
    },
    parserSupport: ['show-cdp-neighbors'],
  };
}

function createWirelessRouterCapabilities(): DeviceCapabilities {
  return {
    model: 'WirelessRouter-PT',
    surfaces: {
      ios: { supported: false },
      hostport: { supported: true, interfaces: ['Ethernet', 'Wireless'] },
      'dhcp-appliance': { supported: true, maxInstances: 1 },
      'wireless-ap': { supported: true, maxInstances: 1 },
    },
    operations: {
      'vlan': { supported: false },
      'trunk': { supported: false },
      'access-port': { supported: false },
      'svi': { supported: false },
      'subinterface': { supported: false },
      'dhcp-pool': { supported: true, maxInstances: 1 },
      'dhcp-relay': { supported: false },
      'static-route': { supported: false },
      'ospf': { supported: false },
      'eigrp': { supported: false },
      'bgp': { supported: false },
      'acl-standard': { supported: false },
      'acl-extended': { supported: false },
      'nat': { supported: true },
      'ssh': { supported: false },
      'tunnel': { supported: false },
      'backup': { supported: false },
    },
    interfaceNaming: {
      pattern: /^Ethernet(\d+)$/,
      validRanges: { '0': [0, 4] },
    },
    parserSupport: [],
  };
}

function createAccessPointCapabilities(): DeviceCapabilities {
  return {
    model: 'AccessPoint-PT',
    surfaces: {
      ios: { supported: false },
      hostport: { supported: true, interfaces: ['Ethernet', 'Wireless'] },
      'dhcp-appliance': { supported: false },
      'wireless-ap': { supported: true },
    },
    operations: {
      'vlan': { supported: false },
      'trunk': { supported: false },
      'access-port': { supported: false },
      'svi': { supported: false },
      'subinterface': { supported: false },
      'dhcp-pool': { supported: false },
      'dhcp-relay': { supported: false },
      'static-route': { supported: false },
      'ospf': { supported: false },
      'eigrp': { supported: false },
      'bgp': { supported: false },
      'acl-standard': { supported: false },
      'acl-extended': { supported: false },
      'nat': { supported: false },
      'ssh': { supported: false },
      'tunnel': { supported: false },
      'backup': { supported: false },
    },
    interfaceNaming: {
      pattern: /^Ethernet(\d+)$/,
      validRanges: { '0': [0] },
    },
    parserSupport: [],
  };
}

/**
 * Get capabilities for a model
 */
export function getCapabilitiesForModel(model: string): DeviceCapabilities | null {
  return MODEL_CAPABILITIES[model] || null;
}

/**
 * Get model info
 */
export function getModelInfo(model: string): ModelInfo | null {
  return MODEL_INFO[model] || null;
}

/**
 * Get all known models
 */
export function getAllModels(): string[] {
  return Object.keys(MODEL_CAPABILITIES);
}