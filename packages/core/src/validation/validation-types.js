/**
 * Validation Result Types - Common types for validation operations
 * Used across all validators in the system
 */
// ============================================================================
// Helper Functions
// ============================================================================
export function createError(code, message, field) {
    return { code, message, field, severity: 'error' };
}
export function createWarning(code, message, field) {
    return { code, message, field, severity: 'warning' };
}
export function createInfo(code, message, field) {
    return { code, message, field, severity: 'info' };
}
export function createValidationResult(errors = [], warnings = [], info = []) {
    return {
        valid: errors.length === 0,
        errors,
        warnings,
        info,
    };
}
//# sourceMappingURL=validation-types.js.map