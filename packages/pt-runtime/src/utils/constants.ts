// ============================================================================
// Runtime Constants - Shared between handlers and tests
// ============================================================================

/** Cable type IDs used by Packet Tracer */
export const CABLE_TYPES = {
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

/** Device type IDs used by Packet Tracer */
export const DEVICE_TYPES = {
  router: 0,
  switch: 1,
  hub: 2,
  pc: 3,
  server: 4,
  printer: 5,
  wireless: 6,
  cloud: 7,
  end: 8,
} as const;

export type DeviceType = keyof typeof DEVICE_TYPES;

/** Model name aliases for common devices */
export const MODEL_ALIASES: Record<string, string> = {
  pc: "PC-PT",
  laptop: "Laptop-PT",
  server: "Server-PT",
  cloud: "Cloud-PT",
  ap: "AccessPoint-PT",
  accesspoint: "AccessPoint-PT",
};

/** Reverse map: cable type ID to name */
export const CABLE_TYPE_NAMES: Record<number, string> = Object.fromEntries(
  Object.entries(CABLE_TYPES).map(([name, id]) => [id, name])
);

/** Reverse map: device type ID to canonical name */
export const DEVICE_TYPE_NAMES: Record<number, string> = {
  [DEVICE_TYPES.router]: 'router',
  [DEVICE_TYPES.switch]: 'switch',
  [DEVICE_TYPES.hub]: 'generic',
  [DEVICE_TYPES.pc]: 'pc',
  [DEVICE_TYPES.server]: 'server',
  [DEVICE_TYPES.printer]: 'generic',
  [DEVICE_TYPES.wireless]: 'access_point',
  [DEVICE_TYPES.cloud]: 'cloud',
  [DEVICE_TYPES.end]: 'generic',
};

/** Get cable name from ID */
export function getCableTypeName(id: number): string {
  return CABLE_TYPE_NAMES[id] || "auto";
}

/** Get cable ID from name */
export function getCableTypeId(name: string): number {
  return CABLE_TYPES[name as CableType] ?? CABLE_TYPES.auto;
}
