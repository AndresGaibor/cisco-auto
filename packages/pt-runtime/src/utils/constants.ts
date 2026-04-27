// ============================================================================
// Runtime Constants - Shared between handlers and tests
// ============================================================================

/** Cable type IDs used by Packet Tracer */
export const CABLE_TYPES = {
  "ethernet-straight": 8100,
  "ethernet-cross": 8101,
  straight: 8100,
  cross: 8101,
  roll: 8102,
  fiber: 8103,
  phone: 8104,
  cable: 8105,
  serial: 8106,
  auto: 8107,
  console: 8108,
  wireless: 8109,
  coaxial: 8110,
  octal: 8111,
  cellular: 8112,
  usb: 8113,
  custom_io: 8114,
} as const;

export type CableType = keyof typeof CABLE_TYPES;

/** Device type IDs used by Packet Tracer (mapa oficial PTBuilder) */
export const DEVICE_TYPES = {
  router: 0,
  switch: 1,
  cloud: 2,
  bridge: 3,
  hub: 4,
  repeater: 5,
  coaxialSplitter: 6,
  wireless: 7,
  pc: 8,
  server: 9,
  printer: 10,
  wirelessRouter: 11,
  ipPhone: 12,
  dslModem: 13,
  cableModem: 14,
  multilayerSwitch: 16,
  laptop: 18,
  tablet: 19,
  smartphone: 20,
  wirelessEndDevice: 21,
  wiredEndDevice: 22,
  tv: 23,
  homeVoip: 24,
  analogPhone: 25,
  firewall: 27,
  dlc: 29,
  homeRouter: 30,
  cellTower: 31,
  centralOfficeServer: 32,
  iot: 34,
  sniffer: 35,
  mcu: 36,
  sbc: 37,
  embeddedServer: 40,
  wlc: 41,
  aironet: 44,
  powerDistribution: 45,
  patchPanel: 46,
  wallMount: 47,
  meraki: 48,
  merakiServer: 49,
  networkController: 50,
} as const;

export type DeviceType = keyof typeof DEVICE_TYPES;

/** Model name aliases for common devices */
export const MODEL_ALIASES: Record<string, string> = {
  pc: "PC-PT",
  laptop: "Laptop-PT",
  server: "Server-PT",
  cloud: "Cloud-PT",
  printer: "Printer-PT",
  ap: "AccessPoint-PT",
  accesspoint: "AccessPoint-PT",
  wrt300n: "Linksys-WRT300N",
};

/** Reverse map: cable type ID to name */
export const CABLE_TYPE_NAMES: Record<number, string> = Object.fromEntries(
  Object.entries(CABLE_TYPES).map(([name, id]) => [id, name])
);

const LEGACY_CABLE_TYPE_NAMES: Record<number, string> = {
  0: "straight",
  1: "cross",
  2: "fiber",
  3: "serial",
  4: "console",
  5: "phone",
  6: "cable",
  7: "roll",
  8: "wireless",
  9: "coaxial",
  10: "custom_io",
  11: "octal",
  12: "cellular",
  13: "usb",
};

/** Reverse map: device type ID to canonical name */
export const DEVICE_TYPE_NAMES: Record<number, string> = {
  [DEVICE_TYPES.router]: 'router',
  [DEVICE_TYPES.switch]: 'switch',
  [DEVICE_TYPES.cloud]: 'cloud',
  [DEVICE_TYPES.bridge]: 'bridge',
  [DEVICE_TYPES.hub]: 'hub',
  [DEVICE_TYPES.repeater]: 'repeater',
  [DEVICE_TYPES.pc]: 'pc',
  [DEVICE_TYPES.server]: 'server',
  [DEVICE_TYPES.printer]: 'printer',
  [DEVICE_TYPES.wireless]: 'wireless',
  [DEVICE_TYPES.wirelessRouter]: 'wireless-router',
  [DEVICE_TYPES.multilayerSwitch]: 'multilayer-switch',
  [DEVICE_TYPES.laptop]: 'laptop',
  [DEVICE_TYPES.tablet]: 'tablet',
  [DEVICE_TYPES.smartphone]: 'smartphone',
  [DEVICE_TYPES.wiredEndDevice]: 'wired-end-device',
  [DEVICE_TYPES.wirelessEndDevice]: 'wireless-end-device',
  [DEVICE_TYPES.firewall]: 'firewall',
  [DEVICE_TYPES.homeRouter]: 'home-router',
  [DEVICE_TYPES.iot]: 'iot',
  [DEVICE_TYPES.wlc]: 'wlc',
  [DEVICE_TYPES.aironet]: 'aironet',
};

/** Get cable name from ID */
export function getCableTypeName(id: number): string {
  return CABLE_TYPE_NAMES[id] || LEGACY_CABLE_TYPE_NAMES[id] || "auto";
}

/** Get cable ID from name */
export function getCableTypeId(name: string): number {
  return CABLE_TYPES[name as CableType] ?? CABLE_TYPES.auto;
}
