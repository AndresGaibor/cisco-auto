// ============================================================================
// InterfaceName Value Object
// ============================================================================

const INTERFACE_NAME_PATTERN = /^[A-Za-z]+\d+(\/\d+)*(\.\d+)?$/;

/**
 * Represents a validated Cisco IOS interface name.
 * Examples: GigabitEthernet0/0, FastEthernet0/1, VLAN100, Serial0/0/0
 */
export class InterfaceName {
  public readonly value: string;

  constructor(value: string) {
    const normalized = value.trim();
    if (!normalized) {
      throw new Error("Interface name cannot be empty");
    }
    if (!INTERFACE_NAME_PATTERN.test(normalized)) {
      throw new Error(`Invalid interface name: "${value}". Expected format: GigabitEthernet0/0, FastEthernet0/1, VLAN100, etc.`);
    }
    this.value = normalized;
  }

  /**
   * Get the short form of the interface name (e.g., Gi0/0 instead of GigabitEthernet0/0)
   */
  get shortForm(): string {
    const abbreviations: Record<string, string> = {
      GigabitEthernet: "Gi",
      FastEthernet: "Fa",
      Ethernet: "Et",
      Serial: "Se",
      Loopback: "Lo",
      Vlan: "Vl",
      PortChannel: "Po",
      Tunnel: "Tu",
    };

    for (const [full, abbrev] of Object.entries(abbreviations)) {
      if (this.value.startsWith(full)) {
        return this.value.replace(full, abbrev);
      }
    }
    return this.value;
  }

  /**
   * Check if this is a subinterface (e.g., GigabitEthernet0/0.100)
   */
  get isSubinterface(): boolean {
    return this.value.includes(".");
  }

  /**
   * Get the parent interface for a subinterface
   */
  get parentInterface(): InterfaceName | null {
    if (!this.isSubinterface) return null;
    const parent = this.value.split(".")[0]!;
    return new InterfaceName(parent);
  }

  equals(other: InterfaceName): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

/**
 * Parse an interface name string, throwing if invalid
 */
export function parseInterfaceName(value: string): InterfaceName {
  return new InterfaceName(value);
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
