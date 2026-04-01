/**
 * VLAN ID Value Object
 *
 * Represents a validated VLAN ID (1-4094)
 * Ensures VLAN IDs are valid at construction time, preventing runtime errors
 */
/**
 * VLAN ID types according to IEEE 802.1Q standard
 */
export declare enum VlanType {
    /** Default VLAN - cannot be deleted */
    DEFAULT = "default",
    /** Normal range VLANs (2-1001) - can be created/deleted */
    NORMAL = "normal",
    /** Reserved VLANs (1002-1005) - legacy FDDI/Token Ring */
    RESERVED = "reserved",
    /** Extended range VLANs (1006-4094) - limited features */
    EXTENDED = "extended"
}
export declare class VlanId {
    readonly value: number;
    readonly type: VlanType;
    constructor(value: number);
    /**
     * Classify VLAN ID according to IEEE 802.1Q
     */
    private classifyVlan;
    /**
     * Create VlanId from a number
     */
    static from(value: number): VlanId;
    /**
     * Create VlanId from a string (parses the number)
     */
    static fromString(value: string): VlanId;
    /**
     * Try to create VlanId, returns null if invalid
     */
    static tryFrom(value: number | string): VlanId | null;
    /**
     * Check if a number is a valid VLAN ID without throwing
     */
    static isValid(value: number | string): boolean;
    /**
     * Check if this is the default VLAN (VLAN 1)
     */
    get isDefault(): boolean;
    /**
     * Check if this is a normal VLAN (2-1001)
     */
    get isNormal(): boolean;
    /**
     * Check if this is a reserved VLAN (1002-1005)
     */
    get isReserved(): boolean;
    /**
     * Check if this is an extended VLAN (1006-4094)
     */
    get isExtended(): boolean;
    /**
     * Check if this VLAN can be created/deleted (normal and extended)
     */
    get isConfigurable(): boolean;
    /**
     * Check equality with another VlanId
     */
    equals(other: VlanId): boolean;
    /**
     * Compare with another VlanId for sorting
     */
    compareTo(other: VlanId): number;
    /**
     * Get raw number value
     */
    toNumber(): number;
    /**
     * String representation
     */
    toString(): string;
    /**
     * JSON serialization
     */
    toJSON(): number;
}
/**
 * Parse a VLAN ID from number or string
 */
export declare function parseVlanId(value: number | string): VlanId;
/**
 * Parse optional VLAN ID (returns undefined for null/undefined)
 */
export declare function parseOptionalVlanId(value: number | string | null | undefined): VlanId | undefined;
/**
 * Check if a value is a valid VLAN ID
 */
export declare function isValidVlanId(value: number | string): boolean;
//# sourceMappingURL=vlan-id.d.ts.map