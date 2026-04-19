// ============================================================================
// Primitives Index - Exports de todas las primitives
// ============================================================================
// Note: Payload types are exported from handlers, not here to avoid conflicts

export {
  addDevice,
  removeDevice,
  renameDevice,
  moveDevice,
  listDevices,
} from "./device";

export {
  addLink,
  removeLink,
} from "./link";

export {
  addModule,
  removeModule,
  inspectModuleSlots,
} from "./module";

export {
  setIp,
  setGateway,
  setDns,
  setDhcp,
} from "./host";

export {
  topologySnapshot,
  hardwareInfo,
  processInfo,
} from "./snapshot";

export {
  type PrimitiveDomain,
  type PrimitiveResult,
  type PrimitiveEntry,
  type PrimitiveContext,
  registerPrimitive,
  getPrimitive,
  listPrimitives,
  getPrimitivesByDomain,
  executePrimitive,
} from "./primitive-registry";