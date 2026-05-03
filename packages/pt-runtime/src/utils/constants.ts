// ============================================================================
// Runtime Constants - Shared between handlers and tests
// ============================================================================
// NOTE: Constants like CABLE_TYPES, DEVICE_TYPES are defined in pt-api/pt-constants.ts
// and loaded via catalog.js. This file re-exports them for runtime usage.

import type { CableType, DeviceType } from "../pt-api/pt-constants.js";
import { CABLE_TYPES, DEVICE_TYPES, MODEL_ALIASES, PT_HELPER_MAPS } from "../pt-api/pt-constants.js";

// Re-export types
export type { CableType, DeviceType };

// Re-export constants from pt-api/pt-constants.js
export { CABLE_TYPES, DEVICE_TYPES, MODEL_ALIASES, PT_HELPER_MAPS };

/**
 * Legacy helper: resolve a cable type name to its Packet Tracer numeric id.
 *
 * Mantiene compatibilidad con handlers legacy como add-link.ts sin importar
 * value-objects/index.ts, porque ese barrel arrastra hardware-maps.ts/import.meta.
 */
export function getCableTypeId(name: string): number | null {
  const normalized = String(name || "").trim();

  if (!normalized) {
    return null;
  }

  if (Object.prototype.hasOwnProperty.call(CABLE_TYPES, normalized)) {
    return CABLE_TYPES[normalized];
  }

  const lower = normalized.toLowerCase();

  if (Object.prototype.hasOwnProperty.call(CABLE_TYPES, lower)) {
    return CABLE_TYPES[lower];
  }

  return null;
}

/**
 * Legacy helper: resolve a Packet Tracer cable numeric id to its canonical name.
 */
export function getCableTypeName(typeId: number): string | null {
  const numericTypeId = Number(typeId);

  if (!Number.isFinite(numericTypeId)) {
    return null;
  }

  for (const name of Object.keys(CABLE_TYPES)) {
    if (CABLE_TYPES[name] === numericTypeId) {
      return name;
    }
  }

  return null;
}