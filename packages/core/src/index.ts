// =============================================================================
// CORE MODULES
// =============================================================================

export * from './parser/yaml-parser';
export * from './types/index';
export * from './value-objects/index.ts';
export { validateLab, LabValidator } from './validation/index';
export type { ValidationIssue, ValidationResult } from './validation/index';

export * from './topology/index';
export * from './canonical/index.ts';
export * from './executor/index.ts';
export * from './config-generators/index.ts';
export * from './config/types.ts';
export * from './config/resolver.ts';
export * from './config/loader.ts';
export * from './context/index.ts';

// =============================================================================
// FUSED MODULES (from tools, templates)
// =============================================================================

// Tools - herramientas para PT
export * from './tools/index';

// Templates - plantillas de laboratorio
export * from './templates/index';
