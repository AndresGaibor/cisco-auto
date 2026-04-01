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
export declare class VlanRange {
    readonly vlans: VlanId[];
    readonly sorted: boolean;
    readonly unique: boolean;
    constructor(vlans: Array<number | string | VlanId>, options?: {
        sort?: boolean;
        unique?: boolean;
    });
    /**
     * Create VlanRange from an array of VLAN IDs
     */
    static from(vlans: Array<number | string | VlanId>, options?: {
        sort?: boolean;
        unique?: boolean;
    }): VlanRange;
    /**
     * Create VlanRange from a comma-separated string like "10,20,30-40"
     */
    static fromString(rangeStr: string, options?: {
        sort?: boolean;
        unique?: boolean;
    }): VlanRange;
    /**
     * Try to create VlanRange, returns null if invalid
     */
    static tryFrom(vlans: Array<number | string | VlanId> | string, options?: {
        sort?: boolean;
        unique?: boolean;
    }): VlanRange | null;
    /**
     * Check if arrays of VLANs are valid
     */
    static isValid(vlans: Array<number | string>): boolean;
    /**
     * Check if a range string is valid
     */
    static isValidString(rangeStr: string): boolean;
    /**
     * Get raw number values
     */
    toNumbers(): number[];
    /**
     * Get comma-separated string representation
     */
    toString(): string;
    /**
     * Get string representation with ranges compressed (e.g., "1-10,20,30-40")
     */
    toCompressedString(): string;
    /**
     * Check if contains a specific VLAN ID
     */
    contains(vlanId: number | VlanId): boolean;
    /**
     * Check if contains all VLAN IDs from another VlanRange
     */
    containsAll(other: VlanRange): boolean;
    /**
     * Add a VLAN ID to the range (returns new instance)
     */
    add(vlanId: number | string | VlanId): VlanRange;
    /**
     * Remove a VLAN ID from the range (returns new instance)
     */
    remove(vlanId: number | VlanId): VlanRange;
    /**
     * Get the number of VLANs in the range
     */
    get size(): number;
    /**
     * Get the minimum VLAN ID
     */
    get min(): number;
    /**
     * Get the maximum VLAN ID
     */
    get max(): number;
    /**
     * Check equality with another VlanRange
     */
    equals(other: VlanRange): boolean;
    /**
     * JSON serialization
     */
    toJSON(): number[];
    /**
     * Iterate over VLAN IDs
     */
    [Symbol.iterator](): Iterator<VlanId>;
}
/**
 * Parse a VLAN range from array or string
 */
export declare function parseVlanRange(vlans: Array<number | string | VlanId> | string, options?: {
    sort?: boolean;
    unique?: boolean;
}): VlanRange;
/**
 * Check if a value is a valid VLAN range
 */
export declare function isValidVlanRange(vlans: Array<number | string> | string): boolean;
//# sourceMappingURL=vlan-range.d.ts.map