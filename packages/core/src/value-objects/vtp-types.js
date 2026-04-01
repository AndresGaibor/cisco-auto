/**
 * VTP (VLAN Trunk Protocol) Value Objects
 *
 * Represents validated VTP configuration parameters:
 * - VtpMode: server, client, transparent, off
 * - VtpVersion: 1, 2, 3
 * - VtpDomain: Domain name (1-32 chars, alphanumeric)
 * - VtpPassword: Password (8-32 chars, optional)
 */
export class VtpMode {
    value;
    constructor(value) {
        const validModes = ['server', 'client', 'transparent', 'off'];
        if (!validModes.includes(value)) {
            throw new Error(`Invalid VTP mode "${value}". Must be one of: ${validModes.join(', ')}`);
        }
        this.value = value;
    }
    static from(value) {
        return new VtpMode(value);
    }
    static tryFrom(value) {
        try {
            return new VtpMode(value);
        }
        catch {
            return null;
        }
    }
    static isValid(value) {
        const validModes = ['server', 'client', 'transparent', 'off'];
        return validModes.includes(value);
    }
    get isServer() {
        return this.value === 'server';
    }
    get isClient() {
        return this.value === 'client';
    }
    get isTransparent() {
        return this.value === 'transparent';
    }
    get isOff() {
        return this.value === 'off';
    }
    /**
     * Check if this mode can create/modify VLANs
     */
    get canModifyVlans() {
        return this.value === 'server' || this.value === 'transparent';
    }
    equals(other) {
        return this.value === other.value;
    }
    toString() {
        return this.value;
    }
    toJSON() {
        return this.value;
    }
}
export class VtpVersion {
    value;
    constructor(value) {
        if (![1, 2, 3].includes(value)) {
            throw new Error(`Invalid VTP version ${value}. Must be 1, 2, or 3`);
        }
        this.value = value;
    }
    static from(value) {
        return new VtpVersion(value);
    }
    static tryFrom(value) {
        try {
            return new VtpVersion(value);
        }
        catch {
            return null;
        }
    }
    static isValid(value) {
        return [1, 2, 3].includes(value);
    }
    equals(other) {
        return this.value === other.value;
    }
    toString() {
        return String(this.value);
    }
    toJSON() {
        return this.value;
    }
}
// =============================================================================
// VTP Domain
// =============================================================================
const MAX_DOMAIN_LENGTH = 32;
const DOMAIN_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$|^[a-zA-Z0-9]$/;
export class VtpDomain {
    value;
    constructor(value) {
        if (typeof value !== 'string') {
            throw new Error(`VTP domain must be a string, got: ${typeof value}`);
        }
        const trimmed = value.trim();
        if (trimmed.length === 0) {
            throw new Error('VTP domain cannot be empty');
        }
        if (trimmed.length > MAX_DOMAIN_LENGTH) {
            throw new Error(`VTP domain "${trimmed}" exceeds maximum length of ${MAX_DOMAIN_LENGTH} characters`);
        }
        if (!DOMAIN_PATTERN.test(trimmed)) {
            throw new Error(`Invalid VTP domain "${trimmed}": must start with alphanumeric and contain only alphanumeric characters, hyphens, or underscores`);
        }
        this.value = trimmed;
    }
    static from(value) {
        return new VtpDomain(value);
    }
    static tryFrom(value) {
        try {
            return new VtpDomain(value);
        }
        catch {
            return null;
        }
    }
    static isValid(value) {
        try {
            VtpDomain.from(value);
            return true;
        }
        catch {
            return false;
        }
    }
    equals(other) {
        return this.value === other.value;
    }
    toString() {
        return this.value;
    }
    toJSON() {
        return this.value;
    }
}
// =============================================================================
// VTP Password (optional)
// =============================================================================
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 32;
const PASSWORD_PATTERN = /^[a-zA-Z0-9_-]+$/;
export class VtpPassword {
    value;
    constructor(value) {
        if (typeof value !== 'string') {
            throw new Error(`VTP password must be a string, got: ${typeof value}`);
        }
        if (value.length < MIN_PASSWORD_LENGTH) {
            throw new Error(`VTP password must be at least ${MIN_PASSWORD_LENGTH} characters, got ${value.length}`);
        }
        if (value.length > MAX_PASSWORD_LENGTH) {
            throw new Error(`VTP password exceeds maximum length of ${MAX_PASSWORD_LENGTH} characters`);
        }
        if (!PASSWORD_PATTERN.test(value)) {
            throw new Error(`Invalid VTP password: must contain only alphanumeric characters, hyphens, or underscores`);
        }
        this.value = value;
    }
    static from(value) {
        return new VtpPassword(value);
    }
    static fromOptional(value) {
        if (!value || value.trim() === '') {
            return undefined;
        }
        return new VtpPassword(value);
    }
    static tryFrom(value) {
        try {
            return new VtpPassword(value);
        }
        catch {
            return null;
        }
    }
    static isValid(value) {
        try {
            VtpPassword.from(value);
            return true;
        }
        catch {
            return false;
        }
    }
    equals(other) {
        return this.value === other.value;
    }
    toString() {
        return this.value;
    }
    toJSON() {
        return this.value;
    }
}
// =============================================================================
// Helper functions
// =============================================================================
export function parseVtpMode(value) {
    return VtpMode.from(value);
}
export function parseVtpVersion(value) {
    return VtpVersion.from(value);
}
export function parseVtpDomain(value) {
    return VtpDomain.from(value);
}
export function parseOptionalVtpPassword(value) {
    return VtpPassword.fromOptional(value);
}
//# sourceMappingURL=vtp-types.js.map