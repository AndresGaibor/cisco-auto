// ============================================================================
// Runtime Constants - Shared between handlers and tests
// ============================================================================
// NOTE: Constants like CABLE_TYPES, DEVICE_TYPES are defined in pt-api/pt-constants.ts
// and loaded via catalog.js. This file re-exports them for runtime usage.

import type { CableType, DeviceType } from "../pt-api/pt-constants.js";

// Re-export types
export type { CableType, DeviceType };

// Re-export constants from pt-api/pt-constants.js
export { CABLE_TYPES, DEVICE_TYPES, MODEL_ALIASES, PT_HELPER_MAPS } from "../pt-api/pt-constants.js";
