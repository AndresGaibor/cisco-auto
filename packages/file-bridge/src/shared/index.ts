/**
 * Shared utilities and types for Bridge V2.
 */
export { ensureDir, atomicWriteFile, appendLine, ensureFile } from "./fs-atomic";
export {
  BRIDGE_PROTOCOL_VERSION,
  type BridgeProtocolVersion,
  type BridgeCommandEnvelope,
  type BridgeResultEnvelope,
  type BridgeErrorDetail,
  type BridgeEvent,
  type BridgeLease,
  BridgeEventSchema,
  type BridgeEventInput,
} from "./protocol";
export {
  type ConsumerCheckpoint,
  type RotationEntry,
  type RotationManifest,
  type InFlightRecovery,
  type CommandStatus,
  type CommandFileEnvelope,
} from "./local-types";
export { BridgePathLayout } from "./path-layout";
export { SequenceStore } from "./sequence-store";
