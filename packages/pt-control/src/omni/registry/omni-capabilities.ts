// ============================================================================
// Omni Capabilities - hack capabilities for PT internals
// ============================================================================

import type { CapabilitySpec } from "./capability-types.js";

const NOOP = { type: "primitive" as const, handler: "noop" };

/**
 * Register all omni (hack) capabilities
 */
export function registerOmniCapabilities(register: (spec: CapabilitySpec) => void): void {
  // omni.evaluate.raw
  register({
    id: "omni.evaluate.raw",
    title: "Evaluate Raw JS",
    domain: "evaluate",
    kind: "hack",
    risk: "dangerous",
    description: "Evaluar código JS directamente en el motor C++ de PT",
    tags: ["omni", "evaluate", "hack", "dangerous"],
    prerequisites: [{ type: "capability", constraint: "scriptEngine must be available" }],
    setup: NOOP,
    execute: { type: "hack", adapter: "evaluateExpression" },
    cleanup: NOOP,
    expectedEvidence: { fields: { result: { required: true, type: "any" } } },
    supportPolicy: { minRunsForSupported: 2, flakinessThreshold: 0.2, timeoutMs: 5000 },
  });

  // omni.assessment.read
  register({
    id: "omni.assessment.read",
    title: "Read Assessment Item",
    domain: "assessment",
    kind: "hack",
    risk: "experimental",
    description: "Leer assessment items del Activity",
    tags: ["omni", "assessment", "hack"],
    prerequisites: [{ type: "capability", constraint: "AssessmentModel must be available" }],
    setup: NOOP,
    execute: { type: "hack", adapter: "getAssessmentItem" },
    cleanup: NOOP,
    expectedEvidence: { fields: { value: { required: true, type: "any" } } },
    supportPolicy: { minRunsForSupported: 2, flakinessThreshold: 0.25, timeoutMs: 5000 },
  });

  // omni.process.inspect
  register({
    id: "omni.process.inspect",
    title: "Inspect Process",
    domain: "process",
    kind: "hack",
    risk: "dangerous",
    description: "Inspeccionar procesos de un dispositivo",
    tags: ["omni", "process", "hack"],
    prerequisites: [{ type: "device", constraint: "Device must exist" }],
    setup: NOOP,
    execute: { type: "hack", adapter: "getProcess" },
    cleanup: NOOP,
    expectedEvidence: { fields: { process: { required: true, type: "any" } } },
    supportPolicy: { minRunsForSupported: 2, flakinessThreshold: 0.2, timeoutMs: 5000 },
  });

  // omni.globalscope.inspect
  register({
    id: "omni.globalscope.inspect",
    title: "Inspect Global Scope",
    domain: "global-scope",
    kind: "hack",
    risk: "dangerous",
    description: "Acceder a globals de PT",
    tags: ["omni", "globalscope", "hack"],
    prerequisites: [],
    setup: NOOP,
    execute: { type: "hack", adapter: "accessGlobal" },
    cleanup: NOOP,
    expectedEvidence: { fields: { value: { required: true, type: "any" } } },
    supportPolicy: { minRunsForSupported: 2, flakinessThreshold: 0.2, timeoutMs: 5000 },
  });

  // omni.environment.probe
  register({
    id: "omni.environment.probe",
    title: "Probe Environment",
    domain: "environment",
    kind: "hack",
    risk: "safe",
    description: "Sondear información del entorno PT",
    tags: ["omni", "environment", "hack"],
    prerequisites: [],
    setup: NOOP,
    execute: { type: "hack", adapter: "getEnvironmentInfo" },
    cleanup: NOOP,
    expectedEvidence: { fields: { version: { required: true, type: "string" } } },
    supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.1, timeoutMs: 5000 },
  });

  // omni.device.serialize
  register({
    id: "omni.device.serialize",
    title: "Serialize Device",
    domain: "device",
    kind: "hack",
    risk: "elevated",
    description: "Serializar dispositivo a XML",
    tags: ["omni", "device", "serialize", "hack"],
    prerequisites: [{ type: "device", constraint: "Device must exist" }],
    setup: NOOP,
    execute: { type: "hack", adapter: "serializeDevice" },
    cleanup: NOOP,
    expectedEvidence: { fields: { xml: { required: true, type: "string" } } },
    supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.15, timeoutMs: 5000 },
  });

  // omni.device.skipboot
  register({
    id: "omni.device.skipboot",
    title: "Skip Device Boot",
    domain: "device",
    kind: "hack",
    risk: "dangerous",
    description: "Ejecutar device.skipBoot() para bypass del diálogo inicial IOS",
    tags: ["omni", "device", "skipboot", "hack"],
    prerequisites: [{ type: "device", constraint: "Device must exist" }],
    setup: NOOP,
    execute: { type: "hack", adapter: "skipBootDevice" },
    cleanup: NOOP,
    expectedEvidence: { fields: { skipped: { required: true, type: "boolean" } } },
    supportPolicy: { minRunsForSupported: 2, flakinessThreshold: 0.2, timeoutMs: 5000 },
  });

  // omni.device.mactable
  register({
    id: "omni.device.mactable",
    title: "Get MAC Address Table",
    domain: "device",
    kind: "hack",
    risk: "dangerous",
    description: "Extraer tabla MAC de un switch via getMacAddressTable()",
    tags: ["omni", "device", "mactable", "hack"],
    prerequisites: [{ type: "device", constraint: "Device must exist" }],
    setup: NOOP,
    execute: { type: "hack", adapter: "getMacAddressTable" },
    cleanup: NOOP,
    expectedEvidence: { fields: { entryCount: { required: true, type: "number" } } },
    supportPolicy: { minRunsForSupported: 2, flakinessThreshold: 0.25, timeoutMs: 5000 },
  });

  // omni.device.arp
  register({
    id: "omni.device.arp",
    title: "Get ARP Table",
    domain: "device",
    kind: "hack",
    risk: "dangerous",
    description: "Extraer tabla ARP de un dispositivo via getArpTable()",
    tags: ["omni", "device", "arp", "hack"],
    prerequisites: [{ type: "device", constraint: "Device must exist" }],
    setup: NOOP,
    execute: { type: "hack", adapter: "getArpTable" },
    cleanup: NOOP,
    expectedEvidence: { fields: { found: { required: true, type: "boolean" } } },
    supportPolicy: { minRunsForSupported: 2, flakinessThreshold: 0.25, timeoutMs: 5000 },
  });

  // omni.device.routing
  register({
    id: "omni.device.routing",
    title: "Get Routing Table",
    domain: "device",
    kind: "hack",
    risk: "dangerous",
    description: "Extraer tabla de enrutamiento via getRoutingTable()",
    tags: ["omni", "device", "routing", "hack"],
    prerequisites: [{ type: "device", constraint: "Device must exist" }],
    setup: NOOP,
    execute: { type: "hack", adapter: "getRoutingTable" },
    cleanup: NOOP,
    expectedEvidence: { fields: { found: { required: true, type: "boolean" } } },
    supportPolicy: { minRunsForSupported: 2, flakinessThreshold: 0.25, timeoutMs: 5000 },
  });

  // omni.port.inspect
  register({
    id: "omni.port.inspect",
    title: "Inspect Port",
    domain: "device",
    kind: "hack",
    risk: "dangerous",
    description: "Inspeccionar propiedades físicas de puerto - LED status, BIA, OSPF intervals, ACL applied",
    tags: ["omni", "port", "inspect", "hack"],
    prerequisites: [{ type: "device", constraint: "Device must exist" }],
    setup: NOOP,
    execute: { type: "hack", adapter: "inspectPort" },
    cleanup: NOOP,
    expectedEvidence: { fields: { lightStatus: { required: false, type: "number" }, hasOspf: { required: true, type: "boolean" }, hasAcl: { required: true, type: "boolean" } } },
    supportPolicy: { minRunsForSupported: 2, flakinessThreshold: 0.3, timeoutMs: 5000 },
  });

  // omni.simulation.forward
  register({
    id: "omni.simulation.forward",
    title: "Forward Simulation",
    domain: "environment",
    kind: "hack",
    risk: "dangerous",
    description: "Avanzar N frames de simulación para forzar convergencia (STP, ARP)",
    tags: ["omni", "simulation", "hack"],
    prerequisites: [],
    setup: NOOP,
    execute: { type: "hack", adapter: "forwardSimulation" },
    cleanup: NOOP,
    expectedEvidence: { fields: { framesAdvanced: { required: true, type: "number" } } },
    supportPolicy: { minRunsForSupported: 2, flakinessThreshold: 0.25, timeoutMs: 5000 },
  });

  // omni.workspace.delete
  register({
    id: "omni.workspace.delete",
    title: "Delete Device by Reference",
    domain: "environment",
    kind: "hack",
    risk: "dangerous",
    description: "Borrar dispositivo por referencia de objeto usando w.deleteDevice() - bypass de nombres duplicados",
    tags: ["omni", "workspace", "delete", "hack"],
    prerequisites: [],
    setup: NOOP,
    execute: { type: "hack", adapter: "deleteDeviceByRef" },
    cleanup: NOOP,
    expectedEvidence: { fields: { deleted: { required: true, type: "boolean" } } },
    supportPolicy: { minRunsForSupported: 2, flakinessThreshold: 0.2, timeoutMs: 5000 },
  });
}