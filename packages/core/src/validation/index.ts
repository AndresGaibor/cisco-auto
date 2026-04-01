/**
 * VALIDATION MODULE - Exports
 */

// Validators
export { VlanValidator } from './vlan-validator';
export { RoutingValidator } from './routing-validator';
export { DeviceValidator } from './device-validator';
export { NetworkValidator } from './network-validator';

// Types
export type {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationInfo,
} from './validation-types';

export { createError, createWarning, createInfo, createValidationResult } from './validation-types';

export { ValidationCodes, getErrorMessage, type ValidationCode } from './validation-codes';

// Legacy
export * from './lab.validator';
