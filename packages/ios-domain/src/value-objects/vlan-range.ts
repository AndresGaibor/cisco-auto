/**
 * VLAN Range Value Object
 *
 * Represents a validated list of VLAN IDs for trunk allowed VLANs configuration.
 * Supports:
 * - Individual VLANs: [10, 20, 30]
 * - Ranges: 10-20 (expanded to [10, 11, 12, ..., 20])
 * - Mixed: [10, 20-30, 40]
 *
 * Ensures all VLAN IDs are valid (1-4094) at construction time.
 */

import { VlanId } from './vlan-id.js';

/**
 * Parse a VLAN range string like "10", "10-20", or "10,20,30-40"
 */
function parseVlanRangeString(rangeStr: string): number[] {
  const result: number[] = [];
  const parts = rangeStr.split(',').map((s) => s.trim());

  for (const part of parts) {
    if (!part) continue;

    const rangeMatch = part.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1]!, 10);
      const end = parseInt(rangeMatch[2]!, 10);

      if (start > end) {
        throw new Error(
          `Invalid VLAN range "${part}": start (${start}) must be <= end (${end})`
        );
      }

      for (let i = start; i <= end; i++) {
        result.push(i);
      }
    } else {
      const vlanId = parseInt(part, 10);
      if (isNaN(vlanId)) {
        throw new Error(`Invalid VLAN ID in range: "${part}" is not a number`);
      }
      result.push(vlanId);
    }
  }

  return result;
}

export class VlanRange {
  public readonly vlans: VlanId[];
  public readonly sorted: boolean;
  public readonly unique: boolean;

  constructor(
    vlans: Array<number | string | VlanId>,
    options: { sort?: boolean; unique?: boolean } = {}
  ) {
    const { sort = true, unique = true } = options;

    if (!Array.isArray(vlans) || vlans.length === 0) {
      throw new Error('VlanRange requires at least one VLAN ID');
    }

    // Convert all inputs to VlanId (validates each one)
    const vlanIds = vlans.map((v) =>
      v instanceof VlanId ? v : typeof v === 'string' ? VlanId.fromString(v) : VlanId.from(v)
    );

    // Remove duplicates if requested
    let processed = vlanIds;
    if (unique) {
      const seen = new Set<number>();
      processed = vlanIds.filter((vlan) => {
        if (seen.has(vlan.value)) return false;
        seen.add(vlan.value);
        return true;
      });
    }

    // Sort if requested
    if (sort) {
      processed = [...processed].sort((a, b) => a.compareTo(b));
    }

    this.vlans = processed;
    this.sorted = sort;
    this.unique = unique;
  }

  /**
   * Create VlanRange from an array of VLAN IDs
   */
  static from(
    vlans: Array<number | string | VlanId>,
    options?: { sort?: boolean; unique?: boolean }
  ): VlanRange {
    return new VlanRange(vlans, options);
  }

  /**
   * Create VlanRange from a comma-separated string like "10,20,30-40"
   */
  static fromString(rangeStr: string, options?: { sort?: boolean; unique?: boolean }): VlanRange {
    const vlanNumbers = parseVlanRangeString(rangeStr);
    return new VlanRange(vlanNumbers, options);
  }

  /**
   * Try to create VlanRange, returns null if invalid
   */
  static tryFrom(
    vlans: Array<number | string | VlanId> | string,
    options?: { sort?: boolean; unique?: boolean }
  ): VlanRange | null {
    try {
      return typeof vlans === 'string'
        ? VlanRange.fromString(vlans, options)
        : VlanRange.from(vlans, options);
    } catch {
      return null;
    }
  }

  /**
   * Check if arrays of VLANs are valid
   */
  static isValid(vlans: Array<number | string>): boolean {
    try {
      VlanRange.from(vlans);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a range string is valid
   */
  static isValidString(rangeStr: string): boolean {
    try {
      VlanRange.fromString(rangeStr);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get raw number values
   */
  toNumbers(): number[] {
    return this.vlans.map((v) => v.value);
  }

  /**
   * Get comma-separated string representation
   */
  toString(): string {
    return this.toNumbers().join(',');
  }

  /**
   * Get string representation with ranges compressed (e.g., "1-10,20,30-40")
   */
  toCompressedString(): string {
    if (this.vlans.length === 0) return '';

    const numbers = this.toNumbers();
    const ranges: string[] = [];
    let start = numbers[0]!;
    let end = start;

    for (let i = 1; i < numbers.length; i++) {
      const current = numbers[i]!;
      if (current === end + 1) {
        end = current;
      } else {
        ranges.push(start === end ? String(start) : `${start}-${end}`);
        start = current;
        end = current;
      }
    }

    // Add the last range
    ranges.push(start === end ? String(start) : `${start}-${end}`);

    return ranges.join(',');
  }

  /**
   * Check if contains a specific VLAN ID
   */
  contains(vlanId: number | VlanId): boolean {
    const value = vlanId instanceof VlanId ? vlanId.value : vlanId;
    return this.vlans.some((v) => v.value === value);
  }

  /**
   * Check if contains all VLAN IDs from another VlanRange
   */
  containsAll(other: VlanRange): boolean {
    return other.vlans.every((v) => this.contains(v.value));
  }

  /**
   * Add a VLAN ID to the range (returns new instance)
   */
  add(vlanId: number | string | VlanId): VlanRange {
    const newVlan =
      vlanId instanceof VlanId
        ? vlanId
        : typeof vlanId === 'string'
        ? VlanId.fromString(vlanId)
        : VlanId.from(vlanId);

    return new VlanRange([...this.vlans, newVlan], {
      sort: this.sorted,
      unique: this.unique,
    });
  }

  /**
   * Remove a VLAN ID from the range (returns new instance)
   */
  remove(vlanId: number | VlanId): VlanRange {
    const value = vlanId instanceof VlanId ? vlanId.value : vlanId;
    const filtered = this.vlans.filter((v) => v.value !== value);

    if (filtered.length === 0) {
      throw new Error('Cannot remove all VLANs from VlanRange');
    }

    return new VlanRange(filtered, {
      sort: this.sorted,
      unique: this.unique,
    });
  }

  /**
   * Get the number of VLANs in the range
   */
  get size(): number {
    return this.vlans.length;
  }

  /**
   * Get the minimum VLAN ID
   */
  get min(): number {
    return this.vlans[0]?.value ?? 0;
  }

  /**
   * Get the maximum VLAN ID
   */
  get max(): number {
    return this.vlans[this.vlans.length - 1]?.value ?? 0;
  }

  /**
   * Check equality with another VlanRange
   */
  equals(other: VlanRange): boolean {
    if (this.vlans.length !== other.vlans.length) return false;
    return this.vlans.every((v, i) => v.equals(other.vlans[i]!));
  }

  /**
   * JSON serialization
   */
  toJSON(): number[] {
    return this.toNumbers();
  }

  /**
   * Iterate over VLAN IDs
   */
  *[Symbol.iterator](): Iterator<VlanId> {
    for (const vlan of this.vlans) {
      yield vlan;
    }
  }
}

/**
 * Parse a VLAN range from array or string
 */
export function parseVlanRange(
  vlans: Array<number | string | VlanId> | string,
  options?: { sort?: boolean; unique?: boolean }
): VlanRange {
  return typeof vlans === 'string'
    ? VlanRange.fromString(vlans, options)
    : VlanRange.from(vlans, options);
}

/**
 * Check if a value is a valid VLAN range
 */
export function isValidVlanRange(vlans: Array<number | string> | string): boolean {
  return typeof vlans === 'string'
    ? VlanRange.isValidString(vlans)
    : VlanRange.isValid(vlans);
}
