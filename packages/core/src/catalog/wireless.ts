import type { DeviceCatalogEntry } from './schema';
import {
  apCapabilities,
  giPort,
  giPorts4,
  faPorts5,
  wirelessPort,
  wirelessRouterCapabilities,
} from './device-capabilities';

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
    model: '3702i',
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
    id: 'home-router-pt-ac',
    model: 'HomeRouter-PT-AC',
    series: 'Home Router',
    family: 'Router',
    vendor: 'generic',
    type: 'wireless-router',
    deviceFamily: 'wireless',
    fixedPorts: [faPorts5, wirelessPort],
    moduleSlots: [],
    capabilities: {
      ...wirelessRouterCapabilities,
      wirelessStandards: ['802.11a', '802.11n', '802.11ac']
    },
    displayName: 'Home Router PT-AC',
    description: 'Home WiFi Router with 802.11ac',
    ptCategory: 'Wireless Devices',
    tags: ['router', 'wireless', 'home', 'soho', 'ac'],
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
