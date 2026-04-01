// ============================================================================
// PortName Value Object
// ============================================================================

/**
 * Pattern for valid IOS port names:
 * - Format: Type[Slot/Port] or Type[Slot/Subslot/Port]
 * - Examples: GigabitEthernet0/0, FastEthernet0/1/0, Serial0/0/0:1
 * - Types: Ethernet, FastEthernet, GigabitEthernet, TenGigabitEthernet, Serial, Loopback, Vlan, Port-channel, Tunnel
 */
const PORT_NAME_PATTERN = /^(Ethernet|FastEthernet|GigabitEthernet|TenGigabitEthernet|FortyGigE|HundredGigE|Serial|Loopback|Vlan|Port-channel|Tunnel|NVI|Null|Dialer|Dot11Radio|Cellular|Async|BRIO|POS|ATM|Virtual-PPP|Tunnel|Wlan-GigabitEthernet)(\d+)(\/(\d+))?(\/(\d+))?(\.(\d+))?(:(\d+))?$/i;

/**
 * Represents a validated IOS interface/port name
 */
export class PortName {
  public readonly value: string;

  constructor(value: string) {
    const trimmed = value.trim();
    const formatted = this.normalizeFormat(trimmed);

    if (!PORT_NAME_PATTERN.test(formatted)) {
      throw new Error(
        `Invalid port name: "${value}". Must follow IOS naming convention (e.g., GigabitEthernet0/0, FastEthernet0/1/0, Loopback0).`
      );
    }
    this.value = formatted;
  }

  static fromJSON(value: string): PortName {
    return new PortName(value);
  }

  toJSON(): string {
    return this.value;
  }

  get raw(): string {
    return this.value;
  }

  /**
   * Normalize port name format (capitalize properly)
   */
  private normalizeFormat(value: string): string {
    // Capitalize first letter of each word
    return value.replace(/^[a-z]+|[A-Z][a-z]*\d*/gi, (match) => {
      const letters = match.replace(/\d/g, '');
      const numbers = match.replace(/[a-zA-Z]/g, '');
      return letters.charAt(0).toUpperCase() + letters.slice(1).toLowerCase() + numbers;
    });
  }

  /**
   * Get the port type (e.g., "GigabitEthernet")
   */
  get type(): string {
    const match = this.value.match(/^[a-zA-Z-]+/);
    return match ? match[0] : '';
  }

  /**
   * Get the slot number
   */
  get slot(): number | null {
    const match = this.value.match(/\/(\d+)/);
    return match ? parseInt(match[1]!, 10) : null;
  }

  /**
   * Get the port number
   */
  get port(): number | null {
    const parts = this.value.split('/');
    if (parts.length >= 2) {
      const lastPart = parts[parts.length - 1]!.split('.')[0]!.split(':')[0];
      return parseInt(lastPart, 10);
    }
    return null;
  }

  /**
   * Check if this is a physical port
   */
  get isPhysical(): boolean {
    const physicalTypes = ['Ethernet', 'FastEthernet', 'GigabitEthernet', 'TenGigabitEthernet', 'Serial'];
    return physicalTypes.some(t => this.type.toLowerCase().includes(t.toLowerCase()));
  }

  /**
   * Check if this is a logical interface
   */
  get isLogical(): boolean {
    const logicalTypes = ['Loopback', 'Vlan', 'Port-channel', 'Tunnel', 'NVI'];
    return logicalTypes.some(t => this.type.toLowerCase() === t.toLowerCase());
  }

  /**
   * Check if this is a subinterface
   */
  get isSubinterface(): boolean {
    return this.value.includes('.');
  }

  /**
   * Get the parent interface name (for subinterfaces)
   */
  get parent(): PortName | null {
    if (!this.isSubinterface) return null;
    const parentName = this.value.split('.')[0];
    try {
      return new PortName(parentName!);
    } catch {
      return null;
    }
  }

  /**
   * Get the IOS command to enter this interface
   */
  toInterfaceCommand(): string {
    return `interface ${this.value}`;
  }

  /**
   * Get the IOS command to describe this interface
   */
  toDescriptionCommand(description: string): string {
    return `description ${description}`;
  }

  equals(other: PortName): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

/**
 * Create a PortName from a string, throwing if invalid
 */
export function parsePortName(value: string): PortName {
  return new PortName(value);
}

/**
 * Check if a string is a valid port name without throwing
 */
export function isValidPortName(value: string): boolean {
  try {
    new PortName(value);
    return true;
  } catch {
    return false;
  }
}
