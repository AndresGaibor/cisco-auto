// ============================================================================
// @cisco-auto/file-bridge - File-based bridge for CLI ↔ Packet Tracer
//
// DEPRECATED: file-bridge-v2-types.ts — Use @cisco-auto/types for protocol
// types or define domain-specific types inline. That file will be removed.
// ============================================================================

// Core bridge implementation
export {
  FileBridgeV2,
  type FileBridgeV2Options,
  type BridgeHealth,
  type GCReport,
} from "./file-bridge-v2.js";

// Bridge lifecycle (state machine)
export { BridgeLifecycle } from "./v2/bridge-lifecycle.js";

// Backpressure and resource management
export { BackpressureManager, BackpressureError } from "./backpressure-manager.js";
export { SharedResultWatcher } from "./shared-result-watcher.js";

// Convenience helpers
export { pushCommands, pushCode, type PushResult } from "./file-bridge-v2-commands.js";

// Event consumers
export {
  DurableNdjsonConsumer,
  type DurableNdjsonConsumerOptions,
} from "./durable-ndjson-consumer.js";
export { CheckpointManager } from "./consumer-checkpoint.js";
export { FileResolver } from "./consumer-file-resolver.js";

// Event writer
export { EventLogWriter } from "./event-log-writer.js";

// Protocol types — canonical source is @cisco-auto/types
export type {
  BridgeCommandEnvelope,
  BridgeResultEnvelope,
  BridgeEvent,
  BridgeLease,
  BridgeErrorDetail,
} from "./shared/protocol.js";

// Validation
export { BridgeEventSchema, type BridgeEventInput } from "./shared/protocol.js";

// Infrastructure
export { BridgePathLayout } from "./shared/path-layout.js";
export { SequenceStore } from "./shared/sequence-store.js";
export { LeaseManager } from "./v2/lease-manager.js";
export { CrashRecovery } from "./v2/crash-recovery.js";
export { atomicWriteFile, ensureDir, ensureFile, appendLine } from "./shared/fs-atomic.js";

// Value Objects
export { CommandSeq, parseCommandSeq, isValidCommandSeq } from "./shared/command-seq.js";
export {
  CommandId,
  parseCommandId,
  isValidCommandId,
  generateCommandId,
} from "./shared/command-id.js";
