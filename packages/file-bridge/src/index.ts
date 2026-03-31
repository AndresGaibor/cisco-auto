// ============================================================================
// @cisco-auto/file-bridge - File-based bridge for CLI ↔ Packet Tracer
// ============================================================================

// Core bridge implementation
export { FileBridgeV2, type FileBridgeV2Options, type BridgeHealth, type GCReport } from "./file-bridge-v2.js";

// Convenience helpers
export { pushCommands, pushCode, type PushResult } from "./file-bridge-v2-commands.js";

// Event consumers
export { DurableNdjsonConsumer, type DurableNdjsonConsumerOptions } from "./durable-ndjson-consumer.js";
export { CheckpointManager } from "./consumer-checkpoint.js";
export { FileResolver } from "./consumer-file-resolver.js";

// Event writer
export { EventLogWriter } from "./event-log-writer.js";

// Protocol types
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
export { atomicWriteFile, ensureDir, ensureFile } from "./shared/fs-atomic.js";