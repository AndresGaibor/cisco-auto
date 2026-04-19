// ============================================================================
// Legacy Handlers - Deprecated
// ============================================================================
//
// Estos handlers fueron removidos del export público en handlers/index.ts
//
// NO USAR para código nuevo. Fueron reemplazados por:
//   - primitives/ → primitivas de dispositivo
//   - terminal/ → subsistema de terminal
//   - omni/ → adapters omni
//
// Para handlers de negocio (VLAN, DHCP, etc.) usar pt-control.
//
// Este archivo existe solo para backward compat de consumers internos
// que aún no migraron. NO es API pública.
//
// Ubicación original: ../handlers/
// ============================================================================

export * from "../handlers/device";
export * from "../handlers/link";
export * from "../handlers/inspect";
export * from "../handlers/canvas";
export * from "../handlers/vlan";
export * from "../handlers/dhcp";
export * from "../handlers/host";
