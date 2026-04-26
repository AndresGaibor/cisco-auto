// ============================================================================
// Workflow Capabilities - workflow.*, dhcp.diagnosis
// ============================================================================

import type { CapabilitySpec } from "./capability-types.js";

const NOOP = { type: "primitive" as const, handler: "noop" };

/**
 * Register all workflow capabilities
 */
export function registerWorkflowCapabilities(register: (spec: CapabilitySpec) => void): void {
  // workflow.vlan.simple
  register({
    id: "workflow.vlan.simple",
    title: "VLAN Simple",
    domain: "orchestration",
    kind: "workflow",
    risk: "elevated",
    description: "Crear VLAN y asignar puertos",
    tags: ["workflow", "vlan", "orchestration"],
    prerequisites: [{ type: "device", constraint: "Switch must exist" }],
    setup: NOOP,
    execute: { type: "workflow", plan: "vlanSimplePlan" },
    cleanup: { type: "workflow", plan: "vlanSimpleCleanup" },
    expectedEvidence: {
      fields: {
        vlanCreated: { required: true, type: "boolean" },
        portsAssigned: { required: true, type: "number" },
      },
    },
    supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.15, timeoutMs: 30000 },
  });

  // workflow.trunk.simple
  register({
    id: "workflow.trunk.simple",
    title: "Trunk Simple",
    domain: "orchestration",
    kind: "workflow",
    risk: "elevated",
    description: "Configurar trunk entre switches",
    tags: ["workflow", "trunk", "orchestration"],
    prerequisites: [{ type: "device", constraint: "Two switches must exist" }],
    setup: NOOP,
    execute: { type: "workflow", plan: "trunkSimplePlan" },
    cleanup: { type: "workflow", plan: "trunkSimpleCleanup" },
    expectedEvidence: {
      fields: {
        trunkConfigured: { required: true, type: "boolean" },
      },
    },
    supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.2, timeoutMs: 30000 },
  });

  // workflow.router-on-stick
  register({
    id: "workflow.router-on-stick",
    title: "Router-on-a-Stick",
    domain: "orchestration",
    kind: "workflow",
    risk: "elevated",
    description: "Configurar router-on-a-stick con subinterfaces",
    tags: ["workflow", "router", "subinterface", "orchestration"],
    prerequisites: [{ type: "device", constraint: "Router must exist" }],
    setup: NOOP,
    execute: { type: "workflow", plan: "routerOnAStickPlan" },
    cleanup: { type: "workflow", plan: "routerOnAStickCleanup" },
    expectedEvidence: {
      fields: {
        subinterfacesCreated: { required: true, type: "number" },
      },
    },
    supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.2, timeoutMs: 45000 },
  });

  // workflow.dhcp.diagnosis
  register({
    id: "workflow.dhcp.diagnosis",
    title: "DHCP Diagnosis",
    domain: "diagnosis",
    kind: "workflow",
    risk: "safe",
    description: "Diagnosticar problemas DHCP",
    tags: ["workflow", "dhcp", "diagnosis"],
    prerequisites: [{ type: "device", constraint: "Router with DHCP must exist" }],
    setup: NOOP,
    execute: { type: "workflow", plan: "dhcpDiagnosisPlan" },
    cleanup: NOOP,
    expectedEvidence: {
      fields: {
        issuesFound: { required: true, type: "array" },
      },
    },
    supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.15, timeoutMs: 30000 },
  });

  // host.dhcp.set
  register({
    id: "host.dhcp.set",
    title: "Configure DHCP Host",
    domain: "host",
    kind: "primitive",
    risk: "safe",
    description: "Configurar DHCP en un host PC/Server",
    tags: ["host", "dhcp", "primitive"],
    prerequisites: [{ type: "device", constraint: "Host must exist" }],
    setup: NOOP,
    execute: { type: "primitive", handler: "handleConfigDhcp" },
    cleanup: NOOP,
    expectedEvidence: { fields: { dhcpEnabled: { required: true, type: "boolean" } } },
    supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.1, timeoutMs: 10000 },
  });
}