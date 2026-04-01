/**
 * VLAN Name Value Object
 *
 * Represents a validated VLAN name according to Cisco IOS specifications:
 * - Maximum 32 characters
 * - Alphanumeric characters, hyphens, underscores allowed
 * - Cannot start with a number
 * - Cannot contain spaces or special characters
 */
export declare class VlanName {
    readonly value: string;
    readonly truncated: boolean;
    constructor(value: string);
    /**
     * Create VlanName from a string
     */
    static from(value: string): VlanName;
    /**
     * Try to create VlanName, returns null if invalid
     */
    static tryFrom(value: string): VlanName | null;
    /**
     * Create optional VlanName (returns undefined for empty/null/undefined)
     */
    static fromOptional(value: string | null | undefined): VlanName | undefined;
    /**
     * Check if a string is a valid VLAN name
     */
    static isValid(value: string): boolean;
    /**
     * Check if name was truncated
     */
    get wasTruncated(): boolean;
    /**
     * Get the original length before truncation
     */
    get originalLength(): number;
    /**
     * Check equality with another VlanName
     */
    equals(other: VlanName): boolean;
    /**
     * String representation
     */
    toString(): string;
    /**
     * JSON serialization
     */
    toJSON(): string;
}
/**
 * Parse a VLAN name from a string
 */
export declare function parseVlanName(value: string): VlanName;
/**
 * Parse optional VLAN name (returns undefined for empty values)
 */
export declare function parseOptionalVlanName(value: string | null | undefined): VlanName | undefined;
/**
 * Check if a string is a valid VLAN name
 */
export declare function isValidVlanName(value: string): boolean;
//# sourceMappingURL=vlan-name.d.ts.map