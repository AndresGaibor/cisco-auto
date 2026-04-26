// ============================================================================
// Terminal Capabilities - terminal.session.*, host.* commands
// ============================================================================

import type { CapabilitySpec } from "./capability-types.js";

const NOOP = { type: "primitive" as const, handler: "noop" };

/**
 * Register all terminal and host capabilities
 */
export function registerTerminalCapabilities(register: (spec: CapabilitySpec) => void): void {
  // Terminal session capabilities
  register({
    id: "terminal.session.open",
    title: "Open Terminal Session",
    domain: "terminal",
    kind: "primitive",
    risk: "safe",
    description: "Abrir una sesión de terminal IOS",
    tags: ["terminal", "session", "primitive"],
    prerequisites: [{ type: "device", constraint: "Device must exist" }],
    setup: NOOP,
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
    prerequisites: [{ type: "device", constraint: "Session must be open" }],
    setup: NOOP,
    execute: { type: "terminal", handler: "handleExecuteCommand" },
    cleanup: NOOP,
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
    prerequisites: [{ type: "device", constraint: "Pager must be active" }],
    setup: NOOP,
    execute: { type: "terminal", handler: "handlePagerAdvance" },
    cleanup: NOOP,
    expectedEvidence: { fields: { advanced: { required: true, type: "boolean" } } },
    supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.1, timeoutMs: 5000 },
  });

  // Terminal show commands
  register({
    id: "terminal.show-version",
    title: "Show Version",
    domain: "terminal",
    kind: "primitive",
    risk: "safe",
    description: "Ejecutar show version en un dispositivo IOS",
    tags: ["terminal", "ios", "show", "version"],
    prerequisites: [{ type: "device", constraint: "IOS device must exist" }],
    setup: NOOP,
    execute: { type: "terminal", handler: "show version", code: "show version" },
    cleanup: NOOP,
    expectedEvidence: { fields: { output: { required: true, type: "string" }, status: { required: true, type: "number" } } },
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
    setup: NOOP,
    execute: { type: "terminal", handler: "show running-config", code: "show running-config" },
    cleanup: NOOP,
    expectedEvidence: { fields: { output: { required: true, type: "string" }, status: { required: true, type: "number" } } },
    supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.15, timeoutMs: 25000 },
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
    setup: NOOP,
    execute: { type: "terminal", handler: "show ip interface brief", code: "show ip interface brief" },
    cleanup: NOOP,
    expectedEvidence: { fields: { output: { required: true, type: "string" }, status: { required: true, type: "number" } } },
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
    setup: NOOP,
    execute: { type: "terminal", handler: "show vlan brief", code: "show vlan brief" },
    cleanup: NOOP,
    expectedEvidence: { fields: { output: { required: true, type: "string" }, status: { required: true, type: "number" } } },
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
    setup: NOOP,
    execute: { type: "terminal", handler: "show cdp neighbors", code: "show cdp neighbors" },
    cleanup: NOOP,
    expectedEvidence: { fields: { output: { required: true, type: "string" }, status: { required: true, type: "number" } } },
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
    setup: NOOP,
    execute: { type: "terminal", handler: "show ip route", code: "show ip route" },
    cleanup: NOOP,
    expectedEvidence: { fields: { output: { required: true, type: "string" }, status: { required: true, type: "number" } } },
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
    setup: NOOP,
    execute: { type: "terminal", handler: "show mac address-table", code: "show mac address-table" },
    cleanup: NOOP,
    expectedEvidence: { fields: { output: { required: true, type: "string" }, status: { required: true, type: "number" } } },
    supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.1, timeoutMs: 15000 },
  });

  // Host capabilities
  register({
    id: "host.command",
    title: "Host Command",
    domain: "host",
    kind: "primitive",
    risk: "safe",
    description: "Ejecutar un comando genérico en un host",
    tags: ["terminal", "host", "command"],
    prerequisites: [{ type: "device", constraint: "Host device must exist" }],
    setup: NOOP,
    execute: { type: "terminal", handler: "handleHostCommand" },
    cleanup: NOOP,
    expectedEvidence: { fields: { output: { required: true, type: "string" }, status: { required: true, type: "number" } } },
    supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.1, timeoutMs: 20000 },
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
    setup: NOOP,
    execute: { type: "terminal", handler: "handleHostIpconfig", code: "ipconfig /all" },
    cleanup: NOOP,
    expectedEvidence: { fields: { output: { required: true, type: "string" }, status: { required: true, type: "number" } } },
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
    setup: NOOP,
    execute: { type: "terminal", handler: "handleHostPing", code: "ping" },
    cleanup: NOOP,
    expectedEvidence: { fields: { output: { required: true, type: "string" }, status: { required: true, type: "number" } } },
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
    setup: NOOP,
    execute: { type: "terminal", handler: "handleHostTracert", code: "tracert" },
    cleanup: NOOP,
    expectedEvidence: { fields: { output: { required: true, type: "string" }, status: { required: true, type: "number" } } },
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
    setup: NOOP,
    execute: { type: "terminal", handler: "handleHostArp", code: "arp -a" },
    cleanup: NOOP,
    expectedEvidence: { fields: { output: { required: true, type: "string" }, status: { required: true, type: "number" } } },
    supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.1, timeoutMs: 15000 },
  });

  register({
    id: "host.nslookup",
    title: "Host DNS Lookup",
    domain: "host",
    kind: "primitive",
    risk: "safe",
    description: "Ejecutar nslookup en un host",
    tags: ["terminal", "host", "nslookup", "dns"],
    prerequisites: [{ type: "device", constraint: "Host device must exist" }],
    setup: NOOP,
    execute: { type: "terminal", handler: "handleHostNslookup", code: "nslookup" },
    cleanup: NOOP,
    expectedEvidence: { fields: { output: { required: true, type: "string" }, status: { required: true, type: "number" } } },
    supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.1, timeoutMs: 20000 },
  });

  register({
    id: "host.netstat",
    title: "Host Network Statistics",
    domain: "host",
    kind: "primitive",
    risk: "safe",
    description: "Ejecutar netstat en un host",
    tags: ["terminal", "host", "netstat"],
    prerequisites: [{ type: "device", constraint: "Host device must exist" }],
    setup: NOOP,
    execute: { type: "terminal", handler: "handleHostNetstat", code: "netstat" },
    cleanup: NOOP,
    expectedEvidence: { fields: { output: { required: true, type: "string" }, status: { required: true, type: "number" } } },
    supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.1, timeoutMs: 15000 },
  });

  register({
    id: "host.history",
    title: "Host Command History",
    domain: "host",
    kind: "primitive",
    risk: "safe",
    description: "Ejecutar history en un host",
    tags: ["terminal", "host", "history"],
    prerequisites: [{ type: "device", constraint: "Host device must exist" }],
    setup: NOOP,
    execute: { type: "terminal", handler: "handleHostHistory", code: "history" },
    cleanup: NOOP,
    expectedEvidence: { fields: { output: { required: true, type: "string" }, status: { required: true, type: "number" } } },
    supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.1, timeoutMs: 15000 },
  });

  register({
    id: "host.telnet",
    title: "Host Telnet Client",
    domain: "host",
    kind: "primitive",
    risk: "safe",
    description: "Ejecutar telnet desde un host",
    tags: ["terminal", "host", "telnet"],
    prerequisites: [{ type: "device", constraint: "Host device must exist" }],
    setup: NOOP,
    execute: { type: "terminal", handler: "handleHostTelnet", code: "telnet" },
    cleanup: NOOP,
    expectedEvidence: { fields: { output: { required: true, type: "string" }, status: { required: true, type: "number" } } },
    supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.2, timeoutMs: 20000 },
  });

  register({
    id: "host.ssh",
    title: "Host SSH Client",
    domain: "host",
    kind: "primitive",
    risk: "safe",
    description: "Ejecutar ssh desde un host",
    tags: ["terminal", "host", "ssh"],
    prerequisites: [{ type: "device", constraint: "Host device must exist" }],
    setup: NOOP,
    execute: { type: "terminal", handler: "handleHostSsh", code: "ssh" },
    cleanup: NOOP,
    expectedEvidence: { fields: { output: { required: true, type: "string" }, status: { required: true, type: "number" } } },
    supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.2, timeoutMs: 20000 },
  });

  register({
    id: "host.route",
    title: "Host Route Table",
    domain: "host",
    kind: "primitive",
    risk: "safe",
    description: "Ejecutar route print en un host",
    tags: ["terminal", "host", "route"],
    prerequisites: [{ type: "device", constraint: "Host device must exist" }],
    setup: NOOP,
    execute: { type: "terminal", handler: "handleHostRoute", code: "route print" },
    cleanup: NOOP,
    expectedEvidence: { fields: { output: { required: true, type: "string" }, status: { required: true, type: "number" } } },
    supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.1, timeoutMs: 15000 },
  });
}