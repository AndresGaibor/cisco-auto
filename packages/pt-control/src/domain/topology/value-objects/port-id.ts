// ============================================================================
// PortId Value Object
// ============================================================================

import type { DeviceId } from './device-id.js';

/**
 * Port ID format: device:port
 * Example: R1:GigabitEthernet0/0
 */
const PORT_ID_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]*:[a-zA-Z0-9/._-]+$/;

/**
 * Valor obstructor que representa un identificador de puerto validado para topología.
 *
 * Combina device ID y nombre de puerto en una referencia única para usar en
 * extremos de enlace, lookups de puerto y consultas de topología.
 *
 * Formato: device:port
 *
 * @example
 * ```typescript
 * const portId = PortId.from("R1", "GigabitEthernet0/0");
 * console.log(portId.toString()); // "R1:GigabitEthernet0/0"
 * console.log(portId.device); // "R1"
 * console.log(portId.port); // "GigabitEthernet0/0"
 *
 * // Crear desde string
 * const fromString = PortId.fromString("SW1:GigabitEthernet0/1");
 * console.log(fromString.isOnDevice("SW1")); // true
 * ```
 */
export class PortId {
  public readonly value: string;
  public readonly device: string;
  public readonly port: string;

  constructor(device: string | DeviceId, port: string) {
    const d = typeof device === 'string' ? device : device.value;
    const normalizedPort = port.trim();

    if (normalizedPort.length === 0) {
      throw new Error('Port name cannot be empty');
    }

    const portId = `${d}:${normalizedPort}`;

    if (!PORT_ID_PATTERN.test(portId)) {
      throw new Error(
        `Invalid port ID format. Expected "device:port", got "${portId}"`
      );
    }

    this.value = portId;
    this.device = d;
    this.port = normalizedPort;
  }

  /**
   * Create PortId from device and port
   */
  static from(device: string | DeviceId, port: string): PortId {
    return new PortId(device, port);
  }

  /**
   * Create PortId from a string
   */
  static fromString(value: string): PortId {
    const match = value.match(PORT_ID_PATTERN);
    if (!match) {
      throw new Error(`Invalid port ID string: "${value}"`);
    }

    const [device, port] = value.split(':');
    return new PortId(device!, port!);
  }

  /**
   * Try to create PortId, returns null if invalid
   */
  static tryFrom(device: string | DeviceId, port: string): PortId | null {
    try {
      return new PortId(device, port);
    } catch {
      return null;
    }
  }

  /**
   * Try to create from string, returns null if invalid
   */
  static tryFromString(value: string): PortId | null {
    try {
      return PortId.fromString(value);
    } catch {
      return null;
    }
  }

  /**
   * Check if a string is a valid port ID
   */
  static isValid(value: string): boolean {
    try {
      PortId.fromString(value);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get as device:port string
   */
  toString(): string {
    return this.value;
  }

  /**
   * Get as object with device and port
   */
  toObject(): { device: string; port: string } {
    return {
      device: this.device,
      port: this.port,
    };
  }

  /**
   * Check equality with another PortId
   */
  equals(other: PortId): boolean {
    return this.value === other.value;
  }

  /**
   * Check if this port belongs to a specific device
   */
  isOnDevice(device: string | DeviceId): boolean {
    const deviceName = typeof device === 'string' ? device : device.value;
    return this.device === deviceName;
  }

  /**
   * JSON serialization
   */
  toJSON(): string {
    return this.value;
  }
}

/**
 * Parse a port ID from device and port
 */
export function parsePortId(device: string | DeviceId, port: string): PortId {
  return PortId.from(device, port);
}

/**
 * Parse a port ID from string
 */
export function parsePortIdString(value: string): PortId {
  return PortId.fromString(value);
}

/**
 * Check if a string is a valid port ID
 */
export function isValidPortId(value: string): boolean {
  return PortId.isValid(value);
}
