// ============================================================================
// Physical Capabilities - device, link, module operations
// ============================================================================

import type { CapabilitySpec } from "./capability-types.js";

const NOOP = { type: "primitive" as const, handler: "noop" };

/**
 * Register all physical (device/link/module) capabilities
 */
export function registerPhysicalCapabilities(register: (spec: CapabilitySpec) => void): void {
  // device.add
  register({
    id: "device.add",
    title: "Add Device",
    domain: "device",
    kind: "primitive",
    risk: "safe",
    description: "Agregar un dispositivo a la topología",
    tags: ["device", "add", "primitive"],
    prerequisites: [],
    setup: NOOP,
    execute: { type: "primitive", handler: "handleAddDevice" },
    cleanup: { type: "primitive", handler: "handleRemoveDevice" },
    expectedEvidence: { fields: { name: { required: true, type: "string" } } },
    supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.1, timeoutMs: 10000 },
  });

  // device.move
  register({
    id: "device.move",
    title: "Move Device",
    domain: "device",
    kind: "primitive",
    risk: "safe",
    description: "Mover un dispositivo a nuevas coordenadas",
    tags: ["device", "move", "primitive"],
    prerequisites: [{ type: "device", constraint: "Device must exist" }],
    setup: NOOP,
    execute: { type: "primitive", handler: "handleMoveDevice" },
    cleanup: NOOP,
    expectedEvidence: { fields: { x: { required: true, type: "number" }, y: { required: true, type: "number" } } },
    supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.1, timeoutMs: 5000 },
  });

  // device.remove
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
    cleanup: NOOP,
    expectedEvidence: { fields: { removed: { required: true, type: "boolean" } } },
    supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.1, timeoutMs: 5000 },
  });

  // device.ports.list
  register({
    id: "device.ports.list",
    title: "List Device Ports",
    domain: "device",
    kind: "primitive",
    risk: "safe",
    description: "Listar puertos de un dispositivo",
    tags: ["device", "ports", "list"],
    prerequisites: [{ type: "device", constraint: "Device must exist" }],
    setup: NOOP,
    execute: { type: "primitive", handler: "handleListDevices" },
    cleanup: NOOP,
    expectedEvidence: { fields: { ports: { required: true, type: "array" } } },
    supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.1, timeoutMs: 5000 },
  });

  // link.add
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
    setup: NOOP,
    execute: { type: "primitive", handler: "handleAddLink" },
    cleanup: { type: "primitive", handler: "handleRemoveLink" },
    expectedEvidence: { fields: { linkId: { required: true, type: "string" } } },
    supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.1, timeoutMs: 10000 },
  });

  // module.add
  register({
    id: "module.add",
    title: "Add Module",
    domain: "module",
    kind: "primitive",
    risk: "elevated",
    description: "Agregar un módulo a un dispositivo",
    tags: ["module", "add", "primitive"],
    prerequisites: [{ type: "device", constraint: "Device must exist" }],
    setup: NOOP,
    execute: { type: "primitive", handler: "handleAddModule" },
    cleanup: { type: "primitive", handler: "handleRemoveModule" },
    expectedEvidence: { fields: { moduleAdded: { required: true, type: "boolean" } } },
    supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.15, timeoutMs: 10000 },
  });
}