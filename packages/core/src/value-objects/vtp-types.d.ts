/**
 * VTP (VLAN Trunk Protocol) Value Objects
 *
 * Represents validated VTP configuration parameters:
 * - VtpMode: server, client, transparent, off
 * - VtpVersion: 1, 2, 3
 * - VtpDomain: Domain name (1-32 chars, alphanumeric)
 * - VtpPassword: Password (8-32 chars, optional)
 */
export type VtpModeType = 'server' | 'client' | 'transparent' | 'off';
export declare class VtpMode {
    readonly value: VtpModeType;
    constructor(value: VtpModeType);
    static from(value: VtpModeType): VtpMode;
    static tryFrom(value: string): VtpMode | null;
    static isValid(value: string): boolean;
    get isServer(): boolean;
    get isClient(): boolean;
    get isTransparent(): boolean;
    get isOff(): boolean;
    /**
     * Check if this mode can create/modify VLANs
     */
    get canModifyVlans(): boolean;
    equals(other: VtpMode): boolean;
    toString(): string;
    toJSON(): VtpModeType;
}
export type VtpVersionType = 1 | 2 | 3;
export declare class VtpVersion {
    readonly value: VtpVersionType;
    constructor(value: number);
    static from(value: VtpVersionType): VtpVersion;
    static tryFrom(value: number): VtpVersion | null;
    static isValid(value: number): boolean;
    equals(other: VtpVersion): boolean;
    toString(): string;
    toJSON(): VtpVersionType;
}
export declare class VtpDomain {
    readonly value: string;
    constructor(value: string);
    static from(value: string): VtpDomain;
    static tryFrom(value: string): VtpDomain | null;
    static isValid(value: string): boolean;
    equals(other: VtpDomain): boolean;
    toString(): string;
    toJSON(): string;
}
export declare class VtpPassword {
    readonly value: string;
    constructor(value: string);
    static from(value: string): VtpPassword;
    static fromOptional(value: string | null | undefined): VtpPassword | undefined;
    static tryFrom(value: string): VtpPassword | null;
    static isValid(value: string): boolean;
    equals(other: VtpPassword): boolean;
    toString(): string;
    toJSON(): string;
}
export declare function parseVtpMode(value: VtpModeType): VtpMode;
export declare function parseVtpVersion(value: VtpVersionType): VtpVersion;
export declare function parseVtpDomain(value: string): VtpDomain;
export declare function parseOptionalVtpPassword(value: string | null | undefined): VtpPassword | undefined;
//# sourceMappingURL=vtp-types.d.ts.map