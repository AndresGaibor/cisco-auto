/**
 * Bridge V2 Protocol Types
 *
 * Protocol version 2 addresses the durability issues of v1:
 * - Commands are individual files in a queue folder (no single-command.json overwrite)
 * - Results are written to dedicated result files (not just events)
 * - Events use monotonic seq numbers for gap detection
 * - Atomic writes prevent partial-read issues
 */

import { z } from "zod";

export const BRIDGE_PROTOCOL_VERSION = 2 as const;
export type BridgeProtocolVersion = typeof BRIDGE_PROTOCOL_VERSION;

// ============================================================================
// Event Validation Schema
// ============================================================================

/**
 * Schema for validating BridgeEvent objects.
 * Ensures required fields exist and have correct types.
 */
export const BridgeEventSchema = z.object({
  seq: z.number().int().nonnegative(),
  ts: z.number().int().nonnegative(),
  type: z.string().min(1),
  id: z.string().optional(),
}).passthrough();

export type BridgeEventInput = z.input<typeof BridgeEventSchema>;

/**
 * Command envelope written by CLI and read by PT.
 * Each command gets its own file in commands/.
 */
export interface BridgeCommandEnvelope<T = unknown> {
  protocolVersion: BridgeProtocolVersion;
  /** Unique command ID, e.g. "cmd_000000000042" */
  id: string;
  /** Monotonic sequence number for ordering and gap detection */
  seq: number;
  /** Unix timestamp in ms when command was created */
  createdAt: number;
  /** Command type string, e.g. "addDevice", "configIos" */
  type: string;
  /** Command payload */
  payload: T;
  /** Attempt number (1-based) */
  attempt: number;
  /** Optional expiry timestamp */
  expiresAt?: number;
  /** SHA256 checksum of the payload for integrity verification */
  checksum?: string;
}

/**
 * Result envelope written by PT and read by CLI.
 * Written to results/<id>.json as the authoritative result.
 */
export interface BridgeResultEnvelope<T = unknown> {
  protocolVersion: BridgeProtocolVersion;
  id: string;
  seq: number;
  /** When PT started processing the command */
  startedAt?: number;
  /** When PT completed/failed the command */
  completedAt: number;
  status: "completed" | "failed" | "timeout";
  ok: boolean;
  value?: T;
  error?: BridgeErrorDetail;
}

export interface BridgeErrorDetail {
  code: string;
  message: string;
  /** Whether this command can be safely retried */
  retryable?: boolean;
  /** Which phase the error occurred in: queue, pickup, execute, result */
  phase?: "queue" | "pickup" | "execute" | "result";
}

/**
 * Event written to the NDJSON journal.
 * Each event has a monotonic seq for ordering and gap detection.
 */
export interface BridgeEvent {
  seq: number;
  ts: number;
  type: string;
  /** Optional command ID if this event relates to a specific command */
  id?: string;
  [key: string]: unknown;
}

/**
 * Consumer checkpoint persisted to disk.
 * Allows resuming from the last known position after restart.
 */
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

/**
 * Bridge lease for single-instance enforcement.
 * Written periodically by the active bridge instance.
 */
export interface BridgeLease {
  ownerId: string;
  pid: number;
  hostname: string;
  startedAt: number;
  updatedAt: number;
  expiresAt: number;
  ttlMs: number;
  processTitle: string;
  version: string;
}

/**
 * Rotation manifest entry — tracks when a log file was rotated.
 */
export interface RotationEntry {
  file: string;
  rotatedAt: number;
  previousFile: string;
  bytesSizeAtRotation: number;
  lastSeqInFile: number;
}

/**
 * Rotation manifest — written by EventLogWriter, read by DurableNdjsonConsumer
 * to recover events from rotated files.
 */
export interface RotationManifest {
  rotations: RotationEntry[];
}

/**
 * In-flight recovery entry — used during crash recovery.
 */
export interface InFlightRecovery {
  file: string;
  cmdId: string;
  seq: number;
  type: string;
  attempt: number;
  movedAt: number;
  action: "requeued" | "completed" | "dead-letter";
}

/**
 * Command file on disk has status tracked by PT.
 */
export type CommandStatus = "queued" | "picked" | "started" | "completed" | "failed";

/**
 * Internal command file envelope with status for PT-side tracking.
 */
export interface CommandFileEnvelope<T = unknown> extends BridgeCommandEnvelope<T> {
  status: CommandStatus;
}
