/**
 * Validation Result Types - Common types for validation operations
 * Used across all validators in the system
 */
export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
    info: ValidationInfo[];
}
export interface ValidationError {
    code: string;
    message: string;
    field: string;
    severity: 'error';
}
export interface ValidationWarning {
    code: string;
    message: string;
    field: string;
    severity: 'warning';
}
export interface ValidationInfo {
    code: string;
    message: string;
    field: string;
    severity: 'info';
}
export declare function createError(code: string, message: string, field: string): ValidationError;
export declare function createWarning(code: string, message: string, field: string): ValidationWarning;
export declare function createInfo(code: string, message: string, field: string): ValidationInfo;
export declare function createValidationResult(errors?: ValidationError[], warnings?: ValidationWarning[], info?: ValidationInfo[]): ValidationResult;
//# sourceMappingURL=validation-types.d.ts.map