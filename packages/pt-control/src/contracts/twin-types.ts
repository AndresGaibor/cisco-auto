/**
 * LEGACY REEXPORTS - twin-types.ts
 * 
 * This file now serves as a backward-compatibility layer.
 * All types have been refactored into specialized modules for better maintainability.
 * 
 * Import directly from the modular files instead:
 * - twin-enums.ts         - Enum definitions
 * - placement-types.ts    - Spatial placement models
 * - port-types.ts         - Network port models
 * - provenance-types.ts   - Data provenance and CLI state
 * - config-types.ts       - Device configuration models
 * - device-traits-types.ts - Services, capabilities, modules
 * - device-types.ts       - Main device model
 * - spatial-types.ts      - Zones, annotations, spatial context
 * - link-types.ts         - Network link models
 * - network-types.ts      - Top-level network container
 * - agent-context-types.ts - Agent session and context
 */

export * from './twin-enums.js';
export * from './placement-types.js';
export * from './port-types.js';
export * from './provenance-types.js';
export * from './config-types.js';
export * from './device-traits-types.js';
export * from './device-types.js';
export * from './spatial-types.js';
export * from './link-types.js';
export * from './network-types.js';
export * from './agent-context-types.js';
