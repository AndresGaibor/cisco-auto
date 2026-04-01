/**
 * Validation Result Types - Common types for validation operations
 * Used across all validators in the system
 */

// ============================================================================
// Result Types
// ============================================================================

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

// ============================================================================
// Helper Functions
// ============================================================================

export function createError(
  code: string,
  message: string,
  field: string
): ValidationError {
  return { code, message, field, severity: 'error' };
}

export function createWarning(
  code: string,
  message: string,
  field: string
): ValidationWarning {
  return { code, message, field, severity: 'warning' };
}

export function createInfo(
  code: string,
  message: string,
  field: string
): ValidationInfo {
  return { code, message, field, severity: 'info' };
}

export function createValidationResult(
  errors: ValidationError[] = [],
  warnings: ValidationWarning[] = [],
  info: ValidationInfo[] = []
): ValidationResult {
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    info,
  };
}
