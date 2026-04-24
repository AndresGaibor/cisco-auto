// ============================================================================
// LinkId Value Object
// ============================================================================

import type { DeviceId } from './device-id.js';
import type { PortId } from './port-id.js';

/**
 * Link ID format: device1:port1--device2:port2
 * Sorted alphabetically to ensure consistent ID regardless of direction
 */
const LINK_ID_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]*:[a-zA-Z0-9/._-]+--[a-zA-Z][a-zA-Z0-9_-]*:[a-zA-Z0-9/._-]+$/;

/**
 * Valor obstructor que representa un identificador de enlace validado para topología.
 *
 * Los Link IDs son canónicos: se ordenan alfabéticamente para asegurar el mismo ID
 * sin importar la dirección del enlace (A->B === B->A).
 *
 * Formato: device1:port1--device2:port2
 *
 * @example
 * ```typescript
 * const linkId = LinkId.from("R1", "GigabitEthernet0/0", "SW1", "GigabitEthernet0/1");
 * console.log(linkId.toString()); // "R1:GigabitEthernet0/0--SW1:GigabitEthernet0/1"
 *
 * // Obtener el otro dispositivo desde uno已知
 * const other = linkId.getOtherDevice("R1");
 * console.log(other); // "SW1"
 * ```
 */
export class LinkId {
  public readonly value: string;
  public readonly device1: string;
  public readonly port1: string;
  public readonly device2: string;
  public readonly port2: string;

  constructor(
    device1: string | DeviceId,
    port1: string,
    device2: string | DeviceId,
    port2: string
  ) {
    const d1 = typeof device1 === 'string' ? device1 : device1.value;
    const d2 = typeof device2 === 'string' ? device2 : device2.value;

    // Normalize port names for consistent comparison
    const p1 = this.normalizePortName(port1);
    const p2 = this.normalizePortName(port2);

    // Create canonical ID (sorted alphabetically)
    const endpoint1 = `${d1}:${p1}`;
    const endpoint2 = `${d2}:${p2}`;

    const [first, second] = endpoint1 < endpoint2 ? [endpoint1, endpoint2] : [endpoint2, endpoint1];
    const linkId = `${first}--${second}`;

    if (!LINK_ID_PATTERN.test(linkId)) {
      throw new Error(
        `Invalid link ID format. Expected "device1:port1--device2:port2", got "${linkId}"`
      );
    }

    this.value = linkId;

    // Parse components
    const parts = linkId.split('--');
    const [dev1, p1Part] = parts[0]!.split(':');
    const [dev2, p2Part] = parts[1]!.split(':');

    this.device1 = dev1!;
    this.port1 = p1Part!;
    this.device2 = dev2!;
    this.port2 = p2Part!;
  }

  /**
   * Normalize port name for consistent comparison
   */
  private normalizePortName(name: string): string {
    // Remove extra spaces, normalize common abbreviations
    return name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/^gi(0)?\//g, 'gigabitethernet0/')
      .replace(/^fa(0)?\//g, 'fastethernet0/')
      .replace(/^se(0)?\//g, 'serial0/');
  }

  /**
   * Create LinkId from strings
   */
  static from(
    device1: string | DeviceId,
    port1: string,
    device2: string | DeviceId,
    port2: string
  ): LinkId {
    return new LinkId(device1, port1, device2, port2);
  }

  /**
   * Create LinkId from a string ID
   */
  static fromString(value: string): LinkId {
    const match = value.match(LINK_ID_PATTERN);
    if (!match) {
      throw new Error(`Invalid link ID string: "${value}"`);
    }

    const parts = value.split('--');
    const [dev1, p1] = parts[0]!.split(':');
    const [dev2, p2] = parts[1]!.split(':');

    return new LinkId(dev1!, p1!, dev2!, p2!);
  }

  /**
   * Try to create LinkId, returns null if invalid
   */
  static tryFrom(
    device1: string | DeviceId,
    port1: string,
    device2: string | DeviceId,
    port2: string
  ): LinkId | null {
    try {
      return new LinkId(device1, port1, device2, port2);
    } catch {
      return null;
    }
  }

  /**
   * Try to create from string, returns null if invalid
   */
  static tryFromString(value: string): LinkId | null {
    try {
      return LinkId.fromString(value);
    } catch {
      return null;
    }
  }

  /**
   * Check if a string is a valid link ID
   */
  static isValid(value: string): boolean {
    try {
      LinkId.fromString(value);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the other device given one device
   */
  getOtherDevice(deviceName: string | DeviceId): string | null {
    const name = typeof deviceName === 'string' ? deviceName : deviceName.value;
    if (this.device1 === name) return this.device2;
    if (this.device2 === name) return this.device1;
    return null;
  }

  /**
   * Get the other port given one device
   */
  getOtherPort(deviceName: string | DeviceId): string | null {
    const name = typeof deviceName === 'string' ? deviceName : deviceName.value;
    if (this.device1 === name) return this.port2;
    if (this.device2 === name) return this.port1;
    return null;
  }

  /**
   * Check if link involves a specific device
   */
  involvesDevice(deviceName: string | DeviceId): boolean {
    const name = typeof deviceName === 'string' ? deviceName : deviceName.value;
    return this.device1 === name || this.device2 === name;
  }

  /**
   * Get endpoints as array
   */
  getEndpoints(): Array<{ device: string; port: string }> {
    return [
      { device: this.device1, port: this.port1 },
      { device: this.device2, port: this.port2 },
    ];
  }

  /**
   * Check equality with another LinkId
   */
  equals(other: LinkId): boolean {
    return this.value === other.value;
  }

  /**
   * String representation
   */
  toString(): string {
    return this.value;
  }

  /**
   * JSON serialization
   */
  toJSON(): string {
    return this.value;
  }
}

/**
 * Parse a link ID from components
 */
export function parseLinkId(
  device1: string | DeviceId,
  port1: string,
  device2: string | DeviceId,
  port2: string
): LinkId {
  return LinkId.from(device1, port1, device2, port2);
}

/**
 * Parse a link ID from string
 */
export function parseLinkIdString(value: string): LinkId {
  return LinkId.fromString(value);
}

/**
 * Check if a string is a valid link ID
 */
export function isValidLinkId(value: string): boolean {
  return LinkId.isValid(value);
}
