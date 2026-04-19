// ============================================================================
// Capability Suites - Agrupaciones de capabilities
// ============================================================================

import type { CapabilityRisk } from "./capability-types.js";
import { filterCapabilities } from "./capability-registry.js";
import { INTERACTIVE_VERIFICATION_BASELINES } from "./suites/interactive-verification-baselines.js";

export interface CapabilitySuite {
  id: string;
  title: string;
  description: string;
  capabilityIds: string[];
  estimatedDurationMs: number;
  risk: CapabilityRisk;
  prerequisites: string[];
}

const SUITES: Map<string, CapabilitySuite> = new Map();

function registerSuite(suite: CapabilitySuite): void {
  SUITES.set(suite.id, suite);
}

registerSuite({
  id: "device-basic",
  title: "Device Basic",
  description: "Operaciones básicas de dispositivo",
  capabilityIds: ["device.add", "device.move", "device.remove", "device.ports.list"],
  estimatedDurationMs: 30000,
  risk: "safe",
  prerequisites: [],
});

registerSuite({
  id: "link-basic",
  title: "Link Basic",
  description: "Operaciones básicas de enlace",
  capabilityIds: ["link.add"],
  estimatedDurationMs: 15000,
  risk: "safe",
  prerequisites: ["device-basic"],
});

registerSuite({
  id: "module-basic",
  title: "Module Basic",
  description: "Operaciones de módulos",
  capabilityIds: ["module.add"],
  estimatedDurationMs: 15000,
  risk: "elevated",
  prerequisites: ["device-basic"],
});

registerSuite({
  id: "host-basic",
  title: "Host Basic",
  description: "Configuración de hosts",
  capabilityIds: ["host.dhcp.set"],
  estimatedDurationMs: 15000,
  risk: "safe",
  prerequisites: ["device-basic"],
});

registerSuite({
  id: "terminal-core",
  title: "Terminal Core",
  description: "Operaciones de terminal",
  capabilityIds: ["terminal.session.open", "terminal.session.execute", "terminal.pager.advance"],
  estimatedDurationMs: 60000,
  risk: "safe",
  prerequisites: ["device-basic"],
});

registerSuite({
  id: "omni-safe",
  title: "Omni Safe",
  description: "Capabilities omni seguras",
  capabilityIds: ["omni.environment.probe"],
  estimatedDurationMs: 10000,
  risk: "safe",
  prerequisites: [],
});

registerSuite({
  id: "omni-elevated",
  title: "Omni Elevated",
  description: "Capabilities omni con riesgo elevado",
  capabilityIds: ["omni.device.serialize"],
  estimatedDurationMs: 15000,
  risk: "elevated",
  prerequisites: ["omni-safe"],
});

registerSuite({
  id: "omni-hacks",
  title: "Omni Hacks",
  description: "Todas las capabilities hack",
  capabilityIds: [
    "omni.evaluate.raw",
    "omni.assessment.read",
    "omni.process.inspect",
    "omni.globalscope.inspect",
    "omni.environment.probe",
    "omni.device.serialize",
  ],
  estimatedDurationMs: 45000,
  risk: "dangerous",
  prerequisites: [],
});

registerSuite({
  id: "workflow-basic",
  title: "Workflow Basic",
  description: "Workflows básicos",
  capabilityIds: ["workflow.vlan.simple", "workflow.trunk.simple", "workflow.dhcp.diagnosis"],
  estimatedDurationMs: 120000,
  risk: "elevated",
  prerequisites: ["device-basic", "terminal-core"],
});

registerSuite({
  id: "verification-basic",
  title: "Verification Basic",
  description: "Capabilities de verificación",
  capabilityIds: ["topology.snapshot"],
  estimatedDurationMs: 10000,
  risk: "safe",
  prerequisites: [],
});

registerSuite({
  id: "regression-smoke",
  title: "Regression Smoke",
  description: "Suite mínimo para regression testing",
  capabilityIds: [
    "device.add",
    "device.move",
    "link.add",
    "topology.snapshot",
    "omni.environment.probe",
  ],
  estimatedDurationMs: 45000,
  risk: "safe",
  prerequisites: [],
});

export function getSuite(id: string): CapabilitySuite | undefined {
  return SUITES.get(id);
}

export function listSuites(): CapabilitySuite[] {
  return Array.from(SUITES.values());
}

export function getSuiteCapabilities(suiteId: string): string[] {
  const suite = SUITES.get(suiteId);
  return suite?.capabilityIds ?? [];
}

export function filterSuitesByRisk(risk: CapabilityRisk): CapabilitySuite[] {
  return Array.from(SUITES.values()).filter((s) => s.risk === risk);
}

export function getPrerequisites(suiteId: string): string[] {
  const suite = SUITES.get(suiteId);
  return suite?.prerequisites ?? [];
}

registerSuite({
  id: "interactive-smoke",
  title: "Interactive Smoke",
  description: "Baseline mínima de interacción terminal IOS/host con evidencia verificable",
  capabilityIds: [...INTERACTIVE_VERIFICATION_BASELINES["interactive-smoke"]],
  estimatedDurationMs: 60000,
  risk: "safe",
  prerequisites: [],
});

registerSuite({
  id: "interactive-network",
  title: "Interactive Network",
  description: "Baseline de ping/tracert/arp/cdp",
  capabilityIds: [...INTERACTIVE_VERIFICATION_BASELINES["interactive-network"]],
  estimatedDurationMs: 90000,
  risk: "safe",
  prerequisites: [],
});

registerSuite({
  id: "interactive-switching",
  title: "Interactive Switching",
  description: "Baseline de switching y observabilidad IOS",
  capabilityIds: [...INTERACTIVE_VERIFICATION_BASELINES["interactive-switching"]],
  estimatedDurationMs: 60000,
  risk: "safe",
  prerequisites: [],
});