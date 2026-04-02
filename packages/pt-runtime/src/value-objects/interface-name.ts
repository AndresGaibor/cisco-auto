// ============================================================================
// InterfaceName Value Object - Validates IOS interface names
// ============================================================================

/**
 * Valid interface types in Cisco IOS
 */
export type InterfaceType =
  | 'Ethernet'
  | 'FastEthernet'
  | 'GigabitEthernet'
  | 'TenGigabit'
  | 'Port-channel'
  | 'Loopback'
  | 'Vlan'
  | 'Serial'
  | 'Async'
  | 'Tunnel'
  | 'NVI'
  | 'Null';

/**
 * Interface type abbreviations commonly used in IOS
 */
const INTERFACE_ABBREVIATIONS: Record<string, InterfaceType> = {
  'e': 'Ethernet',
  'eth': 'Ethernet',
  'ethernet': 'Ethernet',
  'fa': 'FastEthernet',
  'fastethernet': 'FastEthernet',
  'gi': 'GigabitEthernet',
  'gigabitethernet': 'GigabitEthernet',
  'te': 'TenGigabit',
  'tengigabit': 'TenGigabit',
  'po': 'Port-channel',
  'port-channel': 'Port-channel',
  'lo': 'Loopback',
  'loopback': 'Loopback',
  'vl': 'Vlan',
  'vlan': 'Vlan',
  'se': 'Serial',
  'serial': 'Serial',
  'as': 'Async',
  'async': 'Async',
  'tu': 'Tunnel',
  'tunnel': 'Tunnel',
  'nvi': 'NVI',
  'nu': 'Null',
  'null': 'Null',
};

const INTERFACE_NUMBER_PATTERN = /^(\d+)(?:\/(\d+))?(?:\.(\d+))?$/;

/**
 * Represents a validated Cisco IOS interface name
 *
 * Formats supported:
 * - Ethernet0, FastEthernet0/1, GigabitEthernet0/0
 * - Port-channel1, Loopback0, Vlan1
 * - Serial0/0/0, Tunnel0
 * - Subinterfaces: GigabitEthernet0/0.100
 * - Abbreviations: Gi0/0, Fa0/1, Vl1, Po1
 */
export class InterfaceName {
  public readonly value: string;
  public readonly type: InterfaceType;
  public readonly slot: number;
  public readonly port: number | null;
  public readonly subinterface: number | null;

  constructor(value: string) {
    const trimmed = value.trim();

    if (!trimmed) {
      throw new Error("Interface name cannot be empty");
    }

    // Parse type (including abbreviations)
    // Match letters and hyphens for types like "Port-channel"
    const typeMatch = trimmed.match(/^([a-zA-Z]+(?:-[a-zA-Z]+)?)/);
    if (!typeMatch) {
      throw new Error(
        `Invalid interface format: "${trimmed}". ` +
        `Must start with interface type (e.g., GigabitEthernet, Gi, Fa, Vlan, Port-channel)`
      );
    }

    const typeString = typeMatch[0]!.toLowerCase();
    this.type = INTERFACE_ABBREVIATIONS[typeString];
    
    if (!this.type) {
      throw new Error(
        `Invalid interface type: "${trimmed}". ` +
        `Valid types: Ethernet, FastEthernet, GigabitEthernet, TenGigabit, ` +
        `Port-channel, Loopback, Vlan, Serial, Async, Tunnel, NVI, Null`
      );
    }

    // Parse numbers
    const numberPart = trimmed.substring(typeMatch[0]!.length);
    const numberMatch = numberPart.match(INTERFACE_NUMBER_PATTERN);
    
    if (!numberMatch) {
      throw new Error(
        `Invalid interface number format: "${numberPart}". ` +
        `Expected format: slot[/port][.subinterface] (e.g., 0/0, 0/0.100, 1)`
      );
    }

    this.slot = parseInt(numberMatch[1]!, 10);
    this.port = numberMatch[2] !== undefined ? parseInt(numberMatch[2], 10) : null;
    this.subinterface = numberMatch[3] !== undefined ? parseInt(numberMatch[3], 10) : null;

    this.value = trimmed;
  }

  static fromJSON(value: string): InterfaceName {
    return new InterfaceName(value);
  }

  toJSON(): string {
    return this.value;
  }

  get raw(): string {
    return this.value;
  }

  /**
   * Get the abbreviated interface name (e.g., "Gi0/0", "Fa0/1", "Vl1")
   */
  get abbreviation(): string {
    const abbreviations: Record<InterfaceType, string> = {
      'Ethernet': 'E',
      'FastEthernet': 'Fa',
      'GigabitEthernet': 'Gi',
      'TenGigabit': 'Te',
      'Port-channel': 'Po',
      'Loopback': 'Lo',
      'Vlan': 'Vl',
      'Serial': 'Se',
      'Async': 'As',
      'Tunnel': 'Tu',
      'NVI': 'NVI',
      'Null': 'Nu',
    };

    const abbrev = abbreviations[this.type];
    let result = `${abbrev}${this.slot}`;
    
    if (this.port !== null) {
      result += `/${this.port}`;
    }
    
    if (this.subinterface !== null) {
      result += `.${this.subinterface}`;
    }
    
    return result;
  }

  /**
   * Get the full canonical name (e.g., "GigabitEthernet0/0")
   */
  get canonical(): string {
    let result = this.type;
    
    if (this.type === 'Vlan' || this.type === 'Loopback') {
      result += `${this.slot}`;
    } else if (this.port !== null) {
      result += `${this.slot}/${this.port}`;
      if (this.subinterface !== null) {
        result += `.${this.subinterface}`;
      }
    } else {
      result += `${this.slot}`;
    }
    
    return result;
  }

  /**
   * Check if this is a physical interface (has slot/port)
   */
  get isPhysical(): boolean {
    return this.port !== null && 
           !['Loopback', 'Vlan', 'Port-channel', 'Tunnel', 'NVI', 'Null'].includes(this.type);
  }

  /**
   * Check if this is a logical/virtual interface
   */
  get isLogical(): boolean {
    return !this.isPhysical;
  }

  /**
   * Check if this is a subinterface
   */
  get isSubinterface(): boolean {
    return this.subinterface !== null;
  }

  /**
   * Check if this is a Layer 3 interface
   */
  get isLayer3(): boolean {
    return ['Loopback', 'Vlan', 'Serial', 'Tunnel', 'NVI'].includes(this.type) ||
           this.subinterface !== null;
  }

  /**
   * Check if this is a Layer 2 interface
   */
  get isLayer2(): boolean {
    return this.isPhysical && this.subinterface === null &&
           !['Serial', 'Tunnel', 'NVI'].includes(this.type);
  }

  /**
   * Get the parent interface name (for subinterfaces)
   * Returns null if not a subinterface
   */
  getParent(): InterfaceName | null {
    if (this.subinterface === null) {
      return null;
    }
    
    try {
      return new InterfaceName(`${this.type}${this.slot}${this.port !== null ? `/${this.port}` : ''}`);
    } catch {
      return null;
    }
  }

  /**
   * Check if this interface can have an IP address
   */
  get canHaveIp(): boolean {
    return this.isLayer3 || this.isPhysical;
  }

  /**
   * Check if this is a switch port (Ethernet/FastEthernet/GigabitEthernet)
   */
  get isSwitchPort(): boolean {
    return ['Ethernet', 'FastEthernet', 'GigabitEthernet', 'TenGigabit'].includes(this.type);
  }

  /**
   * Check if this is a router interface
   */
  get isRouterInterface(): boolean {
    return ['Serial', 'Async', 'Tunnel'].includes(this.type) || this.isSubinterface;
  }

  equals(other: InterfaceName): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

/**
 * Create an InterfaceName, throwing if invalid
 */
export function parseInterfaceName(value: string): InterfaceName {
  return new InterfaceName(value);
}

/**
 * Create an InterfaceName or return null if invalid
 */
export function tryParseInterfaceName(value: string): InterfaceName | null {
  try {
    return new InterfaceName(value);
  } catch {
    return null;
  }
}

/**
 * Check if a string is a valid interface name without throwing
 */
export function isValidInterfaceName(value: string): boolean {
  try {
    new InterfaceName(value);
    return true;
  } catch {
    return false;
  }
}
