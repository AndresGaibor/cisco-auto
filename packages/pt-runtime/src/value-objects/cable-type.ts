// ============================================================================
// CableType Value Object - Validates Packet Tracer cable types
// ============================================================================

/**
 * Cable type names supported by Packet Tracer
 */
export type CableTypeName =
  | 'straight'      // Straight-through (8100)
  | 'cross'         // Crossover (8101)
  | 'roll'          // Rollover (8102)
  | 'fiber'         // Fiber (8103)
  | 'phone'         // Phone (8104)
  | 'cable'         // Coaxial cable (8105)
  | 'serial'        // Serial (8106)
  | 'auto'          // Auto-select (8107)
  | 'console'       // Console (8108)
  | 'wireless'      // Wireless connection (8109)
  | 'coaxial'       // Coaxial (8110)
  | 'octal'         // Octal (8111)
  | 'cellular'      // Cellular (8112)
  | 'usb'           // USB (8113)
  | 'custom_io'     // Custom I/O (8114);

/**
 * Cable type ID to name mapping (Packet Tracer internal IDs)
 */
export const CABLE_TYPE_IDS: Record<CableTypeName, number> = {
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

/**
 * Reverse mapping: ID to name
 */
const CABLE_TYPE_NAMES: Record<number, CableTypeName> = Object.fromEntries(
  Object.entries(CABLE_TYPE_IDS).map(([name, id]) => [id, name as CableTypeName])
) as Record<number, CableTypeName>;

/**
 * Cable type recommendations for common connection scenarios
 */
export const CABLE_RECOMMENDATIONS = {
  // Device to switch
  pc_to_switch: 'straight' as CableTypeName,
  server_to_switch: 'straight' as CableTypeName,
  router_to_switch: 'straight' as CableTypeName,
  ap_to_switch: 'straight' as CableTypeName,
  
  // Same device types
  switch_to_switch: 'cross' as CableTypeName,
  router_to_router: 'cross' as CableTypeName,
  pc_to_pc: 'cross' as CableTypeName,
  switch_to_switch_fiber: 'fiber' as CableTypeName,
  
  // Serial connections
  router_serial: 'serial' as CableTypeName,
  
  // Management
  pc_console_to_router: 'console' as CableTypeName,
  pc_console_to_switch: 'console' as CableTypeName,
  
  // Phone
  ip_phone: 'phone' as CableTypeName,
  
  // Wireless
  wireless_connection: 'wireless' as CableTypeName,
  
  // Auto-select (let PT decide)
  auto: 'auto' as CableTypeName,
} as const;

/**
 * Represents a validated Packet Tracer cable type
 * 
 * Provides type safety for cable type IDs and names,
 * along with helper methods for common scenarios.
 */
export class CableType {
  public readonly name: CableTypeName;
  public readonly id: number;

  constructor(name: CableTypeName) {
    const validNames = Object.keys(CABLE_TYPE_IDS) as CableTypeName[];
    
    if (!validNames.includes(name)) {
      throw new Error(
        `Invalid cable type: "${name}". ` +
        `Valid types: ${validNames.join(', ')}`
      );
    }
    
    this.name = name;
    this.id = CABLE_TYPE_IDS[name];
  }

  static fromJSON(value: CableTypeName): CableType {
    return new CableType(value);
  }

  toJSON(): CableTypeName {
    return this.name;
  }

  get raw(): CableTypeName {
    return this.name;
  }

  /**
   * Get the display name for this cable type
   */
  get displayName(): string {
    const displayNames: Record<CableTypeName, string> = {
      straight: 'Straight-Through',
      cross: 'Crossover',
      roll: 'Rollover',
      fiber: 'Fiber',
      phone: 'Phone',
      cable: 'Coaxial',
      serial: 'Serial',
      auto: 'Auto',
      console: 'Console',
      wireless: 'Wireless',
      coaxial: 'Coaxial',
      octal: 'Octal',
      cellular: 'Cellular',
      usb: 'USB',
      custom_io: 'Custom I/O',
    };
    return displayNames[this.name];
  }

  /**
   * Check if this is an Ethernet cable (straight or cross)
   */
  get isEthernet(): boolean {
    return this.name === 'straight' || this.name === 'cross';
  }

  /**
   * Check if this is a serial cable
   */
  get isSerial(): boolean {
    return this.name === 'serial';
  }

  /**
   * Check if this is a fiber optic cable
   */
  get isFiber(): boolean {
    return this.name === 'fiber';
  }

  /**
   * Check if this is a console cable
   */
  get isConsole(): boolean {
    return this.name === 'console' || this.name === 'roll';
  }

  /**
   * Check if this is a wireless connection
   */
  get isWireless(): boolean {
    return this.name === 'wireless' || this.name === 'cellular';
  }

  /**
   * Check if this is auto-select mode
   */
  get isAuto(): boolean {
    return this.name === 'auto';
  }

  /**
   * Get the recommended cable type for a connection scenario
   */
  static recommend(scenario: keyof typeof CABLE_RECOMMENDATIONS): CableType {
    return new CableType(CABLE_RECOMMENDATIONS[scenario]);
  }

  /**
   * Get cable type from PT internal ID
   */
  static fromId(id: number): CableType | null {
    const name = CABLE_TYPE_NAMES[id];
    return name ? new CableType(name) : null;
  }

  /**
   * Get cable type from a string name (case-insensitive)
   */
  static fromName(name: string): CableType | null {
    const normalizedName = name.toLowerCase().trim() as CableTypeName;
    
    // Check if it's a valid name
    if (Object.keys(CABLE_TYPE_IDS).includes(normalizedName)) {
      return new CableType(normalizedName);
    }
    
    // Check display names
    const displayNames: Record<CableTypeName, string> = {
      straight: 'Straight-Through',
      cross: 'Crossover',
      roll: 'Rollover',
      fiber: 'Fiber',
      phone: 'Phone',
      cable: 'Coaxial',
      serial: 'Serial',
      auto: 'Auto',
      console: 'Console',
      wireless: 'Wireless',
      coaxial: 'Coaxial',
      octal: 'Octal',
      cellular: 'Cellular',
      usb: 'USB',
      custom_io: 'Custom I/O',
    };
    
    for (const [typeName, displayName] of Object.entries(displayNames)) {
      if (displayName.toLowerCase() === name.toLowerCase().trim()) {
        return new CableType(typeName as CableTypeName);
      }
    }
    
    return null;
  }

  equals(other: CableType): boolean {
    return this.name === other.name && this.id === other.id;
  }

  toString(): string {
    return `${this.displayName} (${this.id})`;
  }
}

/**
 * Create a CableType from a name, throwing if invalid
 */
export function parseCableType(name: string): CableType {
  const cable = CableType.fromName(name);
  if (!cable) {
    throw new Error(`Invalid cable type: "${name}"`);
  }
  return cable;
}

/**
 * Create a CableType from a PT internal ID, throwing if invalid
 */
export function parseCableTypeId(id: number): CableType {
  const cable = CableType.fromId(id);
  if (!cable) {
    throw new Error(`Invalid cable type ID: ${id}`);
  }
  return cable;
}

/**
 * Get the PT internal ID for a cable type name
 */
export function getCableTypeId(name: CableTypeName): number {
  return CABLE_TYPE_IDS[name];
}

/**
 * Get the cable type name from a PT internal ID
 */
export function getCableTypeName(id: number): CableTypeName | null {
  return CABLE_TYPE_NAMES[id] || null;
}

/**
 * Check if a string is a valid cable type name without throwing
 */
export function isValidCableType(name: string): boolean {
  return CableType.fromName(name) !== null;
}

/**
 * Check if a number is a valid cable type ID without throwing
 */
export function isValidCableTypeId(id: number): boolean {
  return CableType.fromId(id) !== null;
}
