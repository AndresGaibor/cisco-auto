/**
 * Packet Tracer IPC Constants
 */

// Cable/Connection Types (CONNECT_TYPES enum)
export const CONNECT_TYPES = {
  ETHERNET_STRAIGHT: 8100,
  ETHERNET_CROSS: 8101,
  ROLL: 8102,
  FIBER: 8103,
  PHONE: 8104,
  CABLE: 8105,
  SERIAL: 8106,
  AUTO: 8107,
  CONSOLE: 8108,
  WIRELESS: 8109,
  COAXIAL: 8110,
  OCTAL: 8111,
  CELLULAR: 8112,
  USB: 8113,
  CUSTOM_IO: 8114,
} as const;

export type ConnectType = (typeof CONNECT_TYPES)[keyof typeof CONNECT_TYPES];

// Mapeo de nombres legibles a tipos de cable
export const CABLE_TYPE_NAMES: Record<string, ConnectType> = {
  straight: CONNECT_TYPES.ETHERNET_STRAIGHT,
  cross: CONNECT_TYPES.ETHERNET_CROSS,
  roll: CONNECT_TYPES.ROLL,
  fiber: CONNECT_TYPES.FIBER,
  phone: CONNECT_TYPES.PHONE,
  cable: CONNECT_TYPES.CABLE,
  serial: CONNECT_TYPES.SERIAL,
  auto: CONNECT_TYPES.AUTO,
  console: CONNECT_TYPES.CONSOLE,
  wireless: CONNECT_TYPES.WIRELESS,
  coaxial: CONNECT_TYPES.COAXIAL,
  octal: CONNECT_TYPES.OCTAL,
  cellular: CONNECT_TYPES.CELLULAR,
  usb: CONNECT_TYPES.USB,
  custom_io: CONNECT_TYPES.CUSTOM_IO,
} as const;

// Command Status (TerminalLine.commandEnded status)
export const COMMAND_STATUS = {
  OK: 0,
  AMBIGUOUS: 1,
  INVALID: 2,
  INCOMPLETE: 3,
  NOT_IMPLEMENTED: 4,
} as const;

export type CommandStatus = (typeof COMMAND_STATUS)[keyof typeof COMMAND_STATUS];

// Message Box Icons
export const MESSAGE_BOX_ICON = {
  NO_ICON: 0,
  INFORMATION: 1,
  WARNING: 2,
  CRITICAL: 3,
  QUESTION: 4,
} as const;

// Device Types (números internos de PT - estos son aproximados, se deben verificar)
export const DEVICE_TYPE = {
  ROUTER: 0,
  SWITCH: 1,
  HUB: 2,
  PC: 3,
  SERVER: 4,
  PRINTER: 5,
  WIRELESS_DEVICE: 6,
  CLOUD: 7,
  END_DEVICE: 8,
} as const;

export type DeviceType = (typeof DEVICE_TYPE)[keyof typeof DEVICE_TYPE];

// Nombres de dispositivos más comunes
export const DEVICE_MODELS = {
  // Routers
  ROUTER_2911: "2911",
  ROUTER_2901: "2901",
  ROUTER_1941: "1941",
  ROUTER_819HGW: "819HGW",
  
  // Switches
  SWITCH_2960_24TT: "2960-24TT",
  SWITCH_2960: "2960",
  SWITCH_3560_24PS: "3560-24PS",
  
  // PCs and End Devices
  PC: "PC",
  LAPTOP: "Laptop",
  SERVER: "Server-PT",
  PRINTER: "Printer-PT",
  
  // Wireless
  AP: "AccessPoint-PT",
  
  // Cloud
  CLOUD: "Cloud-PT",
} as const;
