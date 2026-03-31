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
  type ConsumerCheckpoint,
  type BridgeLease,
  type CommandStatus,
  type CommandFileEnvelope,
  BridgeEventSchema,
  type BridgeEventInput,
} from "./protocol";
export { BridgePathLayout } from "./path-layout";
export { SequenceStore } from "./sequence-store";
