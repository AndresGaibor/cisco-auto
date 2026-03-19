/**
 * Event Types - Normalized Taxonomy
 * 
 * Centralized event type definitions used across:
 * - sim-engine: event scheduling
 * - sim-runtime: trace generation
 * - TUI: event visualization
 * 
 * This file provides a single source of truth for event naming,
 * colors, icons, and categorization.
 */

// Re-export NetworkEventType from sim-engine for convenience
export { NetworkEventType } from '@cisco-auto/sim-engine';

// =============================================================================
// NORMALIZED EVENT TYPE CONSTANTS
// =============================================================================

/**
 * Normalized event type strings
 * Use these constants instead of raw strings throughout the codebase
 */
export const EVENT_TYPES = {
  // === Layer 2 Events ===
  FRAME_TRANSMIT: 'frame_tx',
  FRAME_RECEIVE: 'frame_rx',
  FRAME_FORWARD: 'frame_forward',
  FRAME_DROP: 'frame_drop',
  MAC_LEARNED: 'mac_learned',
  MAC_EXPIRED: 'mac_expired',
  
  // === Layer 3 Events ===
  PACKET_SEND: 'packet_send',
  PACKET_RECEIVE: 'packet_receive',
  PACKET_FORWARD: 'packet_forward',
  PACKET_DROP: 'packet_drop',
  
  // === ARP Events ===
  ARP_REQUEST: 'arp_request',
  ARP_REPLY: 'arp_reply',
  ARP_REQUEST_SENT: 'arp_request_sent',
  ARP_CACHE_HIT: 'arp_cache_hit',
  ARP_CACHE_MISS: 'arp_cache_miss',
  
  // === ICMP Events ===
  ICMP_ECHO_REQUEST: 'icmp_echo_request',
  ICMP_ECHO_REPLY: 'icmp_echo_reply',
  ICMP_TIME_EXCEEDED: 'icmp_time_exceeded',
  ICMP_DEST_UNREACHABLE: 'icmp_dest_unreachable',
  
  // === Device Events ===
  DEVICE_ADD: 'device_add',
  DEVICE_REMOVE: 'device_remove',
  DEVICE_POWER_ON: 'device_power_on',
  DEVICE_POWER_OFF: 'device_power_off',
  DEVICE_START: 'device_start',
  DEVICE_STOP: 'device_stop',
  
  // === Interface Events ===
  INTERFACE_UP: 'interface_up',
  INTERFACE_DOWN: 'interface_down',
  LINK_UP: 'link_up',
  LINK_DOWN: 'link_down',
  
  // === Error Events ===
  ERROR: 'error',
  COLLISION: 'collision',
  TIMEOUT: 'timeout',
  
  // === Control Events ===
  SIMULATION_START: 'simulation_start',
  SIMULATION_STEP: 'simulation_step',
  SIMULATION_END: 'simulation_end',
  CONFIG_CHANGE: 'config_change',
} as const;

export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];

// =============================================================================
// EVENT CATEGORIES
// =============================================================================

export enum EventCategory {
  L2 = 'L2',
  L3 = 'L3',
  ARP = 'ARP',
  ICMP = 'ICMP',
  DEVICE = 'DEVICE',
  INTERFACE = 'INTERFACE',
  ERROR = 'ERROR',
  CONTROL = 'CONTROL',
}

/**
 * Maps event types to their category
 */
export const EVENT_CATEGORIES: Record<EventType, EventCategory> = {
  // L2
  [EVENT_TYPES.FRAME_TRANSMIT]: EventCategory.L2,
  [EVENT_TYPES.FRAME_RECEIVE]: EventCategory.L2,
  [EVENT_TYPES.FRAME_FORWARD]: EventCategory.L2,
  [EVENT_TYPES.FRAME_DROP]: EventCategory.L2,
  [EVENT_TYPES.MAC_LEARNED]: EventCategory.L2,
  [EVENT_TYPES.MAC_EXPIRED]: EventCategory.L2,
  
  // L3
  [EVENT_TYPES.PACKET_SEND]: EventCategory.L3,
  [EVENT_TYPES.PACKET_RECEIVE]: EventCategory.L3,
  [EVENT_TYPES.PACKET_FORWARD]: EventCategory.L3,
  [EVENT_TYPES.PACKET_DROP]: EventCategory.L3,
  
  // ARP
  [EVENT_TYPES.ARP_REQUEST]: EventCategory.ARP,
  [EVENT_TYPES.ARP_REPLY]: EventCategory.ARP,
  [EVENT_TYPES.ARP_REQUEST_SENT]: EventCategory.ARP,
  [EVENT_TYPES.ARP_CACHE_HIT]: EventCategory.ARP,
  [EVENT_TYPES.ARP_CACHE_MISS]: EventCategory.ARP,
  
  // ICMP
  [EVENT_TYPES.ICMP_ECHO_REQUEST]: EventCategory.ICMP,
  [EVENT_TYPES.ICMP_ECHO_REPLY]: EventCategory.ICMP,
  [EVENT_TYPES.ICMP_TIME_EXCEEDED]: EventCategory.ICMP,
  [EVENT_TYPES.ICMP_DEST_UNREACHABLE]: EventCategory.ICMP,
  
  // Device
  [EVENT_TYPES.DEVICE_ADD]: EventCategory.DEVICE,
  [EVENT_TYPES.DEVICE_REMOVE]: EventCategory.DEVICE,
  [EVENT_TYPES.DEVICE_POWER_ON]: EventCategory.DEVICE,
  [EVENT_TYPES.DEVICE_POWER_OFF]: EventCategory.DEVICE,
  [EVENT_TYPES.DEVICE_START]: EventCategory.DEVICE,
  [EVENT_TYPES.DEVICE_STOP]: EventCategory.DEVICE,
  
  // Interface
  [EVENT_TYPES.INTERFACE_UP]: EventCategory.INTERFACE,
  [EVENT_TYPES.INTERFACE_DOWN]: EventCategory.INTERFACE,
  [EVENT_TYPES.LINK_UP]: EventCategory.INTERFACE,
  [EVENT_TYPES.LINK_DOWN]: EventCategory.INTERFACE,
  
  // Error
  [EVENT_TYPES.ERROR]: EventCategory.ERROR,
  [EVENT_TYPES.COLLISION]: EventCategory.ERROR,
  [EVENT_TYPES.TIMEOUT]: EventCategory.ERROR,
  
  // Control
  [EVENT_TYPES.SIMULATION_START]: EventCategory.CONTROL,
  [EVENT_TYPES.SIMULATION_STEP]: EventCategory.CONTROL,
  [EVENT_TYPES.SIMULATION_END]: EventCategory.CONTROL,
  [EVENT_TYPES.CONFIG_CHANGE]: EventCategory.CONTROL,
};

// =============================================================================
// EVENT SEVERITY
// =============================================================================

export enum EventSeverity {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
}

/**
 * Maps event types to their severity
 */
export const EVENT_SEVERITIES: Record<EventType, EventSeverity> = {
  // L2 - mostly info
  [EVENT_TYPES.FRAME_TRANSMIT]: EventSeverity.INFO,
  [EVENT_TYPES.FRAME_RECEIVE]: EventSeverity.INFO,
  [EVENT_TYPES.FRAME_FORWARD]: EventSeverity.INFO,
  [EVENT_TYPES.FRAME_DROP]: EventSeverity.WARNING,
  [EVENT_TYPES.MAC_LEARNED]: EventSeverity.SUCCESS,
  [EVENT_TYPES.MAC_EXPIRED]: EventSeverity.INFO,
  
  // L3
  [EVENT_TYPES.PACKET_SEND]: EventSeverity.INFO,
  [EVENT_TYPES.PACKET_RECEIVE]: EventSeverity.INFO,
  [EVENT_TYPES.PACKET_FORWARD]: EventSeverity.INFO,
  [EVENT_TYPES.PACKET_DROP]: EventSeverity.WARNING,
  
  // ARP
  [EVENT_TYPES.ARP_REQUEST]: EventSeverity.INFO,
  [EVENT_TYPES.ARP_REPLY]: EventSeverity.SUCCESS,
  [EVENT_TYPES.ARP_REQUEST_SENT]: EventSeverity.INFO,
  [EVENT_TYPES.ARP_CACHE_HIT]: EventSeverity.SUCCESS,
  [EVENT_TYPES.ARP_CACHE_MISS]: EventSeverity.WARNING,
  
  // ICMP
  [EVENT_TYPES.ICMP_ECHO_REQUEST]: EventSeverity.INFO,
  [EVENT_TYPES.ICMP_ECHO_REPLY]: EventSeverity.SUCCESS,
  [EVENT_TYPES.ICMP_TIME_EXCEEDED]: EventSeverity.WARNING,
  [EVENT_TYPES.ICMP_DEST_UNREACHABLE]: EventSeverity.ERROR,
  
  // Device
  [EVENT_TYPES.DEVICE_ADD]: EventSeverity.SUCCESS,
  [EVENT_TYPES.DEVICE_REMOVE]: EventSeverity.WARNING,
  [EVENT_TYPES.DEVICE_POWER_ON]: EventSeverity.SUCCESS,
  [EVENT_TYPES.DEVICE_POWER_OFF]: EventSeverity.INFO,
  [EVENT_TYPES.DEVICE_START]: EventSeverity.SUCCESS,
  [EVENT_TYPES.DEVICE_STOP]: EventSeverity.INFO,
  
  // Interface
  [EVENT_TYPES.INTERFACE_UP]: EventSeverity.SUCCESS,
  [EVENT_TYPES.INTERFACE_DOWN]: EventSeverity.WARNING,
  [EVENT_TYPES.LINK_UP]: EventSeverity.SUCCESS,
  [EVENT_TYPES.LINK_DOWN]: EventSeverity.WARNING,
  
  // Error
  [EVENT_TYPES.ERROR]: EventSeverity.ERROR,
  [EVENT_TYPES.COLLISION]: EventSeverity.WARNING,
  [EVENT_TYPES.TIMEOUT]: EventSeverity.WARNING,
  
  // Control
  [EVENT_TYPES.SIMULATION_START]: EventSeverity.INFO,
  [EVENT_TYPES.SIMULATION_STEP]: EventSeverity.INFO,
  [EVENT_TYPES.SIMULATION_END]: EventSeverity.INFO,
  [EVENT_TYPES.CONFIG_CHANGE]: EventSeverity.INFO,
};

// =============================================================================
// EVENT VISUAL PROPERTIES
// =============================================================================

/**
 * Maps event types to display colors (for Ink/terminal)
 */
export const EVENT_COLORS: Record<EventType, string> = {
  // L2
  [EVENT_TYPES.FRAME_TRANSMIT]: 'green',
  [EVENT_TYPES.FRAME_RECEIVE]: 'blue',
  [EVENT_TYPES.FRAME_FORWARD]: 'cyan',
  [EVENT_TYPES.FRAME_DROP]: 'red',
  [EVENT_TYPES.MAC_LEARNED]: 'green',
  [EVENT_TYPES.MAC_EXPIRED]: 'gray',
  
  // L3
  [EVENT_TYPES.PACKET_SEND]: 'green',
  [EVENT_TYPES.PACKET_RECEIVE]: 'blue',
  [EVENT_TYPES.PACKET_FORWARD]: 'cyan',
  [EVENT_TYPES.PACKET_DROP]: 'red',
  
  // ARP
  [EVENT_TYPES.ARP_REQUEST]: 'yellow',
  [EVENT_TYPES.ARP_REPLY]: 'green',
  [EVENT_TYPES.ARP_REQUEST_SENT]: 'yellow',
  [EVENT_TYPES.ARP_CACHE_HIT]: 'green',
  [EVENT_TYPES.ARP_CACHE_MISS]: 'yellow',
  
  // ICMP
  [EVENT_TYPES.ICMP_ECHO_REQUEST]: 'magenta',
  [EVENT_TYPES.ICMP_ECHO_REPLY]: 'green',
  [EVENT_TYPES.ICMP_TIME_EXCEEDED]: 'red',
  [EVENT_TYPES.ICMP_DEST_UNREACHABLE]: 'red',
  
  // Device
  [EVENT_TYPES.DEVICE_ADD]: 'green',
  [EVENT_TYPES.DEVICE_REMOVE]: 'red',
  [EVENT_TYPES.DEVICE_POWER_ON]: 'green',
  [EVENT_TYPES.DEVICE_POWER_OFF]: 'gray',
  [EVENT_TYPES.DEVICE_START]: 'green',
  [EVENT_TYPES.DEVICE_STOP]: 'gray',
  
  // Interface
  [EVENT_TYPES.INTERFACE_UP]: 'green',
  [EVENT_TYPES.INTERFACE_DOWN]: 'red',
  [EVENT_TYPES.LINK_UP]: 'green',
  [EVENT_TYPES.LINK_DOWN]: 'red',
  
  // Error
  [EVENT_TYPES.ERROR]: 'red',
  [EVENT_TYPES.COLLISION]: 'yellow',
  [EVENT_TYPES.TIMEOUT]: 'yellow',
  
  // Control
  [EVENT_TYPES.SIMULATION_START]: 'cyan',
  [EVENT_TYPES.SIMULATION_STEP]: 'gray',
  [EVENT_TYPES.SIMULATION_END]: 'cyan',
  [EVENT_TYPES.CONFIG_CHANGE]: 'yellow',
};

/**
 * Maps event types to display icons
 */
export const EVENT_ICONS: Record<EventType, string> = {
  // L2
  [EVENT_TYPES.FRAME_TRANSMIT]: '→',
  [EVENT_TYPES.FRAME_RECEIVE]: '←',
  [EVENT_TYPES.FRAME_FORWARD]: '⤳',
  [EVENT_TYPES.FRAME_DROP]: '↓',
  [EVENT_TYPES.MAC_LEARNED]: '✓',
  [EVENT_TYPES.MAC_EXPIRED]: '⏰',
  
  // L3
  [EVENT_TYPES.PACKET_SEND]: '→',
  [EVENT_TYPES.PACKET_RECEIVE]: '←',
  [EVENT_TYPES.PACKET_FORWARD]: '⤳',
  [EVENT_TYPES.PACKET_DROP]: '✕',
  
  // ARP
  [EVENT_TYPES.ARP_REQUEST]: '?',
  [EVENT_TYPES.ARP_REPLY]: '!',
  [EVENT_TYPES.ARP_REQUEST_SENT]: '↗',
  [EVENT_TYPES.ARP_CACHE_HIT]: '✓',
  [EVENT_TYPES.ARP_CACHE_MISS]: '?',
  
  // ICMP
  [EVENT_TYPES.ICMP_ECHO_REQUEST]: '◉',
  [EVENT_TYPES.ICMP_ECHO_REPLY]: '○',
  [EVENT_TYPES.ICMP_TIME_EXCEEDED]: '⚠',
  [EVENT_TYPES.ICMP_DEST_UNREACHABLE]: '✕',
  
  // Device
  [EVENT_TYPES.DEVICE_ADD]: '+',
  [EVENT_TYPES.DEVICE_REMOVE]: '-',
  [EVENT_TYPES.DEVICE_POWER_ON]: '▶',
  [EVENT_TYPES.DEVICE_POWER_OFF]: '⏸',
  [EVENT_TYPES.DEVICE_START]: '▶',
  [EVENT_TYPES.DEVICE_STOP]: '■',
  
  // Interface
  [EVENT_TYPES.INTERFACE_UP]: '▲',
  [EVENT_TYPES.INTERFACE_DOWN]: '▼',
  [EVENT_TYPES.LINK_UP]: '▲',
  [EVENT_TYPES.LINK_DOWN]: '▼',
  
  // Error
  [EVENT_TYPES.ERROR]: '✗',
  [EVENT_TYPES.COLLISION]: '⚡',
  [EVENT_TYPES.TIMEOUT]: '⏰',
  
  // Control
  [EVENT_TYPES.SIMULATION_START]: '▶',
  [EVENT_TYPES.SIMULATION_STEP]: '▸',
  [EVENT_TYPES.SIMULATION_END]: '■',
  [EVENT_TYPES.CONFIG_CHANGE]: '⚙',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Gets the color for an event type
 * Falls back to 'white' for unknown types
 */
export function getEventColor(type: string): string {
  return EVENT_COLORS[type as EventType] ?? 'white';
}

/**
 * Gets the icon for an event type
 * Falls back to '•' for unknown types
 */
export function getEventIcon(type: string): string {
  return EVENT_ICONS[type as EventType] ?? '•';
}

/**
 * Gets the category for an event type
 * Falls back to CONTROL for unknown types
 */
export function getEventCategory(type: string): EventCategory {
  return EVENT_CATEGORIES[type as EventType] ?? EventCategory.CONTROL;
}

/**
 * Gets the severity for an event type
 * Falls back to INFO for unknown types
 */
export function getEventSeverity(type: string): EventSeverity {
  return EVENT_SEVERITIES[type as EventType] ?? EventSeverity.INFO;
}

/**
 * Checks if an event type is known
 */
export function isKnownEventType(type: string): type is EventType {
  return type in EVENT_TYPES;
}

// =============================================================================
// LEGACY ALIASES (for backwards compatibility)
// =============================================================================

/**
 * Aliases for legacy event type names
 * Maps old names to normalized names
 */
export const LEGACY_EVENT_ALIASES: Record<string, EventType> = {
  // Old ICMP names
  'icmp_echo_req': EVENT_TYPES.ICMP_ECHO_REQUEST,
  'icmp_reply': EVENT_TYPES.ICMP_ECHO_REPLY,
  
  // Old frame names
  'frame_tx': EVENT_TYPES.FRAME_TRANSMIT,
  'frame_rx': EVENT_TYPES.FRAME_RECEIVE,
  
  // Old packet names
  'ip_tx': EVENT_TYPES.PACKET_SEND,
  'ip_rx': EVENT_TYPES.PACKET_RECEIVE,
  'ip_forward': EVENT_TYPES.PACKET_FORWARD,
  'ip_local': EVENT_TYPES.PACKET_RECEIVE,
  
  // Old drop names
  'drop': EVENT_TYPES.FRAME_DROP,
};

/**
 * Normalizes an event type string
 * Converts legacy names to normalized names
 */
export function normalizeEventType(type: string): EventType {
  // Check if it's already normalized
  if (isKnownEventType(type)) {
    return type;
  }
  
  // Check if it's a legacy alias
  if (type in LEGACY_EVENT_ALIASES) {
    return LEGACY_EVENT_ALIASES[type];
  }
  
  // Return as-is if unknown (will use fallback values)
  return type as EventType;
}
