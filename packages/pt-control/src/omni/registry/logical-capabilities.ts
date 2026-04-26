// ============================================================================
// Logical Capabilities - topology snapshot and related
// ============================================================================

import type { CapabilitySpec } from "./capability-types.js";

const NOOP = { type: "primitive" as const, handler: "noop" };

/**
 * Register all logical (snapshot) capabilities
 */
export function registerLogicalCapabilities(register: (spec: CapabilitySpec) => void): void {
  // topology.snapshot
  register({
    id: "topology.snapshot",
    title: "Get Topology Snapshot",
    domain: "snapshot",
    kind: "primitive",
    risk: "safe",
    description: "Obtener snapshot del estado actual de la topología",
    tags: ["topology", "snapshot", "primitive"],
    prerequisites: [],
    setup: NOOP,
    execute: { type: "primitive", handler: "handleSnapshot" },
    cleanup: NOOP,
    expectedEvidence: { fields: { devices: { required: true, type: "array" }, links: { required: true, type: "array" } } },
    supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.05, timeoutMs: 5000 },
  });
}