// ============================================================================
// Capability Registry - Registro de capabilities disponibles
// ============================================================================

import type {
  CapabilitySpec,
  CapabilityDomain,
  CapabilityKind,
  CapabilityRisk,
} from "./capability-types.js";

const CAPABILITY_REGISTRY: Map<string, CapabilitySpec> = new Map();

const NOOP_ACTION = { type: "primitive" as const, handler: "noop" };

function register(spec: CapabilitySpec): void {
  if (CAPABILITY_REGISTRY.has(spec.id)) {
    throw new Error(`Capability ID duplicado: ${spec.id}`);
  }
  CAPABILITY_REGISTRY.set(spec.id, spec);
}

register({
  id: "device.add",
  title: "Add Device",
  domain: "device",
  kind: "primitive",
  risk: "safe",
  description: "Agregar un dispositivo a la topología",
  tags: ["device", "add", "primitive"],
  prerequisites: [],
  setup: NOOP_ACTION,
  execute: { type: "primitive", handler: "handleAddDevice" },
  cleanup: { type: "primitive", handler: "handleRemoveDevice" },
  expectedEvidence: { fields: { name: { required: true, type: "string" } } },
  supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.1, timeoutMs: 10000 },
});

register({
  id: "device.move",
  title: "Move Device",
  domain: "device",
  kind: "primitive",
  risk: "safe",
  description: "Mover un dispositivo a nuevas coordenadas",
  tags: ["device", "move", "primitive"],
  prerequisites: [
    { type: "device", constraint: "Device must exist" },
  ],
  setup: NOOP_ACTION,
  execute: { type: "primitive", handler: "handleMoveDevice" },
  cleanup: NOOP_ACTION,
  expectedEvidence: { fields: { x: { required: true, type: "number" }, y: { required: true, type: "number" } } },
  supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.1, timeoutMs: 5000 },
});

register({
  id: "device.remove",
  title: "Remove Device",
  domain: "device",
  kind: "primitive",
  risk: "elevated",
  description: "Eliminar un dispositivo de la topología",
  tags: ["device", "remove", "primitive"],
  prerequisites: [],
  setup: { type: "primitive", handler: "handleAddDevice" },
  execute: { type: "primitive", handler: "handleRemoveDevice" },
  cleanup: NOOP_ACTION,
  expectedEvidence: { fields: { removed: { required: true, type: "boolean" } } },
  supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.1, timeoutMs: 5000 },
});

register({
  id: "device.ports.list",
  title: "List Device Ports",
  domain: "device",
  kind: "primitive",
  risk: "safe",
  description: "Listar puertos de un dispositivo",
  tags: ["device", "ports", "list"],
  prerequisites: [
    { type: "device", constraint: "Device must exist" },
  ],
  setup: NOOP_ACTION,
  execute: { type: "primitive", handler: "handleListDevices" },
  cleanup: NOOP_ACTION,
  expectedEvidence: { fields: { ports: { required: true, type: "array" } } },
  supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.1, timeoutMs: 5000 },
});

register({
  id: "link.add",
  title: "Add Link",
  domain: "link",
  kind: "primitive",
  risk: "safe",
  description: "Crear un enlace entre dos dispositivos",
  tags: ["link", "add", "primitive"],
  prerequisites: [
    { type: "device", constraint: "Both devices must exist" },
    { type: "port", constraint: "Both ports must be free" },
  ],
  setup: NOOP_ACTION,
  execute: { type: "primitive", handler: "handleAddLink" },
  cleanup: { type: "primitive", handler: "handleRemoveLink" },
  expectedEvidence: { fields: { linkId: { required: true, type: "string" } } },
  supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.1, timeoutMs: 10000 },
});

register({
  id: "module.add",
  title: "Add Module",
  domain: "module",
  kind: "primitive",
  risk: "elevated",
  description: "Agregar un módulo a un dispositivo",
  tags: ["module", "add", "primitive"],
  prerequisites: [
    { type: "device", constraint: "Device must exist" },
  ],
  setup: NOOP_ACTION,
  execute: { type: "primitive", handler: "handleAddModule" },
  cleanup: { type: "primitive", handler: "handleRemoveModule" },
  expectedEvidence: { fields: { moduleAdded: { required: true, type: "boolean" } } },
  supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.15, timeoutMs: 10000 },
});

register({
  id: "host.dhcp.set",
  title: "Configure DHCP Host",
  domain: "host",
  kind: "primitive",
  risk: "safe",
  description: "Configurar DHCP en un host PC/Server",
  tags: ["host", "dhcp", "primitive"],
  prerequisites: [
    { type: "device", constraint: "Host must exist" },
  ],
  setup: NOOP_ACTION,
  execute: { type: "primitive", handler: "handleConfigDhcp" },
  cleanup: NOOP_ACTION,
  expectedEvidence: { fields: { dhcpEnabled: { required: true, type: "boolean" } } },
  supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.1, timeoutMs: 10000 },
});

register({
  id: "topology.snapshot",
  title: "Get Topology Snapshot",
  domain: "snapshot",
  kind: "primitive",
  risk: "safe",
  description: "Obtener snapshot del estado actual de la topología",
  tags: ["topology", "snapshot", "primitive"],
  prerequisites: [],
  setup: NOOP_ACTION,
  execute: { type: "primitive", handler: "handleSnapshot" },
  cleanup: NOOP_ACTION,
  expectedEvidence: { fields: { devices: { required: true, type: "array" }, links: { required: true, type: "array" } } },
  supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.05, timeoutMs: 5000 },
});

register({
  id: "terminal.session.open",
  title: "Open Terminal Session",
  domain: "terminal",
  kind: "primitive",
  risk: "safe",
  description: "Abrir una sesión de terminal IOS",
  tags: ["terminal", "session", "primitive"],
  prerequisites: [
    { type: "device", constraint: "Device must exist" },
  ],
  setup: NOOP_ACTION,
  execute: { type: "terminal", handler: "handleOpenSession" },
  cleanup: { type: "terminal", handler: "handleCloseSession" },
  expectedEvidence: { fields: { sessionId: { required: true, type: "string" } } },
  supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.1, timeoutMs: 15000 },
});

register({
  id: "terminal.session.execute",
  title: "Execute Terminal Command",
  domain: "terminal",
  kind: "primitive",
  risk: "safe",
  description: "Ejecutar un comando IOS",
  tags: ["terminal", "command", "primitive"],
  prerequisites: [
    { type: "device", constraint: "Session must be open" },
  ],
  setup: NOOP_ACTION,
  execute: { type: "terminal", handler: "handleExecuteCommand" },
  cleanup: NOOP_ACTION,
  expectedEvidence: { fields: { output: { required: true, type: "string" }, status: { required: true, type: "number" } } },
  supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.15, timeoutMs: 30000 },
});

register({
  id: "terminal.pager.advance",
  title: "Advance Terminal Pager",
  domain: "terminal",
  kind: "primitive",
  risk: "safe",
  description: "Avanzar el paginador --More--",
  tags: ["terminal", "pager", "primitive"],
  prerequisites: [
    { type: "device", constraint: "Pager must be active" },
  ],
  setup: NOOP_ACTION,
  execute: { type: "terminal", handler: "handlePagerAdvance" },
  cleanup: NOOP_ACTION,
  expectedEvidence: { fields: { advanced: { required: true, type: "boolean" } } },
  supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.1, timeoutMs: 5000 },
});

register({
  id: "omni.evaluate.raw",
  title: "Evaluate Raw JS",
  domain: "evaluate",
  kind: "hack",
  risk: "dangerous",
  description: "Evaluar código JS directamente en el motor C++ de PT",
  tags: ["omni", "evaluate", "hack", "dangerous"],
  prerequisites: [
    { type: "capability", constraint: "scriptEngine must be available" },
  ],
  setup: NOOP_ACTION,
  execute: { type: "hack", adapter: "evaluateExpression" },
  cleanup: NOOP_ACTION,
  expectedEvidence: { fields: { result: { required: true, type: "any" } } },
  supportPolicy: { minRunsForSupported: 2, flakinessThreshold: 0.2, timeoutMs: 5000 },
});

register({
  id: "omni.assessment.read",
  title: "Read Assessment Item",
  domain: "assessment",
  kind: "hack",
  risk: "experimental",
  description: "Leer assessment items del Activity",
  tags: ["omni", "assessment", "hack"],
  prerequisites: [
    { type: "capability", constraint: "AssessmentModel must be available" },
  ],
  setup: NOOP_ACTION,
  execute: { type: "hack", adapter: "getAssessmentItem" },
  cleanup: NOOP_ACTION,
  expectedEvidence: { fields: { value: { required: true, type: "any" } } },
  supportPolicy: { minRunsForSupported: 2, flakinessThreshold: 0.25, timeoutMs: 5000 },
});

register({
  id: "omni.process.inspect",
  title: "Inspect Process",
  domain: "process",
  kind: "hack",
  risk: "dangerous",
  description: "Inspeccionar procesos de un dispositivo",
  tags: ["omni", "process", "hack"],
  prerequisites: [
    { type: "device", constraint: "Device must exist" },
  ],
  setup: NOOP_ACTION,
  execute: { type: "hack", adapter: "getProcess" },
  cleanup: NOOP_ACTION,
  expectedEvidence: { fields: { process: { required: true, type: "any" } } },
  supportPolicy: { minRunsForSupported: 2, flakinessThreshold: 0.2, timeoutMs: 5000 },
});

register({
  id: "omni.globalscope.inspect",
  title: "Inspect Global Scope",
  domain: "global-scope",
  kind: "hack",
  risk: "dangerous",
  description: "Acceder a globals de PT",
  tags: ["omni", "globalscope", "hack"],
  prerequisites: [],
  setup: NOOP_ACTION,
  execute: { type: "hack", adapter: "accessGlobal" },
  cleanup: NOOP_ACTION,
  expectedEvidence: { fields: { value: { required: true, type: "any" } } },
  supportPolicy: { minRunsForSupported: 2, flakinessThreshold: 0.2, timeoutMs: 5000 },
});

register({
  id: "omni.environment.probe",
  title: "Probe Environment",
  domain: "environment",
  kind: "hack",
  risk: "safe",
  description: "Sondear información del entorno PT",
  tags: ["omni", "environment", "hack"],
  prerequisites: [],
  setup: NOOP_ACTION,
  execute: { type: "hack", adapter: "getEnvironmentInfo" },
  cleanup: NOOP_ACTION,
  expectedEvidence: { fields: { version: { required: true, type: "string" } } },
  supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.1, timeoutMs: 5000 },
});

register({
  id: "omni.device.serialize",
  title: "Serialize Device",
  domain: "device",
  kind: "hack",
  risk: "elevated",
  description: "Serializar dispositivo a XML",
  tags: ["omni", "device", "serialize", "hack"],
  prerequisites: [
    { type: "device", constraint: "Device must exist" },
  ],
  setup: NOOP_ACTION,
  execute: { type: "hack", adapter: "serializeDevice" },
  cleanup: NOOP_ACTION,
  expectedEvidence: { fields: { xml: { required: true, type: "string" } } },
  supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.15, timeoutMs: 5000 },
});

register({
  id: "omni.device.skipboot",
  title: "Skip Device Boot",
  domain: "device",
  kind: "hack",
  risk: "dangerous",
  description: "Ejecutar device.skipBoot() para bypass del diálogo inicial IOS",
  tags: ["omni", "device", "skipboot", "hack"],
  prerequisites: [
    { type: "device", constraint: "Device must exist" },
  ],
  setup: NOOP_ACTION,
  execute: { type: "hack", adapter: "skipBootDevice" },
  cleanup: NOOP_ACTION,
  expectedEvidence: { fields: { skipped: { required: true, type: "boolean" } } },
  supportPolicy: { minRunsForSupported: 2, flakinessThreshold: 0.2, timeoutMs: 5000 },
});

register({
  id: "omni.device.mactable",
  title: "Get MAC Address Table",
  domain: "device",
  kind: "hack",
  risk: "dangerous",
  description: "Extraer tabla MAC de un switch via getMacAddressTable()",
  tags: ["omni", "device", "mactable", "hack"],
  prerequisites: [
    { type: "device", constraint: "Device must exist" },
  ],
  setup: NOOP_ACTION,
  execute: { type: "hack", adapter: "getMacAddressTable" },
  cleanup: NOOP_ACTION,
  expectedEvidence: { fields: { entryCount: { required: true, type: "number" } } },
  supportPolicy: { minRunsForSupported: 2, flakinessThreshold: 0.25, timeoutMs: 5000 },
});

register({
  id: "omni.device.arp",
  title: "Get ARP Table",
  domain: "device",
  kind: "hack",
  risk: "dangerous",
  description: "Extraer tabla ARP de un dispositivo via getArpTable()",
  tags: ["omni", "device", "arp", "hack"],
  prerequisites: [
    { type: "device", constraint: "Device must exist" },
  ],
  setup: NOOP_ACTION,
  execute: { type: "hack", adapter: "getArpTable" },
  cleanup: NOOP_ACTION,
  expectedEvidence: { fields: { found: { required: true, type: "boolean" } } },
  supportPolicy: { minRunsForSupported: 2, flakinessThreshold: 0.25, timeoutMs: 5000 },
});

register({
  id: "omni.device.routing",
  title: "Get Routing Table",
  domain: "device",
  kind: "hack",
  risk: "dangerous",
  description: "Extraer tabla de enrutamiento via getRoutingTable()",
  tags: ["omni", "device", "routing", "hack"],
  prerequisites: [
    { type: "device", constraint: "Device must exist" },
  ],
  setup: NOOP_ACTION,
  execute: { type: "hack", adapter: "getRoutingTable" },
  cleanup: NOOP_ACTION,
  expectedEvidence: { fields: { found: { required: true, type: "boolean" } } },
  supportPolicy: { minRunsForSupported: 2, flakinessThreshold: 0.25, timeoutMs: 5000 },
});

register({
  id: "omni.port.inspect",
  title: "Inspect Port",
  domain: "device",
  kind: "hack",
  risk: "dangerous",
  description: "Inspeccionar propiedades físicas de puerto - LED status, BIA, OSPF intervals, ACL applied",
  tags: ["omni", "port", "inspect", "hack"],
  prerequisites: [
    { type: "device", constraint: "Device must exist" },
  ],
  setup: NOOP_ACTION,
  execute: { type: "hack", adapter: "inspectPort" },
  cleanup: NOOP_ACTION,
  expectedEvidence: { fields: { lightStatus: { required: false, type: "number" }, hasOspf: { required: true, type: "boolean" }, hasAcl: { required: true, type: "boolean" } } },
  supportPolicy: { minRunsForSupported: 2, flakinessThreshold: 0.3, timeoutMs: 5000 },
});

register({
  id: "omni.simulation.forward",
  title: "Forward Simulation",
  domain: "environment",
  kind: "hack",
  risk: "dangerous",
  description: "Avanzar N frames de simulación para forzar convergencia (STP, ARP)",
  tags: ["omni", "simulation", "hack"],
  prerequisites: [],
  setup: NOOP_ACTION,
  execute: { type: "hack", adapter: "forwardSimulation" },
  cleanup: NOOP_ACTION,
  expectedEvidence: { fields: { framesAdvanced: { required: true, type: "number" } } },
  supportPolicy: { minRunsForSupported: 2, flakinessThreshold: 0.25, timeoutMs: 5000 },
});

register({
  id: "omni.workspace.delete",
  title: "Delete Device by Reference",
  domain: "environment",
  kind: "hack",
  risk: "dangerous",
  description: "Borrar dispositivo por referencia de objeto usando w.deleteDevice() - bypass de nombres duplicados",
  tags: ["omni", "workspace", "delete", "hack"],
  prerequisites: [],
  setup: NOOP_ACTION,
  execute: { type: "hack", adapter: "deleteDeviceByRef" },
  cleanup: NOOP_ACTION,
  expectedEvidence: { fields: { deleted: { required: true, type: "boolean" } } },
  supportPolicy: { minRunsForSupported: 2, flakinessThreshold: 0.2, timeoutMs: 5000 },
});

register({
  id: "workflow.vlan.simple",
  title: "VLAN Simple",
  domain: "orchestration",
  kind: "workflow",
  risk: "elevated",
  description: "Crear VLAN y asignar puertos",
  tags: ["workflow", "vlan", "orchestration"],
  prerequisites: [
    { type: "device", constraint: "Switch must exist" },
  ],
  setup: NOOP_ACTION,
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

register({
  id: "workflow.trunk.simple",
  title: "Trunk Simple",
  domain: "orchestration",
  kind: "workflow",
  risk: "elevated",
  description: "Configurar trunk entre switches",
  tags: ["workflow", "trunk", "orchestration"],
  prerequisites: [
    { type: "device", constraint: "Two switches must exist" },
  ],
  setup: NOOP_ACTION,
  execute: { type: "workflow", plan: "trunkSimplePlan" },
  cleanup: { type: "workflow", plan: "trunkSimpleCleanup" },
  expectedEvidence: {
    fields: {
      trunkConfigured: { required: true, type: "boolean" },
    },
  },
  supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.2, timeoutMs: 30000 },
});

register({
  id: "workflow.router-on-stick",
  title: "Router-on-a-Stick",
  domain: "orchestration",
  kind: "workflow",
  risk: "elevated",
  description: "Configurar router-on-a-stick con subinterfaces",
  tags: ["workflow", "router", "subinterface", "orchestration"],
  prerequisites: [
    { type: "device", constraint: "Router must exist" },
  ],
  setup: NOOP_ACTION,
  execute: { type: "workflow", plan: "routerOnAStickPlan" },
  cleanup: { type: "workflow", plan: "routerOnAStickCleanup" },
  expectedEvidence: {
    fields: {
      subinterfacesCreated: { required: true, type: "number" },
    },
  },
  supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.2, timeoutMs: 45000 },
});

register({
  id: "workflow.dhcp.diagnosis",
  title: "DHCP Diagnosis",
  domain: "diagnosis",
  kind: "workflow",
  risk: "safe",
  description: "Diagnosticar problemas DHCP",
  tags: ["workflow", "dhcp", "diagnosis"],
  prerequisites: [
    { type: "device", constraint: "Router with DHCP must exist" },
  ],
  setup: NOOP_ACTION,
  execute: { type: "workflow", plan: "dhcpDiagnosisPlan" },
  cleanup: NOOP_ACTION,
  expectedEvidence: {
    fields: {
      issuesFound: { required: true, type: "array" },
    },
  },
  supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.15, timeoutMs: 30000 },
});

register({
  id: "terminal.show-version",
  title: "Show Version",
  domain: "terminal",
  kind: "primitive",
  risk: "safe",
  description: "Ejecutar show version en un dispositivo IOS",
  tags: ["terminal", "ios", "show", "version"],
  prerequisites: [{ type: "device", constraint: "IOS device must exist" }],
  setup: NOOP_ACTION,
  execute: { type: "terminal", handler: "show version", code: "show version" },
  cleanup: NOOP_ACTION,
  expectedEvidence: {
    fields: {
      output: { required: true, type: "string" },
      status: { required: true, type: "number" },
    },
  },
  supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.1, timeoutMs: 15000 },
});

register({
  id: "terminal.show-running-config",
  title: "Show Running Config",
  domain: "terminal",
  kind: "primitive",
  risk: "safe",
  description: "Ejecutar show running-config en un dispositivo IOS",
  tags: ["terminal", "ios", "show", "running-config"],
  prerequisites: [{ type: "device", constraint: "IOS device must exist" }],
  setup: NOOP_ACTION,
  execute: { type: "terminal", handler: "show running-config", code: "show running-config" },
  cleanup: NOOP_ACTION,
  expectedEvidence: {
    fields: {
      output: { required: true, type: "string" },
      status: { required: true, type: "number" },
    },
  },
  supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.15, timeoutMs: 25000 },
});

register({
  id: "host.ipconfig",
  title: "Host Ipconfig",
  domain: "host",
  kind: "primitive",
  risk: "safe",
  description: "Ejecutar ipconfig /all en un host",
  tags: ["terminal", "host", "ipconfig"],
  prerequisites: [{ type: "device", constraint: "Host device must exist" }],
  setup: NOOP_ACTION,
  execute: { type: "terminal", handler: "ipconfig /all", code: "ipconfig /all" },
  cleanup: NOOP_ACTION,
  expectedEvidence: {
    fields: {
      output: { required: true, type: "string" },
      status: { required: true, type: "number" },
    },
  },
  supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.1, timeoutMs: 15000 },
});

register({
  id: "host.ping",
  title: "Host Ping",
  domain: "host",
  kind: "primitive",
  risk: "safe",
  description: "Ejecutar ping desde un host",
  tags: ["terminal", "host", "ping"],
  prerequisites: [{ type: "device", constraint: "Host device must exist" }],
  setup: NOOP_ACTION,
  execute: { type: "terminal", handler: "ping", code: "ping" },
  cleanup: NOOP_ACTION,
  expectedEvidence: {
    fields: {
      output: { required: true, type: "string" },
      status: { required: true, type: "number" },
    },
  },
  supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.15, timeoutMs: 20000 },
});

register({
  id: "host.tracert",
  title: "Host Traceroute",
  domain: "host",
  kind: "primitive",
  risk: "safe",
  description: "Ejecutar tracert desde un host",
  tags: ["terminal", "host", "tracert", "traceroute"],
  prerequisites: [{ type: "device", constraint: "Host device must exist" }],
  setup: NOOP_ACTION,
  execute: { type: "terminal", handler: "tracert", code: "tracert" },
  cleanup: NOOP_ACTION,
  expectedEvidence: {
    fields: {
      output: { required: true, type: "string" },
      status: { required: true, type: "number" },
    },
  },
  supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.2, timeoutMs: 60000 },
});

register({
  id: "host.arp",
  title: "Host ARP Table",
  domain: "host",
  kind: "primitive",
  risk: "safe",
  description: "Ejecutar arp -a en un host",
  tags: ["terminal", "host", "arp"],
  prerequisites: [{ type: "device", constraint: "Host device must exist" }],
  setup: NOOP_ACTION,
  execute: { type: "terminal", handler: "arp -a", code: "arp -a" },
  cleanup: NOOP_ACTION,
  expectedEvidence: {
    fields: {
      output: { required: true, type: "string" },
      status: { required: true, type: "number" },
    },
  },
  supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.1, timeoutMs: 15000 },
});

register({
  id: "terminal.show-ip-interface-brief",
  title: "Show IP Interface Brief",
  domain: "terminal",
  kind: "primitive",
  risk: "safe",
  description: "Ejecutar show ip interface brief en un dispositivo IOS",
  tags: ["terminal", "ios", "show", "ip-interface"],
  prerequisites: [{ type: "device", constraint: "IOS device must exist" }],
  setup: NOOP_ACTION,
  execute: { type: "terminal", handler: "show ip interface brief", code: "show ip interface brief" },
  cleanup: NOOP_ACTION,
  expectedEvidence: {
    fields: {
      output: { required: true, type: "string" },
      status: { required: true, type: "number" },
    },
  },
  supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.1, timeoutMs: 15000 },
});

register({
  id: "terminal.show-vlan-brief",
  title: "Show VLAN Brief",
  domain: "terminal",
  kind: "primitive",
  risk: "safe",
  description: "Ejecutar show vlan brief en un switch IOS",
  tags: ["terminal", "ios", "show", "vlan"],
  prerequisites: [{ type: "device", constraint: "Switch must exist" }],
  setup: NOOP_ACTION,
  execute: { type: "terminal", handler: "show vlan brief", code: "show vlan brief" },
  cleanup: NOOP_ACTION,
  expectedEvidence: {
    fields: {
      output: { required: true, type: "string" },
      status: { required: true, type: "number" },
    },
  },
  supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.1, timeoutMs: 15000 },
});

register({
  id: "terminal.show-cdp-neighbors",
  title: "Show CDP Neighbors",
  domain: "terminal",
  kind: "primitive",
  risk: "safe",
  description: "Ejecutar show cdp neighbors en un dispositivo IOS",
  tags: ["terminal", "ios", "show", "cdp", "neighbors"],
  prerequisites: [{ type: "device", constraint: "IOS device must exist" }],
  setup: NOOP_ACTION,
  execute: { type: "terminal", handler: "show cdp neighbors", code: "show cdp neighbors" },
  cleanup: NOOP_ACTION,
  expectedEvidence: {
    fields: {
      output: { required: true, type: "string" },
      status: { required: true, type: "number" },
    },
  },
  supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.15, timeoutMs: 20000 },
});

register({
  id: "terminal.show-ip-route",
  title: "Show IP Route",
  domain: "terminal",
  kind: "primitive",
  risk: "safe",
  description: "Ejecutar show ip route en un router IOS",
  tags: ["terminal", "ios", "show", "ip-route", "routing"],
  prerequisites: [{ type: "device", constraint: "Router must exist" }],
  setup: NOOP_ACTION,
  execute: { type: "terminal", handler: "show ip route", code: "show ip route" },
  cleanup: NOOP_ACTION,
  expectedEvidence: {
    fields: {
      output: { required: true, type: "string" },
      status: { required: true, type: "number" },
    },
  },
  supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.1, timeoutMs: 15000 },
});

register({
  id: "terminal.show-mac-address-table",
  title: "Show MAC Address Table",
  domain: "terminal",
  kind: "primitive",
  risk: "safe",
  description: "Ejecutar show mac address-table en un switch IOS",
  tags: ["terminal", "ios", "show", "mac", "switch"],
  prerequisites: [{ type: "device", constraint: "Switch must exist" }],
  setup: NOOP_ACTION,
  execute: { type: "terminal", handler: "show mac address-table", code: "show mac address-table" },
  cleanup: NOOP_ACTION,
  expectedEvidence: {
    fields: {
      output: { required: true, type: "string" },
      status: { required: true, type: "number" },
    },
  },
  supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.1, timeoutMs: 15000 },
});

export function getCapability(id: string): CapabilitySpec | undefined {
  return CAPABILITY_REGISTRY.get(id);
}

export function listCapabilities(): CapabilitySpec[] {
  return Array.from(CAPABILITY_REGISTRY.values());
}

export function filterCapabilities(options: {
  domain?: CapabilityDomain;
  kind?: CapabilityKind;
  risk?: CapabilityRisk;
}): CapabilitySpec[] {
  let result = Array.from(CAPABILITY_REGISTRY.values());

  if (options.domain) {
    result = result.filter((c) => c.domain === options.domain);
  }
  if (options.kind) {
    result = result.filter((c) => c.kind === options.kind);
  }
  if (options.risk) {
    result = result.filter((c) => c.risk === options.risk);
  }

  return result;
}

export function capabilityExists(id: string): boolean {
  return CAPABILITY_REGISTRY.has(id);
}