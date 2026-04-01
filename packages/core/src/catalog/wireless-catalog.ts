/**
 * WIRELESS CATALOG
 * 
 * Catálogo de dispositivos inalámbricos (Access Points, etc)
 */

import type { DeviceCatalogEntry } from './schema';
import {
  apCapabilities,
  giPort,
  wirelessPort,
} from './device-capabilities';

export const wirelessCatalog: DeviceCatalogEntry[] = [
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
];
