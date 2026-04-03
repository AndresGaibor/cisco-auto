/**
 * POC: Runtime Constants Module (TypeScript → ES5 Compilation)
 * 
 * BEFORE (String Template):
 * ```typescript
 * export function generateConstantsTemplate(): string {
 *   return `var CABLE_TYPES = ${JSON.stringify(CABLE_TYPES)};`;
 * }
 * ```
 * 
 * AFTER (TypeScript Source):
 * This file is compiled to ES5 JavaScript
 */

// ============================================================================
// Cable Types (Packet Tracer IPC Constants)
// ============================================================================

export const CABLE_TYPES = {
  "ethernet-straight": 8100,
  "ethernet-cross": 8101,
  "straight": 8100,
  "cross": 8101,
  "roll": 8102,
  "fiber": 8103,
  "phone": 8104,
  "cable": 8105,
  "serial": 8106,
  "auto": 8107,
  "console": 8108,
  "wireless": 8109,
  "coaxial": 8110,
  "octal": 8111,
  "cellular": 8112,
  "usb": 8113,
  "custom_io": 8114,
} as const;

export type CableType = keyof typeof CABLE_TYPES;
export type CableTypeCode = (typeof CABLE_TYPES)[CableType];

// ============================================================================
// Device Types (Packet Tracer IPC Constants)
// ============================================================================

export const DEVICE_TYPES = {
  "router": 0,
  "switch": 1,
  "cloud": 2,
  "bridge": 3,
  "hub": 4,
  "repeater": 5,
  "coaxialSplitter": 6,
  "wireless": 7,
  "pc": 8,
  "server": 9,
  "printer": 10,
  "wirelessRouter": 11,
  "ipPhone": 12,
  "dslModem": 13,
  "cableModem": 14,
  "multilayerSwitch": 16,
  "laptop": 18,
  "tablet": 19,
  "smartphone": 20,
  "wirelessEndDevice": 21,
  "wiredEndDevice": 22,
  "tv": 23,
  "homeVoip": 24,
  "analogPhone": 25,
  "firewall": 27,
  "dlc": 29,
  "homeRouter": 30,
  "cellTower": 31,
  "centralOfficeServer": 32,
  "iot": 34,
  "sniffer": 35,
  "mcu": 36,
  "sbc": 37,
  "embeddedServer": 40,
  "wlc": 41,
  "aironet": 44,
  "powerDistribution": 45,
  "patchPanel": 46,
  "wallMount": 47,
  "meraki": 48,
  "merakiServer": 49,
  "networkController": 50,
} as const;

export type DeviceType = keyof typeof DEVICE_TYPES;
export type DeviceTypeCode = (typeof DEVICE_TYPES)[DeviceType];

// ============================================================================
// Device Type Names (Reverse Mapping)
// ============================================================================

export const DEVICE_TYPE_NAMES = {
  "0": "router",
  "1": "switch",
  "2": "cloud",
  "3": "bridge",
  "4": "hub",
  "5": "repeater",
  "7": "wireless",
  "8": "pc",
  "9": "server",
  "10": "printer",
  "11": "wireless-router",
  "16": "multilayer-switch",
  "18": "laptop",
  "19": "tablet",
  "20": "smartphone",
  "21": "wireless-end-device",
  "22": "wired-end-device",
  "27": "firewall",
  "30": "home-router",
  "34": "iot",
  "41": "wlc",
  "44": "aironet",
} as const;

// ============================================================================
// Model Aliases
// ============================================================================

export const MODEL_ALIASES = {
  "pc": "PC-PT",
  "laptop": "Laptop-PT",
  "server": "Server-PT",
  "cloud": "Cloud-PT",
  "printer": "Printer-PT",
  "ap": "AccessPoint-PT",
  "accesspoint": "AccessPoint-PT",
  "wrt300n": "Linksys-WRT300N",
} as const;

export type ModelAlias = keyof typeof MODEL_ALIASES;

// ============================================================================
// Cable Type Names (Reverse Mapping)
// ============================================================================

export const CABLE_TYPE_NAMES = {
  "8100": "straight",
  "8101": "cross",
  "8102": "roll",
  "8103": "fiber",
  "8104": "phone",
  "8105": "cable",
  "8106": "serial",
  "8107": "auto",
  "8108": "console",
  "8109": "wireless",
  "8110": "coaxial",
  "8111": "octal",
  "8112": "cellular",
  "8113": "usb",
  "8114": "custom_io",
} as const;

// ============================================================================
// Validation Functions (BONUS: Not in original template)
// ============================================================================

/**
 * Validate if a cable type is valid
 * @param cable - Cable type to validate
 * @returns true if valid, false otherwise
 */
export function isValidCableType(cable: string): cable is CableType {
  return cable in CABLE_TYPES;
}

/**
 * Validate if a device type is valid
 * @param device - Device type to validate
 * @returns true if valid, false otherwise
 */
export function isValidDeviceType(device: string): device is DeviceType {
  return device in DEVICE_TYPES;
}

/**
 * Get cable type code
 * @param cable - Cable type name
 * @returns Cable type code or null
 */
export function getCableTypeCode(cable: string): number | null {
  if (isValidCableType(cable)) {
    return CABLE_TYPES[cable];
  }
  return null;
}

/**
 * Get device type code
 * @param device - Device type name
 * @returns Device type code or null
 */
export function getDeviceTypeCode(device: string): number | null {
  if (isValidDeviceType(device)) {
    return DEVICE_TYPES[device];
  }
  return null;
}
