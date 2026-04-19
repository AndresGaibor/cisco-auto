/**
 * Bridge V2 Protocol Types
 *
 * @deprecated Import from @cisco-auto/types instead
 * This file is kept for backwards compatibility during migration
 */

import type { BridgeCommandEnvelope } from "@cisco-auto/types";

export {
  BRIDGE_PROTOCOL_VERSION,
  BridgeEventSchema,
  type BridgeProtocolVersion,
  type BridgeEventInput,
  type BridgeResultEnvelope,
  type BridgeErrorDetail,
  type BridgeEvent,
  type BridgeCheckpoint,
  type BridgeQueueStatus,
  type BridgeLease,
  type BridgeHeartbeat,
  type BridgeRuntimeState,
} from "@cisco-auto/types";

export type { BridgeCommandEnvelope } from "@cisco-auto/types";

export interface ConsumerCheckpoint {
  consumerId: string;
  /** Relative path within logsDir, e.g. "events.current.ndjson" */
  currentFile: string;
  /** Byte offset within currentFile where reading should resume */
  byteOffset: number;
  /** Last seq number that was successfully processed */
  lastSeq: number;
  updatedAt: number;
}

export interface RotationEntry {
  file: string;
  rotatedAt: number;
  previousFile: string;
  bytesSizeAtRotation: number;
  lastSeqInFile: number;
  firstSeqInFile?: number;
  recordCount?: number;
  bytes?: number;
  createdAt?: number;
  closedAt?: number;
}

export interface RotationManifest {
  rotations: RotationEntry[];
}

export interface InFlightRecovery {
  file: string;
  cmdId: string;
  seq: number;
  type: string;
  attempt: number;
  movedAt: number;
  action: "requeued" | "completed" | "dead-letter";
}

export type CommandStatus = "queued" | "picked" | "started" | "completed" | "failed";

export interface CommandFileEnvelope<T = unknown> extends BridgeCommandEnvelope<T> {
  status: CommandStatus;
}
