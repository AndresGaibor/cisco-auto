// ============================================================================
// Handlers Index - Active handlers (NOT legacy)
// ============================================================================

/**
 * @deprecated Los handlers legacy (device, link, inspect, canvas, vlan, dhcp, host)
 * fueron removidos del export público.
 *
 * Sistema NUEVO ( Phase 3+ ):
 *   - runtime-handlers.ts → dispatcher central (Map-based)
 *   - primitives/ → primitivas de dispositivo
 *   - terminal/ → subsistema de terminal
 *   - omni/ → adapters omni
 *
 * Handlers de negocio (VLAN, DHCP, etc.) viven en pt-control.
 * Ver docs/architecture/runtime-control-boundary.md
 *
 * Para backward compat de consumers internos: import desde "../legacy"
 */

export * from "./module";
export * from "./runtime-handlers";
