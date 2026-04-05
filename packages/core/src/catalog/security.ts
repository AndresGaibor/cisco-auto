import type { DeviceCatalogEntry } from './schema';
import { firewallCapabilities, giPorts4 } from './device-capabilities';

export const securityCatalog: DeviceCatalogEntry[] = [
  // === ASA Firewalls ===
  {
    id: 'asa-5505',
    model: '5505',
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
    model: '5506-X',
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
